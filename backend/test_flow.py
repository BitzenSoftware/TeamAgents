"""Teste de fumaça — simula a jornada multi-tenant completa, sem UI nem WhatsApp real.

Pré-requisitos:
  1. schema.sql + migrations/002_multitenant.sql aplicados na Supabase
  2. .env preenchido (ANTHROPIC_API_KEY + SUPABASE_*)
  3. pip install -r requirements.txt

Correr a partir de backend/:
  python test_flow.py
"""
import asyncio
import sys

# Garante UTF-8 no stdout (a consola do Windows usa cp1252 e rebenta com emojis).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app import flow
from app.db import get_db
from app.schemas import CopyRequest

_CLIENTE_NOME = "Cliente Teste (smoke)"
_INSTANCE = "smoke-instance"
_NOME_CAMPANHA = "Contabilidade Sem Burocracia"


def _limpar_dados_teste() -> None:
    """Apaga o cliente de teste — cascata remove config, campanhas, leads, histórico."""
    get_db().table("clientes").delete().eq("nome", _CLIENTE_NOME).execute()


def _seed_cliente_config() -> dict:
    """Cria o cliente (tenant) e a sua workspace_config (instância -> cliente)."""
    db = get_db()
    cliente = db.table("clientes").insert({"nome": _CLIENTE_NOME}).execute().data[0]
    db.table("workspace_configs").insert(
        {
            "cliente_id": cliente["id"],
            "whatsapp_instance_name": _INSTANCE,
            "whatsapp_token": "fake-token-smoke",
            "whatsapp_api_url": "",  # vazio -> send_text fica no-op (não envia nada)
            "calendario_provider": "calendly",
            "calendario_link": "https://cal.com/diego/15min",
        }
    ).execute()
    return cliente


async def main() -> None:
    print("0) A limpar dados de teste anteriores...")
    _limpar_dados_teste()

    print("0b) A semear cliente + workspace_config...")
    cliente = _seed_cliente_config()
    print(f"   cliente={cliente['id']}  instancia={_INSTANCE}")

    print("\n1) A criar campanha (Agente 1 — Sonnet 4.6)...")
    campanha = flow.criar_campanha(
        CopyRequest(
            cliente_id=cliente["id"],
            nicho="Escritórios de contabilidade de pequeno porte",
            dor_latente="O dono é engolido pela burocracia e não consegue crescer.",
            nome_cliente=_CLIENTE_NOME,
            nome_campanha=_NOME_CAMPANHA,
            link_calendario="https://cal.com/diego/15min",
        )
    )
    palavra = campanha["palavra_chave_gatilho"]
    print(f"   campanha={campanha['id']}  palavra-chave={palavra}")
    print(f"   anúncio (dor): {campanha['anuncio_dor'][:80]}...")

    print("\n2) Lead chega via WEBHOOK (instância -> cliente; Agente 2 — Haiku 4.5)...")
    await flow.processar_mensagem_lead(
        _INSTANCE, "+5511999990000",
        f"Olá! Vi o anúncio sobre {palavra}, quero saber mais.", "Lead Teste",
    )
    print("3) Lead responde a uma pergunta de qualificação...")
    await flow.processar_mensagem_lead(
        _INSTANCE, "+5511999990000",
        "Tenho um escritório com 4 pessoas e sou o dono.", "Lead Teste",
    )

    print("\n3b) Listagem isolada por cliente:")
    leads = flow.listar_leads(cliente["id"])
    print(f"   {len(leads)} lead(s) do cliente")
    if leads:
        conversas = flow.listar_conversas(cliente["id"], leads[0]["id"])
        print(f"   {len(conversas)} mensagem(ns) no histórico do 1º lead")

    print("\n4) Relatório semanal (Agente 3 — Opus 4.8)...")
    rel = flow.gerar_relatorio_campanha(campanha["id"], "2026-06-01", "2026-06-07")
    print("   --- RELATÓRIO ---")
    print(rel["relatorio_whatsapp"])


if __name__ == "__main__":
    asyncio.run(main())
