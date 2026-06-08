"""Integração de email por OAuth (Fase 2) — Gmail (Google).

Liga à caixa do utilizador via OAuth, busca emails recentes e devolve texto
limpo, pronto para o Agente Executivo (Fase 1) separar e processar.

Estruturado por `provider` para acrescentar Outlook (Microsoft Graph) depois —
por agora só `gmail`. Não guarda corpos de email; apenas processa em memória.
"""
import base64
import re
import time

import httpx

from .config import get_settings

_GOOGLE_TOKEN = "https://oauth2.googleapis.com/token"
_GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"
# Scope só de leitura — o agente lê, nunca apaga nem envia (envio fica p/ Fase 3).
GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"

_TIMEOUT = 30.0


# ===================== OAuth: troca de código + refresh =====================
def exchange_google(code: str, redirect_uri: str) -> dict:
    """Troca o `code` do OAuth por tokens e identifica a caixa (email)."""
    s = get_settings()
    if not s.google_client_id or not s.google_client_secret:
        raise ValueError("GOOGLE_CLIENT_ID/SECRET não configurados no servidor.")
    r = httpx.post(
        _GOOGLE_TOKEN,
        data={
            "code": code,
            "client_id": s.google_client_id,
            "client_secret": s.google_client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        },
        timeout=_TIMEOUT,
    )
    if r.status_code != 200:
        raise ValueError(f"Google recusou a troca de token: {r.text[:300]}")
    tok = r.json()
    access = tok.get("access_token")
    if not access:
        raise ValueError("Resposta do Google sem access_token.")
    return {
        "provider": "gmail",
        "email": _google_profile_email(access),
        "access_token": access,
        "refresh_token": tok.get("refresh_token"),  # só vem com prompt=consent + access_type=offline
        "expiry": int(time.time()) + int(tok.get("expires_in", 3600)),
    }


def refresh_google(refresh_token: str) -> tuple[str, int]:
    """Renova o access_token a partir do refresh_token. Devolve (access, expiry)."""
    s = get_settings()
    r = httpx.post(
        _GOOGLE_TOKEN,
        data={
            "refresh_token": refresh_token,
            "client_id": s.google_client_id,
            "client_secret": s.google_client_secret,
            "grant_type": "refresh_token",
        },
        timeout=_TIMEOUT,
    )
    if r.status_code != 200:
        raise ValueError(f"Falha ao renovar token do Google: {r.text[:300]}")
    tok = r.json()
    return tok["access_token"], int(time.time()) + int(tok.get("expires_in", 3600))


def _google_profile_email(access_token: str) -> str:
    r = httpx.get(
        f"{_GMAIL_API}/profile",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=_TIMEOUT,
    )
    if r.status_code != 200:
        return ""
    return r.json().get("emailAddress", "")


# ===================== Buscar emails recentes =====================
def fetch_recent_google(access_token: str, max_results: int = 10, query: str = "newer_than:7d") -> list[dict]:
    """Lista os emails recentes da caixa e devolve [{from, subject, body}, ...]."""
    headers = {"Authorization": f"Bearer {access_token}"}
    r = httpx.get(
        f"{_GMAIL_API}/messages",
        headers=headers,
        params={"maxResults": max_results, "q": query},
        timeout=_TIMEOUT,
    )
    if r.status_code != 200:
        raise ValueError(f"Falha ao listar emails: {r.text[:300]}")
    ids = [m["id"] for m in r.json().get("messages", [])]
    emails: list[dict] = []
    for mid in ids:
        mr = httpx.get(
            f"{_GMAIL_API}/messages/{mid}",
            headers=headers,
            params={"format": "full"},
            timeout=_TIMEOUT,
        )
        if mr.status_code != 200:
            continue
        emails.append(_parse_gmail(mr.json()))
    return emails


def _parse_gmail(msg: dict) -> dict:
    payload = msg.get("payload", {})
    headers = {h.get("name", "").lower(): h.get("value", "") for h in payload.get("headers", [])}
    return {
        "from": headers.get("from", ""),
        "subject": headers.get("subject", "(sem assunto)"),
        "body": _extract_body(payload),
    }


def _collect(payload: dict, want: str) -> list[str]:
    """Recolhe recursivamente o texto das partes com o mimeType pedido."""
    out: list[str] = []
    if payload.get("mimeType") == want:
        data = payload.get("body", {}).get("data")
        if data:
            out.append(_decode(data))
    for part in payload.get("parts", []) or []:
        out.extend(_collect(part, want))
    return out


def _extract_body(payload: dict) -> str:
    """Prefere text/plain; cai para text/html limpo de tags."""
    plain = _collect(payload, "text/plain")
    if plain:
        return "\n".join(plain).strip()
    html = _collect(payload, "text/html")
    return _strip_html("\n".join(html)).strip()


def _decode(data: str) -> str:
    try:
        return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4)).decode("utf-8", "replace")
    except Exception:
        return ""


def _strip_html(s: str) -> str:
    s = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", s, flags=re.I | re.S)
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"[ \t]{2,}", " ", s)
    return s.strip()


def construir_entrada(emails: list[dict]) -> str:
    """Junta os emails num único texto que o orquestrador volta a separar em itens."""
    blocos = []
    for e in emails:
        blocos.append(
            f"--- EMAIL ---\nDe: {e['from']}\nAssunto: {e['subject']}\n\n{e['body']}".strip()
        )
    return "\n\n".join(blocos)
