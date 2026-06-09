-- =====================================================================
-- TeamAgents — Migração 017: Stripe (assinaturas)
-- Liga cada cliente ao seu customer/subscription na Stripe, para o webhook
-- saber a quem aplicar o plano e repor créditos na renovação.
-- (planos.stripe_price_id já existe — migração 009; clientes.plano_id — 011.)
-- =====================================================================

alter table clientes add column if not exists stripe_customer_id     text;
alter table clientes add column if not exists stripe_subscription_id text;

create index if not exists idx_clientes_stripe_customer on clientes (stripe_customer_id);

-- Guarda o id do produto na Stripe para reutilizar ao recriar preços.
alter table planos add column if not exists stripe_product_id text;
