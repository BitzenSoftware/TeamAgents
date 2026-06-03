"""TeamAgents API — FastAPI.

Fluxo crítico do WhatsApp (passo 3 do plano):
o webhook salva o mínimo, agenda a tarefa em background e devolve 200 OK em
< 2s. O agente (que pode demorar) corre DEPOIS, fora da request.
"""
from fastapi import BackgroundTasks, FastAPI, HTTPException, Query

from . import flow
from .config import get_settings
from .schemas import CopyRequest, InboundMessage

app = FastAPI(title="TeamAgents API", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


# ===================== Agente 1: criar campanha (síncrono) =====================
@app.post("/campanhas")
def criar_campanha(req: CopyRequest) -> dict:
    """Gera os 2 anúncios + metadata e persiste a campanha."""
    return flow.criar_campanha(req)


# ===================== Agente 2: webhook WhatsApp (async) =====================
@app.post("/webhook/whatsapp")
async def webhook_whatsapp(msg: InboundMessage, bg: BackgroundTasks) -> dict:
    """Recebe a mensagem do lead, agenda o processamento e responde já.

    `InboundMessage` é o formato JÁ normalizado. Se o teu provider (Evolution/
    Z-API) mandar outro shape, normaliza-o antes de chegar aqui (ou adapta este
    endpoint para receber o payload cru e extrair número/texto).
    """
    bg.add_task(flow.processar_mensagem_lead, msg.whatsapp, msg.text, msg.nome)
    return {"status": "accepted"}  # 200 OK imediato


@app.get("/webhook/whatsapp")
def verify_webhook(token: str = Query(default="")) -> dict:
    """Verificação de subscrição (alguns providers exigem um GET de handshake)."""
    s = get_settings()
    if s.webhook_verify_token and token != s.webhook_verify_token:
        raise HTTPException(status_code=403, detail="invalid verify token")
    return {"status": "verified"}


# ===================== Agente 3: relatório semanal =====================
@app.post("/relatorios/{campanha_id}")
def gerar_relatorio(campanha_id: str, periodo_inicio: str, periodo_fim: str) -> dict:
    """Gera e persiste o relatório de BI da campanha para o período (YYYY-MM-DD)."""
    return flow.gerar_relatorio_campanha(campanha_id, periodo_inicio, periodo_fim)
