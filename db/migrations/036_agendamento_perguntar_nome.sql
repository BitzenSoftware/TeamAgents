-- =====================================================================
-- TeamAgents — Migração 036: opção "pedir o nome do cliente" no agendamento
-- Quando ativo, o SDR pede o nome da pessoa antes de confirmar e grava no
-- agendamento (em vez de cair no genérico "Cliente").
-- =====================================================================

alter table agendamento_config
  add column if not exists perguntar_nome boolean not null default true;
