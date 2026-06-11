-- =====================================================================
-- TeamAgents — Migração 027: número do WhatsApp da empresa
-- Guarda o número (E.164, só dígitos) da linha conectada, usado para
-- gerar o LINK/QR DE CAPTAÇÃO por campanha (wa.me/<numero>?text=<chave>).
-- É preenchido automaticamente quando o WhatsApp gerido fica "ligado",
-- e pode ser editado à mão em Configurações → WhatsApp.
-- =====================================================================

alter table workspace_configs add column if not exists whatsapp_numero text;
