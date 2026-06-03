-- =====================================================================
-- TeamAgents — Migração 007: Config do WhatsApp/agenda opcional no onboarding
-- Permite criar a empresa só com o nome e preencher o resto depois (Configurações).
-- =====================================================================

alter table workspace_configs alter column whatsapp_instance_name drop not null;
alter table workspace_configs alter column whatsapp_token         drop not null;
alter table workspace_configs alter column calendario_link        drop not null;
