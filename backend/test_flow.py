"""Teste de fumaça — simula a jornada completa sem UI nem WhatsApp real.

Pré-requisitos:
  1. schema.sql aplicado na Supabase
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
from app.schemas import CopyRequest


_NOME_CLIENTE = "Diego"
_NOME_CAMPANHA = "Contabilidade Sem Burocracia"


def _limpar_dados_teste() -> None:
    """Apaga a campanha de teste anterior (cascata remove leads + histórico),
    para o teste poder correr vezes sem fim sem bater no índice único."""
    from app.db import get_db

    get_db().table("campanhas").delete().eq("nome_cliente", _NOME_CLIENTE).eq(
        "nome_campanha", _NOME_CAMPANHA
    ).execute()


async def main() -> None:
    print("0) A limpar dados de teste anteriores...")
    _limpar_dados_teste()

    print("1) A criar campanha (Agente 1 — Sonnet 4.6)...")
    campanha = flow.criar_campanha(
        CopyRequest(
            nicho="Escritórios de contabilidade de pequeno porte",
            dor_latente="O dono é engolido pela burocracia e não consegue crescer.",
            nome_cliente="Diego",
            nome_campanha="Contabilidade Sem Burocracia",
            link_calendario="https://cal.com/diego/15min",
        )
    )
    print(f"   campanha={campanha['id']} palavra-chave={campanha['palavra_chave_gatilho']}")
    print(f"   anúncio (dor): {campanha['anuncio_dor'][:80]}...")

    palavra = campanha["palavra_chave_gatilho"]

    print("\n2) Lead chega usando a palavra-chave (Agente 2 — Haiku 4.5)...")
    await flow.processar_mensagem_lead(
        whatsapp_num="+5511999990000",
        text=f"Olá! Vi o anúncio sobre {palavra}, quero saber mais.",
        nome="Lead Teste",
    )

    print("3) Lead responde a uma pergunta de qualificação...")
    await flow.processar_mensagem_lead(
        whatsapp_num="+5511999990000",
        text="Tenho um escritório com 4 pessoas e sou o dono.",
        nome="Lead Teste",
    )
    print("   (verifica em historico_conversas as respostas do SDR)")

    print("\n4) Relatório semanal (Agente 3 — Opus 4.8)...")
    rel = flow.gerar_relatorio_campanha(campanha["id"], "2026-06-01", "2026-06-07")
    print("   --- RELATÓRIO ---")
    print(rel["relatorio_whatsapp"])


if __name__ == "__main__":
    asyncio.run(main())
