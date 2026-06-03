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

## Notas

- O `InboundMessage` no webhook assume um payload **já normalizado** (`whatsapp`, `text`, `nome`). Se o teu provider (Evolution/Z-API) mandar outro formato, normaliza antes — ou adapta o endpoint para receber o payload cru.
- `whatsapp.send_text` traz o formato típico da Evolution API; ajusta ao provider escolhido.
- Para volume alto, trocar `BackgroundTasks` por Redis/Celery (o desenho do `flow.py` já isola a lógica, a migração é direta).
