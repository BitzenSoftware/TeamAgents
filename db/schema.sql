-- =====================================================================
-- TeamAgents — Schema do Funil (o "quadro-negro" dos agentes)
-- PostgreSQL / Supabase
--
-- Aplicar no SQL Editor da Supabase (ou via psql).
-- Ordem: campanhas -> leads -> historico_conversas -> relatorios
-- =====================================================================

-- gen_random_uuid() está disponível por omissão na Supabase (pgcrypto).
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- ENUMs
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_qualificacao') then
    create type status_qualificacao as enum (
      'FRIO',          -- lead entrou, ainda não interagiu de forma útil
      'EM_ANDAMENTO',  -- SDR está a qualificar
      'QUALIFICADO',   -- perfil ideal, reunião proposta/agendada
      'DESQUALIFICADO' -- fora do perfil
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'status_campanha') then
    create type status_campanha as enum ('ATIVA', 'PAUSADA', 'ARQUIVADA');
  end if;

  if not exists (select 1 from pg_type where typname = 'autor_mensagem') then
    create type autor_mensagem as enum ('LEAD', 'AGENTE', 'SISTEMA');
  end if;
end$$;

-- ---------------------------------------------------------------------
-- updated_at trigger (reutilizável)
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- 1. CAMPANHAS  (output do Agente 1 — Copywriting / Sonnet 4.6)
-- =====================================================================
create table if not exists campanhas (
  id                    uuid primary key default gen_random_uuid(),

  -- Identificação
  nome_cliente          text not null,           -- dono da empresa / cliente do SaaS
  nome_campanha         text not null,

  -- Input dado ao Agente 1
  nicho                 text not null,
  dor_latente           text not null,

  -- Output do Agente 1 (criativos)
  anuncio_dor           text,                    -- Opção 1 (foco na dor)
  anuncio_beneficio     text,                    -- Opção 2 (foco no benefício/desejo)

  -- Metadata estratégica gerada pelo Agente 1
  gatilho_principal     text,
  dor_alvo              text,
  desejo_alvo           text,
  palavra_chave_gatilho text,                    -- palavra de entrada (ex: PRODUTIVIDADE)

  -- Configuração operacional
  link_calendario       text,                    -- usado pelo SDR no fechamento
  investimento_anuncios numeric(12,2) default 0, -- gasto acumulado em ads (alimenta o BI)

  status                status_campanha not null default 'ATIVA',

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- A palavra-chave de entrada é o que liga o lead à campanha; deve ser única por cliente.
create unique index if not exists uq_campanhas_palavra_chave
  on campanhas (nome_cliente, lower(palavra_chave_gatilho))
  where palavra_chave_gatilho is not null;

create index if not exists idx_campanhas_status on campanhas (status);

drop trigger if exists trg_campanhas_updated_at on campanhas;
create trigger trg_campanhas_updated_at
  before update on campanhas
  for each row execute function set_updated_at();

-- =====================================================================
-- 2. LEADS  (gerido pelo Agente 2 — SDR / Haiku 4.5)
-- =====================================================================
create table if not exists leads (
  id                  uuid primary key default gen_random_uuid(),
  campanha_id         uuid not null references campanhas (id) on delete cascade,

  -- Identificação do lead
  nome                text,
  whatsapp            text not null,             -- número (E.164, ex: +5511999999999)

  -- Estado da qualificação
  status_qualificacao status_qualificacao not null default 'FRIO',

  -- Respostas coletadas pelo SDR (as 3 perguntas)
  nicho_operacao      text,                      -- P1: nicho/tamanho da operação
  maior_gargalo       text,                      -- P2: maior gargalo atual
  tomador_decisao     boolean,                   -- P3: tem autonomia de decisão?

  -- Resultados
  reuniao_agendada    boolean not null default false,
  transferido_humano  boolean not null default false,
  motivo_transferencia text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Um mesmo número não deve duplicar dentro da mesma campanha.
create unique index if not exists uq_leads_campanha_whatsapp
  on leads (campanha_id, whatsapp);

create index if not exists idx_leads_status on leads (status_qualificacao);
create index if not exists idx_leads_campanha on leads (campanha_id);

drop trigger if exists trg_leads_updated_at on leads;
create trigger trg_leads_updated_at
  before update on leads
  for each row execute function set_updated_at();

-- =====================================================================
-- 3. HISTORICO_CONVERSAS  (memória/contexto do SDR no WhatsApp)
-- =====================================================================
create table if not exists historico_conversas (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads (id) on delete cascade,

  autor       autor_mensagem not null,           -- LEAD | AGENTE | SISTEMA
  agente      text,                              -- qual agente respondeu (ex: 'sdr')
  mensagem    text not null,

  created_at  timestamptz not null default now()
);

-- Busca de histórico por lead em ordem cronológica (montar o contexto do prompt).
create index if not exists idx_historico_lead_created
  on historico_conversas (lead_id, created_at);

-- =====================================================================
-- 4. RELATORIOS  (output do Agente 3 — Diretor de BI / Opus)
-- =====================================================================
create table if not exists relatorios (
  id                            uuid primary key default gen_random_uuid(),
  campanha_id                   uuid not null references campanhas (id) on delete cascade,

  periodo_inicio                date not null,
  periodo_fim                   date not null,

  -- Dados brutos do período (snapshot)
  leads_totais                  integer not null default 0,
  leads_respondidos             integer not null default 0,
  reunioes_agendadas            integer not null default 0,
  investimento_anuncios         numeric(12,2) not null default 0,

  -- Métricas calculadas
  taxa_conversao_lead_agendamento numeric(6,2),  -- %
  custo_por_agendamento           numeric(12,2), -- R$

  -- Saída final
  relatorio_whatsapp            text,            -- mensagem formatada pronta a enviar

  created_at                    timestamptz not null default now()
);

create index if not exists idx_relatorios_campanha_periodo
  on relatorios (campanha_id, periodo_fim);

-- =====================================================================
-- SEGURANÇA (Supabase)
-- Liga RLS em todas as tabelas. Sem políticas para `anon`/`authenticated`,
-- o acesso público fica negado por omissão. O backend FastAPI usa a
-- service_role key, que ignora RLS — portanto continua a funcionar.
-- Adicionar políticas explícitas só se a app cliente aceder direto à BD.
-- =====================================================================
alter table campanhas           enable row level security;
alter table leads               enable row level security;
alter table historico_conversas enable row level security;
alter table relatorios          enable row level security;
