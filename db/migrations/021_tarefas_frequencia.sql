-- =====================================================================
-- TeamAgents — Migração 021: Frequência avançada das tarefas do Executivo
-- Período (diária/semanal/quinzenal/mensal/trimestral/semestral) +
-- modo (automática = corre no cron / manual = só ao sincronizar) +
-- dia da semana (semanal/quinzenal) ou dia do mês (mensal/trimestral/semestral).
-- =====================================================================

alter table tarefas_executivo drop constraint if exists tarefas_exec_freq_chk;

alter table tarefas_executivo add column if not exists automatica  boolean not null default false;
alter table tarefas_executivo add column if not exists dia_semana  smallint;   -- 0=Seg … 6=Dom
alter table tarefas_executivo add column if not exists dia_mes     smallint;   -- 1..31

-- Migrar o modelo antigo ('manual' | 'diaria'):
--   'diaria' -> período diário automático
--   'manual' -> período diário, mas só corre quando o utilizador sincroniza
update tarefas_executivo set automatica = true  where frequencia = 'diaria';
update tarefas_executivo set frequencia = 'diaria', automatica = false where frequencia = 'manual';

alter table tarefas_executivo alter column frequencia set default 'diaria';

-- Idempotente: largar antes de criar (caso a migração tenha sido corrida em parte).
alter table tarefas_executivo drop constraint if exists tarefas_exec_freq_chk;
alter table tarefas_executivo add constraint tarefas_exec_freq_chk
  check (frequencia in ('diaria', 'semanal', 'quinzenal', 'mensal', 'trimestral', 'semestral'));

alter table tarefas_executivo drop constraint if exists tarefas_exec_dia_semana_chk;
alter table tarefas_executivo add constraint tarefas_exec_dia_semana_chk
  check (dia_semana is null or dia_semana between 0 and 6);

alter table tarefas_executivo drop constraint if exists tarefas_exec_dia_mes_chk;
alter table tarefas_executivo add constraint tarefas_exec_dia_mes_chk
  check (dia_mes is null or dia_mes between 1 and 31);
