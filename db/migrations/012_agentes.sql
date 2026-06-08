-- =====================================================================
-- TeamAgents — Migração 012: Agentes
-- 1) Skills por agente: cada habilidade pertence a um agente (ou é global).
--    Cada agente usa as SUAS habilidades + as globais.
-- 2) Agente Executivo: guarda os processamentos (email/atas) — síntese +
--    itens processados pelos workers, em JSONB.
-- =====================================================================

-- ---- 1) Coluna `agente` nas habilidades -----------------------------
-- Valores: global | copywriting | sdr | bi | assistente
-- `default 'global' not null` faz o backfill das linhas existentes para global.
alter table habilidades
  add column if not exists agente text not null default 'global';

alter table habilidades
  drop constraint if exists habilidades_agente_check;
alter table habilidades
  add constraint habilidades_agente_check
  check (agente in ('global', 'copywriting', 'sdr', 'bi', 'assistente'));

create index if not exists idx_habilidades_agente on habilidades (cliente_id, agente);

-- ---- 2) Processamentos do Agente Executivo --------------------------
create table if not exists processamentos_executivo (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes (id) on delete cascade,
  titulo      text not null,
  entrada     text not null,                 -- texto colado/carregado (email ou ata)
  sintese     jsonb not null,                -- SinteseExecutiva consolidada
  itens       jsonb not null default '[]',   -- lista de ItemProcessado (workers)
  n_itens     int  not null default 0,       -- itens detetados pelo orquestrador
  n_falhas    int  not null default 0,       -- workers que falharam (não cobrados)
  created_at  timestamptz not null default now()
);

create index if not exists idx_proc_exec_cliente
  on processamentos_executivo (cliente_id, created_at desc);

alter table processamentos_executivo enable row level security;
