"""Orquestração do funil — funções que ligam BD <-> agentes <-> WhatsApp.

A BD é o "quadro-negro": os agentes não falam diretamente, trocam estado aqui.
"""
import httpx
from datetime import datetime, timedelta, timezone

from . import llm, whatsapp
from .db import get_db
from .schemas import CopyRequest, CopyOutput, OnboardingPayload, SdrAction, SdrStatus

# O SDR responde em enum legível (inglês); a BD usa o enum status_qualificacao
# em português. Mapeamos na fronteira BD.
_STATUS_DB = {
    SdrStatus.UNQUALIFIED: "DESQUALIFICADO",
    SdrStatus.IN_PROGRESS: "EM_ANDAMENTO",
    SdrStatus.QUALIFIED: "QUALIFICADO",
}


# ===================== Onboarding (criar tenant, atómico) =====================
def onboard_tenant(auth_user_id: str, payload: OnboardingPayload) -> dict:
    """Cria cliente (ligado ao utilizador) + workspace_config numa transação.

    Atomicidade no Postgres: se algo falhar (instância duplicada, ou o user já
    ter cliente -> unique_violation), tudo é revertido. O endpoint trata o
    23505 (distingue pela constraint na mensagem).
    """
    _n = lambda v: v or None  # "" -> None (instância vazia fica NULL, não '')  # noqa: E731
    res = get_db().rpc(
        "onboard_tenant",
        {
            "p_auth_user_id": auth_user_id,
            "p_nome_empresa": payload.nome_empresa,
            "p_whatsapp_instance_name": _n(payload.whatsapp_instance_name),
            "p_whatsapp_token": _n(payload.whatsapp_token),
            "p_whatsapp_api_url": _n(payload.whatsapp_api_url),
            "p_calendario_link": _n(payload.calendario_link),
            "p_whatsapp_dono": _n(payload.whatsapp_dono),
        },
    ).execute()
    return res.data[0]  # {cliente_id, workspace_config_id}


# ===================== Resolução de tenant =====================
def get_config_by_instance(instance_name: str) -> dict | None:
    """Resolve a workspace_config (e o cliente dono) a partir da instância do WhatsApp."""
    res = (
        get_db()
        .table("workspace_configs")
        .select("*")
        .eq("whatsapp_instance_name", instance_name)
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


def get_config_by_cliente(cliente_id: str) -> dict | None:
    """Resolve a workspace_config a partir do cliente (usado pelo cron de BI)."""
    res = (
        get_db()
        .table("workspace_configs")
        .select("*")
        .eq("cliente_id", cliente_id)
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


def update_config(cliente_id: str, fields: dict) -> dict | None:
    """Atualiza a workspace_config do cliente (Configurações). Só campos fornecidos."""
    if not fields:
        return get_config_by_cliente(cliente_id)
    res = (
        get_db()
        .table("workspace_configs")
        .update(fields)
        .eq("cliente_id", cliente_id)
        .execute()
    )
    return res.data[0] if res.data else None


# ===================== Planos (superadmin) =====================
def listar_planos() -> list[dict]:
    return get_db().table("planos").select("*").order("ordem").execute().data


def criar_plano(fields: dict) -> dict:
    return get_db().table("planos").insert(fields).execute().data[0]


def atualizar_plano(pid: str, fields: dict) -> dict | None:
    res = get_db().table("planos").update(fields).eq("id", pid).execute()
    return res.data[0] if res.data else None


def apagar_plano(pid: str) -> None:
    get_db().table("planos").delete().eq("id", pid).execute()


# ===================== Habilidades (base de conhecimento) =====================
def listar_habilidades(cliente_id: str) -> list[dict]:
    return (
        get_db()
        .table("habilidades")
        .select("*")
        .eq("cliente_id", cliente_id)
        .order("created_at", desc=True)
        .execute()
        .data
    )


def criar_habilidade(cliente_id: str, titulo: str, conteudo: str) -> dict:
    return (
        get_db()
        .table("habilidades")
        .insert({"cliente_id": cliente_id, "titulo": titulo, "conteudo": conteudo})
        .execute()
        .data[0]
    )


def atualizar_habilidade(cliente_id: str, hid: str, fields: dict) -> dict | None:
    res = (
        get_db()
        .table("habilidades")
        .update(fields)
        .eq("id", hid)
        .eq("cliente_id", cliente_id)
        .execute()
    )
    return res.data[0] if res.data else None


def apagar_habilidade(cliente_id: str, hid: str) -> None:
    get_db().table("habilidades").delete().eq("id", hid).eq("cliente_id", cliente_id).execute()


def _habilidades_texto(cliente_id: str) -> str:
    """Texto das habilidades ATIVAS do cliente, para injetar no prompt do agente."""
    rows = (
        get_db()
        .table("habilidades")
        .select("titulo, conteudo")
        .eq("cliente_id", cliente_id)
        .eq("ativo", True)
        .order("created_at")
        .execute()
        .data
    )
    if not rows:
        return ""
    linhas = "\n".join(f"- {r['titulo']}: {r['conteudo']}" for r in rows)
    return (
        "## Conhecimento específico desta empresa (Habilidades)\n"
        "Tem isto em conta ao gerar conteúdo e ao conversar — é a fonte de verdade "
        "sobre a oferta, o tom de voz e os argumentos da empresa:\n" + linhas
    )


# ===================== Agente 1: criar campanha =====================
def criar_campanha(cliente_id: str, req: CopyRequest) -> dict:
    """Gera os anúncios e persiste a campanha. cliente_id vem do token (auth)."""
    out: CopyOutput = llm.gerar_anuncios(
        req.nicho, req.dor_latente, habilidades=_habilidades_texto(cliente_id)
    )
    db = get_db()
    row = {
        "cliente_id": cliente_id,
        "nome_cliente": req.nome_cliente,
        "nome_campanha": req.nome_campanha,
        "nicho": req.nicho,
        "dor_latente": req.dor_latente,
        "anuncio_dor": out.anuncio_dor,
        "anuncio_beneficio": out.anuncio_beneficio,
        "gatilho_principal": out.metadata.gatilho_principal,
        "dor_alvo": out.metadata.dor_alvo,
        "desejo_alvo": out.metadata.desejo_alvo,
        "palavra_chave_gatilho": out.metadata.palavra_chave_gatilho,
        "link_calendario": req.link_calendario,
        "status": "ATIVA",
    }
    res = db.table("campanhas").insert(row).execute()
    return res.data[0]


# ===================== Agente 2: processar mensagem do lead =====================
def _match_campanha(cliente_id: str, text: str) -> dict | None:
    """Liga o lead a uma campanha ATIVA DO CLIENTE pela palavra-chave de entrada."""
    db = get_db()
    campanhas = (
        db.table("campanhas")
        .select("*")
        .eq("cliente_id", cliente_id)
        .eq("status", "ATIVA")
        .execute()
        .data
    )
    up = text.upper()
    for c in campanhas:
        kw = (c.get("palavra_chave_gatilho") or "").upper()
        if kw and kw in up:
            return c
    return campanhas[0] if campanhas else None


def _get_or_create_lead(cliente_id: str, campanha_id: str, whatsapp_num: str, nome: str | None) -> dict:
    db = get_db()
    existing = (
        db.table("leads")
        .select("*")
        .eq("campanha_id", campanha_id)
        .eq("whatsapp", whatsapp_num)
        .execute()
        .data
    )
    if existing:
        return existing[0]
    row = {"cliente_id": cliente_id, "campanha_id": campanha_id, "whatsapp": whatsapp_num,
           "nome": nome, "status_qualificacao": "FRIO"}
    return db.table("leads").insert(row).execute().data[0]


def _historico(lead_id: str) -> list[dict]:
    db = get_db()
    msgs = (
        db.table("historico_conversas")
        .select("autor, mensagem")
        .eq("lead_id", lead_id)
        .order("created_at")
        .execute()
        .data
    )
    out = []
    for m in msgs:
        role = "assistant" if m["autor"] == "AGENTE" else "user"
        out.append({"role": role, "content": m["mensagem"]})
    return out


def _save_msg(lead_id: str, autor: str, mensagem: str, agente: str | None = None) -> None:
    get_db().table("historico_conversas").insert(
        {"lead_id": lead_id, "autor": autor, "mensagem": mensagem, "agente": agente}
    ).execute()


async def processar_mensagem_lead(instance: str, whatsapp_num: str, text: str, nome: str | None) -> None:
    """Tarefa de BACKGROUND: qualifica o lead e responde no WhatsApp.

    Roda DEPOIS de o webhook ter devolvido 200 OK ao provider.
    A `instance` resolve o cliente dono → isolamento total.
    """
    db = get_db()

    config = get_config_by_instance(instance)
    if not config:
        return  # instância não mapeada a nenhum cliente — ignora
    cliente_id = config["cliente_id"]

    campanha = _match_campanha(cliente_id, text)
    if not campanha:
        return  # nenhuma campanha ativa deste cliente — nada a fazer

    lead = _get_or_create_lead(cliente_id, campanha["id"], whatsapp_num, nome)
    _save_msg(lead["id"], "LEAD", text)

    historico = _historico(lead["id"])
    # remove a última (acabámos de gravar a mensagem atual; passamo-la à parte)
    historico = historico[:-1] if historico else []

    # O link de calendário vem da CONFIG do cliente (fonte de verdade), com
    # fallback para o da campanha.
    link_calendario = config.get("calendario_link") or campanha.get("link_calendario") or ""

    out = llm.responder_sdr(
        lead_message=text,
        historico=historico,
        gatilho_principal=campanha.get("gatilho_principal") or "",
        dor_alvo=campanha.get("dor_alvo") or "",
        palavra_chave_gatilho=campanha.get("palavra_chave_gatilho") or "",
        link_calendario=link_calendario,
        habilidades=_habilidades_texto(cliente_id),
    )

    _save_msg(lead["id"], "AGENTE", out.response, agente="sdr")

    # Atualiza estado do lead (mapeando o enum do SDR -> enum da BD)
    updates: dict = {"status_qualificacao": _STATUS_DB[out.qualification_status]}
    if out.action == SdrAction.SCHEDULE_MEETING:
        updates["reuniao_agendada"] = True
        updates["status_qualificacao"] = "QUALIFICADO"
    elif out.action == SdrAction.TRANSFER_TO_HUMAN:
        updates["transferido_humano"] = True
    db.table("leads").update(updates).eq("id", lead["id"]).execute()

    # Responde usando as credenciais do tenant (fallback para env global).
    await whatsapp.send_text(
        whatsapp_num,
        out.response,
        instance=config.get("whatsapp_instance_name"),
        token=config.get("whatsapp_token"),
        api_url=config.get("whatsapp_api_url"),
    )


# ===================== Agente 3: relatório semanal =====================
def gerar_relatorio_campanha(campanha_id: str, periodo_inicio: str, periodo_fim: str) -> dict:
    """Agrega métricas da semana, gera o relatório e persiste em `relatorios`."""
    db = get_db()
    campanha = db.table("campanhas").select("*").eq("id", campanha_id).single().execute().data
    leads = db.table("leads").select("*").eq("campanha_id", campanha_id).execute().data

    leads_totais = len(leads)
    leads_respondidos = sum(1 for l in leads if l["status_qualificacao"] != "FRIO")
    reunioes = sum(1 for l in leads if l.get("reuniao_agendada"))
    investimento = float(campanha.get("investimento_anuncios") or 0)

    taxa = (reunioes / leads_totais * 100) if leads_totais else 0.0
    cpag = (investimento / reunioes) if reunioes else 0.0

    out = llm.gerar_relatorio(
        nome_cliente=campanha["nome_cliente"],
        nome_campanha=campanha["nome_campanha"],
        leads_totais=leads_totais,
        leads_respondidos=leads_respondidos,
        reunioes_agendadas=reunioes,
        investimento_anuncios=investimento,
        taxa_conversao=taxa,
        custo_por_agendamento=cpag,
    )

    row = {
        "cliente_id": campanha.get("cliente_id"),
        "campanha_id": campanha_id,
        "periodo_inicio": periodo_inicio,
        "periodo_fim": periodo_fim,
        "leads_totais": leads_totais,
        "leads_respondidos": leads_respondidos,
        "reunioes_agendadas": reunioes,
        "investimento_anuncios": investimento,
        "taxa_conversao_lead_agendamento": round(taxa, 2),
        "custo_por_agendamento": round(cpag, 2),
        "relatorio_whatsapp": out.relatorio_whatsapp,
    }
    return db.table("relatorios").insert(row).execute().data[0]


# ===================== Social Config =====================
def get_social_config(cliente_id: str) -> dict:
    """Devolve a social_config do cliente, criando um registo vazio se não existir."""
    db = get_db()
    res = db.table("social_config").select("*").eq("cliente_id", cliente_id).limit(1).execute()
    if res.data:
        return res.data[0]
    row = db.table("social_config").insert({"cliente_id": cliente_id}).execute()
    return row.data[0]


def update_social_config(cliente_id: str, fields: dict) -> dict:
    """Atualiza (ou cria) a social_config do cliente."""
    db = get_db()
    existing = db.table("social_config").select("id").eq("cliente_id", cliente_id).limit(1).execute()
    if existing.data:
        res = db.table("social_config").update(fields).eq("cliente_id", cliente_id).execute()
    else:
        res = db.table("social_config").insert({**fields, "cliente_id": cliente_id}).execute()
    return res.data[0]


async def testar_discord(webhook_url: str) -> dict:
    """Envia uma mensagem de teste ao webhook do Discord."""
    # Normaliza para discord.com (discordapp.com é domínio legado)
    url = webhook_url.replace("discordapp.com", "discord.com")
    async with httpx.AsyncClient(follow_redirects=True) as client:
        r = await client.post(url, json={
            "content": "✅ **TeamAgents** conectado com sucesso! As notificações do Diretor de BI serão enviadas aqui.",
            "username": "TeamAgents BI"
        })
        if r.status_code not in (200, 204):
            raise ValueError(f"Discord devolveu {r.status_code}: {r.text}")
    return {"ok": True}


async def postar_facebook(page_id: str, token: str, mensagem: str) -> dict:
    """Publica uma mensagem na Facebook Page."""
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"https://graph.facebook.com/v22.0/{page_id}/feed",
            params={"access_token": token},
            json={"message": mensagem}
        )
        if not r.is_success:
            body = r.json()
            raise ValueError(body.get("error", {}).get("message", r.text))
        return r.json()


async def postar_instagram(ig_id: str, token: str, mensagem: str, image_url: str) -> dict:
    """Publica uma imagem com legenda no Instagram Business Account (duas etapas)."""
    async with httpx.AsyncClient() as client:
        # Etapa 1: criar container
        r1 = await client.post(
            f"https://graph.facebook.com/v22.0/{ig_id}/media",
            params={"access_token": token},
            json={"image_url": image_url, "caption": mensagem}
        )
        if not r1.is_success:
            raise ValueError(r1.json().get("error", {}).get("message", r1.text))
        creation_id = r1.json()["id"]

        # Etapa 2: publicar
        r2 = await client.post(
            f"https://graph.facebook.com/v22.0/{ig_id}/media_publish",
            params={"access_token": token},
            json={"creation_id": creation_id}
        )
        if not r2.is_success:
            raise ValueError(r2.json().get("error", {}).get("message", r2.text))
        return r2.json()


async def verificar_facebook(page_id: str, token: str) -> dict:
    """Verifica se o token da Page é válido."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"https://graph.facebook.com/v22.0/{page_id}",
            params={"access_token": token, "fields": "id,name,followers_count"}
        )
        if not r.is_success:
            body = r.json()
            raise ValueError(body.get("error", {}).get("message", r.text))
        return r.json()


async def verificar_instagram(ig_id: str, token: str) -> dict:
    """Verifica se o Instagram Business Account é acessível."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"https://graph.facebook.com/v22.0/{ig_id}",
            params={"access_token": token, "fields": "id,name,username,followers_count"}
        )
        if not r.is_success:
            body = r.json()
            raise ValueError(body.get("error", {}).get("message", r.text))
        return r.json()


# ===================== Listagens (frontend) — sempre por cliente =====================
def listar_clientes() -> list[dict]:
    """Lista os tenants (para o seletor de cliente no MVP, sem auth ainda)."""
    return get_db().table("clientes").select("id, nome, created_at").order("nome").execute().data


def listar_campanhas(cliente_id: str) -> list[dict]:
    """Campanhas de um cliente, mais recentes primeiro."""
    return (
        get_db()
        .table("campanhas")
        .select("*")
        .eq("cliente_id", cliente_id)
        .order("created_at", desc=True)
        .execute()
        .data
    )


def listar_relatorios(cliente_id: str) -> list[dict]:
    """Relatórios de BI de um cliente, mais recentes primeiro."""
    return (
        get_db()
        .table("relatorios")
        .select("*")
        .eq("cliente_id", cliente_id)
        .order("created_at", desc=True)
        .execute()
        .data
    )


def listar_leads(cliente_id: str) -> list[dict]:
    """Leads de um cliente, mais recentes primeiro. SEMPRE filtrado por cliente_id."""
    return (
        get_db()
        .table("leads")
        .select("*")
        .eq("cliente_id", cliente_id)
        .order("created_at", desc=True)
        .execute()
        .data
    )


def listar_conversas(cliente_id: str, lead_id: str) -> list[dict]:
    """Histórico de um lead — valida que o lead pertence ao cliente antes de devolver."""
    db = get_db()
    lead = (
        db.table("leads")
        .select("id")
        .eq("id", lead_id)
        .eq("cliente_id", cliente_id)
        .execute()
        .data
    )
    if not lead:
        return []  # lead não é deste cliente (ou não existe) — não vaza dados
    return (
        db.table("historico_conversas")
        .select("autor, agente, mensagem, created_at")
        .eq("lead_id", lead_id)
        .order("created_at")
        .execute()
        .data
    )


# ===================== Agente 3: relatório SEMANAL por tenant (Cron) =====================
def _metricas_semana(cliente_id: str, dias: int) -> dict:
    """Agrega as métricas dos últimos `dias` dias para um cliente."""
    db = get_db()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=dias)).isoformat()

    def _count(q) -> int:
        return q.execute().count or 0

    base = lambda: db.table("leads").select("id", count="exact").eq("cliente_id", cliente_id).gte("created_at", cutoff)  # noqa: E731

    leads_totais = _count(base())
    leads_respondidos = _count(base().neq("status_qualificacao", "FRIO"))
    reunioes = _count(base().eq("reuniao_agendada", True))

    camps = (
        db.table("campanhas")
        .select("investimento_anuncios")
        .eq("cliente_id", cliente_id)
        .execute()
        .data
    )
    investimento = sum(float(c.get("investimento_anuncios") or 0) for c in camps)

    return {
        "leads_totais": leads_totais,
        "leads_respondidos": leads_respondidos,
        "reunioes": reunioes,
        "investimento": investimento,
    }


def gerar_relatorio_semanal_cliente(cliente: dict, dias: int = 7) -> dict | None:
    """Gera e persiste o relatório semanal consolidado de um cliente.

    Devolve a linha de `relatorios` criada, ou **None** se o cliente não teve
    leads na janela (guarda anti-desperdício: não chama o Opus à toa).
    """
    m = _metricas_semana(cliente["id"], dias)
    if m["leads_totais"] == 0:
        return None  # sem atividade — não gasta token de Opus

    taxa = m["reunioes"] / m["leads_totais"] * 100 if m["leads_totais"] else 0.0
    cpag = m["investimento"] / m["reunioes"] if m["reunioes"] else 0.0

    out = llm.gerar_relatorio(
        nome_cliente=cliente["nome"],
        nome_campanha="Resumo Semanal (todas as campanhas)",
        leads_totais=m["leads_totais"],
        leads_respondidos=m["leads_respondidos"],
        reunioes_agendadas=m["reunioes"],
        investimento_anuncios=m["investimento"],
        taxa_conversao=taxa,
        custo_por_agendamento=cpag,
    )

    fim = datetime.now(timezone.utc).date()
    inicio = fim - timedelta(days=dias)
    row = {
        "cliente_id": cliente["id"],
        "campanha_id": None,  # consolidado — não atado a uma campanha
        "periodo_inicio": inicio.isoformat(),
        "periodo_fim": fim.isoformat(),
        "leads_totais": m["leads_totais"],
        "leads_respondidos": m["leads_respondidos"],
        "reunioes_agendadas": m["reunioes"],
        "investimento_anuncios": m["investimento"],
        "taxa_conversao_lead_agendamento": round(taxa, 2),
        "custo_por_agendamento": round(cpag, 2),
        "relatorio_whatsapp": out.relatorio_whatsapp,
    }
    return get_db().table("relatorios").insert(row).execute().data[0]
