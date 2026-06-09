-- =====================================================================
-- TeamAgents — Migração 018: Pacotes de créditos avulsos (compra única)
-- Modelo: assinatura mensal (planos) + top-ups avulsos que NÃO expiram.
-- Regra de consumo: gasta a mesada do plano primeiro; só depois o avulso.
-- =====================================================================

-- Saldo de créditos avulsos do cliente (persistente, não reinicia no mês).
alter table clientes add column if not exists creditos_avulsos integer not null default 0;

-- Catálogo de pacotes (gerido pelo superadmin, à semelhança dos planos).
create table if not exists pacotes_creditos (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  creditos          integer not null default 0,
  preco             numeric(12,2) not null default 0,
  stripe_price_id   text,
  stripe_product_id text,
  ativo             boolean not null default true,
  ordem             integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists trg_pacotes_creditos_updated_at on pacotes_creditos;
create trigger trg_pacotes_creditos_updated_at
  before update on pacotes_creditos
  for each row execute function set_updated_at();

alter table pacotes_creditos enable row level security;

-- Histórico de compras de pacotes (auditoria + evita creditar 2x o mesmo pagamento).
create table if not exists compras_creditos (
  id                 uuid primary key default gen_random_uuid(),
  cliente_id         uuid not null references clientes (id) on delete cascade,
  pacote_id          uuid references pacotes_creditos (id) on delete set null,
  creditos           integer not null,
  valor              numeric(12,2) not null default 0,
  stripe_session_id  text unique,
  created_at         timestamptz not null default now()
);

create index if not exists idx_compras_creditos_cliente on compras_creditos (cliente_id, created_at);

alter table compras_creditos enable row level security;

-- Seed inicial de pacotes (o superadmin ajusta valores e gera o price_id na Stripe).
insert into pacotes_creditos (nome, creditos, preco, ordem) values
  ('Pacote 200',  200,  79.00, 1),
  ('Pacote 500',  500, 169.00, 2),
  ('Pacote 1500', 1500, 449.00, 3)
on conflict do nothing;
