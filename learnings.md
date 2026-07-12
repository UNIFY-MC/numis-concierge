<!-- last_updated: 2026-06-18 · owner: Mário Carvalho · scope: aprendizagens duráveis (porquês) -->

# Learnings — Numis Concierge

Aprendizagens não-óbvias que evitam reexplicar contexto. Uma linha: **o quê — porquê**.
Atualizar via `/update-progress`.

## Decisões técnicas não-óbvias
- **Catálogo separado da coleção (modelo Numista)** — `catalog_coins` (tipo) + `catalog_issues`
  (variante ano/casa) + `collection` (exemplar). Permite ter o que *existe* sem ter, e o que
  se *tem* sem inventar tipos.
- **`lib/data/catalog.ts` é gerado** (4738 entradas, 90k linhas) por `scripts/parse-html-catalog.mjs`
  — nunca editar à mão; regenerar.
- **Fonte de verdade ≠ HTML do colecionador** — o HTML antigo prova *posse*, não *emissão*.
  Moedas novas só com prova de banco central / Numista / Maktun.
- **Schema `numis` isolado** do `public` no mesmo cluster Supabase — exposto ao PostgREST via
  `pgrst.db_schemas`. Evita colisão com outros projectos.
- **Enriquecimento externo é offline e fica na BD** — a app nunca chama Numista/Maktun em
  runtime; importa-se uma vez. Re-runs são resumíveis (saltam o já enriquecido). Quota 2000/mês.
- **Grau de conservação é texto livre** (escala europeia/Sheldon: UNC, BU, FDC, VF, MS-65…),
  não enum — o mercado usa convenções mistas.
- **Tipografia: Inter (corpo) + Fraunces (títulos/números)** — o `CLAUDE.md` antigo dizia
  "Outfit"; o `layout.tsx` real usa **Inter**. O código é a verdade.
- **Numista NÃO tem valorização de históricas PT** (só euro é cotado; amostra 1562-1811 = 0/8).
  Preços de réis/escudos vêm de Gomes/Ferraro Vaz/leilões, não da API. Não voltar a gastar quota nisto.
- **Import histórico exclui euros** — `importar-historico-numista.mjs` filtra títulos com "Euro"/"Cent"
  e ano ≥ 1999 (incluindo frações "¼ Euro"); euros vão pelo `enrich-numista.mjs` (família `euro_*`).
  `familia=historico` + `moeda_hist='Euro'` NUNCA é legítimo (foi o sintoma do bug de 2026-07-11).
- **Dedup histórico é só difusa** — as 1273 stubs KM/Gomes antigas não têm `numista_id`, logo o match
  a tipos Numista é por ano+denominação; ambíguos ficam para revisão (`.hist-ambiguos-pt.json`).
- **Ref Gomes** (catálogo padrão PT) vem no detalhe Numista em `references[].catalogue.code='Gomes'`;
  guardada em `km_ref` com prefixo "Gomes " (não há coluna `gomes_ref`).

## Armadilhas conhecidas (gotchas)
- **RLS `anon` aberto na `collection`** (migration `006`, temporário) — quem extraia a anon
  key lê/escreve a coleção mesmo passando ao lado do gate de password. Fecha com Supabase Auth.
- **Gate de password não é segurança** — é só barreira de UI (`middleware.ts` + cookie SHA-256
  da `APP_PASSWORD`). Não há `user_id` por linha ainda.
- **"Não tenho" = `quantidade = 0`**, nunca DELETE na `collection`.
- **Fetch de imagens da Numista pendura sem timeout** — usar `AbortSignal.timeout()`. O CDN de
  imagens dá **429 em lote** ao fim de ~380 downloads seguidos; o `importar-fotos-storage.mjs` é
  resumível (salta as já no bucket) — re-correr após cooldown apanha as que faltam.

## Atalhos / comandos úteis
- `/auditar-projeto` — gate anti-regressão (hardcodes, tokens, `tsc`). Estado 2026-06-18: limpo.
- `/design-md` — regenerar `design/DESIGN.md` a partir do `globals.css` real.
- `npx tsc --noEmit` antes de cada commit; tem de compilar limpo.
- Enriquecimento: `scripts/enrich-numista.mjs --probe` (confirma shape) → `--limit N` (lotes).

## 2026-07-12 (sessão Gomes/estojos)
- **`serie_ord` (PT) tem de estar EM LOCKSTEP entre a BD e `lib/series.ts` (ERAS).** A app deriva a era por `eraDe(serie_ord)`; se renumerares na BD sem atualizar as ranges das ERAS (ou vice-versa), as moedas caem na era errada. Atual: Monarquia 1-40, República/Escudo 41-46, Euro 50-56, Ilhas 70-71. Porquê: o spine foi renumerado ao cronológico do Gomes (40 reinados) e já não cabia em 1-33.
- **A coleção é do António Pinto Carvalho (`c2982159`), não do Mário (`bbf3000a`, admin).** As moedas são do pai; o Mário só tem o painel de admin. Editar/ver colecção é na conta do António.
- **"Faltam moedas" era quase sempre ANOS em falta, não tipos.** A `catalog_issues` guardava só o `ano_inicio` de cada tipo datado pré-1910. Os tipos-base estão completos (auditoria Gomes confirmou 0 em falta nos reinados verificados). Corrige-se com INSERT de anos por `km_ref` (só `pais='pt'`, idempotente).
- **Imports Numista/Maktun metem inglês/russo no PARÊNTESE final da `denominacao`, não no `tema`** (que já vinha PT). Há também homóglifos cirílicos (С ≈ C) em texto inglês. Traduzir só o parêntese; normalizar homóglifos com `translate()`.
- **Gomes: a OCR em texto é ruidosa e os `code` do `material-gomes-v3.json` perderam o prefixo de reinado.** O fiável é ler o PDF por VISÃO (agente) e casar pelo `catalog_coins.gomes_ref` (código completo "A1 08"). Enriquecer só campos vazios, com página de evidência; ambíguo → revisão.
- **Variedades datadas** (Proof-like, sobredatas) → `catalog_issues` com `etiqueta`. **Medievais sem data** ficam bloqueadas por `catalog_issues.ano` ser NOT NULL (modelo por decidir).
