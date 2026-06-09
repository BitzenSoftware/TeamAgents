-- =====================================================================
-- TeamAgents — Migração 015: Instruções + Habilidades por tarefa
-- Cada tarefa do Agente Executivo pode dizer ao agente QUE informação
-- extrair (instrucoes) e que Habilidades cadastradas usar (habilidade_ids).
-- =====================================================================

alter table tarefas_executivo add column if not exists instrucoes text;
alter table tarefas_executivo
  add column if not exists habilidade_ids jsonb not null default '[]'::jsonb;
