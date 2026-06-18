# 0002 — Auth: gate de password temporário e RLS anon aberto

- **Data**: 2026-06-18 (registo de decisão existente)
- **Estado**: Vigente como **temporário** — a substituir por Supabase Auth

## Contexto
Para testar a app sem montar auth real, criou-se uma barreira de UI. A coleção precisa de
escrever a partir do browser (anon key) enquanto não há utilizadores.

## Decisão (estado atual)
- **Gate de password**: `middleware.ts` protege tudo exceto `/login` e assets. Password em
  `APP_PASSWORD`, comparada server-side. Cookie `numis_session` = SHA-256 da password
  (`lib/auth-gate.ts`), httpOnly, 30 dias.
- **RLS `collection` aberto a `anon`** (migration `006_collection_anon_temp.sql`): `anon` tem
  SELECT/INSERT/UPDATE (não DELETE — "não tenho" é `quantidade = 0`).

## Risco assumido
Isto **não é segurança**. A anon key está exposta no browser: quem a extraia lê/escreve a
coleção mesmo passando ao lado do gate de password.

## Plano de saída (gate para multi-user / automação)
1. Introduzir **Supabase Auth**.
2. Aplicar `007_revert_collection_anon_PASSO_C.sql`.
3. Preencher `collection.user_id` com o uid do dono.
4. Filtrar/escrever por `user_id = auth.uid()` em `lib/catalog.ts`.

## Consequências
Até fechar isto: não automatizar escrita, não abrir a terceiros. Ver `guardrails.md`.
