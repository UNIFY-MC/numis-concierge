# 0004 — Catálogo histórico PT importado da Numista

- **Data**: 2026-07-11
- **Estado**: Vigente

## Contexto
A base tinha 1273 moedas históricas PT (réis/escudos), mas eram stubs de um catálogo KM/Gomes
**sem `numista_id`, sem fotos, sem peso/composição**. Faltavam ainda as mais antigas (a base
começava em 1223; a Numista tem desde 1139, Afonso I). Objetivo: completar e enriquecer.

## Decisão
Importar as históricas em falta da **Numista** (fonte permitida — ver CLAUDE.md), **oldest-first**,
com novo script `scripts/importar-historico-numista.mjs`:
- Família `historico`, `categoria='coin'`, `moeda_hist` = moeda-de-conta Numista (Libra, Real…).
- Guarda `numista_id`, ref **Gomes** (em `km_ref` com prefixo), peso, diâmetro, composição, fotos.
- **Euros são excluídos** (`ehEuro`: título com "Euro"/"Cent" e ano ≥ 1999) — pertencem ao
  `enrich-numista.mjs`, família `euro_*`.
- **Dedup difusa** (sobreposição de anos + palavra de denominação) porque as 1273 antigas não têm
  `numista_id`: o que colide fica **ambíguo → revisão manual**, nunca auto-importado.

## Resultado
+410 tipos genuínos (1273 → 1683), 0 duplicados no medieval, 10 possíveis em 1500-1800 (para revisão),
850 ambíguos deixados para revisão. Fotos migradas para o Storage (0 hotlinks).

## Consequências / limites
- **Valorização indisponível**: a Numista não dá preços para históricas PT (só euro). Precisa de
  outra fonte (Maktun, catálogo Gomes/Ferraro Vaz, leilões).
- As stubs antigas continuam sem `numista_id`; ligar os 850 ambíguos é trabalho manual futuro.
- Reversível: cada linha nova é identificável por `numista_id`.
