"""Autenticação — verifica o JWT do Supabase Auth e resolve o tenant.

O `cliente_id` NUNCA vem do cliente (URL/body) — é sempre derivado do
utilizador autenticado, via `clientes.auth_user_id`. Isto fecha o buraco de
IDOR (um cliente não consegue ler dados de outro mudando um id na URL).
"""
import httpx
from fastapi import Depends, Header, HTTPException

from .config import get_settings
from .db import get_db


def _fetch_user(authorization: str | None) -> dict:
    """Valida o Bearer token no GoTrue e devolve o utilizador (id + email)."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticação em falta.")
    token = authorization.split(" ", 1)[1]
    s = get_settings()
    try:
        r = httpx.get(
            f"{s.supabase_url}/auth/v1/user",
            headers={
                "apikey": s.supabase_service_role_key,
                "Authorization": f"Bearer {token}",
            },
            timeout=10,
        )
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Serviço de autenticação indisponível.")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado.")
    u = r.json()
    if not u.get("id"):
        raise HTTPException(status_code=401, detail="Token sem utilizador.")
    return u


def verify_user(authorization: str | None = Header(default=None)) -> str:
    """Dependência: devolve o auth user id."""
    return _fetch_user(authorization)["id"]


def require_superadmin(authorization: str | None = Header(default=None)) -> str:
    """Dependência: garante que o utilizador é o superadmin. Devolve o email."""
    u = _fetch_user(authorization)
    if (u.get("email") or "").lower() != get_settings().superadmin_email.lower():
        raise HTTPException(status_code=403, detail="Acesso restrito ao administrador.")
    return u["email"]


def cliente_do_user(user_id: str) -> dict | None:
    rows = (
        get_db()
        .table("clientes")
        .select("id, nome")
        .eq("auth_user_id", user_id)
        .limit(1)
        .execute()
        .data
    )
    return rows[0] if rows else None


def current_cliente_id(user_id: str = Depends(verify_user)) -> str:
    """Dependência: resolve o cliente do utilizador autenticado (403 se não tiver)."""
    cliente = cliente_do_user(user_id)
    if not cliente:
        raise HTTPException(
            status_code=403,
            detail="Utilizador sem cliente associado. Conclua o onboarding primeiro.",
        )
    return cliente["id"]


def superadmin_cliente_id(authorization: str | None = Header(default=None)) -> str:
    """Dependência: garante superadmin E devolve o cliente_id dele (para o menu Growth)."""
    u = _fetch_user(authorization)
    if (u.get("email") or "").lower() != get_settings().superadmin_email.lower():
        raise HTTPException(status_code=403, detail="Acesso restrito ao administrador.")
    cliente = cliente_do_user(u["id"])
    if not cliente:
        raise HTTPException(status_code=403, detail="Superadmin sem cliente associado.")
    return cliente["id"]
