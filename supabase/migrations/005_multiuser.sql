-- Arquitectura multi-utilizador
-- Adiciona profiles + user_id às tabelas pessoais + RLS preparada (inactiva até auth estar ligado)

-- ─── PERFIS DE UTILIZADOR ────────────────────────────────────────────────────
-- Espelha auth.users — criado automaticamente no registo via trigger
create table numis.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  username            text unique,             -- @joao_numis
  nome                text,
  avatar_url          text,
  pais                text default 'pt',
  bio                 text,
  website             text,

  -- Reputação de trocas
  swaps_concluidos    integer default 0,
  swaps_cancelados    integer default 0,
  rating_medio        decimal(3,2),            -- 1.00 a 5.00

  -- Plano de subscrição
  plano               text default 'free'
                      check (plano in ('free','pro','business')),
  plano_ate           timestamptz,             -- null = sem expiração (free)

  -- Preferências
  aceita_trocas       boolean default true,
  pais_envio          text[],                  -- países para onde envia
  metodo_envio_pref   text default 'registado',

  -- Stats públicos (actualizados por triggers/funções)
  total_colecao       integer default 0,
  total_paises        integer default 0,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create trigger profiles_updated_at
  before update on numis.profiles
  for each row execute function numis.set_updated_at();

-- Trigger: cria perfil automaticamente quando um utilizador se regista
create or replace function numis.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into numis.profiles (id, nome, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function numis.handle_new_user();

-- ─── ADICIONAR user_id ÀS TABELAS PESSOAIS ───────────────────────────────────
alter table numis.collection
  add column user_id uuid references auth.users(id) on delete cascade;

alter table numis.wishlists
  add column user_id uuid references auth.users(id) on delete cascade;

-- Swaps precisam de duas partes
alter table numis.swaps
  add column utilizador_origem_id  uuid references auth.users(id),
  add column utilizador_destino_id uuid references auth.users(id);

-- ─── ÍNDICES ──────────────────────────────────────────────────────────────────
create index on numis.collection(user_id);
create index on numis.wishlists(user_id);
create index on numis.swaps(utilizador_origem_id);
create index on numis.swaps(utilizador_destino_id);
create index on numis.profiles(username);
create index on numis.profiles(plano);

-- ─── ROW LEVEL SECURITY (preparada — activar quando auth estiver ligado) ─────
-- Colecção: utilizador vê a sua + para_troca público
alter table numis.collection enable row level security;
create policy "Ver própria colecção"
  on numis.collection for select
  using (auth.uid() = user_id);
create policy "Editar própria colecção"
  on numis.collection for all
  using (auth.uid() = user_id);
create policy "Para troca é pública"
  on numis.collection for select
  using (para_troca = true);

-- Wishlist: só o dono vê
alter table numis.wishlists enable row level security;
create policy "Ver própria wishlist"
  on numis.wishlists for select
  using (auth.uid() = user_id);
create policy "Editar própria wishlist"
  on numis.wishlists for all
  using (auth.uid() = user_id);

-- Swaps: as duas partes vêem
alter table numis.swaps enable row level security;
create policy "Ver trocas em que participa"
  on numis.swaps for select
  using (auth.uid() = utilizador_origem_id or auth.uid() = utilizador_destino_id);
create policy "Criar troca"
  on numis.swaps for insert
  with check (auth.uid() = utilizador_origem_id);
create policy "Actualizar troca em que participa"
  on numis.swaps for update
  using (auth.uid() = utilizador_origem_id or auth.uid() = utilizador_destino_id);

-- Perfis: leitura pública, edição só pelo dono
alter table numis.profiles enable row level security;
create policy "Perfis são públicos"
  on numis.profiles for select using (true);
create policy "Editar próprio perfil"
  on numis.profiles for update
  using (auth.uid() = id);

-- Catálogo e KB são públicos (leitura global, escrita apenas admin via service_role)
alter table numis.catalog_coins enable row level security;
create policy "Catálogo público"
  on numis.catalog_coins for select using (true);

alter table numis.catalog_issues enable row level security;
create policy "Issues públicas"
  on numis.catalog_issues for select using (true);

alter table numis.knowledge_base enable row level security;
create policy "Artigos publicados são públicos"
  on numis.knowledge_base for select
  using (publicado = true);

-- Grants para anon e authenticated
grant usage on schema numis to anon, authenticated;
grant select on numis.catalog_coins, numis.catalog_issues, numis.knowledge_base to anon, authenticated;
grant select on numis.profiles to anon, authenticated;
grant all on numis.collection, numis.wishlists, numis.swaps, numis.swap_items to authenticated;
grant all on numis.profiles to authenticated;
