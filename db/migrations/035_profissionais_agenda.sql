-- =====================================================================
-- TeamAgents — Migração 035: Profissionais, Serviços e Agenda nativa
-- Motor de agendamento próprio (substitui o Cal.com como caminho principal).
--
-- dia_semana: 0=domingo, 1=segunda, ... 6=sábado.
-- Todas as tabelas são escopadas por cliente_id (multi-tenant).
-- =====================================================================

-- Serviços (tipo de procedimento) — a duração define o tamanho do slot.
create table if not exists servicos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes (id) on delete cascade,
  nome        text not null,
  duracao_min integer not null default 30 check (duracao_min between 5 and 600),
  preco       numeric(10,2),
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_servicos_cliente on servicos (cliente_id);

-- Profissionais
create table if not exists profissionais (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes (id) on delete cascade,
  nome        text not null,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_profissionais_cliente on profissionais (cliente_id);

-- Vínculo N:N serviço ⇄ profissional (quem está habilitado a fazer o quê)
create table if not exists servico_profissional (
  servico_id      uuid not null references servicos (id) on delete cascade,
  profissional_id uuid not null references profissionais (id) on delete cascade,
  primary key (servico_id, profissional_id)
);

-- Escala semanal do profissional (uma linha por dia de trabalho)
create table if not exists profissional_escalas (
  id              uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references profissionais (id) on delete cascade,
  dia_semana      smallint not null check (dia_semana between 0 and 6),
  hora_inicio     time not null,
  hora_fim        time not null,
  intervalo_min   integer not null default 30 check (intervalo_min between 5 and 240),
  almoco_inicio   time,
  almoco_fim      time,
  unique (profissional_id, dia_semana)
);

-- Ausências: dia inteiro (período) OU por horas (data + intervalo)
create table if not exists profissional_ausencias (
  id              uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references profissionais (id) on delete cascade,
  tipo            text not null default 'dia_todo' check (tipo in ('dia_todo', 'horas')),
  data_inicio     date not null,
  data_fim        date not null,
  hora_inicio     time,   -- só quando tipo='horas'
  hora_fim        time,   -- só quando tipo='horas'
  motivo          text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_ausencias_prof on profissional_ausencias (profissional_id, data_inicio);

-- Agendamentos (a agenda em si) — fonte de verdade da disponibilidade
create table if not exists agendamentos (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references clientes (id) on delete cascade,
  profissional_id uuid not null references profissionais (id) on delete cascade,
  servico_id      uuid references servicos (id) on delete set null,
  lead_id         uuid references leads (id) on delete set null,
  inicio          timestamptz not null,
  fim             timestamptz not null,
  status          text not null default 'confirmado'
                    check (status in ('confirmado', 'cancelado', 'realizado', 'no_show')),
  origem          text not null default 'manual' check (origem in ('manual', 'agente')),
  cliente_nome    text,
  contato         text,
  observacao      text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_agendamentos_prof on agendamentos (profissional_id, inicio);
create index if not exists idx_agendamentos_cliente on agendamentos (cliente_id, inicio);

-- Configuração global de agendamento (a "Customizar Agendamento")
create table if not exists agendamento_config (
  cliente_id           uuid primary key references clientes (id) on delete cascade,
  fluxo_ordem          text[] not null default array['profissional','servico'],
  perguntar_profissional boolean not null default true,
  permitir_qualquer    boolean not null default true,  -- "qualquer profissional disponível"
  profissional_padrao_id uuid references profissionais (id) on delete set null,
  dias_futuros         integer not null default 14 check (dias_futuros between 1 and 90),
  updated_at           timestamptz not null default now()
);

-- Vínculo campanha ⇄ serviços (a campanha aponta para serviços)
create table if not exists campanha_servicos (
  campanha_id uuid not null references campanhas (id) on delete cascade,
  servico_id  uuid not null references servicos (id) on delete cascade,
  primary key (campanha_id, servico_id)
);

-- Horário de funcionamento + dias de trabalho da empresa (limitam as escalas)
alter table workspace_configs
  add column if not exists horario_func_inicio time,
  add column if not exists horario_func_fim    time,
  add column if not exists dias_trabalho        smallint[];  -- 0=dom..6=sáb
