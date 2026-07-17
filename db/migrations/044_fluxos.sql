-- =====================================================================
-- TeamAgents — Migração 044: Fluxos multi-agente (Organograma Vivo)
-- Papéis por projeto (gerente/executor/revisor) + execuções orquestradas
-- em que o Gerente planeja, os Executores produzem em cadeia e o Revisor
-- aprova/reprova cada entrega (quality gate).
-- =====================================================================

-- Papel de cada agente dentro do projeto. Agente sem linha = executor.
create table if not exists projeto_papeis (
  projeto_id uuid not null references projetos (id) on delete cascade,
  agente_id  text not null,
  papel      text not null check (papel in ('gerente', 'executor', 'revisor')),
  primary key (projeto_id, agente_id)
);

-- Uma execução de fluxo (playbook ou comando livre) dentro de um projeto.
create table if not exists fluxo_execucoes (
  id          uuid primary key default gen_random_uuid(),
  projeto_id  uuid not null references projetos (id) on delete cascade,
  cliente_id  uuid not null references clientes (id) on delete cascade,
  titulo      text not null default '',
  comando     text not null default '',   -- comando livre (vazio se playbook)
  playbook    text,                       -- id do playbook (null se comando livre)
  status      text not null default 'planejando'
              check (status in ('planejando', 'rodando', 'concluida', 'erro', 'sem_creditos')),
  resumo      text not null default '',   -- síntese final do Gerente
  erro        text not null default '',
  creditos    integer not null default 0,
  custo_usd   numeric not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_fluxo_exec_proj on fluxo_execucoes (projeto_id, created_at desc);

-- Etapas da execução (uma por agente/tarefa, em ordem).
create table if not exists fluxo_etapas (
  id           uuid primary key default gen_random_uuid(),
  execucao_id  uuid not null references fluxo_execucoes (id) on delete cascade,
  ordem        integer not null,
  agente_id    text not null,
  tarefa       text not null,
  status       text not null default 'pendente'
               check (status in ('pendente', 'rodando', 'revisao', 'refazendo', 'concluida', 'erro')),
  resultado    text not null default '',
  revisao      text not null default '',  -- parecer do Revisor (quality gate)
  updated_at   timestamptz not null default now()
);
create index if not exists idx_fluxo_etapas_exec on fluxo_etapas (execucao_id, ordem);
