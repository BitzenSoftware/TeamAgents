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
import secrets
import time

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


def _novo_instance_name(cliente_id: str) -> str:
    # Nome único por ligação → nunca colide com uma instância antiga presa.
    return f"ta_{str(cliente_id).replace('-', '')[:8]}_{secrets.token_hex(3)}"


def _h(key: str) -> dict:
    return {"apikey": key, "Content-Type": "application/json"}


def _qr_de(j: dict) -> str | None:
    """Extrai a IMAGEM base64 do QR (ignora o payload cru tipo "2@..." do campo code)."""
    if not isinstance(j, dict):
        return None
    for caminho in (("qrcode", "base64"), ("base64",)):
        cur: object = j
        for k in caminho:
            cur = cur.get(k) if isinstance(cur, dict) else None
        if isinstance(cur, str) and cur:
            return cur
    return None


def criar_ou_conectar(cliente_id: str, instancia_atual: str | None = None) -> dict:
    """Liga o WhatsApp do cliente e devolve o QR.

    Se `instancia_atual` já estiver ligada ("open"), devolve-a sem QR. Caso
    contrário, apaga-a (best-effort) e cria uma instância NOVA com nome único
    (evita o erro "already in use" de instâncias presas).
    Devolve {instance, token, qr, api_url}.
    """
    base, key = _central()
    if not base or not key:
        raise ValueError("Modo gerido do WhatsApp não está configurado no servidor.")
    s = get_settings()
    webhook_url = ((s.backend_url or "").rstrip("/") + "/webhook/whatsapp") if s.backend_url else ""
    token: str | None = None
    qr: str | None = None
    erros: list[str] = []

    with httpx.Client(timeout=30) as c:
        # 0) Se a instância atual já está ligada, não há nada a fazer.
        if instancia_atual:
            try:
                rs = c.get(f"{base}/instance/connectionState/{instancia_atual}", headers=_h(key))
                if rs.status_code < 300:
                    j = rs.json()
                    ji = j.get("instance")
                    est = (ji.get("state") if isinstance(ji, dict) else None) or j.get("state")
                    if est == "open":
                        return {"instance": instancia_atual, "token": None, "qr": None, "api_url": base}
            except Exception:
                pass
            # Apaga a antiga (best-effort) — pode estar presa; não bloqueia.
            for ep in ("logout", "delete"):
                try:
                    c.delete(f"{base}/instance/{ep}/{instancia_atual}", headers=_h(key))
                except Exception:
                    pass

        # 1) Cria uma instância NOVA com nome único (com QR).
        inst = _novo_instance_name(cliente_id)
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
                if not qr:
                    erros.append(f"create sem QR: {r.text[:300]}")
            else:
                erros.append(f"create HTTP {r.status_code}: {r.text[:200]}")
        except Exception as e:
            erros.append(f"create: {e}")

        # 3) Configura o webhook (best-effort; cobre shapes v1 e v2).
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

        # 4) Tentativa rápida de QR já neste pedido (até ~6s). Se ainda não vier,
        #    não faz mal: o frontend faz polling via obter_qr() — o Baileys pode
        #    demorar 15–40s a gerar o QR.
        if not qr:
            for tentativa in range(4):
                if tentativa:
                    time.sleep(1.5)
                try:
                    rc = c.get(f"{base}/instance/connect/{inst}", headers=_h(key))
                    if rc.status_code < 300:
                        qr = _qr_de(rc.json())
                        if qr:
                            break
                    elif tentativa == 0:
                        erros.append(f"connect HTTP {rc.status_code}: {rc.text[:160]}")
                except Exception as e:
                    erros.append(f"connect: {e}")

    # Só falha se o CREATE em si falhou. Sem QR (mas instância criada) é OK —
    # o frontend vai buscar o QR por polling.
    if not token and not qr and erros and any(e.startswith("create HTTP") or e.startswith("create:") for e in erros):
        raise ValueError(f"Não foi possível criar a instância. ({'; '.join(erros)})")
    return {"instance": inst, "token": token, "qr": qr, "api_url": base}


def obter_qr(inst: str | None) -> dict:
    """Busca o QR atual da instância (polling pelo frontend). {qr, estado, ligado}."""
    base, key = _central()
    if not base or not inst:
        return {"qr": None, "estado": None, "ligado": False}
    qr = None
    estado = None
    try:
        with httpx.Client(timeout=20) as c:
            try:
                rc = c.get(f"{base}/instance/connect/{inst}", headers=_h(key))
                if rc.status_code < 300:
                    qr = _qr_de(rc.json())
            except Exception:
                pass
            try:
                rs = c.get(f"{base}/instance/connectionState/{inst}", headers=_h(key))
                if rs.status_code < 300:
                    j = rs.json()
                    ji = j.get("instance")
                    estado = (ji.get("state") if isinstance(ji, dict) else None) or j.get("state")
            except Exception:
                pass
    except Exception:
        pass
    return {"qr": qr, "estado": estado, "ligado": estado == "open"}


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
