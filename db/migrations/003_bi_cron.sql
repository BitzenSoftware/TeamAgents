-- =====================================================================
-- TeamAgents — Migração 003: Relatório semanal por tenant (Cron BI)
-- Aplicar DEPOIS de 002_multitenant.sql.
-- =====================================================================

-- 1. O relatório semanal é POR CLIENTE (consolida todas as campanhas),
--    por isso já não está atado a uma campanha única.
alter table relatorios alter column campanha_id drop not null;

-- 2. Número do DONO da empresa que recebe o relatório no WhatsApp (E.164).
--    A config já tinha a instância remetente; faltava o destino.
alter table workspace_configs add column if not exists whatsapp_dono text;
