"""Normalização do webhook da Evolution API → InboundMessage.

A Evolution manda o evento `messages.upsert` com este shape (resumido):

    {
      "event": "messages.upsert",
      "instance": "default",
      "data": {
        "key": {"remoteJid": "5511999999999@s.whatsapp.net", "fromMe": false, "id": "..."},
        "pushName": "Nome do Lead",
        "message": {"conversation": "texto"}  # ou extendedTextMessage.text
      }
    }

Descartamos:
- eventos que não sejam `messages.upsert`
- mensagens enviadas por nós (`fromMe: true`)
- grupos (`remoteJid` a terminar em `@g.us`)
- mensagens sem texto (áudio, imagem, etc.) — devolve None

Z-API / Z-PRO usam um shape diferente; criar um parser análogo se mudares de provider.
"""
from .schemas import InboundMessage


def _extract_text(message: dict) -> str | None:
    if not message:
        return None
    # texto simples
    if message.get("conversation"):
        return message["conversation"]
    # texto "estendido" (com preview/reply)
    ext = message.get("extendedTextMessage")
    if ext and ext.get("text"):
        return ext["text"]
    return None


def _jid_to_e164(remote_jid: str) -> str:
    """'5511999999999@s.whatsapp.net' -> '+5511999999999'."""
    numero = remote_jid.split("@", 1)[0]
    return numero if numero.startswith("+") else f"+{numero}"


def parse_webhook(payload: dict) -> InboundMessage | None:
    """Devolve InboundMessage normalizado, ou None se a mensagem deve ser ignorada."""
    if payload.get("event") != "messages.upsert":
        return None

    data = payload.get("data") or {}
    key = data.get("key") or {}

    if key.get("fromMe"):
        return None  # mensagem nossa, não reagir

    remote_jid = key.get("remoteJid", "")
    if not remote_jid or remote_jid.endswith("@g.us"):
        return None  # sem remetente ou é grupo

    text = _extract_text(data.get("message") or {})
    if not text:
        return None  # sem texto (áudio/imagem/etc.)

    return InboundMessage(
        whatsapp=_jid_to_e164(remote_jid),
        text=text,
        nome=data.get("pushName"),
    )
