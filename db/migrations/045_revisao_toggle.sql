-- =====================================================================
-- TeamAgents — Migração 045: toggle do quality gate por projeto
-- revisao_ativa=false => fluxos rodam sem Revisor (mais rápido/barato).
-- =====================================================================

alter table projetos add column if not exists revisao_ativa boolean not null default true;
