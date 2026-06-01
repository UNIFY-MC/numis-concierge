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

## Fonte de verdade do catálogo (REGRA CRÍTICA)
**Só se criam novas moedas (`catalog_coins`/`catalog_issues`) comprovando a emissão
pela fonte de verdade: bancos centrais nacionais ou Numista. NUNCA a partir do HTML
antigo nem de entradas avulsas.** O HTML do colecionador serve só para saber o que
ele *tem* (posse/`collection`), não o que *existe* — pode conter moedas que nunca
foram emitidas. Importar sempre da fonte oficial e só depois cruzar com a coleção;
o que não casar com confiança fica para revisão, nunca se inventa.

## Modelo de dados
Schema Supabase: `numis` (isolado do `public` dos outros projectos no mesmo cluster; exposto ao PostgREST via `pgrst.db_schemas`).

Catálogo separado da colecção (modelo Numista):
- `numis.catalog_coins` — catálogo global de tipos de moeda (618 linhas). O *tipo* numismático, não um exemplar.
- `numis.catalog_issues` — variantes por ano/casa da moeda (4738 linhas). FK → catalog_coins.
- `numis.collection` — exemplares pessoais (o que se tem). FK → catalog_coins + catalog_issues.

Tabelas adicionais no schema (ainda sem UI): `wishlists`, `swaps`, `swap_items`, `knowledge_base`, `profiles` (multi-user com RLS + planos free/pro/business).

Conservação usa escala europeia/Sheldon em `collection.grau` (texto livre: UNC, BU, FDC, VF, MS-65…), não um enum fixo.

Campos sem dados no HTML (metal das comemorativas, grau, preços, fotos, km_ref, numista_id) ficam `null` — preencher depois via Numista API, nunca inventar.

## Enriquecimento Numista (uma vez, fica na BD)
A app **nunca** chama a Numista em runtime. Os dados (fotos, peso, diâmetro,
composição, km_ref, numista_id, tiragem) são importados **uma só vez** para o
Supabase pelo script `scripts/enrich-numista.mjs` e a partir daí vivem na BD.
Só se volta à API quando saem moedas novas (correr de novo; é resumível —
salta tudo o que já tem `numista_id`).
- Quota gratuita: 2000 req/mês. O catálogo euro (~618 coins) cabe num run.
- `--probe` confirma o shape da API antes de gastar quota; `--limit N` corre por lotes.
- Respostas cacheadas em `scripts/.numista-cache/` (gitignored) para re-runs baratos.

## Env vars
Ver `.env.local.example` — Supabase + Anthropic + Resend + Numista.
Seed e enriquecimento requerem `SUPABASE_SERVICE_ROLE_KEY` (só local, nunca versionada).
Enriquecimento requer `NUMISTA_API_KEY` (só local/scripts, nunca no browser).

## Design system
A identidade visual é **Moedas do Pinto**: ver `app/globals.css` (tokens `--mp-*`).
Base do design Kyle + paleta dourada/creme. **Toda a cor vem destes tokens, nunca
hardcoded** (proibido `bg-gray-*`, `text-amber-*`, etc.).
- Fundo da app: `bg-mp-bg` (creme). Cards/superfícies: `bg-mp-surface`.
- Marca/títulos/valores: `text-mp-gold` / `text-mp-gold-strong`. Botão primário: `bg-mp-gold`.
- Estados: set = `mp-set` (verde), caderneta = `mp-caderneta` (azul), não tem = `mp-falta` (cobre).
  Aplicar nos chips, dots e barras multicolor.
- Tipografia: títulos e números grandes usam serifa (`font-serif` → Fraunces via next/font);
  corpo usa `font-sans` (Outfit). Variáveis ligadas em `app/layout.tsx`.
- Excepções neutras permitidas: `text-white` sobre dourado, `bg-black/40` no scrim de modais.

## Autenticação (estado actual)
- **Só existe um gate de password de UI**, não auth real. `middleware.ts` protege
  todas as rotas excepto `/login` e assets; a password vive em `APP_PASSWORD`
  (.env.local + Vercel), comparada server-side numa server action em
  `app/(auth)/login/page.tsx`. O cookie de sessão (`numis_session`) é o SHA-256
  da password (`lib/auth-gate.ts`). httpOnly, válido 30 dias.
- Isto é **apenas um gate para testes** — não há utilizadores, registo nem
  `user_id` por linha. Auth real (Supabase Auth) fica para depois.

## Dívida técnica
- **Gate de password ≠ segurança real.** É só uma barreira de UI. Não substitui auth.
- **RLS da `collection` aberto a `anon`** (migration `006_collection_anon_temp.sql`):
  o role `anon` tem SELECT/INSERT/UPDATE na `collection` (NÃO DELETE — "não tenho"
  é `quantidade=0`). A anon key continua exposta no browser, logo **quem a extraia
  pode ler/escrever a colecção mesmo passando ao lado do gate de password**.
  **A auth real (Supabase Auth) TEM de fechar isto**: aplicar
  `007_revert_collection_anon_PASSO_C.sql`, preencher `collection.user_id` com o
  uid do dono, e filtrar/escrever por `user_id = auth.uid()` em `lib/catalog.ts`.

## Não fazer
- Não criar ficheiros HTML
- Não chamar supabase fora de `lib/`
- Não usar localStorage
- Não pôr lógica nas páginas
- Não usar JavaScript (só TypeScript)
- Não editar `lib/data/catalog.ts` à mão (é gerado)
