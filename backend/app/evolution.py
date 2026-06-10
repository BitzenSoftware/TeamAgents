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
import httpx

from .config import get_settings
from .schemas import InboundMessage


# ===================== Modo gerido (provisionamento automático) =====================
# Tu hospedas UM servidor Evolution central (whatsapp_api_url + whatsapp_api_key).
# A app cria a instância de cada cliente, configura o webhook e devolve o QR Code —
# o cliente só faz "Ligar WhatsApp" e lê o QR. Sem central configurada → modo manual.

def _central() -> tuple[str | None, str | None]:
    s = get_settings()
    base = (s.whatsapp_api_url or "").rstrip("/")
    key = s.whatsapp_api_key or ""
    return (base or None, key or None)


def central_disponivel() -> bool:
    base, key = _central()
    return bool(base and key)


def _instance_name(cliente_id: str) -> str:
    return "ta_" + str(cliente_id).replace("-", "")[:16]


def _h(key: str) -> dict:
    return {"apikey": key, "Content-Type": "application/json"}


def _qr_de(j: dict) -> str | None:
    """Extrai o base64 do QR de respostas em formatos variados da Evolution."""
    if not isinstance(j, dict):
        return None
    for caminho in (("qrcode", "base64"), ("base64",), ("qrcode", "code"), ("code",)):
        cur: object = j
        for k in caminho:
            cur = cur.get(k) if isinstance(cur, dict) else None
        if isinstance(cur, str) and cur:
            return cur
    return None


def criar_ou_conectar(cliente_id: str) -> dict:
    """Cria (ou reusa) a instância do cliente, configura o webhook e devolve o QR.

    Devolve {instance, token, qr, api_url}. `qr` pode ser None se a instância já
    estiver ligada (nesse caso o estado dá "open").
    """
    base, key = _central()
    if not base or not key:
        raise ValueError("Modo gerido do WhatsApp não está configurado no servidor.")
    inst = _instance_name(cliente_id)
    s = get_settings()
    webhook_url = ((s.backend_url or "").rstrip("/") + "/webhook/whatsapp") if s.backend_url else ""
    token: str | None = None
    qr: str | None = None
    with httpx.Client(timeout=30) as c:
        # 1) tenta criar a instância (com QR). Se já existir, ignora e pede connect.
        try:
            r = c.post(
                f"{base}/instance/create",
                headers=_h(key),
                json={"instanceName": inst, "qrcode": True, "integration": "WHATSAPP-BAILEYS"},
            )
            if r.status_code < 300:
                j = r.json()
                qr = _qr_de(j)
                hsh = j.get("hash")
                token = hsh.get("apikey") if isinstance(hsh, dict) else (hsh if isinstance(hsh, str) else None)
        except Exception:
            pass
        # 2) configura o webhook (best-effort; cobre shapes v1 e v2).
        if webhook_url:
            for body in (
                {"webhook": {"enabled": True, "url": webhook_url, "events": ["MESSAGES_UPSERT"]}},
                {"url": webhook_url, "events": ["MESSAGES_UPSERT"], "enabled": True},
            ):
                try:
                    if c.post(f"{base}/webhook/set/{inst}", headers=_h(key), json=body).status_code < 300:
                        break
                except Exception:
                    pass
        # 3) se não veio QR (instância já existia), pede um QR novo.
        if not qr:
            try:
                rc = c.get(f"{base}/instance/connect/{inst}", headers=_h(key))
                if rc.status_code < 300:
                    qr = _qr_de(rc.json())
            except Exception:
                pass
    return {"instance": inst, "token": token, "qr": qr, "api_url": base}


def estado_instancia(inst: str | None) -> str | None:
    """Estado da ligação: 'open' (ligado), 'connecting', 'close' ou None."""
    base, key = _central()
    if not base or not inst:
        return None
    try:
        with httpx.Client(timeout=15) as c:
            r = c.get(f"{base}/instance/connectionState/{inst}", headers=_h(key))
            if r.status_code >= 300:
                return None
            j = r.json()
            ji = j.get("instance")
            return (ji.get("state") if isinstance(ji, dict) else None) or j.get("state")
    except Exception:
        return None


def apagar_instancia(inst: str | None) -> None:
    base, key = _central()
    if not base or not inst:
        return
    try:
        with httpx.Client(timeout=15) as c:
            try:
                c.delete(f"{base}/instance/logout/{inst}", headers=_h(key))
            except Exception:
                pass
            c.delete(f"{base}/instance/delete/{inst}", headers=_h(key))
    except Exception:
        pass


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

    instance = payload.get("instance")
    if not instance:
        return None  # sem instância não sabemos a que cliente pertence

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
        instance=instance,
        whatsapp=_jid_to_e164(remote_jid),
        text=text,
        nome=data.get("pushName"),
    )
