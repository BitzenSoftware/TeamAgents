"""TeamAgents API — FastAPI.

Fluxo crítico do WhatsApp (passo 3 do plano):
o webhook salva o mínimo, agenda a tarefa em background e devolve 200 OK em
< 2s. O agente (que pode demorar) corre DEPOIS, fora da request.
"""
import json

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, Header, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from postgrest.exceptions import APIError

from . import anexos, auth, billing, evolution, flow
from .config import get_settings
from .schemas import (
    AgendamentoConfigUpdate,
    AgendamentoCreate,
    AgendamentoUpdate,
    ASSISTENTES,
    AssistenteChatRequest,
    AusenciaCreate,
    CampanhaUpdate,
    DepartamentoCreate,
    DepartamentoUpdate,
    EmpresaAgentesUpdate,
    ProjetoChatRequest,
    ProjetoCreate,
    ProjetoRelatorioCreate,
    ProjetoRelatorioUpdate,
    ProjetoUpdate,
    CheckoutRequest,
    CompraPacoteRequest,
    ProfissionalCreate,
    ProfissionalUpdate,
    ServicoCreate,
    ServicoUpdate,
    BlogPostCreate,
    BlogPostUpdate,
    ConcederCreditosRequest,
    ConfigUpdate,
    CopyRequest,
    EmailSyncRequest,
    ExecutivoRequest,
    GROWTH_AGENTES_CHAT,
    GrowthChatRequest,
    GrowthBriefingSave,
    GrowthComandoRequest,
    GrowthConfigUpdate,
    GrowthDiretorRequest,
    GrowthPostsRequest,
    GrowthPostUpdate,
    GrowthRefinarRequest,
    GrowthSinteseRequest,
    MembroCreate,
    MembroUpdate,
    HabilidadeCreate,
    HabilidadeUpdate,
    OAuthGoogleExchange,
    OnboardingPayload,
    PacoteCreate,
    PacoteUpdate,
    PlanoCreate,
    PlanoUpdate,
    OAuthFacebookExchange,
    SocialConfigUpdate,
    SocialPostRequest,
    SuporteMensagem,
    TarefaExecutivoCreate,
    TarefaExecutivoUpdate,
    TokenExchangeRequest,
)

app = FastAPI(title="TeamAgents API", version="0.1.0")

_origins = [o.strip() for o in get_settings().allowed_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/planos/publicos")
def planos_publicos(moeda: str = "brl") -> list[dict]:
    """Planos ativos para a landing page (público — sem dados sensíveis).

    ?moeda=usd → planos do mercado US; default 'brl'.
    """
    return flow.listar_planos_publicos(moeda=moeda)


# ===================== Identidade do tenant autenticado =====================
@app.get("/me")
def me(authorization: str | None = Header(default=None)) -> dict:
    """Devolve a empresa do utilizador (dono OU membro convidado), com papel e
    permissões. 404 só quando não é dono nem membro (precisa de onboarding)."""
    u = auth._fetch_user(authorization)
    cliente = auth.cliente_do_user(u["id"])
    if cliente:
        return {**cliente, "papel": "owner", "permissoes": None, "departamento_ids": None}
    m = auth._membro_por_email(u.get("email"))
    if m:
        if not m.get("auth_user_id"):
            auth._link_membro(m["id"], u["id"])
        empresa = auth.cliente_por_id(m["cliente_id"])
        if not empresa:
            raise HTTPException(status_code=404, detail="Empresa não encontrada.")
        return {**empresa, "papel": "membro",
                "permissoes": m.get("permissoes") or [],
                "departamento_ids": m.get("departamento_ids") or []}
    raise HTTPException(status_code=404, detail="Sem cliente — necessário onboarding.")


# ===================== Configurações (ler/editar config do tenant) =====================
@app.get("/me/config")
def get_config(cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    """Config do tenant autenticado."""
    cfg = flow.get_config_by_cliente(cliente_id)
    if not cfg:
        raise HTTPException(status_code=404, detail="Sem configuração.")
    return cfg


@app.patch("/me/config")
def update_config(payload: ConfigUpdate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    """Atualiza a config do tenant (só os campos enviados)."""
    try:
        updated = flow.update_config(cliente_id, payload.model_dump(exclude_none=True))
    except APIError as e:
        if e.code == "23505":  # instância em uso por outro cliente
            raise HTTPException(status_code=400, detail="Esta instância do WhatsApp já está em uso.")
        raise HTTPException(status_code=500, detail=f"Falha ao atualizar: {e.message}")
    if not updated:
        raise HTTPException(status_code=404, detail="Sem configuração para atualizar.")
    return updated


# ===================== WhatsApp gerido (QR Code, 1 clique) =====================
@app.get("/me/whatsapp/estado")
def whatsapp_estado(cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    return flow.whatsapp_estado(cliente_id)


@app.get("/me/whatsapp/qr")
def whatsapp_qr(cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    return flow.whatsapp_qr(cliente_id)


@app.post("/me/whatsapp/conectar")
def whatsapp_conectar(cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    try:
        return flow.whatsapp_conectar(cliente_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/me/whatsapp/desligar")
def whatsapp_desligar(cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    return flow.whatsapp_desligar(cliente_id)


# ===================== Planos (apenas superadmin) =====================
@app.get("/admin/planos")
def listar_planos(_: str = Depends(auth.require_superadmin)) -> list[dict]:
    return flow.listar_planos()


@app.post("/admin/planos", status_code=201)
def criar_plano(payload: PlanoCreate, _: str = Depends(auth.require_superadmin)) -> dict:
    return flow.criar_plano(payload.model_dump())


@app.patch("/admin/planos/{pid}")
def atualizar_plano(pid: str, payload: PlanoUpdate, _: str = Depends(auth.require_superadmin)) -> dict:
    updated = flow.atualizar_plano(pid, payload.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Plano não encontrado.")
    return updated


@app.delete("/admin/planos/{pid}", status_code=204)
def apagar_plano(pid: str, _: str = Depends(auth.require_superadmin)) -> None:
    flow.apagar_plano(pid)


@app.post("/admin/planos/{pid}/stripe")
def registar_plano_stripe(pid: str, _: str = Depends(auth.require_superadmin)) -> dict:
    """Cria/recria o Produto + Preço recorrente na Stripe e guarda o price_id."""
    planos = [p for p in flow.listar_planos() if p["id"] == pid]
    if not planos:
        raise HTTPException(status_code=404, detail="Plano não encontrado.")
    try:
        return billing.criar_preco_para_plano(planos[0])
    except billing.StripeNaoConfigurada as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:  # erros da API Stripe
        raise HTTPException(status_code=400, detail=f"Falha na Stripe: {e}")


# ===================== Pacotes de créditos avulsos (admin) =====================
@app.get("/admin/pacotes")
def listar_pacotes(_: str = Depends(auth.require_superadmin)) -> list[dict]:
    return flow.listar_pacotes()


@app.post("/admin/pacotes", status_code=201)
def criar_pacote(payload: PacoteCreate, _: str = Depends(auth.require_superadmin)) -> dict:
    return flow.criar_pacote(payload.model_dump())


@app.patch("/admin/pacotes/{pid}")
def atualizar_pacote(pid: str, payload: PacoteUpdate, _: str = Depends(auth.require_superadmin)) -> dict:
    updated = flow.atualizar_pacote(pid, payload.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Pacote não encontrado.")
    return updated


@app.delete("/admin/pacotes/{pid}", status_code=204)
def apagar_pacote(pid: str, _: str = Depends(auth.require_superadmin)) -> None:
    flow.apagar_pacote(pid)


# ===================== Painel do superadmin: Empresas =====================
@app.get("/admin/empresas")
def admin_empresas(_: str = Depends(auth.require_superadmin)) -> list[dict]:
    """Cadastro de todas as empresas (clientes) com plano, email e consumo do mês."""
    return flow.admin_empresas()


@app.get("/admin/empresas/consumo")
def admin_empresas_consumo(de: str, ate: str, _: str = Depends(auth.require_superadmin)) -> list[dict]:
    """Consumo de tokens por empresa no intervalo [de, ate]."""
    return flow.admin_empresas_consumo(de, ate)


@app.post("/admin/empresas/{cliente_id}/creditos")
def admin_conceder_creditos(cliente_id: str, payload: ConcederCreditosRequest, _: str = Depends(auth.require_superadmin)) -> dict:
    """Concede créditos de cortesia (avulsos) a uma empresa — acumulativo."""
    return flow.admin_conceder_creditos(cliente_id, payload.creditos)


@app.get("/admin/dashboards")
def admin_dashboards(de: str, ate: str, gran: str = "mes", _: str = Depends(auth.require_superadmin)) -> dict:
    """Séries agregadas (todas as empresas): consumo, faturamento e crescimento."""
    return flow.admin_dashboard(de, ate, gran)


@app.post("/admin/pacotes/{pid}/stripe")
def registar_pacote_stripe(pid: str, _: str = Depends(auth.require_superadmin)) -> dict:
    """Cria/recria o Produto + Preço de compra única na Stripe e guarda o price_id."""
    pacotes = [p for p in flow.listar_pacotes() if p["id"] == pid]
    if not pacotes:
        raise HTTPException(status_code=404, detail="Pacote não encontrado.")
    try:
        return billing.criar_preco_para_pacote(pacotes[0])
    except billing.StripeNaoConfigurada as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Falha na Stripe: {e}")


# ===================== Stripe: assinaturas do cliente =====================
@app.post("/me/checkout")
def criar_checkout(req: CheckoutRequest, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    """Abre uma sessão de Checkout (assinar plano) e devolve a URL de redirect."""
    try:
        return {"url": billing.criar_checkout(cliente_id, req.plano_id)}
    except billing.StripeNaoConfigurada as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/me/mudar-plano")
def mudar_plano(req: CheckoutRequest, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    """Upgrade/downgrade de uma assinatura existente (sem novo checkout)."""
    try:
        return billing.mudar_plano(cliente_id, req.plano_id)
    except billing.StripeNaoConfigurada as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/me/portal")
def criar_portal(cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    """Abre o Portal de Faturação da Stripe (gerir/cancelar) e devolve a URL."""
    try:
        return {"url": billing.criar_portal(cliente_id)}
    except billing.StripeNaoConfigurada as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/me/cancelar-assinatura")
def cancelar_assinatura(cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    """Cancela a assinatura no fim do período pago (sem ir ao painel da Stripe)."""
    try:
        return billing.cancelar_assinatura(cliente_id)
    except billing.StripeNaoConfigurada as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/me/reativar-assinatura")
def reativar_assinatura(cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    """Anula um cancelamento agendado — a assinatura volta a renovar."""
    try:
        return billing.reativar_assinatura(cliente_id)
    except billing.StripeNaoConfigurada as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/me/pacotes")
def listar_pacotes_ativos(moeda: str = "brl", _: str = Depends(auth.current_cliente_id)) -> list[dict]:
    """Pacotes de créditos avulsos disponíveis para compra (filtrados por moeda)."""
    return flow.listar_pacotes_ativos(moeda)


@app.post("/me/comprar-creditos")
def comprar_creditos(req: CompraPacoteRequest, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    """Abre o Checkout (compra única) de um pacote de créditos e devolve a URL."""
    try:
        return {"url": billing.criar_checkout_pacote(cliente_id, req.pacote_id)}
    except billing.StripeNaoConfigurada as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/webhook/stripe")
async def webhook_stripe(request: Request, stripe_signature: str = Header(default="")) -> dict:
    """Recebe eventos da Stripe (pagamento/renovação/cancelamento)."""
    payload = await request.body()
    try:
        return billing.tratar_evento(payload, stripe_signature)
    except billing.StripeNaoConfigurada as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ===================== Onboarding (criar tenant, autenticado) =====================
@app.post("/api/v1/onboarding", status_code=201)
def onboarding(payload: OnboardingPayload, user_id: str = Depends(auth.verify_user)) -> dict:
    """Cria cliente (ligado ao utilizador) + workspace_config de forma atómica."""
    try:
        created = flow.onboard_tenant(user_id, payload)
    except APIError as e:
        if e.code == "23505":  # unique_violation — distinguir a constraint
            msg = (e.message or "").lower()
            if "auth_user" in msg:
                raise HTTPException(status_code=409, detail="Este utilizador já tem um cliente.")
            if "instance" in msg:
                raise HTTPException(
                    status_code=400,
                    detail="Esta instância do WhatsApp já está registada no sistema.",
                )
        raise HTTPException(status_code=500, detail=f"Falha no onboarding: {e.message}")
    return {
        "message": "Onboarding concluído com sucesso!",
        "cliente_id": created["cliente_id"],
        "workspace_config_id": created["workspace_config_id"],
    }


# ===================== Habilidades (base de conhecimento) =====================
@app.get("/me/habilidades")
def listar_habilidades(cliente_id: str = Depends(auth.current_cliente_id)) -> list[dict]:
    return flow.listar_habilidades(cliente_id)


@app.post("/me/habilidades", status_code=201)
def criar_habilidade(payload: HabilidadeCreate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    return flow.criar_habilidade(cliente_id, payload.titulo, payload.conteudo, payload.agente.value)


@app.patch("/me/habilidades/{hid}")
def atualizar_habilidade(
    hid: str, payload: HabilidadeUpdate, cliente_id: str = Depends(auth.current_cliente_id)
) -> dict:
    updated = flow.atualizar_habilidade(cliente_id, hid, payload.model_dump(exclude_none=True, mode="json"))
    if not updated:
        raise HTTPException(status_code=404, detail="Habilidade não encontrada.")
    return updated


@app.delete("/me/habilidades/{hid}", status_code=204)
def apagar_habilidade(hid: str, cliente_id: str = Depends(auth.current_cliente_id)) -> None:
    flow.apagar_habilidade(cliente_id, hid)


# ===================== Agente Executivo (Email & Atas) =====================
@app.get("/me/executivo")
def listar_processamentos(cliente_id: str = Depends(auth.current_cliente_id)) -> list[dict]:
    return flow.listar_processamentos(cliente_id)


@app.post("/me/executivo", status_code=201)
def processar_executivo(req: ExecutivoRequest, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    """Processa email(s)/ata(s): orquestrador (Opus) + workers (Haiku) em paralelo."""
    try:
        return flow.processar_executivo(cliente_id, req)
    except flow.LimiteCreditosError as e:
        raise HTTPException(status_code=402, detail=str(e))


@app.delete("/me/executivo", status_code=200)
def apagar_todos_processamentos(cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    """Apaga TODOS os processamentos do tenant autenticado (também na BD)."""
    return {"apagados": flow.apagar_todos_processamentos(cliente_id)}


@app.delete("/me/executivo/{pid}", status_code=204)
def apagar_processamento(pid: str, cliente_id: str = Depends(auth.current_cliente_id)) -> None:
    flow.apagar_processamento(cliente_id, pid)


# ----- Tarefas dirigidas do Agente Executivo -----
@app.get("/me/executivo/tarefas")
def listar_tarefas_executivo(cliente_id: str = Depends(auth.current_cliente_id)) -> list[dict]:
    return flow.listar_tarefas_executivo(cliente_id)


@app.post("/me/executivo/tarefas", status_code=201)
def criar_tarefa_executivo(req: TarefaExecutivoCreate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    return flow.criar_tarefa_executivo(cliente_id, req.model_dump())


@app.patch("/me/executivo/tarefas/{tid}")
def atualizar_tarefa_executivo(tid: str, req: TarefaExecutivoUpdate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    res = flow.atualizar_tarefa_executivo(cliente_id, tid, req.model_dump(exclude_none=True))
    if res is None:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada.")
    return res


@app.delete("/me/executivo/tarefas/{tid}", status_code=204)
def apagar_tarefa_executivo(tid: str, cliente_id: str = Depends(auth.current_cliente_id)) -> None:
    flow.apagar_tarefa_executivo(cliente_id, tid)


# ===================== Fase 2: integração de email (OAuth Gmail) =====================
@app.get("/me/email-accounts")
def listar_email_accounts(cliente_id: str = Depends(auth.current_cliente_id)) -> list[dict]:
    return flow.listar_email_accounts(cliente_id)


@app.post("/oauth/google/exchange", status_code=201)
def oauth_google_exchange(req: OAuthGoogleExchange, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    try:
        return flow.oauth_google_exchange(cliente_id, req.code, req.redirect_uri)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/me/email/sync")
def sincronizar_email(req: EmailSyncRequest, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    try:
        return flow.sincronizar_email(cliente_id, req.provider, tarefa_ids=req.tarefa_ids)
    except flow.LimiteCreditosError as e:
        raise HTTPException(status_code=402, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/me/email-accounts/{provider}", status_code=204)
def desligar_email_account(provider: str, cliente_id: str = Depends(auth.current_cliente_id)) -> None:
    flow.desligar_email_account(cliente_id, provider)


# ===================== Agente 1: criar campanha (autenticado) =====================
@app.post("/campanhas")
def criar_campanha(req: CopyRequest, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    """Gera os 2 anúncios + metadata e persiste a campanha do tenant autenticado."""
    try:
        return flow.criar_campanha(cliente_id, req)
    except flow.LimiteCreditosError as e:
        raise HTTPException(status_code=402, detail=str(e))


# ===================== Agente 2: webhook WhatsApp (async) =====================
@app.post("/webhook/whatsapp")
async def webhook_whatsapp(payload: dict, bg: BackgroundTasks) -> dict:
    """Recebe o payload CRU da Evolution API, normaliza e agenda o processamento.

    Responde 200 OK imediatamente (o agente corre em background). Mensagens que
    devem ser ignoradas (nossas, de grupos, sem texto) são descartadas no parser.
    """
    msg = evolution.parse_webhook(payload)
    if msg is None:
        return {"status": "ignored"}  # 200 OK na mesma — não reenfileira
    bg.add_task(flow.processar_mensagem_lead, msg.instance, msg.whatsapp, msg.text, msg.nome)
    return {"status": "accepted"}  # 200 OK imediato


@app.get("/webhook/whatsapp")
def verify_webhook(token: str = Query(default="")) -> dict:
    """Verificação de subscrição (alguns providers exigem um GET de handshake)."""
    s = get_settings()
    if s.webhook_verify_token and token != s.webhook_verify_token:
        raise HTTPException(status_code=403, detail="invalid verify token")
    return {"status": "verified"}


# ===================== Listagens (frontend) — cliente vem do TOKEN =====================
@app.get("/me/campanhas")
def listar_campanhas(cliente_id: str = Depends(auth.current_cliente_id)) -> list[dict]:
    """Campanhas do tenant autenticado (mais recentes primeiro)."""
    return flow.listar_campanhas(cliente_id)


@app.get("/me/consumo")
def get_consumo(cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    """Consumo de créditos do mês atual vs o limite do plano (para os cards)."""
    return flow.get_consumo(cliente_id)


@app.get("/me/planos")
def listar_planos_ativos(moeda: str = "brl", _: str = Depends(auth.current_cliente_id)) -> list[dict]:
    """Planos ativos disponíveis para o cliente assinar (filtrados por moeda)."""
    return flow.listar_planos_ativos(moeda)


@app.get("/me/consumo/dashboard")
def consumo_dashboard(
    de: str, ate: str, gran: str = "dia", cliente_id: str = Depends(auth.current_cliente_id)
) -> dict:
    """Séries de consumo (bucket dia/semana/mes) + repartição por origem, no intervalo [de, ate]."""
    return flow.consumo_dashboard(cliente_id, de, ate, gran)


@app.patch("/me/campanhas/{cid}")
def atualizar_campanha(cid: str, payload: CampanhaUpdate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    """Edita uma campanha do tenant autenticado (nome, anúncios, palavra-chave)."""
    res = flow.atualizar_campanha(cliente_id, cid, payload.model_dump(exclude_none=True))
    if res is None:
        raise HTTPException(status_code=404, detail="Campanha não encontrada.")
    return res


@app.delete("/me/campanhas/{cid}", status_code=204)
def apagar_campanha(cid: str, cliente_id: str = Depends(auth.current_cliente_id)) -> None:
    """Apaga uma campanha do tenant autenticado."""
    flow.apagar_campanha(cliente_id, cid)


@app.get("/me/relatorios")
def listar_relatorios(cliente_id: str = Depends(auth.current_cliente_id)) -> list[dict]:
    """Relatórios de BI do tenant autenticado (mais recentes primeiro)."""
    return flow.listar_relatorios(cliente_id)


@app.get("/me/leads")
def listar_leads(cliente_id: str = Depends(auth.current_cliente_id)) -> list[dict]:
    """Leads do tenant autenticado."""
    return flow.listar_leads(cliente_id)


@app.get("/me/leads/{lead_id}/conversas")
def listar_conversas(lead_id: str, cliente_id: str = Depends(auth.current_cliente_id)) -> list[dict]:
    """Histórico de um lead — só devolve se o lead for do tenant autenticado."""
    return flow.listar_conversas(cliente_id, lead_id)


@app.post("/me/leads/{lead_id}/reativar-ia")
def reativar_ia_lead(lead_id: str, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    """Reativa o SDR num contato que tinha sido transferido para humano."""
    return flow.reativar_ia_lead(cliente_id, lead_id)


@app.post("/me/calcom/verificar")
def verificar_calcom(cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    """Valida a ligação Cal.com do tenant (API key + Event Type ID já salvos)."""
    return flow.verificar_calcom(cliente_id)


# ===================== Suporte (chat cliente <-> admin) =====================
@app.get("/me/suporte")
def suporte_listar(cliente_id: str = Depends(auth.current_cliente_id)) -> list[dict]:
    """Conversa de suporte do tenant autenticado (marca respostas do admin como lidas)."""
    return flow.suporte_listar(cliente_id)


@app.post("/me/suporte", status_code=201)
def suporte_enviar(payload: SuporteMensagem, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    """O cliente envia uma mensagem ao suporte."""
    return flow.suporte_enviar(cliente_id, payload.mensagem)


@app.get("/me/suporte/nao-lidas")
def suporte_nao_lidas(cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    """Nº de respostas do suporte ainda não vistas (badge no menu)."""
    return {"n": flow.suporte_nao_lidas(cliente_id)}


@app.get("/admin/suporte")
def admin_suporte_threads(_: str = Depends(auth.require_superadmin)) -> list[dict]:
    """Caixa de entrada do admin: uma linha por cliente."""
    return flow.suporte_admin_threads()




@app.get("/admin/suporte/{cliente_id}")
def admin_suporte_listar(cliente_id: str, _: str = Depends(auth.require_superadmin)) -> list[dict]:
    """Conversa de um cliente (admin) — marca as mensagens do cliente como lidas."""
    return flow.suporte_admin_listar(cliente_id)


@app.post("/admin/suporte/{cliente_id}", status_code=201)
def admin_suporte_responder(cliente_id: str, payload: SuporteMensagem, _: str = Depends(auth.require_superadmin)) -> dict:
    """O admin responde a um cliente."""
    return flow.suporte_admin_responder(cliente_id, payload.mensagem)


# ===================== Blog (público + admin/CMS) =====================
@app.get("/blog/publicos")
def blog_publicos() -> list[dict]:
    """Artigos publicados (página de vendas). Público, sem auth."""
    return flow.blog_listar_publicos()


@app.get("/blog/publicos/{slug}")
def blog_publico(slug: str) -> dict:
    """Um artigo publicado pelo slug. Público, sem auth."""
    post = flow.blog_obter_publico(slug)
    if not post:
        raise HTTPException(status_code=404, detail="Artigo não encontrado.")
    return post


@app.get("/admin/blog")
def admin_blog_listar(_: str = Depends(auth.require_superadmin)) -> list[dict]:
    return flow.blog_admin_listar()


@app.post("/admin/blog", status_code=201)
def admin_blog_criar(payload: BlogPostCreate, _: str = Depends(auth.require_superadmin)) -> dict:
    return flow.blog_admin_criar(payload.model_dump(exclude_none=True))


@app.patch("/admin/blog/{post_id}")
def admin_blog_atualizar(post_id: str, payload: BlogPostUpdate, _: str = Depends(auth.require_superadmin)) -> dict:
    res = flow.blog_admin_atualizar(post_id, payload.model_dump(exclude_none=True))
    if not res:
        raise HTTPException(status_code=404, detail="Artigo não encontrado.")
    return res


@app.delete("/admin/blog/{post_id}", status_code=204)
def admin_blog_apagar(post_id: str, _: str = Depends(auth.require_superadmin)) -> None:
    flow.blog_admin_apagar(post_id)


# ===================== Diretoria Growth (menu privado do superadmin) =====================
@app.get("/growth/config")
def growth_config(cliente_id: str = Depends(auth.superadmin_cliente_id)) -> dict:
    return flow.growth_config(cliente_id)


@app.patch("/growth/config")
def growth_set_config(payload: GrowthConfigUpdate, cliente_id: str = Depends(auth.superadmin_cliente_id)) -> dict:
    return flow.growth_set_config(cliente_id, payload.model_dump(exclude_none=True))


@app.post("/growth/comando")
def growth_comando(req: GrowthComandoRequest, cliente_id: str = Depends(auth.superadmin_cliente_id)) -> dict:
    """Sala de Comando (tudo de uma vez): o CEO planeja, aciona os diretores e devolve o briefing."""
    return flow.growth_comando(cliente_id, req.objetivo)


# Etapas separadas — a UI as encadeia para mostrar o fluxo de trabalho ao vivo.
@app.post("/growth/plano")
def growth_plano(req: GrowthComandoRequest, cliente_id: str = Depends(auth.superadmin_cliente_id)) -> dict:
    """Etapa 1: leitura estratégica do CEO + diretores escolhidos."""
    return flow.growth_plano(cliente_id, req.objetivo)


@app.post("/growth/diretor")
def growth_diretor(req: GrowthDiretorRequest, cliente_id: str = Depends(auth.superadmin_cliente_id)) -> dict:
    """Etapa 2: um diretor entrega sua parte."""
    try:
        return flow.growth_diretor(cliente_id, req.diretor, req.foco, req.objetivo)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/growth/sintese")
def growth_sintese(req: GrowthSinteseRequest, cliente_id: str = Depends(auth.superadmin_cliente_id)) -> dict:
    """Etapa 3: o CEO consolida os entregáveis num briefing executivo."""
    entregaveis = [e.model_dump() for e in req.entregaveis]
    return flow.growth_sintese(cliente_id, req.objetivo, entregaveis)


# Planejamentos salvos (histórico da Sala de Comando)
@app.get("/growth/briefings")
def growth_listar_briefings(cliente_id: str = Depends(auth.superadmin_cliente_id)) -> list[dict]:
    return flow.growth_listar_briefings(cliente_id)


@app.post("/growth/briefings", status_code=201)
def growth_salvar_briefing(req: GrowthBriefingSave, cliente_id: str = Depends(auth.superadmin_cliente_id)) -> dict:
    return flow.growth_salvar_briefing(cliente_id, req.model_dump())


@app.delete("/growth/briefings/{briefing_id}", status_code=204)
def growth_apagar_briefing(briefing_id: str, cliente_id: str = Depends(auth.superadmin_cliente_id)) -> None:
    flow.growth_apagar_briefing(cliente_id, briefing_id)


# ===================== Assistentes do cliente (chat) =====================
@app.post("/me/assistentes/chat")
async def assistente_chat(
    agente: str = Form(...),
    mensagens: str = Form(...),               # JSON: [{role, content}, ...]
    habilidade_ids: str | None = Form(None),  # JSON: ["id", ...] | null
    arquivos: list[UploadFile] = File(default=[]),
    cliente_id: str = Depends(auth.current_cliente_id),
) -> dict:
    """Chat do assistente (multipart): aceita 0+ anexos (PDF/CSV/Word/Excel)."""
    if agente not in ASSISTENTES:
        raise HTTPException(status_code=400, detail="Assistente inválido.")
    try:
        msgs = json.loads(mensagens)
        habs = json.loads(habilidade_ids) if habilidade_ids else None
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Payload inválido.")

    doc_blocks: list[dict] = []
    textos: list[str] = []
    for f in (arquivos or [])[: anexos.MAX_FILES]:
        data = await f.read()
        if not data:
            continue
        if len(data) > anexos.MAX_BYTES:
            raise HTTPException(status_code=413, detail=f"Arquivo '{f.filename}' excede 15 MB.")
        blocks, txt = anexos.processar_anexo(f.filename or "arquivo", data)
        doc_blocks.extend(blocks)
        if txt:
            textos.append(txt)

    try:
        return flow.assistente_chat(
            cliente_id, agente, msgs, habilidade_ids=habs,
            doc_blocks=doc_blocks, anexos_texto="\n\n".join(textos),
        )
    except flow.LimiteCreditosError as e:
        raise HTTPException(status_code=402, detail=str(e))


# ===================== Gestão (Empresa › Departamentos › Projetos) =====================
@app.get("/me/gestao/agentes")
def gestao_agentes_get(cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    """Agentes ativos da empresa + catálogo disponível (os 10)."""
    return {"ativos": flow.gestao_agentes_get(cliente_id), "disponiveis": list(ASSISTENTES)}


@app.put("/me/gestao/agentes")
def gestao_agentes_set(payload: EmpresaAgentesUpdate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    return {"ativos": flow.gestao_agentes_set(cliente_id, payload.agente_ids)}


# --- Departamentos ---
@app.get("/me/gestao/departamentos")
def departamentos_listar(ctx: dict = Depends(auth.contexto_acesso)) -> list[dict]:
    # Membro só vê os departamentos atribuídos; dono vê todos.
    apenas = None if ctx["papel"] == "owner" else (ctx.get("departamento_ids") or [])
    return flow.departamentos_listar(ctx["cliente_id"], apenas_ids=apenas)


@app.post("/me/gestao/departamentos", status_code=201)
def departamento_criar(payload: DepartamentoCreate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    return flow.departamento_criar(cliente_id, payload.nome, payload.agente_ids)


@app.patch("/me/gestao/departamentos/{dep_id}")
def departamento_atualizar(dep_id: str, payload: DepartamentoUpdate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    res = flow.departamento_atualizar(cliente_id, dep_id, payload.model_dump(exclude_unset=True))
    if not res:
        raise HTTPException(status_code=404, detail="Departamento não encontrado.")
    return res


@app.delete("/me/gestao/departamentos/{dep_id}", status_code=204)
def departamento_apagar(dep_id: str, cliente_id: str = Depends(auth.current_cliente_id)) -> None:
    flow.departamento_apagar(cliente_id, dep_id)


# --- Projetos ---
@app.get("/me/gestao/departamentos/{dep_id}/projetos")
def projetos_listar(dep_id: str, ctx: dict = Depends(auth.contexto_acesso)) -> list[dict]:
    # Membro só acessa projetos dos seus departamentos.
    if ctx["papel"] != "owner" and dep_id not in (ctx.get("departamento_ids") or []):
        return []
    return flow.projetos_listar(ctx["cliente_id"], dep_id)


@app.get("/me/gestao/projetos/{proj_id}")
def projeto_obter(proj_id: str, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    res = flow.projeto_obter(cliente_id, proj_id)
    if not res:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    return res


@app.post("/me/gestao/projetos", status_code=201)
def projeto_criar(payload: ProjetoCreate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    res = flow.projeto_criar(cliente_id, payload.departamento_id, payload.nome,
                             payload.descricao or "", payload.briefing or "", payload.agente_ids)
    if not res:
        raise HTTPException(status_code=404, detail="Departamento não encontrado.")
    return res


@app.patch("/me/gestao/projetos/{proj_id}")
def projeto_atualizar(proj_id: str, payload: ProjetoUpdate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    res = flow.projeto_atualizar(cliente_id, proj_id, payload.model_dump(exclude_unset=True))
    if not res:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    return res


@app.delete("/me/gestao/projetos/{proj_id}", status_code=204)
def projeto_apagar(proj_id: str, cliente_id: str = Depends(auth.current_cliente_id)) -> None:
    flow.projeto_apagar(cliente_id, proj_id)


# --- Documentos do projeto (contexto compartilhado) ---
@app.get("/me/gestao/projetos/{proj_id}/documentos")
def projeto_documentos_listar(proj_id: str, cliente_id: str = Depends(auth.current_cliente_id)) -> list[dict]:
    return flow.projeto_documentos_listar(cliente_id, proj_id)


@app.post("/me/gestao/projetos/{proj_id}/documentos", status_code=201)
async def projeto_documentos_add(
    proj_id: str,
    arquivos: list[UploadFile] = File(default=[]),
    cliente_id: str = Depends(auth.current_cliente_id),
) -> list[dict]:
    salvos: list[dict] = []
    for f in (arquivos or [])[: anexos.MAX_FILES]:
        data = await f.read()
        if not data:
            continue
        if len(data) > anexos.MAX_BYTES:
            raise HTTPException(status_code=413, detail=f"Arquivo '{f.filename}' excede 15 MB.")
        texto = anexos.extrair_texto(f.filename or "arquivo", data)
        doc = flow.projeto_documento_add(cliente_id, proj_id, f.filename or "arquivo", texto)
        if doc is None:
            raise HTTPException(status_code=404, detail="Projeto não encontrado.")
        salvos.append(doc)
    return salvos


@app.delete("/me/gestao/projetos/{proj_id}/documentos/{doc_id}", status_code=204)
def projeto_documento_apagar(proj_id: str, doc_id: str, cliente_id: str = Depends(auth.current_cliente_id)) -> None:
    flow.projeto_documento_apagar(cliente_id, proj_id, doc_id)


# --- Chat persistido por agente dentro do projeto ---
@app.get("/me/gestao/projetos/{proj_id}/mensagens")
def projeto_mensagens_listar(proj_id: str, agente: str, cliente_id: str = Depends(auth.current_cliente_id)) -> list[dict]:
    return flow.projeto_mensagens_listar(cliente_id, proj_id, agente)


@app.post("/me/gestao/projetos/{proj_id}/chat")
def projeto_chat(proj_id: str, req: ProjetoChatRequest, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    try:
        res = flow.projeto_chat(cliente_id, proj_id, req.agente, req.mensagem)
    except flow.LimiteCreditosError as e:
        raise HTTPException(status_code=402, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not res:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    return res


# --- Relatórios / planos de ação do projeto ---
@app.get("/me/gestao/projetos/{proj_id}/relatorios")
def projeto_relatorios_listar(proj_id: str, cliente_id: str = Depends(auth.current_cliente_id)) -> list[dict]:
    return flow.projeto_relatorios_listar(cliente_id, proj_id)


@app.post("/me/gestao/projetos/{proj_id}/relatorios", status_code=201)
def projeto_relatorio_add(proj_id: str, payload: ProjetoRelatorioCreate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    res = flow.projeto_relatorio_add(cliente_id, proj_id, payload.model_dump())
    if not res:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    return res


@app.patch("/me/gestao/projetos/{proj_id}/relatorios/{rel_id}")
def projeto_relatorio_atualizar(proj_id: str, rel_id: str, payload: ProjetoRelatorioUpdate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    res = flow.projeto_relatorio_atualizar(cliente_id, proj_id, rel_id, payload.model_dump(exclude_none=True))
    if not res:
        raise HTTPException(status_code=404, detail="Relatório não encontrado.")
    return res


@app.delete("/me/gestao/projetos/{proj_id}/relatorios/{rel_id}", status_code=204)
def projeto_relatorio_apagar(proj_id: str, rel_id: str, cliente_id: str = Depends(auth.current_cliente_id)) -> None:
    flow.projeto_relatorio_apagar(cliente_id, proj_id, rel_id)


# ===================== Utilizadores (membros da empresa) — só o dono =====================
@app.get("/me/membros")
def membros_listar(cliente_id: str = Depends(auth.owner_cliente_id)) -> list[dict]:
    return flow.membros_listar(cliente_id)


@app.post("/me/membros", status_code=201)
def membro_criar(payload: MembroCreate, cliente_id: str = Depends(auth.owner_cliente_id)) -> dict:
    try:
        return flow.membro_criar(cliente_id, payload.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.patch("/me/membros/{membro_id}")
def membro_atualizar(membro_id: str, payload: MembroUpdate, cliente_id: str = Depends(auth.owner_cliente_id)) -> dict:
    res = flow.membro_atualizar(cliente_id, membro_id, payload.model_dump(exclude_none=True))
    if not res:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return res


@app.delete("/me/membros/{membro_id}", status_code=204)
def membro_apagar(membro_id: str, cliente_id: str = Depends(auth.owner_cliente_id)) -> None:
    flow.membro_apagar(cliente_id, membro_id)


@app.post("/me/membros/{membro_id}/reenviar-convite")
def membro_reenviar(membro_id: str, cliente_id: str = Depends(auth.owner_cliente_id)) -> dict:
    return {"ok": flow.membro_reenviar_convite(cliente_id, membro_id)}


# ===================== Profissionais, Serviços e Agenda =====================
# --- Serviços ---
@app.get("/me/servicos")
def servicos_listar(cliente_id: str = Depends(auth.current_cliente_id)) -> list[dict]:
    return flow.servicos_listar(cliente_id)


@app.post("/me/servicos", status_code=201)
def servico_criar(payload: ServicoCreate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    return flow.servico_criar(cliente_id, payload.model_dump(exclude_none=True))


@app.patch("/me/servicos/{servico_id}")
def servico_atualizar(servico_id: str, payload: ServicoUpdate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    res = flow.servico_atualizar(cliente_id, servico_id, payload.model_dump(exclude_none=True))
    if not res:
        raise HTTPException(status_code=404, detail="Serviço não encontrado.")
    return res


@app.delete("/me/servicos/{servico_id}", status_code=204)
def servico_apagar(servico_id: str, cliente_id: str = Depends(auth.current_cliente_id)) -> None:
    flow.servico_apagar(cliente_id, servico_id)


# --- Profissionais ---
@app.get("/me/profissionais")
def profissionais_listar(cliente_id: str = Depends(auth.current_cliente_id)) -> list[dict]:
    return flow.profissionais_listar(cliente_id)


@app.post("/me/profissionais", status_code=201)
def profissional_criar(payload: ProfissionalCreate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    return flow.profissional_criar(cliente_id, payload.model_dump())


@app.patch("/me/profissionais/{prof_id}")
def profissional_atualizar(prof_id: str, payload: ProfissionalUpdate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    res = flow.profissional_atualizar(cliente_id, prof_id, payload.model_dump(exclude_unset=True))
    if not res:
        raise HTTPException(status_code=404, detail="Profissional não encontrado.")
    return res


@app.delete("/me/profissionais/{prof_id}", status_code=204)
def profissional_apagar(prof_id: str, cliente_id: str = Depends(auth.current_cliente_id)) -> None:
    flow.profissional_apagar(cliente_id, prof_id)


# --- Ausências (por profissional) ---
@app.get("/me/profissionais/{prof_id}/ausencias")
def ausencias_listar(prof_id: str, cliente_id: str = Depends(auth.current_cliente_id)) -> list[dict]:
    return flow.ausencias_listar(cliente_id, prof_id)


@app.post("/me/profissionais/{prof_id}/ausencias", status_code=201)
def ausencia_criar(prof_id: str, payload: AusenciaCreate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    res = flow.ausencia_criar(cliente_id, prof_id, payload.model_dump(exclude_none=True))
    if not res:
        raise HTTPException(status_code=404, detail="Profissional não encontrado.")
    return res


@app.delete("/me/profissionais/{prof_id}/ausencias/{ausencia_id}", status_code=204)
def ausencia_apagar(prof_id: str, ausencia_id: str, cliente_id: str = Depends(auth.current_cliente_id)) -> None:
    flow.ausencia_apagar(cliente_id, prof_id, ausencia_id)


# --- Disponibilidade (slots livres) ---
@app.get("/me/disponibilidade")
def disponibilidade(
    servico_id: str | None = None,
    profissional_id: str | None = None,
    cliente_id: str = Depends(auth.current_cliente_id),
) -> list[dict]:
    return flow.disponibilidade(cliente_id, servico_id=servico_id, profissional_id=profissional_id)


# --- Agendamentos ---
@app.get("/me/agendamentos")
def agendamentos_listar(
    de: str | None = None, ate: str | None = None, profissional_id: str | None = None,
    cliente_id: str = Depends(auth.current_cliente_id),
) -> list[dict]:
    return flow.agendamentos_listar(cliente_id, de=de, ate=ate, prof_id=profissional_id)


@app.post("/me/agendamentos", status_code=201)
def agendamento_criar(payload: AgendamentoCreate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    try:
        return flow.agendamento_criar(cliente_id, payload.model_dump(exclude_none=True))
    except flow.ConflitoAgendaError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.patch("/me/agendamentos/{agendamento_id}")
def agendamento_atualizar(agendamento_id: str, payload: AgendamentoUpdate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    try:
        res = flow.agendamento_atualizar(cliente_id, agendamento_id, payload.model_dump(exclude_none=True))
    except flow.ConflitoAgendaError as e:
        raise HTTPException(status_code=409, detail=str(e))
    if not res:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    return res


@app.delete("/me/agendamentos/{agendamento_id}", status_code=204)
def agendamento_apagar(agendamento_id: str, cliente_id: str = Depends(auth.current_cliente_id)) -> None:
    flow.agendamento_apagar(cliente_id, agendamento_id)


# --- Config de agendamento (Customizar Agendamento, global) ---
@app.get("/me/agendamento-config")
def agendamento_config_get(cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    return flow.agendamento_config_get(cliente_id)


@app.patch("/me/agendamento-config")
def agendamento_config_set(payload: AgendamentoConfigUpdate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    return flow.agendamento_config_set(cliente_id, payload.model_dump(exclude_unset=True))


@app.post("/growth/briefings/{briefing_id}/refinar")
def growth_refinar_briefing(briefing_id: str, req: GrowthRefinarRequest, cliente_id: str = Depends(auth.superadmin_cliente_id)) -> dict:
    """Continua o chat do planejamento para aperfeiçoá-lo (CEO com o plano em contexto)."""
    res = flow.growth_refinar_briefing(cliente_id, briefing_id, req.mensagem)
    if not res:
        raise HTTPException(status_code=404, detail="Planejamento não encontrado.")
    return res


@app.post("/growth/chat")
def growth_chat(req: GrowthChatRequest, cliente_id: str = Depends(auth.superadmin_cliente_id)) -> dict:
    """Chat direto com um agente da diretoria (ex.: Coach de Vendas)."""
    if req.agente not in GROWTH_AGENTES_CHAT:
        raise HTTPException(status_code=400, detail="Agente inválido.")
    mensagens = [m.model_dump() for m in req.mensagens]
    return flow.growth_chat(cliente_id, req.agente, mensagens)


@app.get("/growth/posts")
def growth_listar_posts(cliente_id: str = Depends(auth.superadmin_cliente_id)) -> list[dict]:
    return flow.growth_listar_posts(cliente_id)


@app.post("/growth/posts/gerar", status_code=201)
def growth_gerar_posts(req: GrowthPostsRequest, cliente_id: str = Depends(auth.superadmin_cliente_id)) -> list[dict]:
    return flow.growth_gerar_posts(cliente_id, req.tema, req.quantidade, req.tom or "")


@app.patch("/growth/posts/{post_id}")
def growth_atualizar_post(post_id: str, payload: GrowthPostUpdate, cliente_id: str = Depends(auth.superadmin_cliente_id)) -> dict:
    res = flow.growth_atualizar_post(cliente_id, post_id, payload.model_dump(exclude_none=True))
    if not res:
        raise HTTPException(status_code=404, detail="Post não encontrado.")
    return res


@app.delete("/growth/posts/{post_id}", status_code=204)
def growth_apagar_post(post_id: str, cliente_id: str = Depends(auth.superadmin_cliente_id)) -> None:
    flow.growth_apagar_post(cliente_id, post_id)


# ===================== Social Config =====================
@app.get("/me/social-config")
def get_social_config(cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    return flow.get_social_config(cliente_id)


@app.patch("/me/social-config")
def update_social_config(payload: SocialConfigUpdate, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    return flow.update_social_config(cliente_id, payload.model_dump(exclude_none=True))


@app.post("/me/social-config/test/discord")
async def testar_discord(cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    cfg = flow.get_social_config(cliente_id)
    url = cfg.get("discord_webhook_url")
    if not url:
        raise HTTPException(status_code=400, detail="Webhook URL do Discord não configurado.")
    try:
        return await flow.testar_discord(url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/me/social-config/test/facebook")
async def verificar_facebook(cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    cfg = flow.get_social_config(cliente_id)
    page_id = cfg.get("facebook_page_id")
    token = cfg.get("facebook_page_access_token")
    if not page_id or not token:
        raise HTTPException(status_code=400, detail="Page ID e Access Token do Facebook são obrigatórios.")
    try:
        return await flow.verificar_facebook(page_id, token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/me/social-config/test/instagram")
async def verificar_instagram(cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    cfg = flow.get_social_config(cliente_id)
    ig_id = cfg.get("instagram_business_account_id")
    token = cfg.get("facebook_page_access_token")
    if not ig_id or not token:
        raise HTTPException(status_code=400, detail="Instagram Business ID e Access Token são obrigatórios.")
    try:
        return await flow.verificar_instagram(ig_id, token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/me/social-config/post/discord")
async def postar_discord(req: SocialPostRequest, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    cfg = flow.get_social_config(cliente_id)
    url = cfg.get("discord_webhook_url")
    if not url:
        raise HTTPException(status_code=400, detail="Webhook URL do Discord não configurado.")
    try:
        return await flow.postar_discord(url, req.mensagem)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/me/social-config/post/facebook")
async def postar_facebook(req: SocialPostRequest, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    cfg = flow.get_social_config(cliente_id)
    page_id = cfg.get("facebook_page_id")
    token = cfg.get("facebook_page_access_token")
    if not page_id or not token:
        raise HTTPException(status_code=400, detail="Page ID e Access Token do Facebook são obrigatórios.")
    try:
        return await flow.postar_facebook(page_id, token, req.mensagem, req.image_url, req.video_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/oauth/facebook/exchange")
async def oauth_facebook_exchange(req: OAuthFacebookExchange, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    try:
        result = await flow.oauth_facebook_exchange(req.code, req.redirect_uri)
        update: dict = {
            "facebook_page_id": result["facebook_page_id"],
            "facebook_page_access_token": result["facebook_page_access_token"],
        }
        if result["instagram_business_account_id"]:
            update["instagram_business_account_id"] = result["instagram_business_account_id"]
        flow.update_social_config(cliente_id, update)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/me/social-config/exchange-token")
async def exchange_facebook_token(req: TokenExchangeRequest, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    cfg = flow.get_social_config(cliente_id)
    page_id = cfg.get("facebook_page_id")
    if not page_id:
        raise HTTPException(status_code=400, detail="Guarda o Facebook Page ID primeiro antes de trocar o token.")
    try:
        result = await flow.trocar_token_longa_duracao(req.user_access_token, page_id)
        flow.update_social_config(cliente_id, {"facebook_page_access_token": result["access_token"]})
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/me/social-config/post/instagram")
async def postar_instagram(req: SocialPostRequest, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    cfg = flow.get_social_config(cliente_id)
    ig_id = cfg.get("instagram_business_account_id")
    token = cfg.get("facebook_page_access_token")
    if not ig_id or not token:
        raise HTTPException(status_code=400, detail="Instagram Business ID e Access Token são obrigatórios.")
    # Vídeo (Reels) tem prioridade; senão imagem (com placeholder se nada vier).
    image_url = None if req.video_url else (req.image_url or "https://picsum.photos/1080")
    try:
        return await flow.postar_instagram(ig_id, token, req.mensagem, image_url, req.video_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ===================== Agente 3: relatório semanal =====================
@app.post("/relatorios/{campanha_id}")
def gerar_relatorio(campanha_id: str, periodo_inicio: str, periodo_fim: str) -> dict:
    """Gera e persiste o relatório de BI da campanha para o período (YYYY-MM-DD)."""
    return flow.gerar_relatorio_campanha(campanha_id, periodo_inicio, periodo_fim)
