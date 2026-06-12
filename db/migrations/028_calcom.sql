-- =====================================================================
-- TeamAgents — Migração 028: agendamento automático via Cal.com
-- Cada clínica liga a SUA conta Cal.com (API key + Event Type ID).
-- O Agente SDR lê os horários livres e cria a reserva na agenda real.
-- O custo do Cal.com, quando houver, é da clínica (conta dela).
-- =====================================================================

alter table workspace_configs add column if not exists calcom_api_key text;
alter table workspace_configs add column if not exists calcom_event_type_id integer;
