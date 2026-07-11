-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Estojos (localização física) + alocação de exemplares a estojos.          ║
-- ║  A collection NÃO muda: continua 1 linha por (issue, formato). A tabela     ║
-- ║  de alocação distribui os exemplares dessa linha por um ou mais estojos,    ║
-- ║  permitindo a mesma moeda em estojos diferentes.                            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table numis.estojos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  nome        text not null,
  tipo        text,                    -- 'album' | 'caixa' | 'moldura' | 'capsula' | 'outro' (livre)
  descricao   text,
  cor         text,                    -- opcional, para chip visual
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, nome)
);

create table numis.colecao_estojo (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  collection_id uuid not null references numis.collection(id) on delete cascade,
  estojo_id     uuid not null references numis.estojos(id) on delete cascade,
  quantidade    integer not null default 1 check (quantidade > 0),
  nota          text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (collection_id, estojo_id)    -- uma alocação por (exemplar, estojo)
);

create index on numis.estojos(user_id);
create index on numis.colecao_estojo(user_id);
create index on numis.colecao_estojo(estojo_id);
create index on numis.colecao_estojo(collection_id);

create trigger estojos_updated_at
  before update on numis.estojos
  for each row execute function numis.set_updated_at();
create trigger colecao_estojo_updated_at
  before update on numis.colecao_estojo
  for each row execute function numis.set_updated_at();

-- ─── RLS: cada um vê/gere os seus; o admin lê tudo ──────────────────────────
alter table numis.estojos enable row level security;
create policy "Gerir próprios estojos" on numis.estojos
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admin vê todos os estojos" on numis.estojos
  for select to authenticated using (numis.is_admin());

alter table numis.colecao_estojo enable row level security;
create policy "Gerir próprias alocações" on numis.colecao_estojo
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admin vê todas as alocações" on numis.colecao_estojo
  for select to authenticated using (numis.is_admin());

grant select, insert, update, delete on numis.estojos to authenticated;
grant select, insert, update, delete on numis.colecao_estojo to authenticated;
