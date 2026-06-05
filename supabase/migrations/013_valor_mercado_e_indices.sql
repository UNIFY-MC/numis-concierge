-- 013 — Valor de mercado + performance da página Moedas
--
-- (a) A página Moedas carrega o catálogo todo (12k+ moedas) ordenado por pais_nome
--     com paginação por OFFSET. Sem índice em pais_nome a query excedia o
--     statement_timeout do PostgREST ("canceling statement due to statement
--     timeout"). Índice (pais_nome, id) resolve o ORDER BY/OFFSET.
-- (b) Margem extra no statement_timeout dos roles da API.
-- (c) Valor de mercado por issue (importado da Numista por scripts/precos-numista.mjs).

create index if not exists catalog_coins_pais_nome_idx
  on numis.catalog_coins (pais_nome, id);

alter role anon set statement_timeout = '20s';
alter role authenticated set statement_timeout = '20s';

alter table numis.catalog_issues
  add column if not exists valor_mercado numeric(12,2),       -- valor representativo (grau alto)
  add column if not exists valor_mercado_grau text,           -- grau a que se refere
  add column if not exists valor_mercado_moeda text default 'EUR',
  add column if not exists valor_mercado_data timestamptz,    -- quando foi importado
  add column if not exists valor_mercado_fonte text,          -- 'Numista', etc.
  add column if not exists precos_mercado jsonb;              -- mapa grau→valor completo
