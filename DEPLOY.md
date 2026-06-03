# Deploy — TeamAgents

Backend no **Render** (Docker), frontend na **Vercel**. Ordem: Render primeiro (o frontend precisa do URL do backend).

## 1. Backend — Render

1. [render.com](https://render.com) → **New → Blueprint**
2. Liga o repo GitHub `BitzenSoftware/TeamAgents` → o Render lê o [render.yaml](render.yaml)
3. Cria 2 serviços: `teamagents-api` (web) e `teamagents-bi-cron` (cron semanal)
4. Preenche as **env vars** (todas `sync: false`, não vão no git):

   | Var | Valor |
   |-----|-------|
   | `ANTHROPIC_API_KEY` | a tua key `sk-ant-...` |
   | `SUPABASE_URL` | `https://ugbefyrolumpwhsttjih.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | a `sb_secret_...` |
   | `ALLOWED_ORIGINS` | `*` por agora (depois mete o domínio Vercel) |
   | `WHATSAPP_API_URL` / `WHATSAPP_API_KEY` / `WHATSAPP_INSTANCE` | da Evolution (ou vazio) |
   | `WEBHOOK_VERIFY_TOKEN` | um segredo à tua escolha |

5. Deploy → obténs `https://teamagents-api.onrender.com`
6. Testa: abre `https://teamagents-api.onrender.com/health` → `{"status":"ok"}`

> **Notas:** o plano `starter` é pago; podes mudar o web para **Free** (adormece após inatividade, primeiro pedido é lento). O serviço **cron** exige plano pago — se quiseres só free, apaga o serviço cron no dashboard (corres o relatório manualmente por agora).

## 2. Frontend — Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → importa `BitzenSoftware/TeamAgents`
2. **Root Directory: `frontend`** ⬅️ importante (é monorepo)
3. Framework: Next.js (deteta sozinho)
4. **Environment Variables:**

   | Var | Valor |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | o URL do Render (ex: `https://teamagents-api.onrender.com`) |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://ugbefyrolumpwhsttjih.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | a `sb_publishable_...` |

5. Deploy → obténs `https://<projeto>.vercel.app`

## 3. Ligar o CORS

1. No **Render** → serviço `teamagents-api` → Environment → mete `ALLOWED_ORIGINS` = o teu domínio Vercel (ex: `https://teamagents.vercel.app`) → Save (re-deploia)
2. No **Supabase** → Authentication → URL Configuration → adiciona o domínio Vercel aos *Redirect URLs* (para o login)

## 4. Verificar

Abre o domínio Vercel → cria conta → onboarding → painel. Tudo a falar com o backend no Render. ✅

Ambos re-deploiam automaticamente a cada `git push` para `main`.
