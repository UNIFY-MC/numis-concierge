-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Área de administração — o admin vê tudo.                                   ║
-- ║  is_admin() (SECURITY DEFINER) evita recursão de RLS ao ler profiles.       ║
-- ║  Política extra na collection: além do own-row, o admin lê todas as         ║
-- ║  colecções. RPC admin_collectors() devolve o resumo por colecionador,       ║
-- ║  gated internamente por is_admin() (não-admins obtêm zero linhas).          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create or replace function numis.is_admin()
returns boolean
language sql
stable
security definer
set search_path = numis, public
as $$
  select coalesce((select p.is_admin from numis.profiles p where p.id = auth.uid()), false);
$$;

grant execute on function numis.is_admin() to authenticated;

-- O admin lê toda a colecção (soma-se ao own-row existente; RLS é permissiva/OR).
drop policy if exists "Admin vê toda a colecção" on numis.collection;
create policy "Admin vê toda a colecção"
  on numis.collection for select to authenticated
  using (numis.is_admin());

-- Resumo por colecionador para o painel admin (uma chamada, sem puxar linhas).
create or replace function numis.admin_collectors()
returns table (
  id uuid, nome text, username text, plano text, is_admin boolean,
  criado_em timestamptz, moedas bigint, paises bigint
)
language sql
stable
security definer
set search_path = numis, public
as $$
  select p.id, p.nome, p.username, p.plano, p.is_admin, p.created_at,
         coalesce(s.moedas, 0), coalesce(s.paises, 0)
  from numis.profiles p
  left join (
    select c.user_id,
           count(*) filter (where c.quantidade > 0) as moedas,
           count(distinct k.pais_codigo) filter (where c.quantidade > 0) as paises
    from numis.collection c
    join numis.catalog_coins k on k.id = c.catalog_coin_id
    group by c.user_id
  ) s on s.user_id = p.id
  where numis.is_admin()
  order by coalesce(s.moedas, 0) desc;
$$;

grant execute on function numis.admin_collectors() to authenticated;

-- Detalhe de um colecionador: colecção agregada por país (para /admin/utilizador/[id]).
create or replace function numis.admin_collector_paises(uid uuid)
returns table (pais_codigo text, pais_nome text, moedas bigint, exemplares bigint)
language sql
stable
security definer
set search_path = numis, public
as $$
  select k.pais_codigo,
         max(k.pais_nome) as pais_nome,
         count(*) filter (where c.quantidade > 0) as moedas,
         coalesce(sum(c.quantidade), 0) as exemplares
  from numis.collection c
  join numis.catalog_coins k on k.id = c.catalog_coin_id
  where c.user_id = uid and numis.is_admin()
  group by k.pais_codigo
  order by count(*) filter (where c.quantidade > 0) desc;
$$;

grant execute on function numis.admin_collector_paises(uuid) to authenticated;
