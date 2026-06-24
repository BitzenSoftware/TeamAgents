-- =====================================================================
-- TeamAgents — Migração 041: Utilizadores (membros da empresa) + RBAC leve
-- O dono da conta (clientes.auth_user_id) convida membros. Cada membro
-- pertence a UMA empresa (cliente_id), com permissões de menu e departamentos.
-- Créditos continuam por empresa (cliente_id) — compartilhados.
-- =====================================================================

create table if not exists membros (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references clientes (id) on delete cascade,
  email             text not null,
  nome              text not null default '',
  papel             text not null default 'membro',
  permissoes        jsonb not null default '[]',   -- chaves de menu permitidas (hrefs)
  departamento_ids  jsonb not null default '[]',   -- uuids de departamentos atribuídos
  auth_user_id      uuid,                           -- preenchido no 1º login do convidado
  created_at        timestamptz not null default now(),
  unique (cliente_id, email)
);
create index if not exists idx_membros_email on membros (lower(email));
