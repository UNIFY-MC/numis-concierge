<!-- last_updated: 2026-06-18 · owner: Mário Carvalho · scope: índice de conexões / integrações (C2) -->

# Connections — Numis Concierge

Índice das conexões (C2 · Conexões). Diz **o que está ligado** e **o que cada uma
lê/escreve**. As chaves vivem só no `.env.local` / secrets — **nunca aqui, nunca no código,
nunca no chat**. Ver `.env.local.example`.

## Regra de ouro
> Pelo menos **uma** conexão tem de **ESCREVER**. Aqui: o Supabase (`collection`) escreve.

## Conexões ativas
| Serviço | Tipo | Lê | Escreve | Chave (nome em .env) | Notas |
|---|---|---|---|---|---|
| Supabase (schema `numis`) | SDK (browser) | ✅ catálogo + coleção | ✅ `collection` (via anon, temp) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | única fonte de queries: `lib/catalog.ts`. RLS `anon` aberto à `collection` (dívida técnica). |
| Supabase (service role) | SDK (scripts) | ✅ | ✅ seed/enriquecimento | `SUPABASE_SERVICE_ROLE_KEY` | **só local**, nunca versionada nem no browser. |
| Anthropic SDK | API (produto, futuro) | — | — | `ANTHROPIC_API_KEY` | previsto; ainda sem uso runtime. |
| Resend | API (futuro) | — | ✅ email | `RESEND_API_KEY` | previsto; ainda sem uso. |
| Numista | API (scripts) | ✅ metadados/fotos | — (escreve no nosso Supabase) | `NUMISTA_API_KEY` | enriquecimento **offline** (`scripts/enrich-numista.mjs`); nunca em runtime. Quota 2000/mês. |
| Maktun | scrape (scripts) | ✅ fotos/descrições | — (migra p/ Supabase Storage) | — | só scripts locais, com cache + rate limit + `--probe`. Respeitar robots.txt. |
| Vercel | deploy | — | ✅ deploy/analytics | (tokens Vercel) | `@vercel/analytics` no layout. Env vars espelhadas no painel. |

## Segredos
- Frontend: só `NEXT_PUBLIC_*` (público — anon key exposta no browser).
- Service role / `NUMISTA_API_KEY` / `ANTHROPIC_API_KEY` / `RESEND_API_KEY`: só local/scripts/server.
- `.env.local` está no `.gitignore`. Manter `.env.local.example` atualizado.

## Princípio
A app **nunca** chama Numista/Maktun em runtime — dados externos importam-se **uma vez**
para o Supabase e a partir daí vivem na BD. Voltar às fontes só quando saem moedas novas
ou faltam imagens (re-run resumível).

## A ligar (backlog)
- Supabase Auth (fecha a dívida do RLS `anon` aberto — ver `guardrails.md` e `decisions/`).
- Resend (alertas/exports) — quando houver multi-user.
