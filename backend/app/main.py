"""TeamAgents API — FastAPI.

Fluxo crítico do WhatsApp (passo 3 do plano):
o webhook salva o mínimo, agenda a tarefa em background e devolve 200 OK em
< 2s. O agente (que pode demorar) corre DEPOIS, fora da request.
"""
from fastapi import BackgroundTasks, FastAPI, HTTPException, Query
from postgrest.exceptions import APIError

from . import evolution, flow
from .config import get_settings
from .schemas import CopyRequest, OnboardingPayload

app = FastAPI(title="TeamAgents API", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


# ===================== Onboarding (criar tenant) =====================
@app.post("/api/v1/onboarding", status_code=201)
def onboarding(payload: OnboardingPayload) -> dict:
    """Cria cliente + workspace_config de forma atómica (função onboard_tenant)."""
    try:
        created = flow.onboard_tenant(payload)
    except APIError as e:
        if e.code == "23505":  # unique_violation -> instância já registada
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


# ===================== Agente 1: criar campanha (síncrono) =====================
@app.post("/campanhas")
def criar_campanha(req: CopyRequest) -> dict:
    """Gera os 2 anúncios + metadata e persiste a campanha."""
    return flow.criar_campanha(req)


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


# ===================== Listagens (frontend) — filtradas por cliente =====================
@app.get("/clientes/{cliente_id}/leads")
def listar_leads(cliente_id: str) -> list[dict]:
    """Lista os leads de um cliente (sempre isolado por cliente_id)."""
    return flow.listar_leads(cliente_id)


@app.get("/clientes/{cliente_id}/leads/{lead_id}/conversas")
def listar_conversas(cliente_id: str, lead_id: str) -> list[dict]:
    """Histórico de conversa de um lead — só devolve se o lead for do cliente."""
    return flow.listar_conversas(cliente_id, lead_id)


# ===================== Agente 3: relatório semanal =====================
@app.post("/relatorios/{campanha_id}")
def gerar_relatorio(campanha_id: str, periodo_inicio: str, periodo_fim: str) -> dict:
    """Gera e persiste o relatório de BI da campanha para o período (YYYY-MM-DD)."""
    return flow.gerar_relatorio_campanha(campanha_id, periodo_inicio, periodo_fim)
