-- =====================================================================
-- TeamAgents — Migração 026: Notificação de pagamento falhado
-- O webhook marca pagamento_em_falha quando a Stripe reporta
-- invoice.payment_failed; limpa quando um pagamento é confirmado.
-- O menu Assinatura mostra o aviso ao utilizador.
-- =====================================================================

alter table clientes add column if not exists pagamento_em_falha boolean not null default false;
