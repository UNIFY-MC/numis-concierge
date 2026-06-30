-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Raridade por issue (ano × casa). A raridade é da emissão concreta, não do  ║
-- ║  tipo — ex.: o 1 Centavo KM#565 é comum em 1917-1921 mas o de 1922 é uma    ║
-- ║  raridade de topo (Gomes R01.06, ~6 exemplares). Fica no catálogo mesmo     ║
-- ║  quando não se possui, com etiqueta de raridade.                            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
alter table numis.catalog_issues
  add column if not exists raridade text,        -- 'R' | 'RR' | 'RRR' | texto curto
  add column if not exists raridade_nota text;   -- referência (Gomes/Vaz) + nº conhecido
