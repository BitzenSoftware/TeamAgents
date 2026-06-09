-- =====================================================================
-- TeamAgents — Migração 022: Horário das tarefas automáticas do Executivo
-- Cada tarefa automática corre à hora escolhida (0–23) no seu fuso horário.
-- O cron passa a correr de hora a hora e dispara as tarefas cuja hora local
-- coincide com a hora atual. Default: 07:00 em Brasília.
-- =====================================================================

alter table tarefas_executivo add column if not exists hora smallint not null default 7;
alter table tarefas_executivo add column if not exists fuso text not null default 'America/Sao_Paulo';

alter table tarefas_executivo drop constraint if exists tarefas_exec_hora_chk;
alter table tarefas_executivo add constraint tarefas_exec_hora_chk check (hora between 0 and 23);
