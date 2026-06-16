-- =====================================================================
-- TeamAgents — Migração 034: conversa de refino nos planejamentos Growth
-- Cada planejamento salvo vira um chat contínuo: o fundador manda follow-ups
-- ("aperfeiçoe X", "inclua um cronograma") e o CEO responde com o plano em
-- contexto. `conversa` guarda os turnos de refino [{role, content}].
-- =====================================================================

alter table growth_briefings
  add column if not exists conversa jsonb not null default '[]';
