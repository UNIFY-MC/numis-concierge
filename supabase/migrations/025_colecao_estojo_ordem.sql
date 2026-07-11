-- Ordem/posição da moeda dentro do estojo (1,2,3…) para replicar a arrumação física
-- e permitir entrada rápida em linha (o nº de ordem aparece à esquerda).
alter table numis.colecao_estojo add column if not exists ordem int;

with numer as (
  select id, row_number() over (partition by estojo_id order by created_at, id) as rn
  from numis.colecao_estojo
)
update numis.colecao_estojo ce
set ordem = numer.rn
from numer
where numer.id = ce.id and ce.ordem is null;
