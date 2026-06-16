"""Orquestração do funil — funções que ligam BD <-> agentes <-> WhatsApp.

A BD é o "quadro-negro": os agentes não falam diretamente, trocam estado aqui.
"""
import asyncio
import calendar
import re
import time
import unicodedata
import httpx
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from . import calcom, email_ingest, evolution, executivo, growth, llm, pricing, whatsapp
from .config import get_settings
from .db import get_db
from .schemas import CopyRequest, CopyOutput, ExecutivoRequest, ItemBruto, OnboardingPayload, SdrAction, SdrStatus, TipoItem

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


# ===================== WhatsApp gerido (provisionamento automático) =====================
def whatsapp_estado(cliente_id: str) -> dict:
    """Estado da ligação WhatsApp do cliente + se o modo gerido está disponível."""
    cfg = get_config_by_cliente(cliente_id) or {}
    inst = cfg.get("whatsapp_instance_name")
    gerido = evolution.central_disponivel()
    estado = evolution.estado_instancia(inst) if (gerido and inst) else None
    # Quando a linha fica ligada, captura o número (uma vez) para o link de captação.
    numero = cfg.get("whatsapp_numero")
    if estado == "open" and not numero and inst:
        try:
            num = evolution.numero_instancia(inst)
            if num:
                update_config(cliente_id, {"whatsapp_numero": num})
                numero = num
        except Exception:
            pass
    return {"gerido": gerido, "instance": inst, "estado": estado, "ligado": estado == "open", "numero": numero}


def whatsapp_conectar(cliente_id: str) -> dict:
    """Cria/reusa a instância do cliente no servidor central e devolve o QR Code."""
    cfg = get_config_by_cliente(cliente_id) or {}
    nome_empresa = cfg.get("nome_empresa")
    if not nome_empresa:
        try:
            row = get_db().table("clientes").select("nome").eq("id", cliente_id).limit(1).execute().data
            nome_empresa = row[0]["nome"] if row else None
        except Exception:
            nome_empresa = None
    res = evolution.criar_ou_conectar(cliente_id, cfg.get("whatsapp_instance_name"), nome_empresa)
    update_config(cliente_id, {
        "whatsapp_instance_name": res["instance"],
        "whatsapp_token": res.get("token") or get_settings().whatsapp_api_key,
        "whatsapp_api_url": res.get("api_url"),
    })
    return {"qr": res.get("qr"), "instance": res["instance"]}


def whatsapp_qr(cliente_id: str) -> dict:
    """Busca o QR atual da instância do cliente (polling pelo frontend)."""
    cfg = get_config_by_cliente(cliente_id) or {}
    return evolution.obter_qr(cfg.get("whatsapp_instance_name"))


def whatsapp_desligar(cliente_id: str) -> dict:
    """Desliga e remove a instância do cliente."""
    cfg = get_config_by_cliente(cliente_id) or {}
    evolution.apagar_instancia(cfg.get("whatsapp_instance_name"))
    update_config(cliente_id, {"whatsapp_instance_name": None, "whatsapp_token": None})
    return {"ok": True}


def verificar_calcom(cliente_id: str) -> dict:
    """Valida a ligação Cal.com do cliente (API key + Event Type ID já salvos)."""
    cfg = get_config_by_cliente(cliente_id) or {}
    key, etid = cfg.get("calcom_api_key"), cfg.get("calcom_event_type_id")
    if not key or not etid:
        return {"ok": False, "erro": "Preencha a API key e o Event Type ID e salve antes de verificar."}
    return calcom.verificar(key, etid)


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
    return _persistir_executivo(cliente_id, req.titulo, req.entrada, resultado)


def _persistir_executivo(cliente_id: str, titulo_in: str | None, entrada: str, resultado, tarefa_id: str | None = None) -> dict:
    """Persiste o resultado do Agente Executivo e desconta créditos (só itens com êxito).

    `tarefa_id` liga o resultado à tarefa que o gerou (NULL nos colados/manuais).
    """
    titulo = (titulo_in or "").strip() or _titulo_automatico(resultado)
    row = {
        "cliente_id": cliente_id,
        "titulo": titulo,
        "entrada": entrada,
        "sintese": resultado.sintese.model_dump(),
        "itens": [i.model_dump() for i in resultado.itens],
        "n_itens": resultado.n_itens,
        "n_falhas": resultado.n_falhas,
        "tarefa_id": tarefa_id,
    }
    db = get_db()
    try:
        saved = db.table("processamentos_executivo").insert(row).execute().data[0]
    except Exception:
        row.pop("tarefa_id", None)  # migração 025 ainda não corrida
        saved = db.table("processamentos_executivo").insert(row).execute().data[0]
    # Piso = fórmula antiga (base + itens); sobe se os tokens reais custarem mais.
    piso = CREDITOS_EXEC_BASE + len(resultado.itens) * CREDITOS_EXEC_ITEM
    uso = pricing.UsoLLM(
        modelo=getattr(resultado, "modelo", None) or "executivo",
        input_tokens=getattr(resultado, "tokens_in", 0),
        output_tokens=getattr(resultado, "tokens_out", 0),
        cache_write=0,
        cache_read=0,
        custo_usd=getattr(resultado, "custo_usd", 0.0),
    )
    cr = pricing.creditos_de_custo(uso.custo_usd, minimo=piso)
    consumir_creditos(cliente_id, cr, "executivo", uso=uso)
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


def apagar_todos_processamentos(cliente_id: str) -> int:
    """Apaga TODOS os processamentos do cliente (na BD). Devolve quantos havia."""
    db = get_db()
    n = len(db.table("processamentos_executivo").select("id").eq("cliente_id", cliente_id).execute().data or [])
    db.table("processamentos_executivo").delete().eq("cliente_id", cliente_id).execute()
    return n


# ----- Tarefas dirigidas (o agente só lê o que estas tarefas pedem) -----
def listar_tarefas_executivo(cliente_id: str) -> list[dict]:
    return (
        get_db()
        .table("tarefas_executivo")
        .select("*")
        .eq("cliente_id", cliente_id)
        .order("created_at", desc=True)
        .execute()
        .data
    )


def criar_tarefa_executivo(cliente_id: str, fields: dict) -> dict:
    return get_db().table("tarefas_executivo").insert({**fields, "cliente_id": cliente_id}).execute().data[0]


def atualizar_tarefa_executivo(cliente_id: str, tid: str, fields: dict) -> dict | None:
    res = (
        get_db()
        .table("tarefas_executivo")
        .update(fields)
        .eq("id", tid)
        .eq("cliente_id", cliente_id)
        .execute()
    )
    return res.data[0] if res.data else None


def apagar_tarefa_executivo(cliente_id: str, tid: str) -> None:
    get_db().table("tarefas_executivo").delete().eq("id", tid).eq("cliente_id", cliente_id).execute()


def _gmail_query(t: dict) -> str:
    """Constrói a query do Gmail a partir dos filtros da tarefa (poupa tokens)."""
    partes = [f"newer_than:{int(t.get('janela_dias') or 1)}d"]
    rem = (t.get("remetente") or "").strip()
    if rem:
        addrs = [a for a in re.split(r"[,\s]+", rem) if a]
        if addrs:
            partes.append("from:(" + " OR ".join(addrs) + ")")
    kw = (t.get("palavras_chave") or "").strip()
    if kw:
        partes.append(kw)
    return " ".join(partes)


def _itens_de_emails(emails: list[dict]) -> list[ItemBruto]:
    return [
        ItemBruto(
            tipo=TipoItem.EMAIL,
            titulo=(e.get("subject") or "(sem assunto)")[:120],
            conteudo=f"De: {e.get('from', '')}\nAssunto: {e.get('subject', '')}\n\n{e.get('body', '')}".strip(),
        )
        for e in emails
    ]


# ===================== Fase 2: contas de email (OAuth Gmail) =====================
def _sanitizar_email_account(row: dict) -> dict:
    """Versão segura para o frontend — nunca devolve tokens."""
    return {
        "provider": row.get("provider"),
        "email": row.get("email"),
        "last_sync": row.get("last_sync"),
        "created_at": row.get("created_at"),
    }


def listar_email_accounts(cliente_id: str) -> list[dict]:
    rows = (
        get_db()
        .table("email_accounts")
        .select("*")
        .eq("cliente_id", cliente_id)
        .order("created_at")
        .execute()
        .data
    )
    return [_sanitizar_email_account(r) for r in rows]


def _get_email_account(cliente_id: str, provider: str) -> dict | None:
    rows = (
        get_db()
        .table("email_accounts")
        .select("*")
        .eq("cliente_id", cliente_id)
        .eq("provider", provider)
        .limit(1)
        .execute()
        .data
    )
    return rows[0] if rows else None


def oauth_google_exchange(cliente_id: str, code: str, redirect_uri: str) -> dict:
    """Troca o código OAuth do Google por tokens e guarda a conta (upsert)."""
    acc = email_ingest.exchange_google(code, redirect_uri)
    row = {
        "cliente_id": cliente_id,
        "provider": acc["provider"],
        "email": acc["email"],
        "access_token": acc["access_token"],
        "expiry": acc["expiry"],
    }
    # O refresh_token só vem na 1ª autorização (prompt=consent). Não o apaga se faltar.
    if acc.get("refresh_token"):
        row["refresh_token"] = acc["refresh_token"]
    saved = (
        get_db()
        .table("email_accounts")
        .upsert(row, on_conflict="cliente_id,provider")
        .execute()
        .data[0]
    )
    return _sanitizar_email_account(saved)


def desligar_email_account(cliente_id: str, provider: str) -> None:
    get_db().table("email_accounts").delete().eq("cliente_id", cliente_id).eq("provider", provider).execute()


def _access_token_valido(account: dict) -> str:
    """Devolve um access_token válido, renovando-o (e persistindo) se expirou."""
    expiry = account.get("expiry") or 0
    if expiry and time.time() < expiry - 60:
        return account["access_token"]
    refresh = account.get("refresh_token")
    if not refresh:
        return account["access_token"]  # sem refresh: tenta o atual (pode falhar -> erro claro a montante)
    novo_access, novo_expiry = email_ingest.refresh_google(refresh)
    get_db().table("email_accounts").update(
        {"access_token": novo_access, "expiry": novo_expiry}
    ).eq("id", account["id"]).execute()
    return novo_access


def _due_agora(t: dict, agora_utc: datetime) -> bool:
    """True se a tarefa automática deve correr AGORA, com recuperação no mesmo dia.

    Regra: hoje tem de ser um dia ELEGÍVEL para a frequência (dia da semana / dia
    do mês exato), já tem de ter passado a HORA agendada (>=, não ==) e a tarefa
    ainda não pode ter corrido desde essa hora hoje. Assim, se a janela falhar
    (serviço em baixo), o próximo tick do cron no mesmo dia recupera. Nunca corre
    num dia diferente do agendado.
    """
    if t.get("automatica") is not True:
        return False  # 'Manual' nunca corre sozinho

    fuso = t.get("fuso") or "America/Sao_Paulo"
    try:
        tz = ZoneInfo(fuso)
    except Exception:
        tz = timezone.utc
    local = agora_utc.astimezone(tz)
    hora_alvo = 7 if t.get("hora") is None else int(t["hora"])
    freq = (t.get("frequencia") or "diaria").lower()

    # 1) Hoje é um dia elegível para esta frequência?
    if freq in ("semanal", "quinzenal"):
        dw = 0 if t.get("dia_semana") is None else int(t["dia_semana"])
        if local.weekday() != dw:
            return False
    elif freq in ("mensal", "trimestral", "semestral"):
        dm = 1 if t.get("dia_mes") is None else int(t["dia_mes"])
        ultimo = calendar.monthrange(local.year, local.month)[1]
        if local.day != min(dm, ultimo):  # dia exato (ajusta a meses curtos)
            return False
    # 'diaria': todos os dias são elegíveis

    # 2) Já passou a hora agendada de hoje? (>= permite recuperar na hora seguinte)
    agendado = local.replace(hour=hora_alvo, minute=0, second=0, microsecond=0)
    if local < agendado:
        return False

    # 3) Já correu desde a hora agendada de hoje? (não repete no mesmo dia)
    last = t.get("last_run")
    try:
        last_dt = datetime.fromisoformat(last.replace("Z", "+00:00")) if last else None
    except Exception:
        last_dt = None
    if last_dt is not None and last_dt.astimezone(tz) >= agendado:
        return False

    # 4) Cadência mínima entre ciclos (quinzenal/trimestral/semestral)
    minimo = {"quinzenal": 13, "trimestral": 85, "semestral": 175}.get(freq, 0)
    if minimo and last_dt is not None:
        if (agora_utc - last_dt).days < minimo:
            return False

    return True


def sincronizar_email(
    cliente_id: str, provider: str = "gmail", apenas_automaticas: bool = False, tarefa_ids: list[str] | None = None
) -> dict:
    """Corre tarefas: busca só os emails que batem nos filtros e resume.

    - `tarefa_ids`: corre só essas tarefas (escolha do utilizador, mesmo inativas).
    - `apenas_automaticas=True`: só as tarefas automáticas que estão "due" hoje (cron).
    - caso contrário: todas as ativas.
    Uma síntese (processamento) por tarefa.
    """
    account = _get_email_account(cliente_id, provider)
    if not account:
        raise ValueError("Nenhuma conta de email ligada. Liga o Gmail primeiro.")

    try:
        todas = listar_tarefas_executivo(cliente_id)
    except Exception:
        return {"processamentos": [], "n_emails": 0, "sem_tarefas": True}  # migração 014 ainda não corrida
    if tarefa_ids:
        escolhidas = set(tarefa_ids)
        tarefas = [t for t in todas if t["id"] in escolhidas]  # escolha explícita: corre mesmo se inativa
    else:
        tarefas = [t for t in todas if t.get("ativo")]
        if apenas_automaticas:
            agora = datetime.now(timezone.utc)
            # GARANTIA DUPLA: 'Manual' (automatica != True) NUNCA corre no cron.
            tarefas = [t for t in tarefas if t.get("automatica") is True and _due_agora(t, agora)]
    if not tarefas:
        return {"processamentos": [], "n_emails": 0, "sem_tarefas": True}

    access = _access_token_valido(account)
    criados: list[dict] = []
    total_emails = 0
    for t in tarefas:
        try:
            verificar_limite(cliente_id, CREDITOS_EXEC_BASE)  # bloqueia ANTES de gastar API
        except LimiteCreditosError:
            break  # sem créditos — para por aqui (as tarefas seguintes ficam para a próxima)
        emails = email_ingest.fetch_recent_google(access, max_results=20, query=_gmail_query(t))
        _marcar_tarefa_run(t["id"])
        if not emails:
            continue
        # Habilidades por tarefa: as escolhidas, ou todas as do agente se nenhuma escolhida.
        hab_ids = t.get("habilidade_ids") or None
        habilidades = _habilidades_texto(
            cliente_id, ids=hab_ids, agente=None if hab_ids else "assistente"
        )
        resultado = asyncio.run(
            executivo.processar_itens(_itens_de_emails(emails), habilidades, t.get("instrucoes") or "")
        )
        proc = _persistir_executivo(cliente_id, t["nome"], email_ingest.construir_entrada(emails), resultado, tarefa_id=t["id"])
        criados.append(proc)
        total_emails += len(emails)

    get_db().table("email_accounts").update({"last_sync": _now_iso()}).eq("id", account["id"]).execute()
    return {"processamentos": criados, "n_emails": total_emails}


def _marcar_tarefa_run(tid: str) -> None:
    get_db().table("tarefas_executivo").update({"last_run": _now_iso()}).eq("id", tid).execute()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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
    out, uso = llm.gerar_anuncios(
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
    cr = pricing.creditos_de_custo(uso.custo_usd, minimo=CREDITOS_CAMPANHA)  # piso = valor atual
    consumir_creditos(cliente_id, cr, "campanhas", uso=uso)  # só desconta após êxito
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

    # Humano já assumiu este contato: o bot fica em silêncio (só guarda a mensagem
    # para a equipe ler o histórico). Evita o agente "falar por cima" do atendente.
    if lead.get("transferido_humano"):
        return

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

    # Se a clínica ligou o Cal.com, injeta os horários REAIS livres — o agente
    # propõe só esses e devolve o inicio_iso escolhido em `agendar_em`.
    horarios_txt = ""
    if calcom.configurado(config):
        livres = calcom.proximos_horarios(config["calcom_api_key"], config["calcom_event_type_id"])
        if livres:
            linhas = "\n".join(f"- {h['rotulo']}  (inicio_iso: {h['inicio_iso']})" for h in livres)
            horarios_txt = (
                "## Horários REAIS livres na agenda (proponha SOMENTE estes)\n"
                f"{linhas}\n"
                "Ao confirmar um horário com a pessoa, devolva action=SCHEDULE_MEETING e copie "
                "o `inicio_iso` EXATO do horário escolhido no campo `agendar_em`. Não invente horários.\n"
            )

    out, uso = llm.responder_sdr(
        lead_message=text,
        historico=historico,
        gatilho_principal=campanha.get("gatilho_principal") or "",
        dor_alvo=campanha.get("dor_alvo") or "",
        palavra_chave_gatilho=campanha.get("palavra_chave_gatilho") or "",
        link_calendario=link_calendario,
        habilidades=_habilidades_texto(cliente_id, agente="sdr"),
        horarios=horarios_txt,
    )

    _save_msg(lead["id"], "AGENTE", out.response, agente="sdr")
    consumir_creditos(cliente_id, pricing.creditos_de_custo(uso.custo_usd, minimo=CREDITOS_SDR), "sdr", uso=uso)

    # Atualiza estado do lead (mapeando o enum do SDR -> enum da BD)
    updates: dict = {"status_qualificacao": _STATUS_DB[out.qualification_status]}
    if out.action == SdrAction.SCHEDULE_MEETING:
        updates["reuniao_agendada"] = True
        updates["status_qualificacao"] = "QUALIFICADO"
        # Agendamento autônomo: se o Cal.com está ligado e o agente escolheu um
        # horário, cria a reserva real na agenda (best-effort — não quebra o fluxo).
        agendar_em = getattr(out, "agendar_em", None)
        if agendar_em and calcom.configurado(config):
            calcom.criar_reserva(
                api_key=config["calcom_api_key"],
                event_type_id=config["calcom_event_type_id"],
                inicio_iso=agendar_em,
                nome=lead.get("nome") or nome or "",
                whatsapp=whatsapp_num,
            )
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
_TZ_RELATORIO = ZoneInfo("America/Sao_Paulo")


def _parse_dt(v: object) -> datetime | None:
    if not isinstance(v, str) or not v:
        return None
    try:
        return datetime.fromisoformat(v.replace("Z", "+00:00"))
    except ValueError:
        return None


def _fora_do_horario(dt: datetime) -> bool:
    """Lead chegou fora do horário comercial? (fim de semana, ou < 8h / >= 18h em SP)."""
    local = dt.astimezone(_TZ_RELATORIO)
    return local.weekday() >= 5 or local.hour < 8 or local.hour >= 18


def _fmt_duracao(seg: float) -> str:
    if seg < 90:
        return "menos de 1 min"
    minutos = round(seg / 60)
    if minutos < 60:
        return f"{minutos} min"
    return f"{seg / 3600:.1f} h".replace(".", ",")


def _metricas_contrafactuais(leads: list[dict]) -> dict:
    """Prova de valor: o que a IA capturou/poupou que um humano provavelmente perderia."""
    total = len(leads)
    fora = sum(1 for l in leads if (dt := _parse_dt(l.get("created_at"))) and _fora_do_horario(dt))
    qualificados = sum(1 for l in leads if l.get("reuniao_agendada") or l.get("status_qualificacao") == "QUALIFICADO")
    pct_qual = round(qualificados / total * 100) if total else 0

    # Tempo médio da 1ª resposta (1ª msg do LEAD -> 1ª msg do AGENTE).
    ids = [l["id"] for l in leads if l.get("id")]
    tempo = None
    if ids:
        msgs = (
            get_db()
            .table("historico_conversas")
            .select("lead_id, autor, created_at")
            .in_("lead_id", ids)
            .order("created_at")
            .execute()
            .data
        )
        por_lead: dict[str, dict] = {}
        for m in msgs:
            lid, d = m.get("lead_id"), _parse_dt(m.get("created_at"))
            if not lid or not d:
                continue
            slot = por_lead.setdefault(lid, {})
            if m.get("autor") == "LEAD" and "lead" not in slot:
                slot["lead"] = d
            elif m.get("autor") == "AGENTE" and "lead" in slot and "agente" not in slot:
                slot["agente"] = d
        deltas = [
            (s["agente"] - s["lead"]).total_seconds()
            for s in por_lead.values()
            if "lead" in s and "agente" in s and (s["agente"] - s["lead"]).total_seconds() >= 0
        ]
        if deltas:
            tempo = _fmt_duracao(sum(deltas) / len(deltas))
    return {"leads_fora_horario": fora, "pct_qualificados_ia": pct_qual, "tempo_resposta": tempo}


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
    cf = _metricas_contrafactuais(leads)

    out, uso = llm.gerar_relatorio(
        nome_cliente=campanha["nome_cliente"],
        nome_campanha=campanha["nome_campanha"],
        leads_totais=leads_totais,
        leads_respondidos=leads_respondidos,
        reunioes_agendadas=reunioes,
        investimento_anuncios=investimento,
        taxa_conversao=taxa,
        custo_por_agendamento=cpag,
        leads_fora_horario=cf["leads_fora_horario"],
        pct_qualificados_ia=cf["pct_qualificados_ia"],
        tempo_resposta=cf["tempo_resposta"],
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
        consumir_creditos(cliente_id, pricing.creditos_de_custo(uso.custo_usd, minimo=CREDITOS_BI), "bi", uso=uso)
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
            erro = body.get("error", {})
            msg = erro.get("message", r.text)
            # Dá uma dica concreta (tipo de token / permissões / app em dev).
            dica = await _diagnosticar_token_facebook(client, token)
            if dica:
                msg = f"{msg}\n\n→ {dica}"
            elif erro.get("code") == 200:
                msg = (f"{msg}\n\n→ A App não tem autorização para este utilizador. "
                       "Confirma que a tua conta é Admin/Tester da App (se estiver em modo Desenvolvimento) "
                       "e reconecta via \"Ligar com Facebook\" autorizando todas as permissões.")
            raise ValueError(msg)
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

# Sem plano pago => 0 créditos. Nenhum crédito é liberado antes da confirmação
# financeira (o plano_id só é atribuído pelo webhook da Stripe após pagamento).
_CREDITOS_FALLBACK = 0


class LimiteCreditosError(Exception):
    """Plano sem créditos suficientes para a ação pretendida."""


def _periodo_atual() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def creditos_do_plano(cliente_id: str) -> int:
    """Créditos mensais do plano do cliente. Sem plano (não pagou) => 0."""
    db = get_db()
    row = db.table("clientes").select("plano_id").eq("id", cliente_id).limit(1).execute().data
    plano_id = row[0]["plano_id"] if row else None
    if plano_id:
        p = db.table("planos").select("creditos_mensais").eq("id", plano_id).limit(1).execute().data
        if p:
            return p[0]["creditos_mensais"]
    return 0


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


def consumo_atual_seguro(cliente_id: str) -> int:
    """consumo_atual tolerante (0 se o schema ainda não foi migrado)."""
    try:
        return consumo_atual(cliente_id)
    except Exception:
        return 0


_superadmin_cache: dict[str, bool] = {}


def is_superadmin_cliente(cliente_id: str) -> bool:
    """True se o cliente pertence ao superadmin (créditos ilimitados). Em cache."""
    if cliente_id in _superadmin_cache:
        return _superadmin_cache[cliente_id]
    resultado = False
    try:
        s = get_settings()
        row = get_db().table("clientes").select("auth_user_id").eq("id", cliente_id).limit(1).execute().data
        uid = row[0].get("auth_user_id") if row else None
        if uid:
            r = httpx.get(
                f"{s.supabase_url}/auth/v1/admin/users/{uid}",
                headers={"apikey": s.supabase_service_role_key, "Authorization": f"Bearer {s.supabase_service_role_key}"},
                timeout=10,
            )
            if r.status_code == 200:
                email = (r.json().get("email") or "").lower()
                resultado = email == s.superadmin_email.lower()
    except Exception:
        resultado = False
    _superadmin_cache[cliente_id] = resultado
    return resultado


def get_consumo(cliente_id: str) -> dict:
    """Resumo de consumo para os cards do frontend (+ plano atual e assinatura)."""
    if is_superadmin_cliente(cliente_id):
        # Superadmin: créditos ilimitados.
        return {"usados": consumo_atual_seguro(cliente_id), "total": None, "restantes": None, "percent": 0,
                "creditos_avulsos": 0, "disponivel_total": None, "plano_id": None, "plano_nome": "Superadmin",
                "tem_assinatura": False, "assinatura_cancela_em": None, "ilimitado": True}
    try:
        total = creditos_do_plano(cliente_id)
        usados = consumo_atual(cliente_id)
    except Exception:
        # Schema de consumo ainda não migrado — devolve um estado neutro.
        return {"usados": 0, "total": _CREDITOS_FALLBACK, "restantes": _CREDITOS_FALLBACK, "percent": 0,
                "creditos_avulsos": 0, "disponivel_total": _CREDITOS_FALLBACK,
                "plano_id": None, "plano_nome": None, "tem_assinatura": False, "assinatura_cancela_em": None}
    percent = round(usados / total * 100) if total else 0
    plano_id = plano_nome = None
    tem_assinatura = False
    avulsos = 0
    cancela_em = None
    pagamento_em_falha = False
    try:
        db = get_db()
        row = db.table("clientes").select("*").eq("id", cliente_id).limit(1).execute().data
        if row:
            plano_id = row[0].get("plano_id")
            tem_assinatura = bool(row[0].get("stripe_subscription_id"))
            avulsos = int(row[0].get("creditos_avulsos") or 0)
            cancela_em = row[0].get("assinatura_cancela_em")
            pagamento_em_falha = bool(row[0].get("pagamento_em_falha"))
        if plano_id:
            p = db.table("planos").select("nome").eq("id", plano_id).limit(1).execute().data
            plano_nome = p[0]["nome"] if p else None
    except Exception:
        pass  # migração 017/018/019/026 ainda não aplicada
    restantes_plano = max(total - usados, 0)
    return {
        "usados": usados,
        "total": total,
        "restantes": restantes_plano,
        "percent": min(percent, 100),
        "creditos_avulsos": avulsos,
        "disponivel_total": restantes_plano + avulsos,
        "plano_id": plano_id,
        "plano_nome": plano_nome,
        "sem_plano": plano_id is None,
        "pagamento_em_falha": pagamento_em_falha,
        "tem_assinatura": tem_assinatura,
        "assinatura_cancela_em": cancela_em,
    }


def listar_planos_publicos() -> list[dict]:
    """Planos ativos para a landing page (público — sem auth, sem ids Stripe)."""
    try:
        return (
            get_db()
            .table("planos")
            .select("nome, creditos_mensais, preco, ordem")
            .eq("ativo", True)
            .order("ordem")
            .execute()
            .data
        )
    except Exception:
        return []


def listar_planos_ativos() -> list[dict]:
    """Planos ativos (para o cliente escolher/assinar)."""
    return (
        get_db()
        .table("planos")
        .select("id, nome, creditos_mensais, preco, stripe_price_id, ordem")
        .eq("ativo", True)
        .order("ordem")
        .execute()
        .data
    )


def saldo_avulso(cliente_id: str) -> int:
    """Saldo de créditos avulsos (comprados, não expiram). 0 se migração 018 ausente."""
    try:
        row = get_db().table("clientes").select("creditos_avulsos").eq("id", cliente_id).limit(1).execute().data
        return int(row[0].get("creditos_avulsos") or 0) if row else 0
    except Exception:
        return 0  # coluna ainda não existe


# ===================== Pacotes de créditos avulsos =====================
def listar_pacotes() -> list[dict]:
    return get_db().table("pacotes_creditos").select("*").order("ordem").execute().data


def listar_pacotes_ativos() -> list[dict]:
    """Pacotes ativos (para o cliente comprar)."""
    return (
        get_db()
        .table("pacotes_creditos")
        .select("id, nome, creditos, preco, stripe_price_id, ordem")
        .eq("ativo", True)
        .order("ordem")
        .execute()
        .data
    )


def criar_pacote(fields: dict) -> dict:
    return get_db().table("pacotes_creditos").insert(fields).execute().data[0]


def atualizar_pacote(pid: str, fields: dict) -> dict | None:
    res = get_db().table("pacotes_creditos").update(fields).eq("id", pid).execute()
    return res.data[0] if res.data else None


def apagar_pacote(pid: str) -> None:
    get_db().table("pacotes_creditos").delete().eq("id", pid).execute()


def creditar_compra_avulsa(cliente_id: str, creditos: int, valor: float, pacote_id: str | None, session_id: str | None) -> bool:
    """Soma créditos ao saldo avulso e regista a compra. Idempotente por session_id.

    Devolve True se creditou, False se já tinha sido processado (mesmo session_id).
    """
    db = get_db()
    if session_id:
        ja = db.table("compras_creditos").select("id").eq("stripe_session_id", session_id).limit(1).execute().data
        if ja:
            return False  # webhook reentregue — não credita 2x
    db.table("compras_creditos").insert({
        "cliente_id": cliente_id,
        "pacote_id": pacote_id,
        "creditos": creditos,
        "valor": valor,
        "stripe_session_id": session_id,
    }).execute()
    atual = saldo_avulso(cliente_id)
    db.table("clientes").update({"creditos_avulsos": atual + creditos}).eq("id", cliente_id).execute()
    return True


def admin_conceder_creditos(cliente_id: str, creditos: int) -> dict:
    """Admin concede créditos de cortesia (avulsos) a uma empresa.
    Acumulativo (soma ao saldo existente) e não-mensal — não expiram."""
    novo = saldo_avulso(cliente_id) + int(creditos)
    get_db().table("clientes").update({"creditos_avulsos": novo}).eq("id", cliente_id).execute()
    return {"ok": True, "creditos_avulsos": novo}


def registar_faturamento(cliente_id: str | None, tipo: str, valor: float, descricao: str | None, stripe_ref: str | None) -> bool:
    """Regista um pagamento no livro de faturamento. Idempotente por stripe_ref.

    Devolve False se já existia (evento reentregue) ou se valor <= 0.
    """
    if not valor or valor <= 0:
        return False
    db = get_db()
    try:
        if stripe_ref:
            ja = db.table("faturamento").select("id").eq("stripe_ref", stripe_ref).limit(1).execute().data
            if ja:
                return False
        db.table("faturamento").insert({
            "cliente_id": cliente_id,
            "tipo": tipo,
            "valor": valor,
            "descricao": descricao,
            "stripe_ref": stripe_ref,
        }).execute()
        return True
    except Exception:
        return False  # migração 020 pode ainda não ter corrido


def verificar_limite(cliente_id: str, qtd: int) -> None:
    """Levanta LimiteCreditosError se a ação exceder mesada do plano + saldo avulso.

    Disponível = (mesada do plano − usado no mês) + créditos avulsos. NÃO consome.
    Se o schema de consumo ainda não foi migrado, NÃO bloqueia (degrada com segurança).
    """
    if is_superadmin_cliente(cliente_id):
        return  # superadmin: créditos ilimitados, nunca bloqueia
    try:
        total = creditos_do_plano(cliente_id)
        usados = consumo_atual(cliente_id)
    except Exception:
        return  # migração 011 ainda não aplicada — não impõe limite
    restante_mensal = max(total - usados, 0)
    avulsos = saldo_avulso(cliente_id)
    disponivel = restante_mensal + avulsos
    if qtd > disponivel:
        if total == 0 and avulsos == 0:
            # Conta sem plano pago — orienta para a assinatura.
            raise LimiteCreditosError(
                "A tua conta ainda não tem créditos. Vai ao menu Assinatura, escolhe um plano "
                "e conclui o pagamento para ativar os agentes."
            )
        raise LimiteCreditosError(
            f"Créditos insuficientes ({disponivel} disponíveis: {restante_mensal} do plano "
            f"+ {avulsos} avulsos). Faz upgrade no menu Assinatura ou compra um pacote de créditos."
        )


def consumir_creditos(cliente_id: str, qtd: int, origem: str = "outro", uso=None) -> None:
    """Contabiliza o consumo: gasta a mesada do plano primeiro, depois o saldo avulso.

    Chamar após a ação ter êxito. `origem`: campanhas | sdr | bi | executivo.
    O `consumo_log` regista a quantidade + tokens/custo/modelo reais (`uso`: UsoLLM).
    """
    try:
        db = get_db()
        periodo = _periodo_atual()

        # Quanto ainda cabe na mesada do plano este mês.
        try:
            total = creditos_do_plano(cliente_id)
            usado_mes = consumo_atual(cliente_id)
            restante_mensal = max(total - usado_mes, 0)
        except Exception:
            restante_mensal = qtd  # sem schema de plano — tudo conta como mesada
        do_mes = min(qtd, restante_mensal)
        do_avulso = qtd - do_mes

        # 1) incrementa o contador mensal (só a parte coberta pela mesada).
        if do_mes > 0:
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
                novo = existing[0]["creditos_usados"] + do_mes
                db.table("consumo_mensal").update({"creditos_usados": novo}).eq("cliente_id", cliente_id).eq("periodo", periodo).execute()
            else:
                db.table("consumo_mensal").insert({"cliente_id": cliente_id, "periodo": periodo, "creditos_usados": do_mes}).execute()

        # 2) o resto sai do saldo avulso (nunca abaixo de 0).
        if do_avulso > 0:
            try:
                atual = saldo_avulso(cliente_id)
                db.table("clientes").update({"creditos_avulsos": max(atual - do_avulso, 0)}).eq("id", cliente_id).execute()
            except Exception:
                pass  # migração 018 pode ainda não ter corrido
    except Exception:
        pass  # nunca falhar a ação principal por causa da contabilização de créditos
    base = {"cliente_id": cliente_id, "origem": origem, "creditos": qtd}
    extra = {}
    if uso is not None:
        extra = {
            "tokens_in": getattr(uso, "input_tokens", 0),
            "tokens_out": getattr(uso, "output_tokens", 0),
            "custo_usd": round(getattr(uso, "custo_usd", 0.0), 6),
            "modelo": getattr(uso, "modelo", None),
        }
    try:
        db.table("consumo_log").insert({**base, **extra}).execute()
    except Exception:
        try:
            db.table("consumo_log").insert(base).execute()  # migração 024 ainda não corrida
        except Exception:
            pass  # log detalhado é best-effort (migração 016 pode ainda não ter corrido)


def consumo_dashboard(cliente_id: str, de: str, ate: str, gran: str = "dia") -> dict:
    """Agrega o log de consumo no intervalo [de, ate] por bucket (dia/semana/mes) e por origem."""
    try:
        rows = (
            get_db()
            .table("consumo_log")
            .select("origem, creditos, created_at")
            .eq("cliente_id", cliente_id)
            .gte("created_at", de)
            .lte("created_at", ate)
            .order("created_at")
            .execute()
            .data
        )
    except Exception:
        return {"total": 0, "por_origem": {}, "series": []}

    def _bucket(iso: str) -> str:
        d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        if gran == "ano":
            return d.strftime("%Y")
        if gran == "mes":
            return d.strftime("%Y-%m")
        if gran == "semana":
            y, w, _ = d.isocalendar()
            return f"{y}-S{w:02d}"
        return d.strftime("%Y-%m-%d")

    series: dict[str, int] = {}
    por_origem: dict[str, int] = {}
    total = 0
    for r in rows:
        q = int(r.get("creditos") or 0)
        total += q
        series[_bucket(r["created_at"])] = series.get(_bucket(r["created_at"]), 0) + q
        o = r.get("origem") or "outro"
        por_origem[o] = por_origem.get(o, 0) + q
    return {
        "total": total,
        "por_origem": por_origem,
        "series": [{"bucket": k, "total": v} for k, v in sorted(series.items())],
    }


# ===================== Painel do superadmin: Empresas =====================
def _mapa_emails() -> dict[str, str]:
    """user_id -> email, via GoTrue admin (best-effort, paginado)."""
    out: dict[str, str] = {}
    try:
        s = get_settings()
        headers = {"apikey": s.supabase_service_role_key, "Authorization": f"Bearer {s.supabase_service_role_key}"}
        page = 1
        while page <= 25:  # teto de segurança
            r = httpx.get(f"{s.supabase_url}/auth/v1/admin/users", headers=headers, params={"page": page, "per_page": 200}, timeout=15)
            if r.status_code != 200:
                break
            data = r.json()
            users = data.get("users", []) if isinstance(data, dict) else data
            if not users:
                break
            for u in users:
                if u.get("id"):
                    out[u["id"]] = u.get("email") or ""
            if len(users) < 200:
                break
            page += 1
    except Exception:
        pass
    return out


def _fim_do_dia(ate: str) -> str:
    """Torna 'ate' inclusivo até ao fim do dia (para comparações de timestamptz)."""
    return ate if "T" in ate else f"{ate}T23:59:59.999Z"


def admin_empresas() -> list[dict]:
    """Lista todas as empresas (clientes) com plano, email e consumo do mês atual."""
    db = get_db()
    clientes = (
        db.table("clientes")
        .select("id, nome, auth_user_id, plano_id, stripe_subscription_id, creditos_avulsos, assinatura_cancela_em, created_at")
        .order("created_at")
        .execute()
        .data
    )
    planos = {p["id"]: p for p in db.table("planos").select("id, nome, creditos_mensais, preco").execute().data}
    emails = _mapa_emails()
    superadmin_email = get_settings().superadmin_email.lower()
    consumo_mes: dict[str, int] = {}
    try:
        for r in db.table("consumo_mensal").select("cliente_id, creditos_usados").eq("periodo", _periodo_atual()).execute().data:
            consumo_mes[r["cliente_id"]] = r["creditos_usados"]
    except Exception:
        pass
    out = []
    for c in clientes:
        plano = planos.get(c.get("plano_id"))
        email = emails.get(c.get("auth_user_id"), "")
        ilimitado = bool(email) and email.lower() == superadmin_email
        out.append({
            "id": c["id"],
            "nome": c.get("nome"),
            "email": email,
            "ilimitado": ilimitado,
            "plano_nome": "Ilimitado" if ilimitado else (plano["nome"] if plano else None),
            "creditos_mensais": None if ilimitado else (plano["creditos_mensais"] if plano else None),
            "preco": 0 if ilimitado else (float(plano["preco"]) if plano else 0),
            "creditos_avulsos": c.get("creditos_avulsos") or 0,
            "tem_assinatura": bool(c.get("stripe_subscription_id")),
            "assinatura_cancela_em": c.get("assinatura_cancela_em"),
            "consumo_mes": consumo_mes.get(c["id"], 0),
            "created_at": c.get("created_at"),
        })
    return out


def admin_empresas_consumo(de: str, ate: str) -> list[dict]:
    """Consumo de tokens por empresa no intervalo [de, ate], com repartição por origem."""
    db = get_db()
    agg: dict[str, dict] = {}
    try:
        rows = (
            db.table("consumo_log")
            .select("cliente_id, origem, creditos, created_at")
            .gte("created_at", de)
            .lte("created_at", _fim_do_dia(ate))
            .execute()
            .data
        )
        for r in rows:
            cid = r["cliente_id"]
            q = int(r.get("creditos") or 0)
            a = agg.setdefault(cid, {"total": 0, "campanhas": 0, "sdr": 0, "bi": 0, "executivo": 0, "outro": 0})
            a["total"] += q
            o = r.get("origem") or "outro"
            a[o] = a.get(o, 0) + q
    except Exception:
        pass
    clientes = db.table("clientes").select("id, nome, plano_id, auth_user_id").execute().data
    planos = {p["id"]: p for p in db.table("planos").select("id, nome, creditos_mensais").execute().data}
    emails = _mapa_emails()
    superadmin_email = get_settings().superadmin_email.lower()
    out = []
    for c in clientes:
        a = agg.get(c["id"], {})
        plano = planos.get(c.get("plano_id"))
        ilimitado = (emails.get(c.get("auth_user_id"), "").lower() == superadmin_email) and bool(superadmin_email)
        out.append({
            "id": c["id"],
            "nome": c.get("nome"),
            "plano_nome": "Ilimitado" if ilimitado else (plano["nome"] if plano else None),
            "creditos_mensais": None if ilimitado else (plano["creditos_mensais"] if plano else None),
            "total": a.get("total", 0),
            "campanhas": a.get("campanhas", 0),
            "sdr": a.get("sdr", 0),
            "bi": a.get("bi", 0),
            "executivo": a.get("executivo", 0),
            "outro": a.get("outro", 0),
        })
    out.sort(key=lambda x: x["total"], reverse=True)
    return out


def admin_dashboard(de: str, ate: str, gran: str = "mes") -> dict:
    """Séries agregadas (todas as empresas): consumo, faturamento e crescimento."""
    db = get_db()
    ate_fim = _fim_do_dia(ate)

    def bk(iso: str) -> str:
        d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        if gran == "ano":
            return d.strftime("%Y")
        if gran == "trimestre":
            return f"{d.year}-T{(d.month - 1) // 3 + 1}"
        if gran == "semana":
            y, w, _ = d.isocalendar()
            return f"{y}-S{w:02d}"
        return d.strftime("%Y-%m")  # mensal

    consumo_series: dict[str, int] = {}
    consumo_total = 0
    custo_usd_total = 0.0
    custo_series: dict[str, float] = {}
    try:
        # Tenta com custo_usd (migração 024); se a coluna não existir, cai no básico.
        try:
            rows = db.table("consumo_log").select("creditos, custo_usd, created_at").gte("created_at", de).lte("created_at", ate_fim).execute().data
        except Exception:
            rows = db.table("consumo_log").select("creditos, created_at").gte("created_at", de).lte("created_at", ate_fim).execute().data
        for r in rows:
            q = int(r.get("creditos") or 0)
            consumo_total += q
            b = bk(r["created_at"])
            consumo_series[b] = consumo_series.get(b, 0) + q
            cu = float(r.get("custo_usd") or 0)
            custo_usd_total += cu
            custo_series[b] = custo_series.get(b, 0.0) + cu
    except Exception:
        pass

    fat_series: dict[str, float] = {}
    fat_total = 0.0
    fat_por_tipo: dict[str, float] = {"assinatura": 0.0, "pacote": 0.0}
    try:
        for r in db.table("faturamento").select("valor, tipo, created_at").gte("created_at", de).lte("created_at", ate_fim).execute().data:
            v = float(r.get("valor") or 0)
            fat_total += v
            fat_series[bk(r["created_at"])] = fat_series.get(bk(r["created_at"]), 0.0) + v
            t = r.get("tipo") or "outro"
            fat_por_tipo[t] = fat_por_tipo.get(t, 0.0) + v
    except Exception:
        pass

    cresc_series: dict[str, int] = {}
    total_empresas = 0
    try:
        rows = db.table("clientes").select("created_at").execute().data
        total_empresas = len(rows)
        for r in rows:
            ca = r.get("created_at")
            if ca and de <= ca <= ate_fim:
                cresc_series[bk(ca)] = cresc_series.get(bk(ca), 0) + 1
    except Exception:
        pass

    ativas = 0
    mrr = 0.0
    try:
        precos = {p["id"]: float(p["preco"]) for p in db.table("planos").select("id, preco").execute().data}
        for c in db.table("clientes").select("plano_id, stripe_subscription_id").execute().data:
            if c.get("stripe_subscription_id"):
                ativas += 1
                mrr += precos.get(c.get("plano_id"), 0.0)
    except Exception:
        pass

    def serie(d: dict) -> list[dict]:
        return [{"bucket": k, "total": round(v, 2)} for k, v in sorted(d.items())]

    usd_brl = get_settings().usd_brl or 5.4
    custo_brl_total = custo_usd_total * usd_brl
    margem_brl = round(fat_total - custo_brl_total, 2)
    margem_pct = round((margem_brl / fat_total) * 100, 1) if fat_total else 0.0

    return {
        "consumo_series": serie(consumo_series),
        "faturamento_series": serie(fat_series),
        "crescimento_series": serie(cresc_series),
        "custo_series": [{"bucket": k, "total": round(v * usd_brl, 2)} for k, v in sorted(custo_series.items())],
        "consumo_total": consumo_total,
        "faturamento_total": round(fat_total, 2),
        "faturamento_por_tipo": {k: round(v, 2) for k, v in fat_por_tipo.items()},
        "custo_usd_total": round(custo_usd_total, 4),
        "custo_brl_total": round(custo_brl_total, 2),
        "margem_brl": margem_brl,
        "margem_pct": margem_pct,
        "total_empresas": total_empresas,
        "empresas_ativas": ativas,
        "mrr": round(mrr, 2),
    }


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


def reativar_ia_lead(cliente_id: str, lead_id: str) -> dict:
    """Desfaz a transferência para humano — o SDR volta a atender este contato.
    Validado por cliente_id (não mexe em lead de outro tenant)."""
    res = (
        get_db()
        .table("leads")
        .update({"transferido_humano": False})
        .eq("id", lead_id)
        .eq("cliente_id", cliente_id)
        .execute()
    )
    return {"ok": bool(res.data)}


# ===================== Suporte (chat cliente <-> admin) =====================
# Colunas pedidas explicitamente (evita "*", que falha no cache do PostgREST nesta tabela).
_SUP_COLS = "id, cliente_id, autor, mensagem, lida, created_at"


def suporte_listar(cliente_id: str) -> list[dict]:
    """Mensagens do cliente (cronológico) + marca as do admin como lidas (cliente viu)."""
    db = get_db()
    # Colunas explícitas (não "*") e sem .order() — o "*"/order tropeça no cache do
    # PostgREST nesta tabela nova. Ordenamos em Python.
    msgs = db.table("suporte_mensagens").select(_SUP_COLS).eq("cliente_id", cliente_id).execute().data or []
    msgs.sort(key=lambda m: m.get("created_at") or "")
    try:  # marcar como lida é secundário — nunca pode quebrar a listagem
        db.table("suporte_mensagens").update({"lida": True}) \
            .eq("cliente_id", cliente_id).eq("autor", "admin").eq("lida", False).execute()
    except Exception:
        pass
    return msgs


def suporte_enviar(cliente_id: str, mensagem: str) -> dict:
    """O cliente envia uma mensagem para o suporte."""
    return get_db().table("suporte_mensagens").insert(
        {"cliente_id": cliente_id, "autor": "cliente", "mensagem": mensagem}
    ).execute().data[0]


def suporte_nao_lidas(cliente_id: str) -> int:
    """Nº de respostas do admin ainda não vistas pelo cliente (badge no menu)."""
    try:
        r = (
            get_db().table("suporte_mensagens").select("id", count="exact")
            .eq("cliente_id", cliente_id).eq("autor", "admin").eq("lida", False).execute()
        )
        return r.count or 0
    except Exception:
        return 0


def suporte_admin_threads() -> list[dict]:
    """Caixa de entrada do admin: uma linha por cliente, mais recente primeiro."""
    db = get_db()
    msgs = db.table("suporte_mensagens").select(_SUP_COLS).execute().data or []
    msgs.sort(key=lambda m: m.get("created_at") or "", reverse=True)
    # `clientes` NÃO tem coluna email — o email vem do Auth/GoTrue (igual à tela Empresas).
    clientes = {c["id"]: c for c in (db.table("clientes").select("id, nome, auth_user_id").execute().data or [])}
    emails = _mapa_emails()  # auth_user_id -> email
    threads: dict[str, dict] = {}
    for m in msgs:  # desc -> a 1ª de cada cliente é a mais recente
        cid = m.get("cliente_id")
        if not cid:
            continue
        c = clientes.get(cid) or {}
        t = threads.setdefault(cid, {
            "cliente_id": cid,
            "nome": c.get("nome"),
            "email": emails.get(c.get("auth_user_id")),
            "ultima": m.get("mensagem"),
            "ultima_em": m.get("created_at"),
            "nao_lidas": 0,
        })
        if m.get("autor") == "cliente" and not m.get("lida"):
            t["nao_lidas"] += 1
    return list(threads.values())


def suporte_admin_listar(cliente_id: str) -> list[dict]:
    """Mensagens de um cliente (admin) + marca as do cliente como lidas."""
    db = get_db()
    msgs = db.table("suporte_mensagens").select(_SUP_COLS).eq("cliente_id", cliente_id).execute().data or []
    msgs.sort(key=lambda m: m.get("created_at") or "")
    try:
        db.table("suporte_mensagens").update({"lida": True}) \
            .eq("cliente_id", cliente_id).eq("autor", "cliente").eq("lida", False).execute()
    except Exception:
        pass
    return msgs


def suporte_admin_responder(cliente_id: str, mensagem: str) -> dict:
    """O admin responde a um cliente."""
    return get_db().table("suporte_mensagens").insert(
        {"cliente_id": cliente_id, "autor": "admin", "mensagem": mensagem}
    ).execute().data[0]


# ===================== Blog (CMS do superadmin) =====================
def _slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", (s or "").lower().strip()).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:80] or "artigo"


def _blog_slug_unico(base: str, ignorar_id: str | None = None) -> str:
    db = get_db()
    slug, i = base, 2
    while True:
        rows = [r for r in db.table("blog_posts").select("id").eq("slug", slug).execute().data
                if r["id"] != ignorar_id]
        if not rows:
            return slug
        slug, i = f"{base}-{i}", i + 1


def blog_listar_publicos() -> list[dict]:
    """Artigos publicados (para a página de vendas /blog), mais recentes primeiro."""
    return (
        get_db().table("blog_posts")
        .select("slug, titulo, resumo, capa_url, created_at")
        .eq("publicado", True).order("created_at", desc=True).execute().data
    )


def blog_obter_publico(slug: str) -> dict | None:
    rows = get_db().table("blog_posts").select("*").eq("slug", slug).eq("publicado", True).limit(1).execute().data
    return rows[0] if rows else None


def blog_admin_listar() -> list[dict]:
    return get_db().table("blog_posts").select("*").order("created_at", desc=True).execute().data


def blog_admin_criar(payload: dict) -> dict:
    titulo = (payload.get("titulo") or "Sem título").strip()
    base = _slugify(payload.get("slug") or titulo)
    row = {
        "titulo": titulo,
        "slug": _blog_slug_unico(base),
        "resumo": payload.get("resumo"),
        "meta_description": payload.get("meta_description"),
        "conteudo": payload.get("conteudo") or "",
        "capa_url": payload.get("capa_url"),
        "publicado": bool(payload.get("publicado")),
    }
    return get_db().table("blog_posts").insert(row).execute().data[0]


def blog_admin_atualizar(post_id: str, payload: dict) -> dict | None:
    fields = dict(payload)
    # Só muda o slug se o admin enviar um explicitamente (mantém URLs estáveis p/ SEO).
    if fields.get("slug"):
        fields["slug"] = _blog_slug_unico(_slugify(fields["slug"]), ignorar_id=post_id)
    else:
        fields.pop("slug", None)
    fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = get_db().table("blog_posts").update(fields).eq("id", post_id).execute()
    return res.data[0] if res.data else None


def blog_admin_apagar(post_id: str) -> None:
    get_db().table("blog_posts").delete().eq("id", post_id).execute()


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

    out, uso = llm.gerar_relatorio(
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
    consumir_creditos(cliente["id"], pricing.creditos_de_custo(uso.custo_usd, minimo=CREDITOS_BI), "bi", uso=uso)
    return rel


# ===================== Diretoria Growth (menu privado do superadmin) =====================
_GROWTH_COLS = "id, cliente_id, titulo, conteudo, status, agendado_para, origem, created_at, updated_at"


def growth_config(cliente_id: str) -> dict:
    """Lê (ou cria) a config da diretoria do superadmin."""
    db = get_db()
    rows = db.table("growth_config").select("*").eq("cliente_id", cliente_id).limit(1).execute().data
    if rows:
        return rows[0]
    novo = {"cliente_id": cliente_id, "modo_aprovacao": "manual", "linkedin_conectado": False}
    try:
        return db.table("growth_config").insert(novo).execute().data[0]
    except Exception:
        return novo  # migração 032 ainda não corrida — devolve default sem persistir


def growth_set_config(cliente_id: str, patch: dict) -> dict:
    db = get_db()
    growth_config(cliente_id)  # garante a linha
    patch = {**patch, "updated_at": datetime.now(timezone.utc).isoformat()}
    db.table("growth_config").update(patch).eq("cliente_id", cliente_id).execute()
    return growth_config(cliente_id)


def growth_comando(cliente_id: str, objetivo: str) -> dict:
    """CEO planeja → diretores executam → CEO consolida (tudo de uma vez). Loga o consumo."""
    resultado, uso = growth.orquestrar(objetivo)
    consumir_creditos(cliente_id, pricing.creditos_de_custo(uso.custo_usd, minimo=1), "growth", uso=uso)
    return resultado


# --- Etapas separadas: a UI as encadeia p/ mostrar o fluxo de trabalho ao vivo ---
def growth_plano(cliente_id: str, objetivo: str) -> dict:
    """Etapa 1: o CEO faz a leitura estratégica e escolhe os diretores."""
    plano, uso = growth.planear(objetivo)
    consumir_creditos(cliente_id, pricing.creditos_de_custo(uso.custo_usd, minimo=1), "growth", uso=uso)
    diretivas = [
        {"diretor": d.diretor, "diretor_nome": growth.NOMES.get(d.diretor, d.diretor), "foco": d.foco}
        for d in plano.diretivas
        if d.diretor in growth.GROWTH_DIRETORES
    ]
    return {"leitura_estrategica": plano.leitura_estrategica, "diretivas": diretivas}


def growth_diretor(cliente_id: str, diretor: str, foco: str, objetivo: str) -> dict:
    """Etapa 2: um diretor entrega o que o CEO pediu."""
    if diretor not in growth.GROWTH_DIRETORES:
        raise ValueError("Diretor inválido.")
    conteudo, uso = growth.executar_diretor(diretor, foco, objetivo)
    consumir_creditos(cliente_id, pricing.creditos_de_custo(uso.custo_usd, minimo=1), "growth", uso=uso)
    return {"conteudo": conteudo}


def growth_sintese(cliente_id: str, objetivo: str, entregaveis: list[dict]) -> dict:
    """Etapa 3: o CEO consolida tudo num briefing executivo."""
    briefing, uso = growth.sintetizar(objetivo, entregaveis)
    consumir_creditos(cliente_id, pricing.creditos_de_custo(uso.custo_usd, minimo=1), "growth", uso=uso)
    return {"briefing": briefing}


# --- Planejamentos salvos (histórico da Sala de Comando) ---
_BRIEFING_COLS = "id, objetivo, leitura_estrategica, entregaveis, briefing, created_at"


def growth_salvar_briefing(cliente_id: str, data: dict) -> dict:
    row = {
        "cliente_id": cliente_id,
        "objetivo": data.get("objetivo", ""),
        "leitura_estrategica": data.get("leitura_estrategica", ""),
        "entregaveis": data.get("entregaveis", []),
        "briefing": data.get("briefing", ""),
    }
    return get_db().table("growth_briefings").insert(row).execute().data[0]


def growth_listar_briefings(cliente_id: str) -> list[dict]:
    db = get_db()
    rows = db.table("growth_briefings").select(_BRIEFING_COLS).eq("cliente_id", cliente_id).execute().data or []
    rows.sort(key=lambda r: r.get("created_at") or "", reverse=True)
    return rows


def growth_apagar_briefing(cliente_id: str, briefing_id: str) -> None:
    get_db().table("growth_briefings").delete().eq("id", briefing_id).eq("cliente_id", cliente_id).execute()


def growth_chat(cliente_id: str, agente: str, mensagens: list[dict]) -> dict:
    """Chat direto com um agente da diretoria (ex.: Coach de Vendas)."""
    resposta, uso = growth.conversar(agente, mensagens)
    consumir_creditos(cliente_id, pricing.creditos_de_custo(uso.custo_usd, minimo=1), "growth", uso=uso)
    return {"resposta": resposta}


def growth_gerar_posts(cliente_id: str, tema: str, quantidade: int = 3, tom: str = "") -> list[dict]:
    """Ghostwriter gera posts e salva como rascunhos na fila de aprovação."""
    posts, uso = growth.gerar_posts(tema, quantidade, tom)
    consumir_creditos(cliente_id, pricing.creditos_de_custo(uso.custo_usd, minimo=1), "growth", uso=uso)
    db = get_db()
    salvos: list[dict] = []
    for p in posts:
        row = {
            "cliente_id": cliente_id,
            "titulo": p.titulo,
            "conteudo": p.conteudo,
            "status": "rascunho",
            "origem": tema[:500],
        }
        salvos.append(db.table("growth_posts").insert(row).execute().data[0])
    return salvos


def growth_listar_posts(cliente_id: str) -> list[dict]:
    db = get_db()
    rows = db.table("growth_posts").select(_GROWTH_COLS).eq("cliente_id", cliente_id).execute().data or []
    rows.sort(key=lambda r: r.get("created_at") or "", reverse=True)
    return rows


def growth_atualizar_post(cliente_id: str, post_id: str, patch: dict) -> dict | None:
    if not patch:
        return _growth_post(cliente_id, post_id)
    db = get_db()
    patch = {**patch, "updated_at": datetime.now(timezone.utc).isoformat()}
    db.table("growth_posts").update(patch).eq("id", post_id).eq("cliente_id", cliente_id).execute()
    return _growth_post(cliente_id, post_id)


def growth_apagar_post(cliente_id: str, post_id: str) -> None:
    get_db().table("growth_posts").delete().eq("id", post_id).eq("cliente_id", cliente_id).execute()


def _growth_post(cliente_id: str, post_id: str) -> dict | None:
    rows = (
        get_db().table("growth_posts").select(_GROWTH_COLS)
        .eq("id", post_id).eq("cliente_id", cliente_id).limit(1).execute().data
    )
    return rows[0] if rows else None
