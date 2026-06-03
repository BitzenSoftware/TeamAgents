"""Cron do Agente 3 (Diretor de BI) — relatório semanal por tenant.

Chamado pelo Render Cron (domingo 23:59 BRT). Para cada cliente:
  1. agrega métricas dos últimos 7 dias
  2. (se houve atividade) gera o relatório com Opus 4.8
  3. persiste em `relatorios` (cliente_id, campanha_id NULL)
  4. envia para o WhatsApp do dono via a instância do tenant

Porquê em lote / background: o Opus é pesado, lento e caro — nunca deve ser
disparado por clique na UI (timeout + margem destruída). O dono acorda na
segunda com a consultoria no telemóvel.

Nota de escala: com muitos tenants, migrar para a Batches API da Anthropic
(50% do custo, assíncrono) — ver skill claude-api. Para já, sequencial.

Correr local:  python cron_bi_reports.py
"""
import asyncio
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app import flow, whatsapp
from app.db import get_db

_DIAS = 7


async def processar_cliente(cliente: dict) -> str:
    nome = cliente.get("nome", cliente["id"])
    rel = flow.gerar_relatorio_semanal_cliente(cliente, dias=_DIAS)
    if rel is None:
        return f"  [skip] {nome}: sem leads na semana (Opus não chamado)"

    config = flow.get_config_by_cliente(cliente["id"])
    destino = (config or {}).get("whatsapp_dono")
    if not config or not destino:
        return f"  [warn] {nome}: relatório gerado mas sem whatsapp_dono na config — não enviado"

    await whatsapp.send_text(
        destino,
        rel["relatorio_whatsapp"],
        instance=config.get("whatsapp_instance_name"),
        token=config.get("whatsapp_token"),
        api_url=config.get("whatsapp_api_url"),
    )
    return f"  [ok]   {nome}: relatório enviado para {destino}"


async def main() -> None:
    clientes = get_db().table("clientes").select("*").execute().data
    print(f"Cron BI — {len(clientes)} cliente(s) a processar (janela {_DIAS}d)")
    for cliente in clientes:
        try:
            print(await processar_cliente(cliente))
        except Exception as e:  # um cliente não pode derrubar os outros
            print(f"  [erro] {cliente.get('nome', cliente['id'])}: {e}")
    print("Cron BI — concluído.")


if __name__ == "__main__":
    asyncio.run(main())
