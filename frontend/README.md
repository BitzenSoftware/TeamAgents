# Frontend — Painel do Cliente (Next.js)

Next.js 14 (App Router) + TypeScript + Tailwind. Consome a API FastAPI do backend.

## Módulos

| Rota | Módulo | Consome |
|------|--------|---------|
| `/pipeline` | **Pipeline Comercial (SDR)** — Kanban por status + drawer de conversa | `GET /clientes/{id}/leads`, `GET .../leads/{id}/conversas` |
| `/campanhas` | **Fábrica de Campanhas (Copy)** — form + anúncios gerados | `POST /campanhas` |
| `/consultoria` | **Feed de Consultoria (BI)** — último relatório + histórico | `GET /clientes/{id}/relatorios` |

O cliente (tenant) é escolhido num seletor no menu lateral (`GET /clientes`), guardado em `localStorage`.

## Setup

```bash
cd frontend
npm install
copy .env.local.example .env.local   # define NEXT_PUBLIC_API_URL
npm run dev                           # http://localhost:3000
```

O backend tem de estar a correr (`uvicorn app.main:app --reload` em `../backend`).

## Deploy (Vercel)

1. Vercel → New Project → importa o repo `TeamAgents`
2. **Root Directory: `frontend`**
3. Env var: `NEXT_PUBLIC_API_URL` = URL pública do backend no Render
4. No backend (Render), define `ALLOWED_ORIGINS` com o domínio do Vercel (CORS)

## ⚠️ Segurança (gate de produção)

Os endpoints do backend **ainda não têm autenticação**. Este painel opera sobre um `cliente_id` selecionável — adequado para MVP/demo, **não para produção pública**. Antes de abrir ao mundo: adicionar auth (Supabase Auth / JWT) e derivar o `cliente_id` do utilizador autenticado, não de um seletor.

## Notas

- `npm audit` reporta advisories de dependências transitivas — rever antes de produção.
- Stack propositadamente mínima (sem UI lib pesada); o estilo "executivo/Notion" é Tailwind puro.
