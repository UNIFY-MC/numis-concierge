-- Localização física do estojo (ex.: Cofre, Casa do pai, Sala). Permite ter o
-- controlo de quantas moedas há em cada estojo e em cada localização.
alter table numis.estojos add column if not exists localizacao text;
