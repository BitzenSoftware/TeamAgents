-- =====================================================================
-- TeamAgents — Migração 029: chat de suporte (cliente <-> admin)
-- Mensagens trocadas entre o cliente logado e o administrador (Bitzen).
-- `autor`: 'cliente' (escreveu o tenant) ou 'admin' (respondeu o suporte).
-- `lida`: a mensagem já foi vista pela OUTRA parte (recipiente).
-- =====================================================================

create table if not exists suporte_mensagens (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes (id) on delete cascade,
  autor       text not null check (autor in ('cliente', 'admin')),
  mensagem    text not null,
  lida        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_suporte_cliente_data on suporte_mensagens (cliente_id, created_at);
