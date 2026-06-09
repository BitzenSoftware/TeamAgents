-- =====================================================================
-- TeamAgents — Migração 023: Janela até 180 dias
-- Com frequência Semestral, faz sentido buscar emails de um período maior
-- (newer_than:Nd). Sobe o limite de 30 → 180 dias.
-- =====================================================================

alter table tarefas_executivo drop constraint if exists tarefas_exec_janela_chk;
alter table tarefas_executivo add constraint tarefas_exec_janela_chk
  check (janela_dias between 1 and 180);
