-- =====================================================================
-- TeamAgents — Migração 038: Gestão (Empresa › Departamentos › Projetos)
-- Hierarquia de organização dos agentes (assistentes). Cascata:
--   projeto_agentes ⊆ departamento_agentes ⊆ gestao_empresa_agentes ⊆ os 10.
-- agente_id = id do assistente (financeiro, juridico, ... operacoes).
-- =====================================================================

-- Nível Empresa: quais agentes a empresa ativou (catálogo da conta).
create table if not exists gestao_empresa_agentes (
  cliente_id  uuid not null references clientes (id) on delete cascade,
  agente_id   text not null,
  primary key (cliente_id, agente_id)
);

-- Nível Departamento (pasta organizacional).
create table if not exists departamentos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes (id) on delete cascade,
  nome        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_departamentos_cliente on departamentos (cliente_id);

create table if not exists departamento_agentes (
  departamento_id uuid not null references departamentos (id) on delete cascade,
  agente_id       text not null,
  primary key (departamento_id, agente_id)
);

-- Nível Projeto (dentro de um departamento) + contexto compartilhado.
create table if not exists projetos (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references clientes (id) on delete cascade,
  departamento_id uuid not null references departamentos (id) on delete cascade,
  nome            text not null,
  descricao       text default '',
  briefing        text default '',   -- contexto compartilhado por todos os agentes
  status          text not null default 'ativo' check (status in ('ativo', 'arquivado')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_projetos_depto on projetos (departamento_id, created_at desc);
create index if not exists idx_projetos_cliente on projetos (cliente_id);

create table if not exists projeto_agentes (
  projeto_id uuid not null references projetos (id) on delete cascade,
  agente_id  text not null,
  primary key (projeto_id, agente_id)
);

-- Documentos do projeto (contexto compartilhado) — texto já extraído. (Fase 2)
create table if not exists projeto_documentos (
  id          uuid primary key default gen_random_uuid(),
  projeto_id  uuid not null references projetos (id) on delete cascade,
  nome        text not null,
  conteudo    text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists idx_projeto_docs on projeto_documentos (projeto_id, created_at);

-- Conversas por projeto+agente (persistidas). (Fase 2)
create table if not exists projeto_mensagens (
  id          uuid primary key default gen_random_uuid(),
  projeto_id  uuid not null references projetos (id) on delete cascade,
  agente_id   text not null,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_projeto_msgs on projeto_mensagens (projeto_id, agente_id, created_at);
