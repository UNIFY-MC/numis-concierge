# Agentes e workers deste projeto

| Nome | Tipo | O que faz | Onde corre | Ficha |
|------|------|-----------|-----------|-------|
| (nenhum ainda) | — | — | — | — |

## Candidatos naturais (quando se justificar)
- **numis-enrichment** (W1/W2): enriquecer fichas de moedas (Gomes/KM#/N#) em fila —
  o output `outputs/gomes-*` foi feito à mão; um worker torna-o contínuo. Criar com `/criar-worker`.

## Convenções
- Cada worker/agente novo → ficha própria (modelo `ficha-worker.md` do kit) + linha aqui.
- Código versionado em `workers/<nome>/` no repo; a VPS/cloud é só runtime.
