# 0003 — MVP multitenant: comunidade numismática (SaaS)

- **Data**: 2026-06-30
- **Estado**: Proposta — spec de arquitetura + roadmap faseado (a implementar por fases)
- **Autores**: software-forge (lead de arquitetura) · DNA: Kleppmann (dados/RLS),
  Dodds + Abramov (frontend), Majors (operações)
- **Sucede a**: `0002-auth-rls-collection.md` (auth + RLS da coleção, Passo C)

---

## 0. Contexto

A `numis.coins` nasceu single-user: um colecionador (Mário) a gerir a sua coleção contra
um catálogo público de euro. O **Passo C** (decisão 0002) já fez a transição estrutural mais
difícil — **Supabase Auth (Google OAuth) + RLS por `user_id`** — deixando a app
tecnicamente multi-utilizador, mas operada como se fosse de um só.

Esta spec define como **abrir** essa base a uma **comunidade numismática SaaS** com planos
pagos (free/pro/business), marketplace de trocas e, mais tarde, fóruns. Não é a plataforma
final: é o **MVP que valida a procura**. A regra de ouro é a do Kleppmann — *o isolamento de
dados é uma invariante da base de dados, não da aplicação*: tudo o que é pessoal fecha por
RLS no Postgres; o `lib/` nunca é a única linha de defesa.

### O que JÁ existe (confirmado por leitura — não reimplementar)

| Área | Estado real | Evidência |
|------|-------------|-----------|
| **Auth** | Google OAuth via `@supabase/ssr`; `middleware.ts` → `lib/supabase-middleware.ts` | `middleware.ts:1-12` |
| **Allowlist** | `NUMIS_ALLOWED_EMAILS` (CSV). **Vazio = signups abertos**; preenchido = restrito | `lib/supabase-middleware.ts:6-11, 53-62` |
| **Clientes** | browser (`lib/supabase.ts`), server SSR (`lib/supabase-server.ts`), middleware — todos **anon key + schema `numis`** | `lib/supabase.ts:12-14` |
| **Service role** | **Não usado em runtime** — só em scripts locais (seed/enriquecimento) | `CLAUDE.md:71` |
| **`profiles`** | Criada com `plano` (free/pro/business), `plano_ate`, reputação, stats; trigger `handle_new_user` cria perfil no registo | `005_multiuser.sql:6-58` |
| **`collection`** | RLS isolada por `user_id = auth.uid()`; `+ para_troca` público; `lib/catalog.ts` carimba `user_id` no insert e confia na RLS na leitura | `005:82-91`, `lib/catalog.ts:129-208` |
| **`wishlists`/`swaps`** | Tabelas e RLS preparadas (own-row / duas-partes) | `003:158-213`, `005:94-112` |
| **Catálogo** | `catalog_coins`/`catalog_issues`/`incm_produtos`/`precos_mercado_hist` — **públicos** (`select` global) | `005:122-138`, `017:22-57` |
| **Valor de mercado** | Vive em `catalog_issues.valor_mercado` (público) — **não é dado pessoal** | `013:16-22` |

### Lacunas/dívidas detectadas (entram no roadmap)

1. **`swap_items` sem policy** — a 005 dá `grant all` a `authenticated` mas **não cria
   política RLS**. Com RLS ativa numa tabela sem policy o acesso fica *negado*; sem RLS
   ativa fica *aberto a qualquer authenticated*. É preciso fechar explicitamente (Fase 2).
2. **`ui_prefs` partilhada entre todos** — policy `using(true) to authenticated`
   (`015:16-20`). Aceitável em single-user; **vaza entre tenants** num SaaS (todos leem/
   escrevem a mesma linha por `chave`). Precisa de `user_id` (Fase 1).
3. **`is_admin` não existe** em `numis.profiles` — o "dono = admin" está implícito por email
   hardcoded (`016_backfill:15`, `mariocarvalho.biz@gmail.com`). Precisa de campo explícito.
4. **Passo C possivelmente não aplicado em prod** — 007 (fecha anon) e 016 (carimba a
   coleção do dono) são migrations-gate; confirmar que correram antes de abrir signups.
5. **Sem billing** — `profiles.plano` existe mas nada o muda; sem Stripe, sem webhooks.
6. **Gating de planos inexistente** — nada lê `profiles.plano` para libertar features.

---

## 1. Auth & onboarding multitenant

**Veredicto: a base está pronta. Abrir signups é uma mudança de configuração, não de código.**

### 1.1 Abrir signups (com reversão trivial)
- A allowlist já é o interruptor: **`NUMIS_ALLOWED_EMAILS` vazio → qualquer conta Google
  entra**, cada uma isolada por RLS (`supabase-middleware.ts:4-5`). Para abrir: esvaziar o
  env var em produção. Para voltar a fechar (convite-only): repor os emails. Zero deploy.
- No painel Supabase: confirmar provider Google ativo e **desligar "Confirm email"** se for
  só OAuth (não há password). Definir `Site URL`/redirect para o domínio de produção.
- `handle_new_user` já cria o perfil — o novo utilizador entra com `plano = 'free'` por
  defeito (`005:21`). Nada a fazer no fluxo de registo.

### 1.2 O que muda no middleware
- **Pouco.** O guarda atual (sem user → `/login`; fora da allowlist → signOut) mantém-se.
- Adicionar **gate de admin** só nas rotas `/admin/*` (Fase 1.4), lendo `profiles.is_admin`
  via `lib/`. Não meter lógica de plano no middleware (é por-rota/por-feature, fica no
  server component / `lib/`, ver §3).

### 1.3 Onboarding do novo utilizador
- Pós-OAuth, redirecionar para `/onboarding` se `profiles.username` for `null`: pedir
  `username` (único), `nome`, `pais`. Server Action escreve via `lib/profiles.ts` (a criar).
- `total_colecao`/`total_paises` ficam a 0 (perfil novo não herda a coleção do dono).

### 1.4 Manter o dono como admin
- **Migration: adicionar `is_admin boolean default false`** a `profiles` (DDL em §A).
  Carimbar o dono uma vez (idempotente, por email — mesma técnica da 016).
- Tudo o que hoje é "só o dono faz" (enriquecimento, edição de catálogo) corre **fora da
  app** (scripts com service role) ou atrás de `/admin/*` com gate `is_admin`.

> **[DECISÃO]** Abrir signups **já** (público) ou manter **convite-only** num beta fechado?
> Recomendação: beta fechado (allowlist preenchida) até billing + gating estarem testados,
> depois esvaziar a allowlist. Reversão é instantânea em qualquer sentido.

---

## 2. Billing (Stripe)

**Assumir Stripe** (gateway com melhor DX para subscrições SaaS PT/EU, suporta SCA/SEPA).
Modelo: subscrição mensal/anual por plano, mapeada a `profiles.plano` + `profiles.plano_ate`.

### 2.1 Princípio de arquitetura (Kleppmann + Majors)
A **fonte de verdade do estado de subscrição é o Stripe**; a nossa BD é uma **projeção** dele,
sincronizada **exclusivamente por webhooks** (nunca pelo cliente). O cliente nunca escreve
`profiles.plano` — só o webhook handler (service role) o faz. Isto evita o anti-padrão
clássico "o frontend diz que pagou" e torna o estado auditável e reconstruível.

### 2.2 Onde corre
- **Checkout** (`POST /api/billing/checkout`) — Route Handler Node.js. Cria Checkout Session
  (`mode: 'subscription'`) com o `price_id` do plano e `client_reference_id = user.id`.
  Lê o user da sessão SSR; **nunca** confia em input do cliente para o plano/preço.
- **Webhook** (`POST /api/billing/webhook`) — Route Handler Node.js, **runtime `nodejs`**,
  body **raw** (necessário para verificar a assinatura `Stripe-Signature`). Não usar Edge
  aqui (precisa do raw body e do SDK Node). Usa **service role** (única exceção runtime ao
  anon key) para escrever `profiles` ignorando RLS.
- **Portal** (`POST /api/billing/portal`) — cria Billing Portal Session para o
  `stripe_customer_id` do user; o utilizador gere/cancela lá. Zero UI de gestão nossa.

### 2.3 Eventos a tratar (idempotentes)
| Evento Stripe | Efeito na BD |
|---------------|--------------|
| `checkout.session.completed` | guardar `stripe_customer_id` + `stripe_subscription_id`; set `plano` pelo price→plano; `plano_ate = current_period_end` |
| `customer.subscription.updated` | re-mapear `plano` (upgrade/downgrade) + `plano_ate` |
| `customer.subscription.deleted` | `plano = 'free'`, limpar `plano_ate` |
| `invoice.payment_failed` | marcar `subscription_estado = 'past_due'` (grace period, não despromover já) |
| `invoice.paid` | confirmar `plano_ate = novo period_end` (renovação) |

### 2.4 Idempotência
- Tabela `billing_eventos(stripe_event_id pk, ...)`: no início do handler, `insert ... on
  conflict do nothing`; se já existia, **ignora** (Stripe reenvia). Garante exactly-once
  lógico apesar do at-least-once do Stripe.
- Mapeamento price→plano **server-side** (env `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`),
  nunca confiar no metadata vindo do cliente.

### 2.5 O que guardar e onde
- **Nova tabela `numis.billing_assinaturas`** (1:1 com profile): `stripe_customer_id`,
  `stripe_subscription_id`, `estado`, `price_id`, `current_period_end`, `cancel_at_period_end`.
  Separar de `profiles` para manter `profiles` "magro e público" (é lido por anon) e os dados
  de billing **privados** (RLS own-row, sem grant a anon). DDL em §A.
- `profiles.plano`/`plano_ate` permanecem como **cache desnormalizado** para gating rápido e
  leitura pública do "badge de plano" sem expor IDs do Stripe.

> **[DECISÃO]** Confirmar **Stripe** como gateway (vs Paddle/LemonSqueezy — Merchant of
> Record, tratam IVA EU por ti; relevante para vender a colecionadores em vários países UE).
> **[DECISÃO]** Preços (placeholders): **free 0€** · **pro 4,99€/mês ou 49€/ano** ·
> **business 14,99€/mês ou 149€/ano**. Confirmar valores e se há plano anual.

---

## 3. Gating de features por plano

### 3.1 Proposta de planos
| Feature | Free | Pro | Business |
|---------|:----:|:---:|:--------:|
| Ver/gerir coleção própria | ✓ | ✓ | ✓ |
| Comparar com emitidas (catálogo) | ✓ | ✓ | ✓ |
| Wishlists | ✓ (até N) | ✓ ilimitado | ✓ |
| Valor de mercado + histórico/evolução | — | ✓ | ✓ |
| Estatísticas avançadas da coleção | — | ✓ | ✓ |
| Marketplace de trocas (propor/aceitar) | ver | ✓ | ✓ |
| Alertas (wishlist match, preço) | — | — | ✓ |
| API / export em massa | — | — | ✓ (futuro) |

> Nota: o **valor de mercado** é dado **público** (`catalog_issues.valor_mercado`,
> `precos_mercado_hist`). O gate NÃO é RLS — é de **apresentação**: o free vê a coleção mas
> os campos de valor/histórico vêm ocultos/blur do server. Não enviar o valor ao cliente
> free (gate no server component / `lib/`, não só CSS).

### 3.2 Onde se faz o gate (defesa em camadas)
1. **RLS** — para tudo que é *acesso a linhas* (own-row). É a fronteira dura.
2. **`lib/plano.ts`** (a criar) — `getPlano(userId)` + helpers `podeVerValor(plano)`,
   `limiteWishlists(plano)`. Server-side. Toda a feature paga passa por aqui **no servidor**
   antes de devolver dados ou aceitar uma mutação. Nunca confiar no cliente.
3. **UI (Dodds/Abramov)** — esconder/CTA-upgrade é só UX; assume-se que o servidor já
   recusa. Componente `<GatePlano nivel="pro">` que renderiza o filho ou um upsell, mas o
   **dado sensível nem chega ao bundle** se o server não o mandar.

### 3.3 Gating de mutações
- Acções pagas (criar troca, criar alerta) validam o plano na **Server Action / Route
  Handler** antes de escrever. Opcionalmente reforçar com RLS usando uma função
  `numis.plano_atual()` (security definer lendo `profiles.plano` do `auth.uid()`) numa
  `with check` — robusto, mas começar com gate em `lib/` e endurecer se necessário.

---

## 4. RLS completa (auditoria tabela-a-tabela)

Princípio: **catálogo público, pessoal fechado**. Estado atual + acção:

| Tabela | Natureza | RLS hoje | Acção |
|--------|----------|----------|-------|
| `catalog_coins` / `catalog_issues` | pública | `select using(true)` ✓ | manter |
| `precos_mercado_hist` / `incm_produtos` | pública | `select` anon ✓ (`017`) | manter |
| `knowledge_base` | pública (publicado) | `select where publicado` ✓ | manter |
| `collection` | pessoal | own-row + `para_troca` público ✓ (`005:82-91`) | manter; **confirmar 007 aplicada** (anon fechado) |
| `wishlists` | pessoal | own-row ✓ (`005:94-100`) | manter; **fechar leitura para matching controlado** (§5) |
| `swaps` | duas partes | own-row (origem/destino) ✓ (`005:103-112`) | manter |
| **`swap_items`** | duas partes | **SEM policy** ⚠️ | **criar policies** via join a `swaps` (§A) |
| `profiles` | pública (leitura) | `select using(true)` ✓ | manter, mas **mover billing para fora** (§2.5) |
| **`ui_prefs`** | pessoal | `using(true) to authenticated` ⚠️ vaza entre tenants | **adicionar `user_id`** + own-row (§A) |
| **`billing_assinaturas`** | privada (nova) | — | own-row select; escrita só service role |

- **Nada de pessoal pode ter `grant ... to anon`.** Auditar com `get_advisors`/`list_tables`
  antes de abrir signups; qualquer `grant` a `anon` fora de catálogo/`profiles`/KB é um bug.
- A `collection` confia na RLS na leitura (`lib/catalog.ts:129` não filtra `user_id` — está
  correto: a policy fá-lo). Manter este padrão em wishlists/swaps.

---

## 5. Marketplace de trocas

Modelo (`swaps`/`swap_items`/`wishlists`) já existe (`003:158-230`). Falta **fluxo + matching
+ privacidade**.

### 5.1 Fluxo (máquina de estados — já no enum `swaps.estado`)
```
rascunho → proposta → confirmada → enviada → recebida → concluida
                   ↘ cancelada / disputada
```
- **Propor** (A→B): A cria `swap` (`utilizador_origem_id = A`, `destino = B`, `estado=proposta`)
  + `swap_items` (oferece/recebe). Server Action; valida que os itens `oferece` pertencem a A
  e estão `para_troca = true`.
- **Aceitar/recusar** (B): B muda `estado` → `confirmada`/`cancelada` (RLS permite às duas
  partes — `005:110-112`).
- **Envio** (`quem_envia_primeiro` resolve a confiança): registar `tracking_*`, `enviada_em`.
- **Receção + reputação**: ambos confirmam (`recebida`→`concluida`), dão `rating_dado_*`.
  Trigger/função atualiza `profiles.swaps_concluidos` e `rating_medio` (recalcular, nunca
  confiar em valor escrito pelo cliente).

### 5.2 Matching
- **A minha `collection` `para_troca = true`** × **`wishlists` ativas de outros** (e vice-versa).
  Query no server: `lib/trocas.ts` cruza por `catalog_coin_id`/`catalog_issue_id`.
- **Privacidade do matching**: as wishlists são own-row (privadas). Para haver matching
  preciso de leitura cruzada controlada → **função `security definer`** `numis.match_trocas
  (auth.uid())` que devolve *agregados* ("3 pessoas querem esta moeda") sem expor de quem,
  até haver proposta. Evita scraping de wishlists alheias.

### 5.3 Privacidade público vs privado numa coleção
- **Público** (via `para_troca = true`): existência do exemplar, grau, `nota_publica`, fotos.
- **Privado** (nunca exposto): `preco_compra`, `local_compra`, `nota_privada`, `armazenamento`,
  `data_compra`. A RLS `para_troca` da 005 expõe a **linha inteira** — ⚠️ isto vaza colunas
  privadas. **Corrigir**: criar uma **view** `numis.trocas_publicas` (ou policy por coluna via
  `security definer`) que só projeta as colunas públicas dos exemplares `para_troca`. O cliente
  consome a view, nunca `collection` de outros.

> **[DECISÃO]** Privacidade por defeito da coleção: **privada** (opt-in por exemplar via
> `para_troca`)? Recomendado. Confirmar.

---

## 6. Comunidade (Fase 3+ — só esboço)

Esboço de modelo, **não implementar agora**:
- `forum_topicos(id, autor_id, categoria, titulo, corpo, fixado, fechado, ...)` — RLS:
  leitura pública (publicado), escrita own-row.
- `forum_respostas(id, topico_id, autor_id, corpo, ...)` — own-row na escrita.
- `encontros(id, organizador_id, local, data, descricao, ...)` + `encontro_inscricoes`.
- Moderação via `is_admin`. Reaproveitar `knowledge_base` para conteúdo editorial curado.

---

## Roadmap faseado

| Fase | Objetivo | Entregáveis | Migrations | Riscos |
|------|----------|-------------|-----------|--------|
| **1 — Base SaaS segura** | Auth aberta + billing + gating + coleção isolada e segura | Confirmar/abrir signups; `is_admin`; `ui_prefs` por user; Stripe checkout+webhook+portal; `lib/plano.ts`+`lib/profiles.ts`; gating server; onboarding `/onboarding`; `/admin/*` | `019_is_admin`, `020_ui_prefs_user`, `021_billing` (+ confirmar **007**/**016** aplicadas) | webhook não idempotente → dupla cobrança/estado errado; Passo C não aplicado em prod → coleção do dono exposta; gate só na UI |
| **2 — Marketplace de trocas** | Propor→aceitar→enviar→reputação; matching; privacidade | `lib/trocas.ts`; fluxo de estados; view `trocas_publicas`; função `match_trocas`; reputação por trigger; UI de trocas | `022_swap_items_rls`, `023_trocas_publicas_view`, `024_match_fn`, `025_reputacao_trigger` | fuga de colunas privadas via policy `para_troca`; scraping de wishlists; disputas sem moderação |
| **3 — Comunidade** | Fóruns + encontros | modelo §6; moderação `is_admin`; UI | `026_forum`, `027_encontros` | spam/moderação; custo de suporte |
| **4 — Monetização por anúncios** | Ads não intrusivos (free) | slot de ad server-side; `business` sem ads | — | UX; GDPR/consentimento |

---

## Apêndice A — Migrations propostas (DDL esboçado)

```sql
-- 019_is_admin.sql
alter table numis.profiles add column if not exists is_admin boolean default false;
update numis.profiles set is_admin = true
  where id = (select id from auth.users
              where lower(email) = lower('mariocarvalho.biz@gmail.com') limit 1);

-- 020_ui_prefs_user.sql  (fechar o vazamento entre tenants)
alter table numis.ui_prefs add column if not exists user_id uuid
  references auth.users(id) on delete cascade;
alter table numis.ui_prefs enable row level security;  -- 015 só mexeu em grants/policies, confirmar RLS ON
-- backfill das prefs existentes para o dono, depois NOT NULL:
update numis.ui_prefs set user_id = (select id from auth.users
  where lower(email)=lower('mariocarvalho.biz@gmail.com') limit 1) where user_id is null;
drop policy if exists "Authenticated le ui_prefs" on numis.ui_prefs;
drop policy if exists "Authenticated escreve ui_prefs" on numis.ui_prefs;
create policy "ui_prefs own-row" on numis.ui_prefs
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- nota: chave passa a ser única POR user → unique(user_id, chave); ajustar lib/catalog.ts.

-- 021_billing.sql
create table numis.billing_assinaturas (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  estado                 text default 'inactiva'
                         check (estado in ('inactiva','trialing','active','past_due','canceled')),
  price_id               text,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean default false,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table numis.billing_assinaturas enable row level security;
create policy "Ver própria assinatura" on numis.billing_assinaturas
  for select to authenticated using (auth.uid() = user_id);
-- escrita: SEM policy de insert/update → só service role (webhook) escreve.
grant select on numis.billing_assinaturas to authenticated;

create table numis.billing_eventos (   -- idempotência dos webhooks
  stripe_event_id text primary key,
  tipo text, processado_em timestamptz default now()
);
-- sem grants a anon/authenticated: só service role.

-- 022_swap_items_rls.sql  (fechar a lacuna)
alter table numis.swap_items enable row level security;
create policy "Ver itens de trocas em que participa" on numis.swap_items
  for select to authenticated using (exists (
    select 1 from numis.swaps s where s.id = swap_id
      and (auth.uid() = s.utilizador_origem_id or auth.uid() = s.utilizador_destino_id)));
create policy "Gerir itens das minhas propostas" on numis.swap_items
  for all to authenticated using (exists (
    select 1 from numis.swaps s where s.id = swap_id
      and auth.uid() = s.utilizador_origem_id))
  with check (exists (
    select 1 from numis.swaps s where s.id = swap_id
      and auth.uid() = s.utilizador_origem_id));

-- 023_trocas_publicas_view.sql  (privacidade: só colunas públicas)
create view numis.trocas_publicas with (security_invoker = true) as
  select id, user_id, catalog_coin_id, catalog_issue_id, formato_posse, grau,
         nota_publica, foto1, foto2, foto3
  from numis.collection where para_troca = true;
-- + REVOGAR a policy "Para troca é pública" da 005 em numis.collection
--   (substituída pela view, que não expõe preco_compra/notas privadas).
```

---

## Resumo (12 linhas)

1. O Passo C (auth Google + RLS por `user_id`) já tornou a app tecnicamente multitenant.
2. **Abrir signups = esvaziar `NUMIS_ALLOWED_EMAILS`**; fechar = repor. Zero deploy, reversível.
3. `profiles` já tem `plano`/`plano_ate` e cria-se sozinho no registo (`handle_new_user`).
4. Falta `is_admin` explícito — hoje "dono" é um email hardcoded; adicionar campo (migration 019).
5. **`ui_prefs` vaza entre tenants** (`using(true)`) — adicionar `user_id` (020). Bug de SaaS.
6. **`swap_items` não tem policy RLS** — fechar via join a `swaps` (022) antes da Fase 2.
7. Billing = **Stripe**, estado sincronizado **só por webhooks** (BD é projeção do Stripe).
8. Webhook idempotente (`billing_eventos`), service role, runtime Node, raw body (021).
9. Gating em camadas: **RLS** (acesso) + `lib/plano.ts` (server) + UI (UX); valor de mercado
   é dado público → gate de **apresentação**, não RLS.
10. Marketplace: máquina de estados já no enum; matching via função `security definer`
    (agregados, sem expor wishlists); **view `trocas_publicas`** evita vazar colunas privadas.
11. Roadmap: F1 base SaaS segura · F2 trocas · F3 comunidade · F4 ads.
12. Antes de abrir: confirmar que **007 e 016** correram em produção (senão a coleção do dono
    fica exposta ou invisível).

## Decisões que o dono tem de tomar

- **[DECISÃO]** Gateway: confirmar **Stripe** (vs Paddle/LemonSqueezy como Merchant of
  Record, que trata IVA UE automaticamente — relevante para vender em vários países).
- **[DECISÃO]** Preços (placeholders): pro **4,99€/mês · 49€/ano**; business
  **14,99€/mês · 149€/ano**; free 0€. Confirmar valores e se há plano anual.
- **[DECISÃO]** Abrir signups **já** (público) ou **beta convite-only** primeiro?
  Recomendação: convite-only até billing+gating testados; depois esvaziar a allowlist.
- **[DECISÃO]** Privacidade da coleção por defeito **privada** (opt-in `para_troca` por
  exemplar)? Recomendado.
- **[DECISÃO]** Confirmar conteúdo exato de cada plano na tabela §3.1 (ex.: limite de
  wishlists do free; marketplace é "ver" no free ou bloqueado).
