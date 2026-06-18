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

## Armadilhas conhecidas (gotchas)
- **RLS `anon` aberto na `collection`** (migration `006`, temporário) — quem extraia a anon
  key lê/escreve a coleção mesmo passando ao lado do gate de password. Fecha com Supabase Auth.
- **Gate de password não é segurança** — é só barreira de UI (`middleware.ts` + cookie SHA-256
  da `APP_PASSWORD`). Não há `user_id` por linha ainda.
- **"Não tenho" = `quantidade = 0`**, nunca DELETE na `collection`.

## Atalhos / comandos úteis
- `/auditar-projeto` — gate anti-regressão (hardcodes, tokens, `tsc`). Estado 2026-06-18: limpo.
- `/design-md` — regenerar `design/DESIGN.md` a partir do `globals.css` real.
- `npx tsc --noEmit` antes de cada commit; tem de compilar limpo.
- Enriquecimento: `scripts/enrich-numista.mjs --probe` (confirma shape) → `--limit N` (lotes).
