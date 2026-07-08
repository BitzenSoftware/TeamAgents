-- Moeda por plano/pacote — permite planos US (USD) a par dos BR (BRL).
-- O backend usa esta coluna ao criar o preço na Stripe (billing.py):
--   currency = plano.moeda or STRIPE_CURRENCY (default 'brl').
-- Planos existentes ficam 'brl' (sem mudança de comportamento).

alter table planos           add column if not exists moeda text not null default 'brl';
alter table pacotes_creditos add column if not exists moeda text not null default 'brl';
