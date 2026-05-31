create table if not exists moedas (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  pais          text not null,
  ano           integer,
  valor_facial  text,
  metal         text,
  estado        text check (estado in ('VF', 'XF', 'AU', 'UNC', 'PF')),
  notas         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger moedas_updated_at
  before update on moedas
  for each row execute function set_updated_at();

-- RLS (descomentar quando tiver auth):
-- alter table moedas enable row level security;
