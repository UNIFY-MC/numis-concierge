-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Número Gomes (catálogo Alberto Gomes, "Moedas Portuguesas e do Território ║
-- ║  que Hoje é Portugal") em coluna própria — não deve poluir km_ref (KM# de   ║
-- ║  Krause). Formato: prefixo de reinado + nº + variante decimal (ex.:         ║
-- ║  "Se 30", "F1 06.01"). Aditiva e idempotente.                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
alter table numis.catalog_coins
  add column if not exists gomes_ref text;   -- nº Gomes (sem o prefixo textual "Gomes ")
