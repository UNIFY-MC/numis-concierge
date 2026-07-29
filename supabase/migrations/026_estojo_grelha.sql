-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Grelha física do estojo (linhas × colunas por folha) e posição exacta     ║
-- ║  de cada moeda. Um álbum/dossier tem folhas iguais (ex.: 4×3); cada moeda  ║
-- ║  ocupa UMA casa. Duas moedas iguais em casas diferentes são duas linhas —  ║
-- ║  por isso cai o unique (collection_id, estojo_id) que as obrigava a somar. ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter table numis.estojos
  add column if not exists linhas  int check (linhas  is null or linhas  between 1 and 50),
  add column if not exists colunas int check (colunas is null or colunas between 1 and 50);

alter table numis.colecao_estojo
  add column if not exists folha  int,
  add column if not exists linha  int,
  add column if not exists coluna int;

-- Uma alocação por (exemplar, estojo) deixa de valer: o mesmo exemplar pode
-- ocupar várias casas do mesmo estojo.
alter table numis.colecao_estojo
  drop constraint if exists colecao_estojo_collection_id_estojo_id_key;

-- Uma casa (folha, linha, coluna) só tem uma moeda. Linhas sem posição ficam
-- de fora do índice (exemplares "no estojo" mas ainda por arrumar).
create unique index if not exists colecao_estojo_casa_uk
  on numis.colecao_estojo (estojo_id, coalesce(folha, 1), linha, coluna)
  where linha is not null and coluna is not null;

create index if not exists colecao_estojo_posicao_idx
  on numis.colecao_estojo (estojo_id, folha, linha, coluna);
