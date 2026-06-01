-- Casa da moeda registada pelo utilizador, por exemplar.
-- O catálogo (catalog_issues) não distingue casa para a maioria dos países;
-- só o coleccionador sabe que casa tem (ex. Alemanha A/D/F/G/J). Guardar aqui
-- permite agrupar a coleção alemã por casa sem inflar o catálogo com slots vazios.
alter table numis.collection
  add column if not exists casa_moeda text;
