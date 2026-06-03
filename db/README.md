# Base de Dados — TeamAgents

PostgreSQL (Supabase dedicada). É o "quadro-negro" onde os agentes trocam dados — eles não conversam diretamente.

## Tabelas

| Tabela | Quem escreve | Para quê |
|--------|--------------|----------|
| `clientes` | SaaS (admin) | O **tenant** — empresa que paga. Liga a `auth.users` por `auth_user_id` (opcional) |
| `workspace_configs` | SaaS (admin) | 1 por cliente: instância/token do WhatsApp + link de calendário. **`whatsapp_instance_name` único** = chave de roteamento do webhook |
| `campanhas` | Agente 1 (Copywriting) | Criativos + metadata estratégica. Tem `cliente_id` |
| `leads` | Agente 2 (SDR) | Quem entrou, status de qualificação, resultado. Tem `cliente_id` |
| `historico_conversas` | Agente 2 (SDR) | Cada mensagem (lead/agente) para manter contexto. Isolado via `lead_id` |
| `relatorios` | Agente 3 (Diretor BI) | Snapshot semanal + métricas + relatório WhatsApp. Tem `cliente_id` |

## Multi-tenant (isolamento por cliente)

O webhook traz o `whatsapp_instance_name` → resolve a `workspace_config` → obtém `cliente_id` + `calendario_link`. Todas as queries de domínio filtram por `cliente_id`, e o SDR usa o calendário do cliente. Cada cliente só vê os seus dados.

## Fluxo de dados nas tabelas

```
clientes ─< workspace_configs   (instância -> cliente)
   │
   └─< campanhas ──(palavra_chave liga o lead)──► leads ──► historico_conversas
              └──────────(agregação semanal)──────────────► relatorios
```

## Como aplicar

### Opção A — SQL Editor da Supabase
1. Abre o projeto Supabase → **SQL Editor**
2. Cola e corre o conteúdo de [`schema.sql`](schema.sql)
3. Corre a migração [`migrations/002_multitenant.sql`](migrations/002_multitenant.sql) (clientes + workspace_configs + `cliente_id`)
4. (Opcional, para testes) corre [`seed.sql`](seed.sql)

### Opção B — psql
```bash
psql "$SUPABASE_DB_URL" -f db/schema.sql
psql "$SUPABASE_DB_URL" -f db/seed.sql   # opcional
```

## Notas de segurança (RLS)

O `schema.sql` ativa **Row Level Security** em todas as tabelas **sem políticas** para `anon`/`authenticated`. Isto significa:

- ✅ Acesso público (anon key) fica **negado por omissão** — seguro.
- ✅ O backend FastAPI usa a **`service_role` key**, que ignora RLS — continua a funcionar.
- ⚠️ Só adicionar políticas explícitas se a app cliente (Next.js) for aceder diretamente à BD sem passar pelo backend.

## Convenções

- Chaves primárias: `uuid` (`gen_random_uuid()`)
- Timestamps: `timestamptz`, com trigger `updated_at` automático em `campanhas` e `leads`
- WhatsApp em formato **E.164** (ex: `+5511999999999`)
- ENUMs: `status_qualificacao`, `status_campanha`, `autor_mensagem`
