-- 014 — Formatos de posse alinhados com os acabamentos INCM
--
-- set/caderneta/caderneta_bebe eram ambíguos. O Conjunto/Série Anual vende-se em
-- carteira FDC, carteira Bebé, BNC e Proof; as avulsas usam BNC/Proof. Decisão do
-- dono: 'set'≡BNC, 'caderneta'≡Carteira FDC. Backup em numis.bk_formato_20260605.

alter table numis.collection drop constraint if exists collection_formato_posse_check;

update numis.collection set formato_posse = 'bnc'           where formato_posse = 'set';
update numis.collection set formato_posse = 'carteira_fdc'  where formato_posse = 'caderneta';
update numis.collection set formato_posse = 'carteira_bebe' where formato_posse = 'caderneta_bebe';

alter table numis.collection add constraint collection_formato_posse_check
  check (formato_posse = any (array['carteira_fdc','carteira_bebe','bnc','proof','circulacao','slab','outro']));
