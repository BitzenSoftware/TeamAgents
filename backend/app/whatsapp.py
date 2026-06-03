"""Envio de mensagens para o WhatsApp via provider externo (Evolution/Z-API/etc.).

Adaptar o payload ao provider que escolheres — abaixo está o formato típico da
Evolution API. É chamado SEMPRE em background, nunca na request do webhook.
"""
import httpx

from .config import get_settings


async def send_text(to: str, text: str) -> None:
    s = get_settings()
    if not s.whatsapp_api_url:
        # Sem provider configurado (ex: testes) — não faz nada.
        return
    url = f"{s.whatsapp_api_url}/message/sendText/{s.whatsapp_instance}"
    payload = {"number": to, "text": text}
    headers = {"apikey": s.whatsapp_api_key}
    async with httpx.AsyncClient(timeout=20) as client:
        await client.post(url, json=payload, headers=headers)
