-- =====================================================================
-- TeamAgents — Migração 002: Multi-tenant (isolamento por cliente)
-- Aplicar no SQL Editor da Supabase DEPOIS do schema.sql.
--
-- Desenho:
--   clientes            -> o tenant (empresa que paga o SaaS)
--   workspace_configs   -> 1 por cliente; amarra Evolution (instância/token)
--                          e agenda (calendario_link) ao cliente
--   campanhas/leads/
--   relatorios          -> ganham cliente_id (isolamento direto)
--
-- Roteamento: webhook traz whatsapp_instance_name -> resolve cliente_id
--             + calendario_link -> tudo isolado.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CLIENTES (tenant). Desacoplado de auth.users: ligamos por
--    auth_user_id quando o dashboard com login existir.
-- ---------------------------------------------------------------------
create table if not exists clientes (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  auth_user_id uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. WORKSPACE_CONFIGS (1 por cliente)
-- ---------------------------------------------------------------------
create table if not exists workspace_configs (
  id                     uuid primary key default gen_random_uuid(),
  cliente_id             uuid not null references clientes (id) on delete cascade,

  -- Mensageria (Evolution API / WhatsApp)
  whatsapp_instance_name text not null,           -- chave de roteamento do webhook
  whatsapp_token         text not null,           -- token da instância
  whatsapp_api_url       text,                    -- base URL do gateway (por cliente)

  -- Agendamento
  calendario_provider    text not null default 'calendly',  -- 'calendly' | 'google_calendar'
  calendario_link        text not null,           -- link que o SDR dispara

  -- Operação
  limite_mensal_leads    integer not null default 500,
  created_at             timestamptz not null default now(),

  constraint uq_workspace_configs_cliente  unique (cliente_id),
  constraint uq_workspace_configs_instance unique (whatsapp_instance_name)
);

create index if not exists idx_workspace_configs_instance
  on workspace_configs (whatsapp_instance_name);

-- ---------------------------------------------------------------------
-- 3. cliente_id nas tabelas de domínio
--    (nullable na migração porque já há linhas; passa a NOT NULL depois
--    de semeares/limpares dados de teste — ver nota no fim)
-- ---------------------------------------------------------------------
alter table campanhas  add column if not exists cliente_id uuid references clientes (id) on delete cascade;
alter table leads      add column if not exists cliente_id uuid references clientes (id) on delete cascade;
alter table relatorios add column if not exists cliente_id uuid references clientes (id) on delete cascade;

create index if not exists idx_campanhas_cliente  on campanhas (cliente_id);
create index if not exists idx_leads_cliente      on leads (cliente_id);
create index if not exists idx_relatorios_cliente on relatorios (cliente_id);

-- A unicidade da palavra-chave passa a ser POR CLIENTE (não por nome_cliente texto).
drop index if exists uq_campanhas_palavra_chave;
create unique index if not exists uq_campanhas_cliente_palavra
  on campanhas (cliente_id, lower(palavra_chave_gatilho))
  where palavra_chave_gatilho is not null;

-- ---------------------------------------------------------------------
-- 4. RLS (nega anon por omissão; backend usa service_role)
-- ---------------------------------------------------------------------
alter table clientes          enable row level security;
alter table workspace_configs enable row level security;

-- =====================================================================
-- NOTA: depois de teres dados reais com cliente_id preenchido, endurece:
--   alter table campanhas  alter column cliente_id set not null;
--   alter table leads      alter column cliente_id set not null;
--   alter table relatorios alter column cliente_id set not null;
-- (Não corras isto enquanto houver linhas com cliente_id NULL.)
-- =====================================================================
