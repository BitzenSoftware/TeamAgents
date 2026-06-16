-- =====================================================================
-- TeamAgents — Migração 033: Growth briefings (planejamentos salvos)
-- Cada execução da Sala de Comando (CEO → diretores → briefing) fica
-- gravada para o superadmin reabrir depois. Escopo por cliente_id.
-- =====================================================================

create table if not exists growth_briefings (
  id                  uuid primary key default gen_random_uuid(),
  cliente_id          uuid not null references clientes (id) on delete cascade,
  objetivo            text not null,
  leitura_estrategica text default '',
  entregaveis         jsonb not null default '[]',   -- [{diretor, diretor_nome, foco, conteudo}]
  briefing            text default '',
  created_at          timestamptz not null default now()
);

create index if not exists idx_growth_briefings_cliente on growth_briefings (cliente_id, created_at desc);
