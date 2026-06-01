-- Texto de enquadramento por país (introdução mostrada no topo do detalhe).
-- Fonte: páginas nacionais oficiais do BCE (/euro/coins/html/{cc}.pt.html).
-- Preenchida uma vez pelo script scripts/bce-enquadramento.mjs (service role).
-- Leitura pública (anon) para a app a ler em runtime.

create table if not exists numis.pais_enquadramento (
  pais_codigo  text        primary key,
  titulo       text,
  introducao   text,
  fonte        text        not null default 'BCE',
  updated_at   timestamptz not null default now()
);

alter table numis.pais_enquadramento enable row level security;

drop policy if exists "leitura publica" on numis.pais_enquadramento;
create policy "leitura publica" on numis.pais_enquadramento
  for select using (true);
