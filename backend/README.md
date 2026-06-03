# Backend — TeamAgents API

FastAPI + Anthropic Python SDK + Supabase. É o "sistema nervoso" que liga os 3 agentes à BD e ao WhatsApp.

## Stack & decisões

- **Saídas estruturadas:** `client.messages.parse(output_format=PydanticModel)` → `.parsed_output` já validado (sem parsing manual de JSON).
- **Prompt caching:** system prompt enviado como bloco com `cache_control: ephemeral`. ⚠️ O prefixo mínimo cacheável é 2048 tokens (Sonnet 4.6) / 4096 (Opus, Haiku). Os prompts dos agentes ainda são curtos, por isso o cache **só engata quando crescerem** — a marcação já está correta.
- **Async (crítico para WhatsApp):** o webhook responde **200 OK em < 2s** e processa o agente em `BackgroundTasks`.
- **Model IDs (exatos, sem sufixo de data):**
  | Agente | Modelo |
  |--------|--------|
  | Copywriting | `claude-sonnet-4-6` |
  | SDR | `claude-haiku-4-5` |
  | Diretor de BI | `claude-opus-4-8` (adaptive thinking) |

## Estrutura

```
backend/
  app/
    config.py     # settings via .env (pydantic-settings)
    db.py         # cliente Supabase (service_role)
    schemas.py    # modelos Pydantic (saídas estruturadas + API)
    llm.py        # chamadas à Anthropic (1 função por agente)
    whatsapp.py   # envio de mensagens (provider externo)
    flow.py       # orquestração BD <-> agentes <-> WhatsApp
    main.py       # FastAPI (endpoints + webhook async)
  test_flow.py    # teste de fumaça end-to-end
  requirements.txt
  .env.example
```

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows (PowerShell: .venv\Scripts\Activate.ps1)
pip install -r requirements.txt
copy .env.example .env          # depois preenche as chaves
```

Aplica primeiro o `db/schema.sql` na Supabase (ver [../db/README.md](../db/README.md)).

## Correr

```bash
uvicorn app.main:app --reload
```

| Método | Rota | Agente | Notas |
|--------|------|--------|-------|
| `POST` | `/campanhas` | 1 — Copywriting | Gera anúncios + metadata, cria campanha (síncrono) |
| `POST` | `/webhook/whatsapp` | 2 — SDR | Recebe lead, **responde 200 OK já**, processa em background |
| `GET`  | `/webhook/whatsapp` | — | Handshake de verificação do provider |
| `POST` | `/relatorios/{campanha_id}` | 3 — BI | Agrega a semana e gera relatório |
| `GET`  | `/health` | — | Healthcheck |

## Teste de fumaça

Sem UI nem WhatsApp real, simula a jornada toda:

```bash
python test_flow.py
```

Cria campanha fake → simula lead com a palavra-chave → SDR responde → gera relatório.

## Webhook da Evolution API

O endpoint `POST /webhook/whatsapp` recebe o **payload cru** da Evolution (evento `messages.upsert`) e normaliza-o em [app/evolution.py](app/evolution.py). Descarta automaticamente:

- mensagens enviadas por nós (`fromMe: true`)
- mensagens de grupos (`@g.us`)
- mensagens sem texto (áudio, imagem, etc.)

Configura na Evolution o webhook a apontar para `https://<teu-render>/webhook/whatsapp`, evento `messages.upsert`. Se mudares para Z-API/Z-PRO, cria um parser análogo (o shape é diferente).

## Deploy no Render (Docker)

[render.yaml](../render.yaml) (na raiz) é um blueprint pronto:

1. Render Dashboard → **New → Blueprint** → aponta para este repo
2. Preenche as env vars (todas `sync: false` — não vão no git): `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WHATSAPP_*`, `WEBHOOK_VERIFY_TOKEN`
3. O build usa [Dockerfile](Dockerfile) com **contexto = raiz do repo** (precisa de `backend/` **e** `agents/`)

O `healthCheckPath` é `/health`. O container escuta em `$PORT` (injetado pelo Render).

### Build local do Docker (opcional)

```bash
# a partir da raiz do repo (o contexto tem de ser a raiz)
docker build -f backend/Dockerfile -t teamagents-api .
docker run --env-file backend/.env -p 8000:8000 teamagents-api
```

## Cron de BI (Agente 3, semanal)

[cron_bi_reports.py](cron_bi_reports.py) gera o relatório semanal **por tenant** e envia ao WhatsApp do dono. Corre em lote (nunca por clique — o Opus é pesado/caro).

- Varre `clientes` → agrega métricas dos últimos 7 dias → (se houve leads) chama o Opus → persiste em `relatorios` (`campanha_id` NULL, consolidado) → envia para `workspace_configs.whatsapp_dono` via a instância do tenant.
- **Guarda anti-desperdício:** clientes sem leads na semana são saltados (não chamam o Opus).
- Agendado no [render.yaml](../render.yaml) como serviço `cron` — `59 2 * * 1` UTC = domingo 23:59 em São Paulo.
- Correr local: `python cron_bi_reports.py`.
- Escala: com muitos tenants, migrar para a Batches API da Anthropic (50% do custo).

## Notas

- `whatsapp.send_text` traz o formato típico da Evolution API; ajusta ao provider escolhido.
- Para volume alto, trocar `BackgroundTasks` por Redis/Celery (o desenho do `flow.py` já isola a lógica, a migração é direta).
