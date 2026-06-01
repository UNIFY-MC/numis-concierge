-- Limpa schema anterior e cria arquitectura completa
-- catalog_coins → catalog_issues → collection → wishlists → swaps → swap_items → knowledge_base

drop table if exists numis.moedas cascade;

-- Função updated_at no schema numis
create or replace function numis.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ─── 1. CATÁLOGO GLOBAL DE TIPOS DE MOEDA ───────────────────────────────────
create table numis.catalog_coins (
  id              uuid primary key default gen_random_uuid(),

  -- Identificação
  titulo          text not null,
  categoria       text not null default 'coin'
                  check (categoria in ('coin','banknote','token','exonumia')),

  -- Emissor
  pais_codigo     text not null,   -- 'pt', 'de', 'fr' …
  pais_nome       text not null,   -- 'Portugal', 'Alemanha' …

  -- Valor
  valor_facial    decimal(10,4),
  unidade         text default 'Euro',
  moeda_codigo    text default 'EUR',
  denominacao     text,            -- '2 Euro', '50 Cent', '1 Euro'

  -- Tipo de emissão
  tipo_emissao    text check (tipo_emissao in
                  ('Circulação','Comemorativa','Proof','BU','Piéfort','Essai')),
  comemorativa    boolean default false,
  serie           text,            -- 'Capitais Europeias da Cultura'
  tema            text,            -- 'Guimarães 2012'

  -- Especificações físicas
  composicao      text,
  metal           text,            -- 'Bimetálica','Nordic Gold','Cobre','Prata','Ouro'
  diametro_mm     decimal(6,2),
  espessura_mm    decimal(6,2),
  peso_g          decimal(8,4),
  pureza          integer,         -- milésimos, só para metais preciosos
  forma           text default 'Redonda',

  -- Design
  anverso_desc    text,
  reverso_desc    text,
  orla_tipo       text check (orla_tipo in
                  ('milled','plain','lettered','security','alternating')),
  orla_desc       text,

  -- Produção
  casa_moeda      text,
  mintmark        text,

  -- Referências cruzadas
  km_ref          text,            -- 'KM#791'
  schon_ref       text,
  numista_id      integer unique,  -- ID na Numista API

  -- Imagens
  anverso_img     text,
  reverso_img     text,

  -- Euro específico
  face_comum      text,            -- 'Versão 1 (1999-2006)' | 'Versão 2 (2007+)'
  demonetizada    boolean default false,

  -- Legacy (migração HTML)
  html_rank       integer,         -- 0-7 standard, 20 comems

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─── 2. VARIANTES POR ANO / CASA DA MOEDA ───────────────────────────────────
create table numis.catalog_issues (
  id                uuid primary key default gen_random_uuid(),
  catalog_coin_id   uuid not null
                    references numis.catalog_coins(id) on delete cascade,

  ano               text not null,       -- text para '2022 bebé', '2023 r'
  ano_gregoriano    integer,             -- para ordenação e filtros
  casa_moeda        text,
  mintmark_variante text,

  tiragem           bigint,
  tiragem_proof     bigint,
  tiragem_bu        bigint,

  data_emissao      date,
  numista_issue_id  integer,

  -- Campos legacy do HTML
  etiqueta          text,                -- 'Set.', 'C-9 moe', 'Carteira'
  html_est0         smallint default 0
                    check (html_est0 in (0,1,2)),
  html_obs          text,
  html_qf           smallint default 1,
  html_verde        boolean default false,

  notas             text,
  created_at        timestamptz default now()
);

-- ─── 3. COLECÇÃO PESSOAL ────────────────────────────────────────────────────
create table numis.collection (
  id                    uuid primary key default gen_random_uuid(),

  catalog_coin_id       uuid not null
                        references numis.catalog_coins(id),
  catalog_issue_id      uuid
                        references numis.catalog_issues(id),

  -- Posse
  quantidade            integer not null default 1 check (quantidade >= 0),
  formato_posse         text check (formato_posse in
                        ('set','caderneta','carteira','circulacao','proof','slab','outro')),

  -- Conservação
  grau                  text,            -- 'MS-65', 'UNC', 'VF', 'FDC', 'BU'
  grau_sistema          text default 'Europeu'
                        check (grau_sistema in ('Sheldon','Europeu','Simplificado')),
  certificador          text,            -- 'PCGS', 'NGC', null
  numero_certificacao   text,

  -- Troca
  para_troca            boolean default false,
  nota_publica          text,

  -- Aquisição
  preco_compra          decimal(10,2),
  moeda_compra          text default 'EUR',
  data_compra           date,
  local_compra          text,

  -- Notas
  nota_privada          text,
  armazenamento         text,            -- 'Álbum A, folha 3'
  defecto               text,
  rating                smallint check (rating between 1 and 5),

  -- Fotos pessoais
  foto1                 text,
  foto2                 text,
  foto3                 text,

  -- Legacy migração HTML
  html_catalog_index    integer,         -- índice no array RAW original

  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ─── 4. WISHLIST / DESIDERATIVOS ────────────────────────────────────────────
create table numis.wishlists (
  id                uuid primary key default gen_random_uuid(),
  catalog_coin_id   uuid not null
                    references numis.catalog_coins(id),
  catalog_issue_id  uuid
                    references numis.catalog_issues(id),

  grau_minimo       text default 'VF',
  quantidade        integer default 1,
  preco_max_eur     decimal(8,2),
  aceita_troca      boolean default true,
  aceita_compra     boolean default false,
  prioridade        smallint default 2
                    check (prioridade in (1,2,3)),  -- 1=alta 2=média 3=baixa
  nota              text,
  activo            boolean default true,

  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ─── 5. TROCAS / SWAPS ──────────────────────────────────────────────────────
create table numis.swaps (
  id                    uuid primary key default gen_random_uuid(),
  referencia            text unique,             -- 'SWAP-2024-001'

  estado                text not null default 'proposta'
                        check (estado in (
                          'rascunho','proposta','confirmada',
                          'enviada','recebida','concluida',
                          'cancelada','disputada'
                        )),

  quem_envia_primeiro   text
                        check (quem_envia_primeiro in ('origem','destino','simultaneo')),
  mensagem_proposta     text,

  tracking_origem       text,
  tracking_destino      text,

  -- Avaliações pós-conclusão
  rating_dado_origem    smallint check (rating_dado_origem between 1 and 5),
  rating_dado_destino   smallint check (rating_dado_destino between 1 and 5),
  comentario_origem     text,
  comentario_destino    text,

  -- Ciclo de vida
  proposta_em           timestamptz,
  confirmada_em         timestamptz,
  enviada_em            timestamptz,
  concluida_em          timestamptz,
  cancelada_em          timestamptz,

  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ─── 6. ITENS DE CADA TROCA ─────────────────────────────────────────────────
create table numis.swap_items (
  id                uuid primary key default gen_random_uuid(),
  swap_id           uuid not null
                    references numis.swaps(id) on delete cascade,
  collection_id     uuid references numis.collection(id),
  catalog_coin_id   uuid not null
                    references numis.catalog_coins(id),
  catalog_issue_id  uuid references numis.catalog_issues(id),

  direccao          text not null
                    check (direccao in ('oferece','recebe')),
  quantidade        integer default 1,
  grau_acordado     text,
  nota              text
);

-- ─── 7. BASE DE CONHECIMENTO / FORMAÇÃO / FAQ ───────────────────────────────
create table numis.knowledge_base (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  categoria   text not null check (categoria in (
                'grading','glossario','trocas','euro',
                'identificacao','historia','faq','guia'
              )),
  titulo      text not null,
  corpo       text not null,   -- Markdown
  nivel       text default 'iniciante'
              check (nivel in ('iniciante','intermedio','avancado')),
  tags        text[] default '{}',
  publicado   boolean default false,
  ordem       integer default 0,

  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── ÍNDICES ─────────────────────────────────────────────────────────────────
create index on numis.catalog_coins(pais_codigo);
create index on numis.catalog_coins(comemorativa);
create index on numis.catalog_coins(numista_id);
create index on numis.catalog_coins(tipo_emissao);
create index on numis.catalog_issues(catalog_coin_id);
create index on numis.catalog_issues(ano_gregoriano);
create index on numis.catalog_issues(html_est0);
create index on numis.collection(catalog_coin_id);
create index on numis.collection(catalog_issue_id);
create index on numis.collection(para_troca);
create index on numis.wishlists(catalog_coin_id);
create index on numis.wishlists(activo);
create index on numis.swaps(estado);
create index on numis.knowledge_base(categoria);
create index on numis.knowledge_base(publicado);

-- ─── TRIGGERS updated_at ─────────────────────────────────────────────────────
create trigger catalog_coins_updated_at
  before update on numis.catalog_coins
  for each row execute function numis.set_updated_at();

create trigger collection_updated_at
  before update on numis.collection
  for each row execute function numis.set_updated_at();

create trigger wishlists_updated_at
  before update on numis.wishlists
  for each row execute function numis.set_updated_at();

create trigger swaps_updated_at
  before update on numis.swaps
  for each row execute function numis.set_updated_at();

create trigger knowledge_base_updated_at
  before update on numis.knowledge_base
  for each row execute function numis.set_updated_at();

-- ─── SEED INICIAL: knowledge_base ────────────────────────────────────────────
insert into numis.knowledge_base (slug, categoria, titulo, corpo, nivel, tags, publicado, ordem) values
(
  'escala-conservacao-europeia',
  'grading',
  'Escala de Conservação Europeia',
  '# Escala de Conservação para Moedas Euro

A conservação de uma moeda determina o seu valor de mercado. Para moedas Euro modernas usa-se principalmente a escala europeia descritiva.

## Escala Simplificada (moedas Euro correntes)

| Grau | Nome | Descrição |
|------|------|-----------|
| **Proof / PP** | Prova | Técnica especial: espelhos e relevos acetinados. Máxima qualidade. |
| **FDC** | Flor de Cunho | Brilho original intacto, sem qualquer marca. ≈ MS-65/70 |
| **BU** | Brilhante Não Circulada | Cunhagem superior, brilho pleno com marcas mínimas. ≈ MS-64 |
| **UNC / NC** | Não Circulada | Nunca circulou mas com marcas de manuseio. ≈ MS-60/63 |
| **AU** | Soberba | Vestígios mínimos de circulação, brilho quase intacto. |
| **XF / EF** | Excelente | Desgaste muito ligeiro nos pontos mais altos. |
| **VF** | Muito Bom | Desgaste leve e uniforme, todos os detalhes visíveis. |
| **F** | Bom | Desgaste moderado mas legível. |
| **VG** | Razoável | Desgaste acentuado, design ainda identificável. |
| **G** | Mau | Muito desgastada, só identificável. |

## Para Moedas Euro de Circulação

A maioria das moedas Euro de uso diário encontra-se entre **VF** e **UNC**. Moedas em **sets oficiais** são normalmente **BU** ou **Proof**.

## Equivalência com Escala Sheldon (americana)

| Europeu | Sheldon |
|---------|---------|
| FDC | MS-65 a MS-70 |
| BU | MS-63 a MS-65 |
| UNC | MS-60 a MS-63 |
| AU | AU-50 a AU-58 |
| XF | EF-40 a EF-45 |
| VF | VF-20 a VF-35 |
| F | F-12 a F-15 |
',
  'iniciante',
  ARRAY['grading', 'conservação', 'escala', 'euro'],
  true,
  1
),
(
  'glossario-numismatico',
  'glossario',
  'Glossário Numismático',
  '# Glossário Numismático

## Termos Essenciais

**Anverso** — Frente da moeda (cara). Nas moedas Euro: o lado nacional.

**Reverso** — Verso da moeda (coroa). Nas moedas Euro: o lado europeu comum.

**Orla** — Contorno lateral da moeda. Pode ser serrilhada (milled), lisa (plain) ou gravada (lettered).

**Mintmark** — Marca da casa da moeda. Ex: `INCM` em Portugal, `A/D/F/G/J` na Alemanha (5 casas).

**BU** *(Brilliant Uncirculated)* — Moeda não circulada com acabamento brilhante superior.

**FDC** *(Flor de Cunho / Fleur de Coin)* — Máxima qualidade de cunhagem, perfeita.

**Proof / PP** — Moeda produzida com técnica especial: cunho polido + relevos foscos. Espelhos perfeitos.

**KM#** — Número do catálogo Krause-Mishler (*Standard Catalog of World Coins*). Referência universal.

**Tiragem / Mintage** — Número de exemplares produzidos. Ex: 1.000.000 unidades.

**Comemorativa** — Moeda emitida para assinalar um evento. Nas zonas Euro, só o €2 pode ser comemorativo.

**Nordic Gold** — Liga usada nas moedas de 10, 20 e 50 cêntimos (89% cobre, 5% alumínio, 5% zinco, 1% estanho).

**Bimetálica** — Moeda com dois metais diferentes (anel + núcleo). Usada em €1 e €2.

**Piéfort** — Variante de colecionador com espessura dupla da moeda normal.

**Set oficial** — Conjunto das 8 denominações Euro de um país/ano, embaladas pela casa da moeda.

**Caderneta / Booklet** — Embalagem em formato de livro com as moedas em plástico.

**Swap / Troca** — Permuta de moedas entre colecionadores.

**Wantlist / Desiderativo** — Lista de moedas que o colecionador procura adquirir.
',
  'iniciante',
  ARRAY['glossario', 'termos', 'definições'],
  true,
  2
),
(
  'como-fazer-trocas',
  'trocas',
  'Como Fazer Trocas de Moedas',
  '# Como Fazer Trocas de Moedas

As trocas (swaps) são uma forma excelente de completar a colecção sem custos.

## Princípios Básicos

1. **Propõe trocas equilibradas** — Moedas de valor semelhante (face value ou de mercado)
2. **Sê específico sobre o estado** — Indica sempre o grau de conservação
3. **Confirma o acordo** — Ambas as partes devem confirmar antes de enviar

## Processo de Troca

### 1. Encontrar Parceiro
- Consulta a wishlist de outros colecionadores
- Verifica se tens moedas que eles procuram
- Verifica se eles têm moedas que precisas

### 2. Proposta
- Indica as moedas que ofereces e as que queres
- Menciona o estado de conservação de cada moeda
- Inclui uma mensagem simpática

### 3. Acordo
- Combinam quem envia primeiro (ou envio simultâneo)
- Registam o método de envio (carta simples, registada, expresso)

### 4. Envio
- Protege bem as moedas (cápsulas, esferovite, bolsa almofadada)
- Guarda o comprovativo de envio
- Regista o número de tracking se disponível

### 5. Confirmação
- Confirma a recepção quando as moedas chegarem
- Deixa uma avaliação do parceiro

## Boas Práticas

✅ Usa cápsulas ou cartões de 2x2 para proteger as moedas
✅ Forra o interior do envelope com cartão rígido
✅ Para moedas valiosas, usa sempre envio registado
✅ Fotografa as moedas antes de enviar (prova do estado)
❌ Não envies moedas valiosas em carta simples
❌ Não limpes as moedas antes de enviar (destrói o valor)
',
  'iniciante',
  ARRAY['trocas', 'swaps', 'envio', 'guia'],
  true,
  3
),
(
  'moedas-euro-especificacoes',
  'euro',
  'Especificações Técnicas das Moedas Euro',
  '# Especificações Técnicas das Moedas Euro

Definidas pelo Regulamento EC 975/98 do Parlamento Europeu.

## Tabela de Especificações

| Denominação | Diâmetro | Espessura | Peso | Metal | Cor |
|-------------|----------|-----------|------|-------|-----|
| 2 € | 25,75 mm | 2,20 mm | 8,50 g | Bimetálica (Cu-Ni + Latão-niquelado) | Prateado/Dourado |
| 1 € | 23,25 mm | 2,33 mm | 7,50 g | Bimetálica (Latão-niquelado + Cu-Ni) | Dourado/Prateado |
| 50 ct | 24,25 mm | 2,38 mm | 7,80 g | Nordic Gold | Dourado |
| 20 ct | 22,25 mm | 2,14 mm | 5,74 g | Nordic Gold | Dourado |
| 10 ct | 19,75 mm | 1,93 mm | 4,10 g | Nordic Gold | Dourado |
| 5 ct | 21,25 mm | 1,92 mm | 3,92 g | Aço coberto a cobre | Vermelho |
| 2 ct | 18,75 mm | 1,67 mm | 3,06 g | Aço coberto a cobre | Vermelho |
| 1 ct | 16,25 mm | 1,67 mm | 2,30 g | Aço coberto a cobre | Vermelho |

## Lado Europeu (Reverso Comum)

- **Versão 1 (1999–2006):** Mapa da UE com 15 estados-membros
- **Versão 2 (2007–presente):** Mapa geográfico da Europa (sem fronteiras internas)

O design do lado comum foi criado por **Luc Luycx** (iniciais LL visíveis).

## Moedas Comemorativas de €2

Cada país da zona Euro pode emitir até **2 moedas comemorativas por ano**. Existem também emissões conjuntas de todos os países para eventos especiais (ex: 10 anos do Euro em 2012, 35 anos do Erasmus).

## Marcas das Casas da Moeda

| País | Marca | Casa da Moeda |
|------|-------|---------------|
| Portugal | INCM | Imprensa Nacional-Casa da Moeda |
| Alemanha | A, D, F, G, J | Berlim, Munique, Stuttgart, Karlsruhe, Hamburgo |
| França | Cornucópia | Monnaie de Paris |
| Itália | R | Istituto Poligrafico e Zecca dello Stato (Roma) |
| Espanha | M★ | Fábrica Nacional de Moneda y Timbre (Madrid) |
| Bélgica/Holanda | Mercúrio | Royal Dutch Mint (Utrecht) desde 2018 |
| Finlândia | Leão heráldico | Mint of Finland |
| Eslováquia | MK | Mincovňa Kremnica |
',
  'iniciante',
  ARRAY['euro', 'especificações', 'técnico', 'casas da moeda'],
  true,
  4
),
(
  'identificar-moeda-foto',
  'identificacao',
  'Como Identificar uma Moeda por Fotografia',
  '# Como Identificar uma Moeda por Fotografia

O numis.concierge permite identificar moedas Euro tirando uma fotografia com o telemóvel.

## Como Funciona

A identificação usa inteligência artificial em dois passos:

1. **Leitura de texto** — A IA lê o texto gravado na moeda: país, ano, denominação, inscrições
2. **Confirmação no catálogo** — Os dados extraídos são cruzados com a base de dados Numista

## Dicas para Melhor Identificação

### Fotografia
- Usa boa iluminação — luz natural difusa é ideal
- Evita reflexos e brilhos excessivos
- Centraliza a moeda na imagem
- Tira foto a ~15-20cm de distância
- Fotografa em superfície escura (contraste)

### Para Moedas Difíceis
- Experimenta fotografar em ângulo ligeiro (45°) para revelar relevos
- Se a moeda for muito gasta, fotografa o reverso (lado europeu com denominação)
- Para moedas antigas ou estrangeiras, inclui escala (moeda de referência ao lado)

## O que a IA Consegue Identificar

✅ País emissor (texto + design do lado nacional)
✅ Denominação (valor facial)
✅ Ano de emissão
✅ Moedas comemorativas (tema do design)
⚠️ Mintmark (pode ser difícil em fotos de baixa resolução)
⚠️ Variantes (KM# específico) — confirmar manualmente

## Após Identificação

Depois de identificada, podes:
- Ver a ficha completa no catálogo
- Adicionar à tua colecção com o estado de conservação
- Ver o valor de mercado actual
- Verificar se alguém tem esta moeda para troca
',
  'iniciante',
  ARRAY['identificação', 'fotografia', 'IA', 'reconhecimento'],
  true,
  5
);
