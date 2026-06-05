-- =====================================================================
-- TeamAgents — Migração 008: Habilidades (base de conhecimento por tenant)
-- A empresa escreve "skills" (ofertas, tom de voz, objeções, casos) e os
-- agentes consultam-nas antes de gerar campanhas e ao conversar como SDR.
-- =====================================================================

create table if not exists habilidades (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes (id) on delete cascade,
  titulo      text not null,
  conteudo    text not null,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_habilidades_cliente on habilidades (cliente_id);

drop trigger if exists trg_habilidades_updated_at on habilidades;
create trigger trg_habilidades_updated_at
  before update on habilidades
  for each row execute function set_updated_at();

alter table habilidades enable row level security;
