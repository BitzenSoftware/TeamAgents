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


def cliente_por_id(cliente_id: str) -> dict | None:
    rows = get_db().table("clientes").select("id, nome").eq("id", cliente_id).limit(1).execute().data
    return rows[0] if rows else None


def _membro_por_email(email: str | None) -> dict | None:
    """Procura um membro convidado pelo e-mail (verificado pelo GoTrue).
    Tolerante a schema: se a tabela ainda não foi migrada, devolve None."""
    if not email:
        return None
    try:
        rows = (
            get_db().table("membros")
            .select("id, cliente_id, permissoes, departamento_ids, auth_user_id")
            .eq("email", email.lower()).limit(1).execute().data
        )
        return rows[0] if rows else None
    except Exception:
        return None


def _link_membro(membro_id: str, user_id: str) -> None:
    try:
        get_db().table("membros").update({"auth_user_id": user_id}).eq("id", membro_id).execute()
    except Exception:
        pass


def perfil_atual(authorization: str | None) -> dict:
    """Resolve o perfil do utilizador autenticado:
    {cliente_id, papel ('owner'|'membro'), permissoes, departamento_ids}.
    O DONO (clientes.auth_user_id) tem acesso total; o MEMBRO entra na empresa
    a que foi convidado (casado por e-mail). 403 se não for nem dono nem membro."""
    u = _fetch_user(authorization)
    cliente = cliente_do_user(u["id"])
    if cliente:
        return {"cliente_id": cliente["id"], "papel": "owner",
                "permissoes": None, "departamento_ids": None, "email": u.get("email")}
    m = _membro_por_email(u.get("email"))
    if m:
        if not m.get("auth_user_id"):
            _link_membro(m["id"], u["id"])
        return {"cliente_id": m["cliente_id"], "papel": "membro",
                "permissoes": m.get("permissoes") or [],
                "departamento_ids": m.get("departamento_ids") or [], "email": u.get("email")}
    raise HTTPException(status_code=403, detail="Utilizador sem empresa associada.")


def current_cliente_id(authorization: str | None = Header(default=None)) -> str:
    """Dependência: resolve a empresa (dono OU membro convidado). 403 se nenhum."""
    return perfil_atual(authorization)["cliente_id"]


def contexto_acesso(authorization: str | None = Header(default=None)) -> dict:
    """Dependência: perfil completo (cliente_id + papel + permissões + departamentos)."""
    return perfil_atual(authorization)


def owner_cliente_id(authorization: str | None = Header(default=None)) -> str:
    """Dependência: SÓ o dono da conta (não membros). Para gerir Utilizadores."""
    u = _fetch_user(authorization)
    cliente = cliente_do_user(u["id"])
    if not cliente:
        raise HTTPException(status_code=403, detail="Apenas o dono da conta pode gerir usuários.")
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
