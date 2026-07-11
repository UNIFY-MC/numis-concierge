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
