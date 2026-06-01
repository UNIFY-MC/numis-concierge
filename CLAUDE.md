# Numis Concierge

> Plataforma de gestão e avaliação de moedas e colecções numismáticas.
> Stack: Next.js · TypeScript · React · Tailwind · Supabase · Vercel · Anthropic SDK · Resend

Segue as convenções globais em ~/.claude/CLAUDE.md.

## Módulos
- `lib/catalog.ts` — ÚNICA fonte de queries ao Supabase (catálogo + colecção)
- `lib/data/catalog.ts` — catálogo estático extraído do HTML (4738 entradas, NÃO editar à mão; regenerar com `scripts/parse-html-catalog.mjs`)
- `lib/supabase.ts` — cliente browser (schema `numis`)
- `lib/types.ts` — tipos do domínio: `CatalogCoin`, `CatalogIssue`, `CollectionItem`
- `components/` — um ficheiro por componente
- `app/(app)/moedas/page.tsx` — só composição

## Modelo de dados
Schema Supabase: `numis` (isolado do `public` dos outros projectos no mesmo cluster; exposto ao PostgREST via `pgrst.db_schemas`).

Catálogo separado da colecção (modelo Numista):
- `numis.catalog_coins` — catálogo global de tipos de moeda (618 linhas). O *tipo* numismático, não um exemplar.
- `numis.catalog_issues` — variantes por ano/casa da moeda (4738 linhas). FK → catalog_coins.
- `numis.collection` — exemplares pessoais (o que se tem). FK → catalog_coins + catalog_issues.

Tabelas adicionais no schema (ainda sem UI): `wishlists`, `swaps`, `swap_items`, `knowledge_base`, `profiles` (multi-user com RLS + planos free/pro/business).

Conservação usa escala europeia/Sheldon em `collection.grau` (texto livre: UNC, BU, FDC, VF, MS-65…), não um enum fixo.

Campos sem dados no HTML (metal das comemorativas, grau, preços, fotos, km_ref, numista_id) ficam `null` — preencher depois via Numista API, nunca inventar.

## Env vars
Ver `.env.local.example` — Supabase + Anthropic + Resend.
Seed de dados requer `SUPABASE_SERVICE_ROLE_KEY` (só local, nunca versionada).

## Não fazer
- Não criar ficheiros HTML
- Não chamar supabase fora de `lib/`
- Não usar localStorage
- Não pôr lógica nas páginas
- Não usar JavaScript (só TypeScript)
- Não editar `lib/data/catalog.ts` à mão (é gerado)
