-- =====================================================================
-- TeamAgents — Migração 025: Ligação rígida resultado ↔ tarefa (por ID)
-- Cada processamento passa a guardar o id da tarefa que o gerou. Se a tarefa
-- for apagada, os resultados ficam "avulsos" (tarefa_id = NULL), não somem.
-- (Processamentos manuais "Processar email/ata" ficam com tarefa_id NULL.)
-- =====================================================================

alter table processamentos_executivo
  add column if not exists tarefa_id uuid references tarefas_executivo (id) on delete set null;

create index if not exists idx_proc_exec_tarefa on processamentos_executivo (tarefa_id);
