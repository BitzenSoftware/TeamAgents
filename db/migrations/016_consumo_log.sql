-- =====================================================================
-- TeamAgents — Migração 016: Log detalhado de consumo de créditos
-- Para o dashboard de créditos (séries diária/semanal/mensal/anual e
-- repartição por origem). O contador mensal (consumo_mensal) continua.
-- =====================================================================

create table if not exists consumo_log (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes (id) on delete cascade,
  origem      text not null,                 -- 'campanhas' | 'sdr' | 'bi' | 'executivo'
  creditos    integer not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_consumo_log_cliente_data on consumo_log (cliente_id, created_at);

alter table consumo_log enable row level security;
