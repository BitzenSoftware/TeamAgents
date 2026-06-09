"""TeamAgents API — FastAPI.

Fluxo crítico do WhatsApp (passo 3 do plano):
o webhook salva o mínimo, agenda a tarefa em background e devolve 200 OK em
< 2s. O agente (que pode demorar) corre DEPOIS, fora da request.
"""
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from postgrest.exceptions import APIError

from . import auth, billing, evolution, flow
from .config import get_settings
from .schemas import (
    CampanhaUpdate,
    CheckoutRequest,
    CompraPacoteRequest,
    ConfigUpdate,
    CopyRequest,
    EmailSyncRequest,
    ExecutivoRequest,
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


# ===================== Identidade do tenant autenticado =====================
@app.get("/me")
def me(user_id: str = Depends(auth.verify_user)) -> dict:
    """Devolve o cliente do utilizador autenticado, ou 404 se ainda não fez onboarding."""
    cliente = auth.cliente_do_user(user_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Sem cliente — necessário onboarding.")
    return cliente


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
def listar_pacotes_ativos(_: str = Depends(auth.current_cliente_id)) -> list[dict]:
    """Pacotes de créditos avulsos disponíveis para compra."""
    return flow.listar_pacotes_ativos()


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
def listar_planos_ativos(_: str = Depends(auth.current_cliente_id)) -> list[dict]:
    """Planos ativos disponíveis para o cliente assinar."""
    return flow.listar_planos_ativos()


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
        return await flow.postar_facebook(page_id, token, req.mensagem)
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
    image_url = req.image_url or "https://picsum.photos/1080"
    try:
        return await flow.postar_instagram(ig_id, token, req.mensagem, image_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ===================== Agente 3: relatório semanal =====================
@app.post("/relatorios/{campanha_id}")
def gerar_relatorio(campanha_id: str, periodo_inicio: str, periodo_fim: str) -> dict:
    """Gera e persiste o relatório de BI da campanha para o período (YYYY-MM-DD)."""
    return flow.gerar_relatorio_campanha(campanha_id, periodo_inicio, periodo_fim)
