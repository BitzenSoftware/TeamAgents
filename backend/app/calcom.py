"""Integração com Cal.com (agenda da clínica) — conta do PRÓPRIO cliente.

Cada tenant liga a SUA conta Cal.com (API key + Event Type ID). O Agente SDR
lê os horários livres e cria a reserva na agenda real. O custo do Cal.com,
quando houver, é da clínica — o TeamAgents não paga nada.

API v2 (https://api.cal.com/v2):
- Slots:    GET  /v2/slots     (header cal-api-version: 2024-09-04)
- Bookings: POST /v2/bookings  (header cal-api-version: 2024-08-13)
"""
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import httpx

_BASE = "https://api.cal.com/v2"
_TZ = ZoneInfo("America/Sao_Paulo")
_DIAS_PT = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]


def configurado(cfg: dict | None) -> bool:
    return bool(cfg and cfg.get("calcom_api_key") and cfg.get("calcom_event_type_id"))


def _headers(api_key: str, versao: str) -> dict:
    return {
        "Authorization": f"Bearer {api_key}",
        "cal-api-version": versao,
        "Content-Type": "application/json",
    }


def _slots_crus(api_key: str, event_type_id: int, dias: int = 14) -> list[str]:
    """Inícios de slot (ISO) livres nos próximos `dias`, ordenados. Levanta em erro HTTP."""
    agora = datetime.now(timezone.utc)
    params = {
        "eventTypeId": int(event_type_id),
        "start": agora.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "end": (agora + timedelta(days=dias)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "timeZone": "America/Sao_Paulo",
    }
    with httpx.Client(timeout=20) as c:
        r = c.get(f"{_BASE}/slots", headers=_headers(api_key, "2024-09-04"), params=params)
        r.raise_for_status()
        data = r.json().get("data") or {}
    out: list[str] = []
    if isinstance(data, dict):
        for v in data.values():
            if isinstance(v, list):
                for item in v:
                    s = item.get("start") if isinstance(item, dict) else (item if isinstance(item, str) else None)
                    if s:
                        out.append(s)
    return sorted(out)


def proximos_horarios(api_key: str, event_type_id: int, limite: int = 6) -> list[dict]:
    """Próximos `limite` horários livres: {rotulo (pt-BR), inicio_iso (UTC)}. Best-effort."""
    try:
        slots = _slots_crus(api_key, event_type_id)
    except Exception:
        return []
    res: list[dict] = []
    for s in slots[:limite]:
        try:
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        except ValueError:
            continue
        local = dt.astimezone(_TZ)
        rotulo = f"{_DIAS_PT[local.weekday()]} {local.strftime('%d/%m')} às {local.strftime('%H:%M')}"
        res.append({"rotulo": rotulo, "inicio_iso": dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")})
    return res


def criar_reserva(*, api_key: str, event_type_id: int, inicio_iso: str, nome: str, whatsapp: str) -> dict:
    """Cria a reserva na agenda do cliente. Devolve {ok, id?, erro?}. Best-effort (nunca levanta)."""
    digits = "".join(ch for ch in (whatsapp or "") if ch.isdigit())
    body = {
        "start": inicio_iso,
        "eventTypeId": int(event_type_id),
        "attendee": {
            "name": (nome or "Lead WhatsApp").strip()[:80],
            # Não temos o email do lead; sintetizamos um e mandamos o telefone real.
            "email": f"lead-{digits or 'sem-numero'}@via-whatsapp.teamagents.app",
            "timeZone": "America/Sao_Paulo",
            "phoneNumber": whatsapp if (whatsapp or "").startswith("+") else f"+{digits}",
        },
        "metadata": {"origem": "teamagents-sdr"},
    }
    try:
        with httpx.Client(timeout=25) as c:
            r = c.post(f"{_BASE}/bookings", headers=_headers(api_key, "2024-08-13"), json=body)
            if r.status_code < 300:
                d = r.json().get("data") or {}
                return {"ok": True, "id": d.get("uid") or d.get("id")}
            return {"ok": False, "erro": f"HTTP {r.status_code}: {r.text[:200]}"}
    except Exception as e:
        return {"ok": False, "erro": str(e)}


def verificar(api_key: str, event_type_id: int) -> dict:
    """Valida a ligação (chave + event type) tentando ler slots. {ok, erro?}."""
    try:
        _slots_crus(api_key, int(event_type_id), dias=2)
        return {"ok": True}
    except httpx.HTTPStatusError as e:
        code = e.response.status_code
        if code in (401, 403):
            return {"ok": False, "erro": "API key inválida ou sem permissão."}
        if code == 404:
            return {"ok": False, "erro": "Event Type ID não encontrado nessa conta."}
        return {"ok": False, "erro": f"Erro do Cal.com (HTTP {code})."}
    except Exception as e:
        return {"ok": False, "erro": str(e)}
