"""Orquestração do funil — funções que ligam BD <-> agentes <-> WhatsApp.

A BD é o "quadro-negro": os agentes não falam diretamente, trocam estado aqui.
"""
import asyncio
import httpx
from datetime import datetime, timedelta, timezone

from . import executivo, llm, whatsapp
from .config import get_settings
from .db import get_db
from .schemas import CopyRequest, CopyOutput, ExecutivoRequest, OnboardingPayload, SdrAction, SdrStatus

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


def criar_habilidade(cliente_id: str, titulo: str, conteudo: str, agente: str = "global") -> dict:
    return (
        get_db()
        .table("habilidades")
        .insert({"cliente_id": cliente_id, "titulo": titulo, "conteudo": conteudo, "agente": agente})
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


# ===================== Agente Executivo (Email & Atas) =====================
def listar_processamentos(cliente_id: str) -> list[dict]:
    return (
        get_db()
        .table("processamentos_executivo")
        .select("*")
        .eq("cliente_id", cliente_id)
        .order("created_at", desc=True)
        .execute()
        .data
    )


def processar_executivo(cliente_id: str, req: ExecutivoRequest) -> dict:
    """Orquestra o processamento (Opus+Haiku), persiste o resultado e desconta créditos.

    Créditos: só descontamos os workers com ÊXITO (base + 1 por item processado).
    """
    verificar_limite(cliente_id, CREDITOS_EXEC_BASE)  # bloqueia ANTES de gastar API
    habilidades = _habilidades_texto(cliente_id, agente="assistente")
    resultado = asyncio.run(executivo.processar(req.entrada, habilidades))

    titulo = (req.titulo or "").strip() or _titulo_automatico(resultado)
    row = {
        "cliente_id": cliente_id,
        "titulo": titulo,
        "entrada": req.entrada,
        "sintese": resultado.sintese.model_dump(),
        "itens": [i.model_dump() for i in resultado.itens],
        "n_itens": resultado.n_itens,
        "n_falhas": resultado.n_falhas,
    }
    saved = get_db().table("processamentos_executivo").insert(row).execute().data[0]
    # Só os itens com êxito cobram (falhas não descontam).
    consumir_creditos(cliente_id, CREDITOS_EXEC_BASE + len(resultado.itens) * CREDITOS_EXEC_ITEM)
    return saved


def _titulo_automatico(resultado) -> str:
    """Título de fallback quando o utilizador não fornece um."""
    if resultado.itens:
        primeiro = resultado.itens[0].titulo.strip()
        if primeiro:
            extra = f" (+{len(resultado.itens) - 1})" if len(resultado.itens) > 1 else ""
            return (primeiro[:80] + extra)
    return "Processamento " + datetime.now(timezone.utc).strftime("%d/%m %H:%M")


def apagar_processamento(cliente_id: str, pid: str) -> None:
    get_db().table("processamentos_executivo").delete().eq("id", pid).eq("cliente_id", cliente_id).execute()


def _habilidades_texto(
    cliente_id: str, ids: list[str] | None = None, agente: str | None = None
) -> str:
    """Texto das habilidades do cliente, para injetar no prompt do agente.

    - ids=None  -> todas as ATIVAS (comportamento legado, usado pelo SDR).
    - ids=[]    -> nenhuma (seleção explícita vazia na Fábrica de Campanhas).
    - ids=[...] -> só as escolhidas (filtradas também por cliente_id, por segurança).
    - agente    -> se dado, restringe às habilidades desse agente + as `global`.
    """
    if ids is not None and not ids:
        return ""
    q = get_db().table("habilidades").select("titulo, conteudo").eq("cliente_id", cliente_id)
    if ids is None:
        q = q.eq("ativo", True)
    else:
        q = q.in_("id", ids)
    if agente is not None:
        q = q.in_("agente", [agente, "global"])
    rows = q.order("created_at").execute().data
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
    verificar_limite(cliente_id, CREDITOS_CAMPANHA)  # bloqueia ANTES de gastar API
    # Lista explícita: omitido/[] => nenhuma habilidade (poupa tokens); nunca cai no "todas".
    out: CopyOutput = llm.gerar_anuncios(
        req.nicho,
        req.dor_latente,
        habilidades=_habilidades_texto(cliente_id, req.habilidade_ids or [], agente="copywriting"),
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
    consumir_creditos(cliente_id, CREDITOS_CAMPANHA)  # só desconta após êxito
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

    # Regra de plano: sem créditos, o SDR não responde (a mensagem do lead fica gravada).
    try:
        verificar_limite(cliente_id, CREDITOS_SDR)
    except LimiteCreditosError:
        return

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
        habilidades=_habilidades_texto(cliente_id, agente="sdr"),
    )

    _save_msg(lead["id"], "AGENTE", out.response, agente="sdr")
    consumir_creditos(cliente_id, CREDITOS_SDR)

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
    cliente_id = campanha.get("cliente_id")
    if cliente_id:
        verificar_limite(cliente_id, CREDITOS_BI)  # bloqueia ANTES de gastar API (Opus)
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
    rel = db.table("relatorios").insert(row).execute().data[0]
    if cliente_id:
        consumir_creditos(cliente_id, CREDITOS_BI)
    return rel


# ===================== Social Config =====================
def get_social_config(cliente_id: str) -> dict:
    """Devolve a social_config do cliente, criando um registo vazio se não existir."""
    db = get_db()
    res = db.table("social_config").select("*").eq("cliente_id", cliente_id).limit(1).execute()
    if res.data:
        row = res.data[0]
        # Limpa dados já guardados "sujos" (ex.: Page ID colado com crases).
        for campo in _SOCIAL_TEXT_FIELDS:
            if isinstance(row.get(campo), str):
                row[campo] = _limpar_valor_colado(row[campo])
        return row
    row = db.table("social_config").insert({"cliente_id": cliente_id}).execute()
    return row.data[0]


# Campos de texto que costumam ser colados pelo utilizador e vêm "sujos"
# (crases da formatação markdown, espaços, aspas, caracteres invisíveis).
_SOCIAL_TEXT_FIELDS = {
    "facebook_page_id",
    "facebook_page_access_token",
    "instagram_business_account_id",
    "discord_webhook_url",
}


def _limpar_valor_colado(valor: str) -> str:
    """Remove lixo de colagem: crases, aspas, espaços e caracteres invisíveis."""
    if valor is None:
        return valor
    # Caracteres de largura zero / BOM que se colam ao copiar de páginas web
    for invisivel in ("​", "‌", "‍", "﻿"):
        valor = valor.replace(invisivel, "")
    return valor.strip().strip("`'\" ").strip()


def update_social_config(cliente_id: str, fields: dict) -> dict:
    """Atualiza (ou cria) a social_config do cliente."""
    fields = {
        k: (_limpar_valor_colado(v) if k in _SOCIAL_TEXT_FIELDS and isinstance(v, str) else v)
        for k, v in fields.items()
    }
    db = get_db()
    existing = db.table("social_config").select("id").eq("cliente_id", cliente_id).limit(1).execute()
    if existing.data:
        res = db.table("social_config").update(fields).eq("cliente_id", cliente_id).execute()
    else:
        res = db.table("social_config").insert({**fields, "cliente_id": cliente_id}).execute()
    return res.data[0]


async def _enviar_discord(webhook_url: str, content: str) -> dict:
    """Envia uma mensagem (content) ao webhook do Discord."""
    # Normaliza para discord.com (discordapp.com é domínio legado)
    url = webhook_url.replace("discordapp.com", "discord.com")
    async with httpx.AsyncClient(follow_redirects=True) as client:
        r = await client.post(url, json={"content": content, "username": "TeamAgents BI"})
        if r.status_code not in (200, 204):
            raise ValueError(f"Discord devolveu {r.status_code}: {r.text}")
    return {"ok": True}


async def testar_discord(webhook_url: str) -> dict:
    """Envia uma mensagem de teste ao webhook do Discord."""
    return await _enviar_discord(
        webhook_url,
        "✅ **TeamAgents** conectado com sucesso! As notificações do Diretor de BI serão enviadas aqui.",
    )


async def postar_discord(webhook_url: str, mensagem: str) -> dict:
    """Publica uma mensagem real (ex.: anúncio de campanha) no webhook do Discord."""
    return await _enviar_discord(webhook_url, mensagem)


async def _diagnosticar_token_facebook(client: httpx.AsyncClient, token: str) -> str | None:
    """Inspeciona o token via debug_token e devolve uma dica acionável, ou None.

    Identifica os dois erros mais comuns do (#200): token é de Utilizador em vez
    de Página, ou falta a permissão pages_manage_posts.
    """
    settings = get_settings()
    if not settings.facebook_app_id or not settings.facebook_app_secret:
        return None
    try:
        r = await client.get(
            "https://graph.facebook.com/debug_token",
            params={
                "input_token": token,
                "access_token": f"{settings.facebook_app_id}|{settings.facebook_app_secret}",
            },
        )
        data = r.json().get("data", {})
    except Exception:
        return None

    tipo = (data.get("type") or "").upper()
    scopes = data.get("scopes") or []
    if tipo == "USER":
        return ("O token guardado é um token de Utilizador, não de Página. "
                "Usa o botão \"Ligar com Facebook\" para obter o Page Token correto, "
                "ou cola o User Token no campo \"Renovar token\" para o converter.")
    em_falta = [p for p in ("pages_manage_posts", "pages_read_engagement") if p not in scopes]
    if em_falta:
        return (f"Faltam permissões no token: {', '.join(em_falta)}. "
                "Reconecta via \"Ligar com Facebook\" e autoriza TODAS as permissões pedidas. "
                "Se a app está em modo Desenvolvimento, confirma que és Admin/Tester dela.")
    return None


async def postar_facebook(page_id: str, token: str, mensagem: str) -> dict:
    """Publica uma mensagem na Facebook Page."""
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"https://graph.facebook.com/v21.0/{page_id}/feed",
            data={"message": mensagem, "access_token": token},
        )
        if not r.is_success:
            body = r.json()
            erro = body.get("error", {})
            msg = erro.get("message", r.text)
            # Erro de permissões (#200): tenta dar uma dica concreta.
            if erro.get("code") == 200:
                dica = await _diagnosticar_token_facebook(client, token)
                if dica:
                    msg = dica
            raise ValueError(msg)
        return r.json()


async def postar_instagram(ig_id: str, token: str, mensagem: str, image_url: str) -> dict:
    """Publica uma imagem com legenda no Instagram Business Account (duas etapas)."""
    async with httpx.AsyncClient(follow_redirects=True) as client:
        # Etapa 1: criar container de media — todos os campos como query params
        r1 = await client.post(
            f"https://graph.facebook.com/v21.0/{ig_id}/media",
            params={"access_token": token, "image_url": image_url, "caption": mensagem},
        )
        if not r1.is_success:
            body = r1.json() if r1.headers.get("content-type", "").startswith("application/json") else {}
            msg = body.get("error", {}).get("message") or r1.text
            raise ValueError(msg)
        creation_id = r1.json()["id"]

        # Etapa 2: publicar o container
        r2 = await client.post(
            f"https://graph.facebook.com/v21.0/{ig_id}/media_publish",
            params={"access_token": token, "creation_id": creation_id},
        )
        if not r2.is_success:
            body = r2.json() if r2.headers.get("content-type", "").startswith("application/json") else {}
            msg = body.get("error", {}).get("message") or r2.text
            raise ValueError(msg)
        return r2.json()


async def oauth_facebook_exchange(code: str, redirect_uri: str) -> dict:
    """Troca código OAuth por tokens permanentes e descobre Página + Instagram."""
    settings = get_settings()
    if not settings.facebook_app_id or not settings.facebook_app_secret:
        raise ValueError("FACEBOOK_APP_ID e FACEBOOK_APP_SECRET não configurados no servidor.")
    async with httpx.AsyncClient() as client:
        # 1. Trocar code por short-lived user token
        r = await client.get(
            "https://graph.facebook.com/oauth/access_token",
            params={
                "client_id": settings.facebook_app_id,
                "client_secret": settings.facebook_app_secret,
                "redirect_uri": redirect_uri,
                "code": code,
            }
        )
        if not r.is_success:
            raise ValueError(r.json().get("error", {}).get("message", r.text))
        short_token = r.json()["access_token"]

        # 2. Trocar por long-lived user token (60 dias)
        r2 = await client.get(
            "https://graph.facebook.com/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.facebook_app_id,
                "client_secret": settings.facebook_app_secret,
                "fb_exchange_token": short_token,
            }
        )
        if not r2.is_success:
            raise ValueError(r2.json().get("error", {}).get("message", r2.text))
        long_token = r2.json()["access_token"]

        # 3. Obter páginas e Page Access Tokens permanentes
        r3 = await client.get(
            "https://graph.facebook.com/me/accounts",
            params={"access_token": long_token}
        )
        if not r3.is_success:
            raise ValueError(r3.json().get("error", {}).get("message", r3.text))
        pages = r3.json().get("data", [])
        if not pages:
            raise ValueError("Nenhuma Página do Facebook encontrada. Cria uma Página em facebook.com/pages/create primeiro.")
        page = pages[0]

        # 4. Tentar obter Instagram Business Account ID
        r4 = await client.get(
            f"https://graph.facebook.com/v21.0/{page['id']}",
            params={"access_token": page["access_token"], "fields": "instagram_business_account"}
        )
        ig_id = None
        if r4.is_success:
            ig_id = r4.json().get("instagram_business_account", {}).get("id")

        return {
            "facebook_page_id": page["id"],
            "facebook_page_name": page["name"],
            "facebook_page_access_token": page["access_token"],
            "instagram_business_account_id": ig_id,
        }


async def trocar_token_longa_duracao(user_token: str, page_id: str) -> dict:
    """Troca user token curto por token de longa duração e obtém Page Token permanente."""
    settings = get_settings()
    if not settings.facebook_app_id or not settings.facebook_app_secret:
        raise ValueError("FACEBOOK_APP_ID e FACEBOOK_APP_SECRET não estão configurados no servidor.")
    async with httpx.AsyncClient() as client:
        # Etapa 1: trocar user token por longa duração (60 dias)
        r = await client.get(
            "https://graph.facebook.com/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.facebook_app_id,
                "client_secret": settings.facebook_app_secret,
                "fb_exchange_token": user_token,
            }
        )
        if not r.is_success:
            raise ValueError(r.json().get("error", {}).get("message", r.text))
        long_user_token = r.json()["access_token"]

        # Etapa 2: obter Page Access Token permanente (não expira)
        r2 = await client.get(
            "https://graph.facebook.com/me/accounts",
            params={"access_token": long_user_token}
        )
        if not r2.is_success:
            raise ValueError(r2.json().get("error", {}).get("message", r2.text))

        pages = r2.json().get("data", [])
        page = next((p for p in pages if p["id"] == page_id), None)
        if not page:
            raise ValueError(f"Página {page_id} não encontrada. Confirma o Facebook Page ID.")
        return {"access_token": page["access_token"], "name": page["name"]}


async def verificar_facebook(page_id: str, token: str) -> dict:
    """Verifica se o token da Page é válido."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"https://graph.facebook.com/v21.0/{page_id}",
            params={"access_token": token, "fields": "id,name"}
        )
        if not r.is_success:
            body = r.json()
            raise ValueError(body.get("error", {}).get("message", r.text))
        return r.json()


async def verificar_instagram(ig_id: str, token: str) -> dict:
    """Verifica se o Instagram Business Account é acessível."""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"https://graph.facebook.com/v21.0/{ig_id}",
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


def atualizar_campanha(cliente_id: str, cid: str, fields: dict) -> dict | None:
    """Edita uma campanha do cliente. Devolve None se não existir/não for dele."""
    if not fields:
        rows = get_db().table("campanhas").select("*").eq("id", cid).eq("cliente_id", cliente_id).execute().data
        return rows[0] if rows else None
    res = (
        get_db()
        .table("campanhas")
        .update(fields)
        .eq("id", cid)
        .eq("cliente_id", cliente_id)
        .execute()
    )
    return res.data[0] if res.data else None


def apagar_campanha(cliente_id: str, cid: str) -> None:
    get_db().table("campanhas").delete().eq("id", cid).eq("cliente_id", cliente_id).execute()


# ===================== Créditos / consumo por plano =====================
# Pesos por ação, alinhados com o custo real dos modelos (Haiku < Sonnet < Opus).
CREDITOS_CAMPANHA = 6   # Fábrica de Campanhas (Sonnet)
CREDITOS_SDR = 1        # resposta do SDR no WhatsApp (Haiku)
CREDITOS_BI = 12        # relatório do Diretor de BI (Opus)
CREDITOS_EXEC_BASE = 10  # Agente Executivo: orquestração + síntese (Opus)
CREDITOS_EXEC_ITEM = 1   # + por cada item processado com ÊXITO (worker Haiku)

_CREDITOS_FALLBACK = 500  # se não houver plano Starter na BD


class LimiteCreditosError(Exception):
    """Plano sem créditos suficientes para a ação pretendida."""


def _periodo_atual() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def creditos_do_plano(cliente_id: str) -> int:
    """Créditos mensais do plano do cliente (NULL/sem plano => Starter)."""
    db = get_db()
    row = db.table("clientes").select("plano_id").eq("id", cliente_id).limit(1).execute().data
    plano_id = row[0]["plano_id"] if row else None
    if plano_id:
        p = db.table("planos").select("creditos_mensais").eq("id", plano_id).limit(1).execute().data
        if p:
            return p[0]["creditos_mensais"]
    s = db.table("planos").select("creditos_mensais").eq("nome", "Starter").order("ordem").limit(1).execute().data
    return s[0]["creditos_mensais"] if s else _CREDITOS_FALLBACK


def consumo_atual(cliente_id: str) -> int:
    """Créditos já gastos pelo cliente no período (mês) atual."""
    row = (
        get_db()
        .table("consumo_mensal")
        .select("creditos_usados")
        .eq("cliente_id", cliente_id)
        .eq("periodo", _periodo_atual())
        .limit(1)
        .execute()
        .data
    )
    return row[0]["creditos_usados"] if row else 0


def get_consumo(cliente_id: str) -> dict:
    """Resumo de consumo para os cards do frontend."""
    try:
        total = creditos_do_plano(cliente_id)
        usados = consumo_atual(cliente_id)
    except Exception:
        # Schema de consumo ainda não migrado — devolve um estado neutro.
        return {"usados": 0, "total": _CREDITOS_FALLBACK, "restantes": _CREDITOS_FALLBACK, "percent": 0}
    percent = round(usados / total * 100) if total else 0
    return {
        "usados": usados,
        "total": total,
        "restantes": max(total - usados, 0),
        "percent": min(percent, 100),
    }


def verificar_limite(cliente_id: str, qtd: int) -> None:
    """Levanta LimiteCreditosError se a ação exceder o plano. NÃO consome.

    Se o schema de consumo ainda não foi migrado, NÃO bloqueia (degrada com segurança).
    """
    try:
        total = creditos_do_plano(cliente_id)
        usados = consumo_atual(cliente_id)
    except Exception:
        return  # migração 011 ainda não aplicada — não impõe limite
    if usados + qtd > total:
        raise LimiteCreditosError(
            f"Limite do plano atingido ({usados}/{total} créditos este mês). "
            "Faz upgrade do plano para continuar."
        )


def consumir_creditos(cliente_id: str, qtd: int) -> None:
    """Incrementa o consumo do período atual (upsert). Chamar após a ação ter êxito."""
    try:
        db = get_db()
        periodo = _periodo_atual()
        existing = (
            db.table("consumo_mensal")
            .select("creditos_usados")
            .eq("cliente_id", cliente_id)
            .eq("periodo", periodo)
            .limit(1)
            .execute()
            .data
        )
        if existing:
            novo = existing[0]["creditos_usados"] + qtd
            db.table("consumo_mensal").update({"creditos_usados": novo}).eq("cliente_id", cliente_id).eq("periodo", periodo).execute()
        else:
            db.table("consumo_mensal").insert({"cliente_id": cliente_id, "periodo": periodo, "creditos_usados": qtd}).execute()
    except Exception:
        pass  # nunca falhar a ação principal por causa da contabilização de créditos


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

    # Regra de plano: sem créditos, salta este cliente (não gasta Opus).
    try:
        verificar_limite(cliente["id"], CREDITOS_BI)
    except LimiteCreditosError:
        return None

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
    rel = get_db().table("relatorios").insert(row).execute().data[0]
    consumir_creditos(cliente["id"], CREDITOS_BI)
    return rel
