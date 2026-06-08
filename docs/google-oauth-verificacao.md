# Google OAuth — Setup e Verificação (Agente Executivo / Gmail)

Guia para ligar o Gmail no TeamAgents. Duas fases: **Testing** (já funciona, só
para ti e test users) e **Verificação** (para abrir a clientes reais).

---

## Parte A — Setup inicial (modo Testing) — faz isto agora

1. **Criar projeto** em [console.cloud.google.com](https://console.cloud.google.com).
2. **Ativar a Gmail API:** APIs & Services → Library → procura "Gmail API" → Enable.
3. **OAuth consent screen:**
   - User type: **External**.
   - App name: `TeamAgents`. User support email: o teu.
   - App domain / Homepage: `https://teamagents.vercel.app` (ou o teu domínio).
   - **Privacy policy URL:** `https://teamagents.vercel.app/privacidade`
   - Developer contact: o teu email.
   - **Scopes:** adiciona `.../auth/gmail.readonly`.
   - **Test users:** adiciona o teu Gmail (e de quem fores testar). Máx. 100.
   - Guarda — deixa a app em **Testing** (NÃO publiques ainda).
4. **Criar credenciais:** Credentials → Create Credentials → **OAuth client ID** →
   Application type **Web application**.
   - **Authorized redirect URIs** (têm de bater certo, exatos):
     - `https://teamagents.vercel.app/configuracoes`
     - `https://teamagents.bitzen.app/configuracoes` (se usares esse domínio)
   - Copia o **Client ID** e o **Client Secret**.
5. **Preencher as variáveis de ambiente:**
   - **Render** (serviço `teamagents`) → Environment:
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
   - **Vercel** → Settings → Environment Variables:
     - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (o mesmo Client ID)
6. **Migração:** correr `db/migrations/013_email_accounts.sql` no Supabase.
7. **Testar:** abre Configurações → aba **Email** → **Ligar Gmail** → autoriza
   (vais ver um aviso "app não verificada" → Avançar, porque és test user) →
   **Sincronizar agora**. O resultado aparece em **Agente Executivo**.

> Em Testing, o ecrã de consentimento mostra "Google hasn't verified this app".
> É normal e só aparece a test users; clica em "Advanced → Go to TeamAgents".

---

## Parte B — Verificação (quando abrires a clientes reais)

`gmail.readonly` é um **scope sensível/restrito** → o Google exige verificação
antes de a app poder ser usada por qualquer pessoa (fora dos 100 test users).

### O que o Google vai pedir

- [ ] **Domínio verificado** no Google Search Console (prova de que és dono do domínio).
- [ ] **Página de privacidade pública** no mesmo domínio → já temos: `/privacidade`.
- [ ] **Homepage pública** que explique o que a app faz.
- [ ] **OAuth consent screen** completo e consistente (nome, logo, domínios).
- [ ] **Justificação dos scopes:** explicar por que precisas de `gmail.readonly`
      (ex: "ler emails recentes para gerar resumos executivos a pedido do utilizador").
- [ ] **Vídeo de demonstração** (YouTube) a mostrar: o fluxo de OAuth, o ecrã de
      consentimento com os scopes, e como os dados são usados na app.
- [ ] **Declaração de Limited Use** — confirmar que cumpres a política (a nossa
      página `/privacidade` já tem o texto).
- [ ] Possível **avaliação de segurança (CASA)** por um assessor externo, exigida
      para scopes restritos. Pode ter custo e demorar semanas.

### Notas
- Enquanto não verificares, podes operar com até **100 test users** adicionados à mão.
- O logótipo, depois de submetido para verificação, fica "bloqueado" para alterações.
- Planeia margem de tempo: a verificação de scopes restritos pode levar de dias a semanas.

### Alternativa para reduzir fricção
Se mais tarde só precisares de **metadados** (assunto, remetente) e não do corpo,
há scopes menos sensíveis (ex: `gmail.metadata`) que podem simplificar a verificação.
O nosso código usa o corpo para resumir, por isso por agora `gmail.readonly` é o certo.
