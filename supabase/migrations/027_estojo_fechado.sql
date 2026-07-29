-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Estojo fechado: trinco contra edições distraídas, com PIN de 4 dígitos.   ║
-- ║  O PIN nunca sai da BD — vive em hash e só as funções o comparam. Fechar   ║
-- ║  não é segurança (4 dígitos e RLS de dono), é um trinco: com o estojo      ║
-- ║  fechado a própria BD recusa mexer nas casas.                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter table numis.estojos
  add column if not exists fechado  boolean not null default false,
  add column if not exists pin_hash text;

-- Fecha o estojo e grava o PIN (hash com o id do estojo como sal).
create or replace function numis.estojo_trancar(p_id uuid, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = numis, extensions, public
as $$
declare v_owner uuid;
begin
  if p_pin !~ '^[0-9]{4}$' then return false; end if;
  select user_id into v_owner from numis.estojos where id = p_id;
  if v_owner is null or v_owner <> auth.uid() then return false; end if;

  perform set_config('numis.trinco', '1', true);
  update numis.estojos
     set fechado = true,
         pin_hash = encode(digest(p_id::text || ':' || p_pin, 'sha256'), 'hex')
   where id = p_id;
  perform set_config('numis.trinco', '0', true);
  return true;
end;
$$;

-- Reabre o estojo se o PIN bater certo.
create or replace function numis.estojo_destrancar(p_id uuid, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = numis, extensions, public
as $$
declare v_owner uuid; v_hash text;
begin
  select user_id, pin_hash into v_owner, v_hash from numis.estojos where id = p_id;
  if v_owner is null or v_owner <> auth.uid() then return false; end if;
  if v_hash is distinct from encode(digest(p_id::text || ':' || p_pin, 'sha256'), 'hex') then
    return false;
  end if;

  perform set_config('numis.trinco', '1', true);
  update numis.estojos set fechado = false where id = p_id;
  perform set_config('numis.trinco', '0', true);
  return true;
end;
$$;

-- O estado do trinco só muda pelas funções acima (que exigem o PIN).
create or replace function numis.estojo_guarda_trinco()
returns trigger language plpgsql as $$
begin
  if new.fechado is distinct from old.fechado
     and coalesce(current_setting('numis.trinco', true), '0') <> '1' then
    raise exception 'O trinco do estojo muda com o PIN.';
  end if;
  if old.fechado and coalesce(current_setting('numis.trinco', true), '0') <> '1' then
    raise exception 'Estojo fechado: reabre-o para o editar.';
  end if;
  return new;
end;
$$;

drop trigger if exists estojos_guarda_trinco on numis.estojos;
create trigger estojos_guarda_trinco
  before update on numis.estojos
  for each row execute function numis.estojo_guarda_trinco();

-- Estojo fechado não recebe nem larga moedas.
create or replace function numis.colecao_estojo_guarda_trinco()
returns trigger language plpgsql as $$
declare v_id uuid;
begin
  v_id := coalesce(new.estojo_id, old.estojo_id);
  if exists (select 1 from numis.estojos where id = v_id and fechado) then
    raise exception 'Estojo fechado: reabre-o para mexer nas casas.';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists colecao_estojo_guarda_trinco on numis.colecao_estojo;
create trigger colecao_estojo_guarda_trinco
  before insert or update or delete on numis.colecao_estojo
  for each row execute function numis.colecao_estojo_guarda_trinco();

grant execute on function numis.estojo_trancar(uuid, text)    to authenticated;
grant execute on function numis.estojo_destrancar(uuid, text) to authenticated;
