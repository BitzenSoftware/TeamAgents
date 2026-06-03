-- =====================================================================
-- TeamAgents — Seed de exemplo (teste de fumaça)
-- Cria 1 campanha fake para simular a jornada do lead.
-- Correr DEPOIS de schema.sql.
-- =====================================================================

insert into campanhas (
  nome_cliente, nome_campanha, nicho, dor_latente,
  anuncio_dor, anuncio_beneficio,
  gatilho_principal, dor_alvo, desejo_alvo, palavra_chave_gatilho,
  link_calendario, investimento_anuncios, status
) values (
  'Diego',
  'Contabilidade Sem Burocracia',
  'Escritórios de contabilidade de pequeno porte',
  'O dono é engolido pela burocracia operacional e não consegue crescer.',
  '😤 Cansado de afogar-se em guias e prazos? Recupere o seu tempo. Fale connosco no WhatsApp 👉',
  '🚀 Imagine escalar o seu escritório sem contratar mais ninguém. É possível. Chame no WhatsApp 👉',
  'Alívio Operacional',
  'Burocracia engolindo o dia do dono',
  'Escalar a empresa sem contratar mais pessoas',
  'PRODUTIVIDADE',
  'https://cal.com/diego/15min',
  1500.00,
  'ATIVA'
)
on conflict do nothing;
