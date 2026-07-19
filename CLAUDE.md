# Numis Concierge

> Plataforma de gestão e avaliação de moedas e colecções numismáticas.
> Stack: Next.js · TypeScript · React · Tailwind · Supabase · Vercel · Anthropic SDK · Resend

Segue as convenções globais em ~/.claude/CLAUDE.md.

## Contexto e memória (ler quando relevante)
- `Context.md` — estado atual / quem é quem.
- `connections.md` — integrações/MCP (o que lê/escreve). Chaves só no `.env`.
- `guardrails.md` — o que o agente NUNCA faz sozinho (gate antes de automatizar).
- `cadencia.md` — C4: em que degrau está cada rotina (manual → supervisionado → agendado).
- `learnings.md` — porquês duráveis. `decisions/` — decisões estruturais datadas.
- `design/DESIGN.md` — fonte de verdade visual (espelho de `app/globals.css`).
- `app/showcase/page.tsx` — validação da fundação (`/showcase`).
- `progress/` — diário por sessão.

## Módulos
- `lib/catalog.ts` — ÚNICA fonte de queries ao Supabase (catálogo + colecção)
- `lib/data/catalog.ts` — catálogo estático extraído do HTML (4738 entradas, NÃO editar à mão; regenerar com `scripts/parse-html-catalog.mjs`)
- `lib/supabase.ts` — cliente browser (schema `numis`)
- `lib/types.ts` — tipos do domínio: `CatalogCoin`, `CatalogIssue`, `CollectionItem`
- `components/` — um ficheiro por componente
- `app/(app)/moedas/page.tsx` — só composição

## Fonte de verdade do catálogo (REGRA CRÍTICA)
**Só se criam novas moedas (`catalog_coins`/`catalog_issues`) comprovando a emissão
por uma fonte de verdade permitida: bancos centrais nacionais, Numista ou Maktun.**
O HTML antigo do colecionador serve só para saber o que ele *tem*
(posse/`collection`), não o que *existe* — pode conter moedas que nunca foram
emitidas. Importar sempre de uma fonte permitida e só depois cruzar com a coleção;
o que não casar com confiança fica para revisão, nunca se inventa.

Ao importar/enriquecer via Maktun:
- Guardar sempre a origem quando possível (`source_url`, id/código externo ou
  referência equivalente) nos scripts/logs de importação.
- Usar Maktun para enriquecer fotos, descrições e metadados de moedas existentes
  ou para criar novas moedas apenas quando o match for inequívoco.
- Não fazer hotlink permanente de imagens: descarregar e migrar para o nosso
  Supabase Storage antes de apontar a BD.
- Respeitar robots.txt, rate limits razoáveis e páginas que exijam sessão/login.
- Entradas ambíguas, duplicadas ou sem prova suficiente ficam para revisão manual.

## Modelo de dados
Schema Supabase: `numis` (isolado do `public` dos outros projectos no mesmo cluster; exposto ao PostgREST via `pgrst.db_schemas`).

Catálogo separado da colecção (modelo Numista):
- `numis.catalog_coins` — catálogo global de tipos de moeda (618 linhas). O *tipo* numismático, não um exemplar.
- `numis.catalog_issues` — variantes por ano/casa da moeda (4738 linhas). FK → catalog_coins.
- `numis.collection` — exemplares pessoais (o que se tem). FK → catalog_coins + catalog_issues.

Tabelas adicionais no schema (ainda sem UI): `wishlists`, `swaps`, `swap_items`, `knowledge_base`, `profiles` (multi-user com RLS + planos free/pro/business).

Conservação usa escala europeia/Sheldon em `collection.grau` (texto livre: UNC, BU, FDC, VF, MS-65…), não um enum fixo.

Campos sem dados no HTML (metal das comemorativas, grau, preços, fotos, km_ref, numista_id) ficam `null` — preencher depois via Numista API, nunca inventar.

## Enriquecimento externo (uma vez, fica na BD)
A app **nunca** chama Numista/Maktun em runtime. Os dados (fotos, peso, diâmetro,
composição, km_ref, ids externos, tiragem) são importados **uma só vez** para o
Supabase por scripts locais e a partir daí vivem na BD.
Para Numista usar `scripts/enrich-numista.mjs`; para Maktun criar/usar script
equivalente com cache, rate limit e modo `--probe` antes de escrever.
Só se volta às fontes externas quando saem moedas novas ou faltam imagens/metadados
(correr de novo; deve ser resumível — saltar tudo o que já está enriquecido).
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
  corpo usa `font-sans` (Inter). Variáveis ligadas em `app/layout.tsx`.
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


---

<!-- nirvana-os:writing-contract:v1 -->
## Writing contract (for any prose deliverable)

### Never
- **Dash stitching.** `-` only for compound words (well-known) and ranges (90-day). Em-dash/en-dash: max one per 200 words. No dash to glue clauses, replace commas, hedge, or emphasize.
- **Filler openers.** "In summary/conclusion", "Moreover", "It's worth noting", "Em resumo/conclusão", "É importante notar".
- **Chat artifacts.** "Great question!", "Of course!", "I hope this helps", "Let me know if", "Let's explore", "Claro!", "Espero que ajude!", "Vamos explorar", "To answer your question".
- **Cutoff disclaimers.** "As of my last training", "while details are limited", "com base nas informações disponíveis".
- **Vague attribution.** "Experts say", "Studies show", "Especialistas afirmam". Cite a named source with a date, or drop the claim.
- **Copula avoidance.** Prefer is/é, has/tem over "serves as", "stands as", "represents", "boasts", "destaca-se como", "configura-se como".
- **Negative parallelism.** "Not only X, but Y" / "Não é só X, é Y".
- **Decorative emojis** in headings/bullets. **Title Case Em Headings:** use sentence case ("Estratégia de marca", not "Estratégia De Marca").

### Structure
- Vary sentence length. 17-word uniformity reads AI; mixing 8-word and 25-word reads human.
- No orphan words ending paragraphs; no 1-sentence paragraphs unless deliberate. No widows at line breaks.

### Voice
- Opinions when warranted; mixed feelings allowed.
- Use "I"/"eu" when it fits.
- Specific over vague: "algo perturbador em X" beats "X é preocupante".

Gate flags = build fails. No auto-rewrite.
