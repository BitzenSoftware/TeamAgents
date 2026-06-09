-- =====================================================================
-- TeamAgents — Migração 019: Cancelamento de assinatura agendado
-- Quando o cliente cancela no app, a Stripe agenda o fim para o final do
-- período já pago (cancel_at_period_end). Guardamos a data para mostrar
-- "cancela em DD/MM" e oferecer "Reativar" enquanto não chega lá.
-- =====================================================================

alter table clientes add column if not exists assinatura_cancela_em timestamptz;
