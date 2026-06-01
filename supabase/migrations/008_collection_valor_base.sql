-- Aditiva: valor-base por exemplar (override do valor_facial no CoinSheet).
-- null → usar catalog_coins.valor_facial. O grau de conservação vive em collection.grau.
alter table numis.collection add column if not exists valor_base numeric;
