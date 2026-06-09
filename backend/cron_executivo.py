"""Cron diário do Agente Executivo — corre as tarefas 'diaria' de cada tenant.

Para cada cliente com Gmail ligado e tarefas ativas com frequência 'diaria':
  - busca SÓ os emails que batem nos filtros das tarefas (poupa tokens)
  - resume (orquestrador Opus + workers Haiku) e persiste um resultado por tarefa
  - desconta créditos só dos itens com êxito (limite do plano respeitado)

Sequencial e tolerante: um cliente que falhe não derruba os outros.

Correr local:  python cron_executivo.py
"""
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app import flow
from app.db import get_db


def main() -> None:
    clientes = get_db().table("clientes").select("id, nome").execute().data
    print(f"Cron Executivo — {len(clientes)} cliente(s) a verificar")
    for c in clientes:
        nome = c.get("nome", c["id"])
        try:
            res = flow.sincronizar_email(c["id"], "gmail", apenas_diarias=True)
            if res.get("sem_tarefas"):
                continue  # sem tarefas diárias ativas — salta silenciosamente
            print(f"  [ok]   {nome}: {res['n_emails']} email(s) em {len(res['processamentos'])} tarefa(s)")
        except ValueError:
            continue  # sem conta de email ligada — salta
        except Exception as e:  # um cliente não pode derrubar os outros
            print(f"  [erro] {nome}: {e}")
    print("Cron Executivo — concluído.")


if __name__ == "__main__":
    main()
