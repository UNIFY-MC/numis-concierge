-- "Caderneta de cromos" da Alemanha: gera o álbum completo com um espaço por
-- cada casa da moeda (A/D/F/G/J) para cada moeda alemã. São slots vazios — a
-- coleção existente continua nos issues originais (casa null = "por atribuir")
-- até ser re-colocada na casa certa. Idempotente (NOT EXISTS evita duplicados).
--
-- Modelo de dados: a collection indexa por catalog_issue_id, logo cada casa
-- precisa do seu próprio issue para se poder ter A e D do mesmo ano/denominação.

insert into numis.catalog_issues
  (catalog_coin_id, ano, ano_gregoriano, casa_moeda, anverso_img, reverso_img, etiqueta, html_est0, html_qf)
select
  i.catalog_coin_id,
  i.ano,
  i.ano_gregoriano,
  m.casa,
  i.anverso_img,
  i.reverso_img,
  'Casa ' || m.casa,
  0,
  1
from numis.catalog_issues i
join numis.catalog_coins c on c.id = i.catalog_coin_id
cross join (values ('A'), ('D'), ('F'), ('G'), ('J')) as m(casa)
where c.pais_codigo = 'de'
  and i.casa_moeda is null
  and not exists (
    select 1 from numis.catalog_issues x
    where x.catalog_coin_id = i.catalog_coin_id
      and x.ano = i.ano
      and x.casa_moeda = m.casa
  );
