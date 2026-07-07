# Nota de estratégia — Internacionalização (PT + en-US) e landing para os EUA

> **Estado:** NOTA / planeamento. Nada implementado ainda. Registada antes de qualquer alteração ao sistema, a pedido do Diego (2026-07).

Objetivo: vender também para o público **americano** (nicho forte: **Amazon FBA / Shopify sellers**), mantendo o mercado BR. Implica (a) landing em inglês com deteção de país e (b) tradução de **todo o sistema** para inglês americano — passando a ter **2 idiomas: PT (ok) e en-US**.

---

## Estrutura real (atualizado para main d2a5109)

> Correção: uma análise inicial foi feita sobre um checkout local **desatualizado** (1a66f80) e concluiu erradamente que a landing/Assistentes não existiam. Após `git pull` para `d2a5109`, está tudo confirmado no repo.

- **Landing / vendas:** `frontend/app/(marketing)/` — `page.tsx` (sales page, headline "a equipe de IA da sua empresa"), `layout.tsx`, `blog/`, `blog/[slug]`, `privacidade/`.
- **App autenticada:** `frontend/app/(app)/` — ~25 rotas: `assistentes`, `executivo`, `growth`, `gestao`, `agenda`, `servicos`, `profissionais`, `empresas`, `assinatura`, `pacotes`, `campanhas`, `pipeline`, `habilidades`, `planos`, `consultoria`, `admin-blog`, `admin-suporte`, etc.
- **Assistentes:** catálogo em `frontend/lib/agentes.ts` — **10**: Financeiro, Jurídico, Suporte, Produto, RH/Pessoas, Auditoria Interna, Projetos, Estratégia, Growth, Operações (cada um com ícone, chip, intro, exemplos, flag de anexos).
- **Backend:** os 3 agentes de captação (copywriting/SDR/BI) coexistem com os Assistentes de chat.
- **SEO/GEO já feito:** `llms.txt`, `sitemap.ts`, `manifest.ts`, `opengraph-image.tsx`, `robots.txt`.
- **Cookie consent:** **NÃO existe** ainda → trabalho novo.

## Assistentes (lineup atual — esboço aberto a ajustes)

Especialistas que "conhecem a empresa pelas **Habilidades**". Definidos em `frontend/lib/agentes.ts`: **Financeiro, Jurídico, Suporte, Produto, RH/Pessoas, Auditoria Interna, Projetos, Estratégia, Growth, Operações**.

- Para a landing US (nicho Amazon FBA/Shopify), vale destacar no topo os que mais falam às dores do e-commerce: Copywriting (A+ Content/criativos), Financeiro (COGS/margem/break-even), Suporte + SDR (carrinho abandonado), Operações, Growth.

## Requisito de UX — Cookie consent

Ao **entrar no site**, mostrar logo o banner de consentimento de cookies ("Aceitar todos os cookies"). Objetivo: transmitir **segurança e profissionalismo**. (Aplica-se à landing/site de marketing, PT e en-US.)

---

## 1. Estratégia da landing (input do Diego / consultoria)

### Pontos fortes da página de vendas atual
- **Proposta de valor:** "Uma equipe inteira de IA. Pelo custo de um café" — ancora o preço contra o custo de funcionários reais (SDR, Designer, Advogado).
- **Demonstração visual:** secção "Centro de Operações" mostra cada agente a trabalhar (SDR a agendar, Financeiro a analisar planilha, Jurídico a rever contrato) → tangibiliza o intangível.
- **Conceito de "Habilidades":** mata a objeção "IA dá respostas genéricas" — o utilizador cadastra tom de voz/políticas uma vez e todos os agentes aprendem. (**Isto já existe no repo:** knowledge base por tenant.)
- **Transparência:** preço acessível (Starter R$179) + créditos auditados por token → confiança técnica/jurídica.

### Verticalização para Amazon FBA / Shopify (pescar "peixes grandes")
A página atual é **horizontal** (contabilidade, clínicas, advocacia, e-commerce…). Para e-commerce, criar **landing verticalizada** com as dores específicas:

- **Copywriting:** descrições otimizadas para SEO (Amazon A+ Content), títulos que convertem, roteiros de criativos para TikTok Ads/Reels.
- **Executivo (E-mail):** resumir e-mails de fornecedores China (Alibaba), alertas de infração de marca (Seller Central), disputas de chargeback (Stripe/Appmax).
- **SDR (WhatsApp):** recuperação de carrinho abandonado, Pix gerado, boleto — "se paga em 2 dias".
- **Financeiro:** análise de planilhas de COGS, cálculo de break-even de anúncios, margem por frete/custos ocultos.
- **Jurídico:** rever contratos de fornecedores OEM/ODM asiáticos e de agências de tráfego.

### CRO sugerido (versão nicho)
- **Headline:** de "A equipe de IA da sua empresa (WhatsApp, finanças, jurídico e mais)" → **"A equipe de IA que roda a sua operação de Amazon ou Shopify 24/7 (do tráfego pago à margem de lucro)"**.
- **Trocar exemplos do "Centro de Operações"** por casos de e-commerce:
  - SDR: cliente que abandonou carrinho na Shopify → compra recuperada via Pix.
  - Financeiro: planilha de frete internacional → alerta de margem baixa no SKU X.
  - Copywriting: 5 variações de anúncio para o produto vencedor da semana.
- **Integrações:** dar ênfase a Instagram/Facebook/WhatsApp para tráfego; futuramente logos de Shopify, ActiveCampaign, Bling/Yampi (para e-commerce, ecossistema de integração é fator de decisão).

## 2. Internacionalização e dolarização (o "pulo do gato")
- Mercado US de Amazon FBA / Shopify Private Label é gigantesco.
- Claude responde em inglês nativamente se as **Habilidades** forem preenchidas em inglês.
- **Preços US sugeridos:** Starter **$49/mês**, Pro **$99/mês**. Para o americano, $49 por 13 agentes é "de graça" vs. custo de VAs (filipinos/indianos). Fator cambial dispara margem.
- Falar a **língua das dores deles:** ROAS, margem de lucro, criativos de anúncios, carrinho abandonado, suporte.

---

## 3. Análise técnica (Claude) — o que isto implica no código

### Landing US + deteção de país
- Frontend é **Next.js na Vercel** → país disponível de graça (`x-vercel-ip-country` / `request.geo` no middleware). Sem serviço externo de geo.
- Fazer **rewrite** no `middleware.ts` (não redirect no cliente) para evitar problemas de SEO/cache da Vercel.
- **Sempre** permitir troca manual de país/idioma + guardar em cookie (geo-IP erra: VPN, viajante).
- Hoje não há landing de marketing no repo (raiz → `/pipeline`) — a landing US e a base BR precisam de ser **criadas/localizadas** onde quer que a atual viva.

### Tradução do sistema todo (PT + en-US)
- **Não há i18n no frontend** hoje: textos em português hardcoded, datas `toLocaleString("pt-BR")`, moeda `R$` hardcoded (ex.: [app/planos/page.tsx](../frontend/app/planos/page.tsx), [app/pipeline/page.tsx](../frontend/app/pipeline/page.tsx)).
- Introduzir arquitetura i18n (ex.: dicionários PT/EN + helper de locale; `next-intl` ou solução leve própria). Locale vem do país detetado, com override manual.
- **Moeda por região:** planos têm de suportar preço em **BRL e USD** (colunas por moeda ou conjunto de preços por região no Supabase + Stripe price_id por moeda). Não basta traduzir texto — a precificação é diferente por mercado.
- **Agentes em inglês:** os prompts dos agentes ([agents/*/prompt.md](../agents)) estão em PT. Para tenants US, ou prompts localizados ou Habilidades em inglês (o Claude adapta, mas o prompt-base influencia o tom).
- **Datas/números:** trocar `pt-BR` hardcoded por formatação por locale.

### Ordem sugerida (quando avançarmos)
1. Resolver a divergência (localizar sales page + confirmar nº real de agentes).
2. Arquitetura i18n no frontend (dicionário + deteção de locale + switcher).
3. Preços multi-moeda (Supabase/Stripe) — BRL e USD.
4. Landing(s): base BR + variação US verticalizada (Amazon/Shopify).
5. Localizar prompts/Habilidades dos agentes para en-US.

> Validar sempre o render no browser antes de deploy (lição do clockly). Deploy: Render (backend) + Vercel (frontend).
