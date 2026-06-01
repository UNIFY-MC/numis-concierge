-- Fotos por variante (ano × casa da moeda) quando a Numista as fornecer ao nível
-- do issue. Aditiva e nullable: se a API só der foto genérica do tipo, ficam null
-- e a UI cai na foto do catalog_coins (referência) ou na foto do próprio utilizador.

alter table numis.catalog_issues
  add column if not exists anverso_img text,
  add column if not exists reverso_img text;
