-- =====================================================================
-- TeamAgents — Migração 014: Tarefas do Agente Executivo
-- Em vez de ler a caixa inteira (caro em tokens), o utilizador define
-- tarefas dirigidas: "ler emails de X / com a palavra Y, resumir".
-- O sync só busca os emails que batem nos filtros das tarefas ativas.
-- =====================================================================

create table if not exists tarefas_executivo (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references clientes (id) on delete cascade,
  nome            text not null,
  remetente       text,                              -- from: (vários separados por vírgula/espaço)
  palavras_chave  text,                              -- termos extra (assunto/corpo)
  janela_dias     integer not null default 1,        -- newer_than:Nd
  frequencia      text not null default 'manual',    -- 'manual' | 'diaria'
  ativo           boolean not null default true,
  last_run        timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint tarefas_exec_freq_chk check (frequencia in ('manual', 'diaria')),
  constraint tarefas_exec_janela_chk check (janela_dias between 1 and 30)
);

create index if not exists idx_tarefas_exec_cliente on tarefas_executivo (cliente_id);

drop trigger if exists trg_tarefas_exec_updated_at on tarefas_executivo;
create trigger trg_tarefas_exec_updated_at
  before update on tarefas_executivo
  for each row execute function set_updated_at();

alter table tarefas_executivo enable row level security;
