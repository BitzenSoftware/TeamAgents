-- =====================================================================
-- TeamAgents — Migração 009: Planos (geridos pelo superadmin)
-- Cada plano: nome, créditos mensais, preço e o price_id da Stripe.
-- =====================================================================

create table if not exists planos (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  creditos_mensais integer not null default 0,
  preco            numeric(12,2) not null default 0,
  stripe_price_id  text,
  ativo            boolean not null default true,
  ordem            integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists trg_planos_updated_at on planos;
create trigger trg_planos_updated_at
  before update on planos
  for each row execute function set_updated_at();

alter table planos enable row level security;

-- Seed inicial (o superadmin edita valores e mete o stripe_price_id depois).
insert into planos (nome, creditos_mensais, preco, ordem) values
  ('Starter', 500, 99.00, 1),
  ('Pro', 2000, 299.00, 2),
  ('Scale', 8000, 999.00, 3)
on conflict do nothing;
