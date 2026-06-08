-- =====================================================================
-- TeamAgents — Migração 013: Contas de email (Fase 2 — OAuth)
-- O Agente Executivo liga à caixa do utilizador por OAuth (Gmail primeiro;
-- estruturado por `provider` para Outlook depois) e busca emails recentes
-- para processar. Guarda os tokens OAuth por tenant.
-- =====================================================================

create table if not exists email_accounts (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references clientes (id) on delete cascade,
  provider      text not null default 'gmail',   -- gmail | outlook
  email         text not null,
  access_token  text not null,
  refresh_token text,
  expiry        bigint,                            -- epoch (segundos) do access_token
  last_sync     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (cliente_id, provider)
);

alter table email_accounts
  drop constraint if exists email_accounts_provider_check;
alter table email_accounts
  add constraint email_accounts_provider_check
  check (provider in ('gmail', 'outlook'));

create index if not exists idx_email_accounts_cliente on email_accounts (cliente_id);

drop trigger if exists trg_email_accounts_updated_at on email_accounts;
create trigger trg_email_accounts_updated_at
  before update on email_accounts
  for each row execute function set_updated_at();

alter table email_accounts enable row level security;
