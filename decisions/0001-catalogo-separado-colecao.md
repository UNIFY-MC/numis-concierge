# 0001 — Catálogo separado da coleção (modelo Numista)

- **Data**: 2026-06-18 (registo; decisão tomada no arranque do modelo de dados)
- **Estado**: Vigente

## Contexto
O HTML antigo do colecionador mistura o que *existe* com o que ele *tem* — e pode conter
moedas que nunca foram emitidas. Precisávamos de modelar tipo numismático, variante e posse
sem inventar emissões.

## Decisão
Separar em três tabelas no schema `numis` (modelo Numista):
- `catalog_coins` — o *tipo* numismático (618 linhas).
- `catalog_issues` — variantes por ano/casa (4738 linhas), FK → `catalog_coins`.
- `collection` — exemplares pessoais, FK → `catalog_coins` + `catalog_issues`.

Moedas novas só se criam com prova de emissão por fonte permitida (banco central, Numista,
Maktun). O HTML prova apenas posse.

## Alternativas consideradas
- Tabela única "moeda + tenho" — rejeitada: confunde existência com posse, polui o catálogo.

## Consequências
- A app distingue "existe mas não tenho" de "tenho". Enriquecimento externo atualiza o
  catálogo sem tocar na posse. Campos sem dados ficam `null`, nunca inventados.
- `lib/data/catalog.ts` é gerado (não editar à mão).
