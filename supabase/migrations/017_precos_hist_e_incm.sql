-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Motor de carregamento (research 2026-06-30):                              ║
-- ║   1. precos_mercado_hist — histórico append-only do valor de mercado       ║
-- ║      (cada leitura Numista deixa uma linha → permite "evolução de preço").  ║
-- ║   2. incm_produtos — espelho do catálogo de Moedas da loja oficial INCM     ║
-- ║      (loja.incm.pt/products.json), fonte livre para novas emissões PT.      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─── 1. Histórico de valor de mercado ────────────────────────────────────────
create table if not exists numis.precos_mercado_hist (
  id                uuid primary key default gen_random_uuid(),
  catalog_issue_id  uuid not null references numis.catalog_issues(id) on delete cascade,
  grau              text,
  valor             numeric(12,2) not null,
  moeda             text not null default 'EUR',
  fonte             text not null default 'Numista',
  data              timestamptz not null default now()
);
create index if not exists precos_mercado_hist_issue_idx
  on numis.precos_mercado_hist (catalog_issue_id, data desc);

alter table numis.precos_mercado_hist enable row level security;
create policy "Historico de precos e publico"
  on numis.precos_mercado_hist for select using (true);
grant select on numis.precos_mercado_hist to anon, authenticated;

-- ─── 2. Catálogo INCM (loja oficial) ─────────────────────────────────────────
create table if not exists numis.incm_produtos (
  id               uuid primary key default gen_random_uuid(),
  sku              text unique not null,           -- variants[].sku (idempotência)
  titulo           text not null,
  preco_emissao    numeric(12,2),                  -- preço de loja (NÃO é valor de mercado)
  moeda            text default 'EUR',
  ano              integer,
  valor_facial     numeric(12,2),
  material         text,
  product_type     text,
  imagem_url       text,
  produto_url      text,
  tags             text[],
  ativo            boolean default true,
  incm_id          bigint,                          -- Shopify product id (para since_id)
  incm_updated_at  timestamptz,                     -- updated_at do produto (delta)
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists incm_produtos_ano_idx on numis.incm_produtos (ano);
create index if not exists incm_produtos_incm_id_idx on numis.incm_produtos (incm_id);

create trigger incm_produtos_updated_at
  before update on numis.incm_produtos
  for each row execute function numis.set_updated_at();

alter table numis.incm_produtos enable row level security;
create policy "Catalogo INCM e publico"
  on numis.incm_produtos for select using (true);
grant select on numis.incm_produtos to anon, authenticated;
