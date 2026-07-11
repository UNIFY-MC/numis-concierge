-- Lista de países presentes no catálogo (para a pesquisa em cascata, sem trazer linhas).
create or replace function numis.paises_catalogo()
returns table (pais_codigo text, pais_nome text, total bigint)
language sql
stable
security definer
set search_path = numis, public
as $$
  select pais_codigo, max(pais_nome) as pais_nome, count(*) as total
  from numis.catalog_coins
  where pais_codigo is not null and pais_codigo <> ''
  group by pais_codigo
  order by max(pais_nome);
$$;

grant execute on function numis.paises_catalogo() to anon, authenticated;
