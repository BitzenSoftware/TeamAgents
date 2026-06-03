-- =====================================================================
-- TeamAgents — Migração 004: Limpar dados soltos + endurecer cliente_id
-- Aplicar DEPOIS de 003. Passa as tabelas de domínio para produção.
-- =====================================================================

-- Remover registos antigos de teste sem tenant atrelado (pré-multitenant).
delete from relatorios where cliente_id is null;
delete from leads      where cliente_id is null;
delete from campanhas  where cliente_id is null;

-- (Opcional, recomendado para arranque limpo) remover o tenant de smoke test.
-- Cascata apaga config, campanhas, leads, histórico e relatórios dele.
delete from clientes where nome = 'Cliente Teste (smoke)';

-- Endurecer as colunas para produção (já não há linhas com NULL).
alter table campanhas  alter column cliente_id set not null;
alter table leads      alter column cliente_id set not null;
alter table relatorios alter column cliente_id set not null;
