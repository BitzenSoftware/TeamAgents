"""TeamAgents API — FastAPI.

Fluxo crítico do WhatsApp (passo 3 do plano):
o webhook salva o mínimo, agenda a tarefa em background e devolve 200 OK em
< 2s. O agente (que pode demorar) corre DEPOIS, fora da request.
"""
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from postgrest.exceptions import APIError

from . import auth, evolution, flow
from .config import get_settings
from .schemas import (
    ConfigUpdate,
    CopyRequest,
    HabilidadeCreate,
    HabilidadeUpdate,
    OnboardingPayload,
    PlanoCreate,
    PlanoUpdate,
    SocialConfigUpdate,
    SocialPostRequest,
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
    return flow.criar_habilidade(cliente_id, payload.titulo, payload.conteudo)


@app.patch("/me/habilidades/{hid}")
def atualizar_habilidade(
    hid: str, payload: HabilidadeUpdate, cliente_id: str = Depends(auth.current_cliente_id)
) -> dict:
    updated = flow.atualizar_habilidade(cliente_id, hid, payload.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Habilidade não encontrada.")
    return updated


@app.delete("/me/habilidades/{hid}", status_code=204)
def apagar_habilidade(hid: str, cliente_id: str = Depends(auth.current_cliente_id)) -> None:
    flow.apagar_habilidade(cliente_id, hid)


# ===================== Agente 1: criar campanha (autenticado) =====================
@app.post("/campanhas")
def criar_campanha(req: CopyRequest, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    """Gera os 2 anúncios + metadata e persiste a campanha do tenant autenticado."""
    return flow.criar_campanha(cliente_id, req)


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
        return await flow.testar_discord(url)
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


@app.post("/me/social-config/post/instagram")
async def postar_instagram(req: SocialPostRequest, cliente_id: str = Depends(auth.current_cliente_id)) -> dict:
    cfg = flow.get_social_config(cliente_id)
    ig_id = cfg.get("instagram_business_account_id")
    token = cfg.get("facebook_page_access_token")
    if not ig_id or not token:
        raise HTTPException(status_code=400, detail="Instagram Business ID e Access Token são obrigatórios.")
    image_url = req.image_url or "https://placehold.co/1080x1080/1a1a1a/ffffff/png?text=TeamAgents"
    try:
        return await flow.postar_instagram(ig_id, token, req.mensagem, image_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ===================== Agente 3: relatório semanal =====================
@app.post("/relatorios/{campanha_id}")
def gerar_relatorio(campanha_id: str, periodo_inicio: str, periodo_fim: str) -> dict:
    """Gera e persiste o relatório de BI da campanha para o período (YYYY-MM-DD)."""
    return flow.gerar_relatorio_campanha(campanha_id, periodo_inicio, periodo_fim)
