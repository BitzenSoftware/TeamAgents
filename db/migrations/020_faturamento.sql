-- =====================================================================
-- TeamAgents — Migração 020: Livro de faturamento (para o painel Empresas)
-- Regista cada pagamento recebido (assinatura via invoice.paid + pacotes via
-- checkout payment). Alimenta os dashboards de faturamento/crescimento do admin.
-- stripe_ref é único → idempotente (o webhook pode reentregar o mesmo evento).
-- =====================================================================

create table if not exists faturamento (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid references clientes (id) on delete set null,
  tipo        text not null,              -- 'assinatura' | 'pacote'
  valor       numeric(12,2) not null default 0,
  descricao   text,
  stripe_ref  text unique,                -- invoice id / checkout session id
  created_at  timestamptz not null default now()
);

create index if not exists idx_faturamento_data on faturamento (created_at);
create index if not exists idx_faturamento_cliente on faturamento (cliente_id);

alter table faturamento enable row level security;
