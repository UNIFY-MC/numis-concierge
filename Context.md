<!-- last_updated: 2026-06-18 · owner: Mário Carvalho · scope: estado atual do projeto -->

# Context — Numis Concierge

Estado atual e "quem é quem", para um Claude que entra a meio saber onde estamos sem reler
tudo. Detalhe histórico em `progress/`. Atualizar quando o estado muda materialmente.

## Onde estamos
- **Fase atual**: produto funcional em dados reais (Supabase) — catálogo + coleção euro.
  Foco recente: Coleções (séries multi-ano, valor de mercado ajustado ao grau, totais por card).
- **A funcionar**: catálogo (618 tipos / 4738 variantes), coleção pessoal, dashboard,
  vista por emissor, valor por país, tabela, coleção alemã/portuguesa, print de faltas.
- **Em mock/stub / por ligar**: Anthropic SDK (produto), Resend (email), Supabase Auth real,
  UI para `wishlists`/`swaps`/`knowledge_base`/`profiles`.

## Pessoas / entidades
- **Mário Carvalho** — dono do projeto e da coleção.
- "Moedas do Pinto" — identidade visual/marca da app (creme + dourado).

## Integrações ativas (detalhe técnico em connections.md)
- Supabase (schema `numis`) · Vercel (deploy + analytics) · Numista/Maktun (enriquecimento offline).

## Arquitetura em 1 parágrafo
Next.js (App Router) + TS + Tailwind v4 + Supabase. `lib/catalog.ts` é a única fonte de
queries. Catálogo (`catalog_coins`/`catalog_issues`) separado da coleção (`collection`),
modelo Numista. Tokens visuais `--mp-*` em `globals.css`; fonte de verdade visual em
`design/DESIGN.md`.

## Próximo marco
- **Supabase Auth real** — fecha a dívida do RLS `anon` aberto e introduz `user_id` por linha
  (ver `guardrails.md` e `decisions/0001-auth-rls-collection.md`).
