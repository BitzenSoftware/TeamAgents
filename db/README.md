# Base de Dados — TeamAgents

PostgreSQL (Supabase dedicada). É o "quadro-negro" onde os agentes trocam dados — eles não conversam diretamente.

## Tabelas

| Tabela | Quem escreve | Para quê |
|--------|--------------|----------|
| `campanhas` | Agente 1 (Copywriting) | Criativos + metadata estratégica (gatilho, dor, palavra-chave, link calendário) |
| `leads` | Agente 2 (SDR) | Quem entrou, status de qualificação, respostas das 3 perguntas, resultado |
| `historico_conversas` | Agente 2 (SDR) | Cada mensagem (lead/agente) para manter contexto entre respostas |
| `relatorios` | Agente 3 (Diretor BI) | Snapshot semanal + métricas calculadas + relatório WhatsApp |

## Fluxo de dados nas tabelas

```
campanhas ──(palavra_chave_gatilho liga o lead à campanha)──► leads ──► historico_conversas
    └────────────────────(agregação semanal)──────────────────────────► relatorios
```

## Como aplicar

### Opção A — SQL Editor da Supabase
1. Abre o projeto Supabase → **SQL Editor**
2. Cola e corre o conteúdo de [`schema.sql`](schema.sql)
3. (Opcional, para testes) corre [`seed.sql`](seed.sql)

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
