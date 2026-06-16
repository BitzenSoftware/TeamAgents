-- =====================================================================
-- TeamAgents — Migração 032: Growth (diretoria de IA do superadmin)
-- Menu privado do superadmin: equipe de agentes de marketing/vendas que
-- ajuda a Bitzen a vender o TeamAgents (conteúdo p/ LinkedIn + coach de
-- vendas). Escopo por cliente_id (só o superadmin usa, mas fica isolado).
--
-- growth_config : preferências (modo de aprovação, conexão LinkedIn).
-- growth_posts  : rascunhos/aprovados/publicados gerados pelo Ghostwriter.
-- =====================================================================

create table if not exists growth_config (
  cliente_id        uuid primary key references clientes (id) on delete cascade,
  -- 'manual' = você aprova antes de publicar; 'auto' = publica ao gerar.
  modo_aprovacao    text not null default 'manual' check (modo_aprovacao in ('manual', 'auto')),
  linkedin_conectado boolean not null default false,
  linkedin_perfil   text,            -- nome/URN do perfil ligado (Fase 2)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists growth_posts (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references clientes (id) on delete cascade,
  titulo        text not null default '',          -- rótulo interno do post
  conteudo      text not null,                     -- texto pronto p/ publicar
  status        text not null default 'rascunho'
                  check (status in ('rascunho', 'aprovado', 'agendado', 'publicado')),
  agendado_para timestamptz,                       -- quando status='agendado'
  origem        text,                              -- tema/objetivo que o gerou
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_growth_posts_cliente on growth_posts (cliente_id, created_at desc);
