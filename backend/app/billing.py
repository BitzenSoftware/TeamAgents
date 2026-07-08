"""Integração com a Stripe — assinaturas mensais dos planos.

Responsabilidades:
  - criar Produto + Preço recorrente na Stripe a partir de um plano (admin);
  - abrir uma sessão de Checkout para o cliente assinar;
  - abrir o Portal de Faturação para o cliente gerir/cancelar;
  - tratar os eventos do webhook (ativar plano, repor créditos, downgrade).

O `cliente_id` que liga a Stripe ao nosso tenant viaja sempre em
`client_reference_id` + `metadata`, nunca é inferido do email.
"""
from __future__ import annotations

from datetime import datetime, timezone

import stripe

from . import flow
from .config import get_settings
from .db import get_db


def _ts_iso(ts: int | None) -> str | None:
    """Converte um timestamp Unix da Stripe em ISO 8601 (UTC), ou None."""
    if not ts:
        return None
    return datetime.fromtimestamp(int(ts), tz=timezone.utc).isoformat()


class StripeNaoConfigurada(RuntimeError):
    """STRIPE_SECRET_KEY não definida no ambiente."""


def _init() -> object:
    s = get_settings()
    if not s.stripe_secret_key:
        raise StripeNaoConfigurada("Stripe não configurada (falta STRIPE_SECRET_KEY).")
    stripe.api_key = s.stripe_secret_key
    return s


# ===================== Admin: registar plano na Stripe =====================
def criar_preco_para_plano(plano: dict) -> dict:
    """Cria (ou recria) o Produto + Preço recorrente mensal na Stripe.

    Preços na Stripe são imutáveis: se o plano já tinha um, criamos um novo e
    passamos a referenciá-lo. Reutilizamos o Produto se já existir.
    Devolve o plano atualizado (com stripe_price_id / stripe_product_id).
    """
    s = _init()
    db = get_db()

    product_id = plano.get("stripe_product_id")
    if product_id:
        try:
            stripe.Product.modify(product_id, name=plano["nome"])
        except stripe.error.InvalidRequestError:
            product_id = None  # produto apagado na Stripe — recria
    if not product_id:
        prod = stripe.Product.create(
            name=plano["nome"],
            metadata={"plano_id": plano["id"]},
        )
        product_id = prod["id"]

    preco = stripe.Price.create(
        product=product_id,
        # Moeda por plano (ex.: 'usd' para o mercado US); fallback à moeda global.
        currency=(plano.get("moeda") or s.stripe_currency),
        unit_amount=int(round(float(plano["preco"]) * 100)),
        recurring={"interval": "month"},
        metadata={"plano_id": plano["id"], "creditos_mensais": plano["creditos_mensais"]},
    )

    upd = (
        db.table("planos")
        .update({"stripe_price_id": preco["id"], "stripe_product_id": product_id})
        .eq("id", plano["id"])
        .execute()
        .data
    )
    return upd[0] if upd else {**plano, "stripe_price_id": preco["id"], "stripe_product_id": product_id}


# ===================== Admin: registar pacote na Stripe =====================
def criar_preco_para_pacote(pacote: dict) -> dict:
    """Cria (ou recria) o Produto + Preço de COMPRA ÚNICA (sem recurring) na Stripe."""
    s = _init()
    db = get_db()

    product_id = pacote.get("stripe_product_id")
    if product_id:
        try:
            stripe.Product.modify(product_id, name=pacote["nome"])
        except stripe.error.InvalidRequestError:
            product_id = None
    if not product_id:
        prod = stripe.Product.create(name=pacote["nome"], metadata={"pacote_id": pacote["id"]})
        product_id = prod["id"]

    preco = stripe.Price.create(
        product=product_id,
        currency=(pacote.get("moeda") or s.stripe_currency),
        unit_amount=int(round(float(pacote["preco"]) * 100)),
        metadata={"pacote_id": pacote["id"], "creditos": pacote["creditos"]},
    )  # sem 'recurring' => preço de compra única

    upd = (
        db.table("pacotes_creditos")
        .update({"stripe_price_id": preco["id"], "stripe_product_id": product_id})
        .eq("id", pacote["id"])
        .execute()
        .data
    )
    return upd[0] if upd else {**pacote, "stripe_price_id": preco["id"], "stripe_product_id": product_id}


def criar_checkout_pacote(cliente_id: str, pacote_id: str) -> str:
    """Checkout em modo 'payment' (compra única) para um pacote de créditos."""
    s = _init()
    db = get_db()

    pac = db.table("pacotes_creditos").select("*").eq("id", pacote_id).limit(1).execute().data
    if not pac:
        raise ValueError("Pacote não encontrado.")
    pac = pac[0]
    price_id = pac.get("stripe_price_id")
    if not price_id:
        raise ValueError("Este pacote ainda não está registado na Stripe.")

    cli = db.table("clientes").select("stripe_customer_id").eq("id", cliente_id).limit(1).execute().data
    customer_id = cli[0].get("stripe_customer_id") if cli else None

    params: dict = {
        "mode": "payment",
        "line_items": [{"price": price_id, "quantity": 1}],
        "client_reference_id": cliente_id,
        "metadata": {
            "tipo": "pacote",
            "cliente_id": cliente_id,
            "pacote_id": pacote_id,
            "creditos": str(pac["creditos"]),
            "valor": str(pac["preco"]),
        },
        "success_url": f"{s.frontend_url}/assinatura?compra=sucesso",
        "cancel_url": f"{s.frontend_url}/assinatura?compra=cancelado",
        "allow_promotion_codes": True,
    }
    if customer_id:
        params["customer"] = customer_id

    sess = stripe.checkout.Session.create(**params)
    return sess["url"]


# ===================== Cliente: Checkout (assinar) =====================
def criar_checkout(cliente_id: str, plano_id: str) -> str:
    """Cria uma sessão de Checkout (modo subscription) e devolve a URL."""
    s = _init()
    db = get_db()

    plano = db.table("planos").select("*").eq("id", plano_id).limit(1).execute().data
    if not plano:
        raise ValueError("Plano não encontrado.")
    plano = plano[0]
    price_id = plano.get("stripe_price_id")
    if not price_id:
        raise ValueError("Este plano ainda não está registado na Stripe.")

    cli = db.table("clientes").select("stripe_customer_id").eq("id", cliente_id).limit(1).execute().data
    customer_id = cli[0].get("stripe_customer_id") if cli else None

    params: dict = {
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "client_reference_id": cliente_id,
        "metadata": {"cliente_id": cliente_id, "plano_id": plano_id},
        "subscription_data": {"metadata": {"cliente_id": cliente_id, "plano_id": plano_id}},
        "success_url": f"{s.frontend_url}/assinatura?assinatura=sucesso",
        "cancel_url": f"{s.frontend_url}/assinatura?assinatura=cancelado",
        "allow_promotion_codes": True,
    }
    if customer_id:
        params["customer"] = customer_id

    sess = stripe.checkout.Session.create(**params)
    return sess["url"]


def mudar_plano(cliente_id: str, plano_id: str) -> dict:
    """Upgrade/downgrade de uma assinatura JÁ existente (troca o preço, com proration).

    Não cria nova subscrição nem redireciona — é tudo via API. Se houver um
    cancelamento agendado, reativa. Levanta ValueError se não houver assinatura.
    """
    _init()
    db = get_db()

    plano = db.table("planos").select("*").eq("id", plano_id).limit(1).execute().data
    if not plano:
        raise ValueError("Plano não encontrado.")
    price_id = plano[0].get("stripe_price_id")
    if not price_id:
        raise ValueError("Este plano ainda não está registado na Stripe.")

    sub_id = _subscription_id(cliente_id)  # ValueError se não existir
    sub = stripe.Subscription.retrieve(sub_id)
    try:
        item_id = sub["items"]["data"][0]["id"]
    except (KeyError, IndexError, TypeError):
        raise ValueError("Assinatura sem item para atualizar.")

    stripe.Subscription.modify(
        sub_id,
        cancel_at_period_end=False,  # se estava agendado p/ cancelar, reativa
        items=[{"id": item_id, "price": price_id}],
        proration_behavior="create_prorations",
    )
    # Atualiza já localmente (o webhook subscription.updated confirma na mesma).
    db.table("clientes").update({"plano_id": plano_id, "assinatura_cancela_em": None}).eq("id", cliente_id).execute()
    return {"plano_id": plano_id}


# ===================== Cliente: Portal de faturação =====================
def criar_portal(cliente_id: str) -> str:
    s = _init()
    db = get_db()
    cli = db.table("clientes").select("stripe_customer_id").eq("id", cliente_id).limit(1).execute().data
    customer_id = cli[0].get("stripe_customer_id") if cli else None
    if not customer_id:
        raise ValueError("Sem assinatura ativa para gerir.")
    sess = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{s.frontend_url}/consumo",
    )
    return sess["url"]


def _subscription_id(cliente_id: str) -> str:
    row = get_db().table("clientes").select("stripe_subscription_id").eq("id", cliente_id).limit(1).execute().data
    sub_id = row[0].get("stripe_subscription_id") if row else None
    if not sub_id:
        raise ValueError("Sem assinatura ativa.")
    return sub_id


def cancelar_assinatura(cliente_id: str) -> dict:
    """Agenda o cancelamento para o fim do período pago (não corta já o acesso)."""
    _init()
    sub_id = _subscription_id(cliente_id)
    sub = stripe.Subscription.modify(sub_id, cancel_at_period_end=True)
    quando = _ts_iso(sub.get("cancel_at") or sub.get("current_period_end"))
    get_db().table("clientes").update({"assinatura_cancela_em": quando}).eq("id", cliente_id).execute()
    return {"cancela_em": quando}


def reativar_assinatura(cliente_id: str) -> dict:
    """Anula um cancelamento agendado — a assinatura volta a renovar normalmente."""
    _init()
    sub_id = _subscription_id(cliente_id)
    stripe.Subscription.modify(sub_id, cancel_at_period_end=False)
    get_db().table("clientes").update({"assinatura_cancela_em": None}).eq("id", cliente_id).execute()
    return {"cancela_em": None}


# ===================== Webhook =====================
def tratar_evento(payload: bytes, sig_header: str) -> dict:
    """Valida a assinatura do webhook e aplica o efeito do evento."""
    s = _init()
    if not s.stripe_webhook_secret:
        raise StripeNaoConfigurada("Falta STRIPE_WEBHOOK_SECRET.")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, s.stripe_webhook_secret)
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        raise ValueError(f"Assinatura inválida: {e}")

    tipo = event["type"]
    obj = event["data"]["object"]

    if tipo == "checkout.session.completed":
        meta = obj.get("metadata") or {}
        cliente_id = obj.get("client_reference_id") or meta.get("cliente_id")
        if cliente_id and (obj.get("mode") == "payment" or meta.get("tipo") == "pacote"):
            # Compra única de pacote de créditos avulsos.
            try:
                creditos = int(meta.get("creditos") or 0)
                valor = float(meta.get("valor") or 0)
            except (TypeError, ValueError):
                creditos, valor = 0, 0.0
            if obj.get("customer"):
                _guardar_ids(cliente_id, obj.get("customer"), None)
            if creditos > 0:
                flow.creditar_compra_avulsa(cliente_id, creditos, valor, meta.get("pacote_id"), obj.get("id"))
            flow.registar_faturamento(cliente_id, "pacote", valor, "Pacote de créditos", obj.get("id"))
        elif cliente_id:
            # Assinatura de plano — só aqui (pagamento confirmado) o plano é ativado.
            plano_id = meta.get("plano_id")
            _guardar_ids(cliente_id, obj.get("customer"), obj.get("subscription"))
            if plano_id:
                _set_plano(cliente_id, plano_id)
            _set_pagamento_falha(cliente_id, False)
            _reset_consumo(cliente_id)

    elif tipo == "invoice.paid":
        cliente_id = _cliente_por_customer(obj.get("customer"))
        if cliente_id:
            valor = (obj.get("amount_paid") or 0) / 100.0
            flow.registar_faturamento(cliente_id, "assinatura", valor, obj.get("number") or "Assinatura", obj.get("id"))
            _set_pagamento_falha(cliente_id, False)  # pagamento confirmado — limpa o aviso
            if obj.get("billing_reason") in ("subscription_cycle", "subscription_create", None):
                _reset_consumo(cliente_id)

    elif tipo == "invoice.payment_failed":
        cliente_id = _cliente_por_customer(obj.get("customer"))
        if cliente_id:
            _set_pagamento_falha(cliente_id, True)  # o menu Assinatura mostra o aviso

    elif tipo == "customer.subscription.updated":
        cliente_id = _cliente_por_customer(obj.get("customer"))
        if cliente_id:
            plano_id = _plano_por_subscription(obj)
            if plano_id:
                _set_plano(cliente_id, plano_id)
            # Reflete um cancelamento agendado (ou a sua anulação).
            quando = _ts_iso(obj.get("cancel_at") or obj.get("current_period_end")) if obj.get("cancel_at_period_end") else None
            _set_cancelamento(cliente_id, quando)

    elif tipo == "customer.subscription.deleted":
        cliente_id = _cliente_por_customer(obj.get("customer"))
        if cliente_id:
            _set_plano(cliente_id, None)
            get_db().table("clientes").update(
                {"stripe_subscription_id": None, "assinatura_cancela_em": None}
            ).eq("id", cliente_id).execute()

    return {"status": "ok", "type": tipo}


# ---- helpers de BD ----
def _guardar_ids(cliente_id: str, customer_id: str | None, subscription_id: str | None) -> None:
    patch: dict = {}
    if customer_id:
        patch["stripe_customer_id"] = customer_id
    if subscription_id:
        patch["stripe_subscription_id"] = subscription_id
    if patch:
        get_db().table("clientes").update(patch).eq("id", cliente_id).execute()


def _set_plano(cliente_id: str, plano_id: str | None) -> None:
    get_db().table("clientes").update({"plano_id": plano_id}).eq("id", cliente_id).execute()


def _set_pagamento_falha(cliente_id: str, em_falha: bool) -> None:
    try:
        get_db().table("clientes").update({"pagamento_em_falha": em_falha}).eq("id", cliente_id).execute()
    except Exception:
        pass  # migração 026 pode ainda não ter corrido


def _set_cancelamento(cliente_id: str, quando_iso: str | None) -> None:
    try:
        get_db().table("clientes").update({"assinatura_cancela_em": quando_iso}).eq("id", cliente_id).execute()
    except Exception:
        pass  # migração 019 pode ainda não ter corrido


def _reset_consumo(cliente_id: str) -> None:
    """Zera o contador de créditos do mês corrente (renovação do ciclo)."""
    db = get_db()
    periodo = flow._periodo_atual()
    existing = (
        db.table("consumo_mensal")
        .select("id")
        .eq("cliente_id", cliente_id)
        .eq("periodo", periodo)
        .limit(1)
        .execute()
        .data
    )
    if existing:
        db.table("consumo_mensal").update({"creditos_usados": 0}).eq("cliente_id", cliente_id).eq("periodo", periodo).execute()
    else:
        db.table("consumo_mensal").insert({"cliente_id": cliente_id, "periodo": periodo, "creditos_usados": 0}).execute()


def _cliente_por_customer(customer_id: str | None) -> str | None:
    if not customer_id:
        return None
    rows = get_db().table("clientes").select("id").eq("stripe_customer_id", customer_id).limit(1).execute().data
    return rows[0]["id"] if rows else None


def _plano_por_subscription(sub: dict) -> str | None:
    """Lê o price_id ativo da subscription e resolve o plano correspondente."""
    try:
        price_id = sub["items"]["data"][0]["price"]["id"]
    except (KeyError, IndexError, TypeError):
        return None
    rows = get_db().table("planos").select("id").eq("stripe_price_id", price_id).limit(1).execute().data
    return rows[0]["id"] if rows else None
