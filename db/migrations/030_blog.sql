-- =====================================================================
-- TeamAgents — Migração 030: Blog (CMS gerido pelo superadmin)
-- Artigos cadastrados no painel admin e exibidos na página de vendas
-- (/blog e /blog/{slug}), indexáveis pelo Google. `conteudo` é markdown.
-- =====================================================================

create table if not exists blog_posts (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  titulo            text not null,
  resumo            text,
  meta_description  text,
  conteudo          text not null default '',
  capa_url          text,
  publicado         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_blog_publicado on blog_posts (publicado, created_at desc);
