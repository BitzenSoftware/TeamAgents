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
from .schemas import CopyRequest, OnboardingPayload

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


# ===================== Agente 3: relatório semanal =====================
@app.post("/relatorios/{campanha_id}")
def gerar_relatorio(campanha_id: str, periodo_inicio: str, periodo_fim: str) -> dict:
    """Gera e persiste o relatório de BI da campanha para o período (YYYY-MM-DD)."""
    return flow.gerar_relatorio_campanha(campanha_id, periodo_inicio, periodo_fim)
