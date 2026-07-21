-- =====================================================================
-- TeamAgents — Migração 046: corrige o CHECK de habilidades.agente
-- A migração 012 fixou os valores em (global, copywriting, sdr, bi,
-- assistente), mas depois o produto ganhou os 10 assistentes. Guardar uma
-- habilidade para um agente específico (ex.: 'estrategia') violava o CHECK
-- e a gravação falhava. Alinha a constraint ao enum AgenteSkill do backend.
-- =====================================================================

alter table habilidades
  drop constraint if exists habilidades_agente_check;

alter table habilidades
  add constraint habilidades_agente_check
  check (agente in (
    'global', 'copywriting', 'sdr', 'bi', 'assistente',
    'financeiro', 'juridico', 'suporte', 'produto', 'rh',
    'auditoria', 'projetos', 'estrategia', 'crescimento', 'operacoes'
  ));
