-- =====================================================================
-- TeamAgents — Migração 011: Consumo de créditos por plano
-- Liga cada cliente a um plano e regista o consumo mensal de créditos.
-- Os créditos são ponderados por ação (campanha=6, SDR=1, BI=12) no backend.
-- =====================================================================

-- 1. Cada cliente pertence a um plano (NULL = tratado como Starter no código).
alter table clientes add column if not exists plano_id uuid references planos (id);

-- Backfill: clientes existentes arrancam no Starter.
update clientes
   set plano_id = (select id from planos where nome = 'Starter' order by ordem limit 1)
 where plano_id is null;

-- 2. Consumo mensal por cliente (um registo por cliente/período YYYY-MM).
create table if not exists consumo_mensal (
  cliente_id      uuid not null references clientes (id) on delete cascade,
  periodo         text not null,                 -- 'YYYY-MM'
  creditos_usados integer not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (cliente_id, periodo)
);

drop trigger if exists trg_consumo_updated_at on consumo_mensal;
create trigger trg_consumo_updated_at
  before update on consumo_mensal
  for each row execute function set_updated_at();

alter table consumo_mensal enable row level security;
