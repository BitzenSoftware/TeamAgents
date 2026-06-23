-- =====================================================================
-- TeamAgents — Migração 037: Loja de ebooks (plataforma separada)
-- Tabelas com prefixo loja_ para coexistir com o schema TeamAgents
-- =====================================================================

create table if not exists loja_categorias (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  slug        text not null unique,
  icone_emoji text not null default '📚',
  ordem       int  not null default 0,
  ativa       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create table if not exists loja_ebooks (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  slug            text not null unique,
  descricao_curta text,
  descricao_longa text,
  categoria_id    uuid references loja_categorias(id) on delete set null,
  preco_centavos  int  not null check (preco_centavos > 0),
  capa_url        text,
  pdf_url         text,
  gemini_prompt   text,
  publicado       boolean not null default false,
  criado_em       timestamptz not null default now()
);

create table if not exists loja_pedidos (
  id                  uuid primary key default gen_random_uuid(),
  comprador_nome      text not null,
  comprador_email     text not null,
  subtotal_centavos   int  not null,
  desconto_centavos   int  not null default 0,
  total_centavos      int  not null,
  tem_desconto        boolean not null default false,
  status              text not null default 'aguardando'
    check (status in ('aguardando', 'pago', 'expirado', 'reembolsado')),
  abacatepay_id       text,
  pix_qr_code         text,
  pix_copia_cola      text,
  pix_expira_em       timestamptz,
  pago_em             timestamptz,
  criado_em           timestamptz not null default now()
);

create table if not exists loja_pedido_itens (
  id             uuid primary key default gen_random_uuid(),
  pedido_id      uuid not null references loja_pedidos(id) on delete cascade,
  ebook_id       uuid not null references loja_ebooks(id) on delete restrict,
  preco_centavos int  not null,
  criado_em      timestamptz not null default now()
);

create table if not exists loja_downloads (
  id                    uuid primary key default gen_random_uuid(),
  pedido_item_id        uuid not null references loja_pedido_itens(id) on delete cascade,
  token                 uuid not null default gen_random_uuid() unique,
  expira_em             timestamptz not null,
  downloads_realizados  int not null default 0,
  baixado_em            timestamptz,
  criado_em             timestamptz not null default now()
);

-- Indexes
create index if not exists idx_loja_ebooks_categoria  on loja_ebooks(categoria_id);
create index if not exists idx_loja_ebooks_slug       on loja_ebooks(slug);
create index if not exists idx_loja_ebooks_publicado  on loja_ebooks(publicado);
create index if not exists idx_loja_pedidos_status    on loja_pedidos(status);
create index if not exists idx_loja_pedidos_email     on loja_pedidos(comprador_email);
create index if not exists idx_loja_downloads_token   on loja_downloads(token);

-- RLS
alter table loja_categorias  enable row level security;
alter table loja_ebooks      enable row level security;
alter table loja_pedidos     enable row level security;
alter table loja_pedido_itens enable row level security;
alter table loja_downloads   enable row level security;

create policy "loja_categorias_public_read" on loja_categorias
  for select to anon, authenticated
  using (ativa = true);

create policy "loja_ebooks_public_read" on loja_ebooks
  for select to anon, authenticated
  using (publicado = true);

-- Seed de categorias
insert into loja_categorias (nome, slug, icone_emoji, ordem) values
  ('Saúde & Bem-estar',      'saude-bem-estar',        '🏃', 1),
  ('Finanças',               'financas',               '💰', 2),
  ('Marketing Digital',      'marketing-digital',      '📱', 3),
  ('Desenvolvimento Pessoal','desenvolvimento-pessoal', '🧠', 4),
  ('Culinária',              'culinaria',              '🍳', 5),
  ('Relacionamentos',        'relacionamentos',         '❤️', 6)
on conflict (slug) do nothing;
