"""Envio de mensagens para o WhatsApp via provider externo (Evolution/Z-API/etc.).

Adaptar o payload ao provider que escolheres — abaixo está o formato típico da
Evolution API. É chamado SEMPRE em background, nunca na request do webhook.
"""
import httpx

from .config import get_settings


async def send_text(
    to: str,
    text: str,
    *,
    instance: str | None = None,
    token: str | None = None,
    api_url: str | None = None,
) -> None:
    """Envia texto no WhatsApp.

    Usa as credenciais do TENANT (instance/token/api_url) quando fornecidas;
    caso contrário cai para o env global. Sem nenhuma URL configurada, é no-op
    (útil em testes locais).
    """
    s = get_settings()
    base_url = api_url or s.whatsapp_api_url
    inst = instance or s.whatsapp_instance
    api_key = token or s.whatsapp_api_key
    if not base_url:
        return  # sem provider configurado — no-op

    url = f"{base_url}/message/sendText/{inst}"
    payload = {"number": to, "text": text}
    headers = {"apikey": api_key}
    async with httpx.AsyncClient(timeout=20) as client:
        await client.post(url, json=payload, headers=headers)
