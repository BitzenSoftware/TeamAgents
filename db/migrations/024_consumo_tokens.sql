-- =====================================================================
-- TeamAgents — Migração 024: Tokens e custo real no log de consumo
-- Cada linha do consumo_log passa a registar os tokens, o custo USD real e o
-- modelo usado — permite auditar margem (receita vs custo) por operação/empresa.
-- =====================================================================

alter table consumo_log add column if not exists tokens_in  integer not null default 0;
alter table consumo_log add column if not exists tokens_out integer not null default 0;
alter table consumo_log add column if not exists custo_usd  numeric(12,6) not null default 0;
alter table consumo_log add column if not exists modelo     text;
