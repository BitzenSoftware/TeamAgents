# TeamAgents

Sistema de **Tríade de Agentes de IA** para captação, qualificação e análise de leads — orientado a tráfego pago com conversão para WhatsApp.

## Estado

🚧 Em desenvolvimento — definições de agentes prontas.

## A Tríade de Agentes

| # | Agente | Pasta | Função |
|---|--------|-------|--------|
| 1 | **Copywriting de Alta Conversão** | [`agents/copywriting`](agents/copywriting) | Gera 2 variações de anúncios (Meta/Google Ads) + metadata de gatilhos psicológicos |
| 2 | **SDR Sênior** | [`agents/sdr`](agents/sdr) | Qualifica o lead em conversa natural e agenda reunião com consultor humano |
| 3 | **Diretor de BI** | [`agents/bi-director`](agents/bi-director) | Analisa o desempenho semanal e entrega relatório executivo no WhatsApp |

## Fluxo de Dados

```
┌─────────────────┐     metadata      ┌──────────────┐    desempenho    ┌──────────────────┐
│  1. Copywriting │ ────────────────► │   2. SDR     │ ───────────────► │  3. Diretor BI   │
│                 │  (gatilho, dor,   │              │  (leads, reuniões│                  │
│  gera anúncios  │   palavra-chave)  │ qualifica e  │   investimento)  │ relatório semanal│
│  → leads        │                   │ agenda       │                  │ → WhatsApp dono  │
└─────────────────┘                   └──────────────┘                  └──────────────────┘
```

1. **Copywriting** recebe `nicho` + `dor_latente` → gera anúncios e metadata (`gatilho_principal`, `dor_alvo`, `desejo_alvo`, `palavra_chave_gatilho`)
2. **SDR** recebe a metadata da campanha + mensagens do lead → qualifica (3 perguntas) e agenda reunião ou transfere para humano
3. **Diretor de BI** recebe métricas agregadas da semana → calcula conversão e CPAg, gera relatório estratégico

## Estrutura

```
TeamAgents/
  agents/
    copywriting/    # Agente 1
      prompt.md
      config.json
    sdr/            # Agente 2
      prompt.md
      config.json
    bi-director/    # Agente 3
      prompt.md
      config.json
  README.md
  .gitignore
```

Cada agente tem:
- **`prompt.md`** — o system prompt completo e formato de saída
- **`config.json`** — metadados (schemas de input/output, modo, tom)

## Setup

_A definir conforme a stack escolhida (orquestrador / runtime dos agentes)._
