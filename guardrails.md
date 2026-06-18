<!-- last_updated: 2026-06-18 · owner: Mário Carvalho · scope: guardas (o que o agente NUNCA faz sozinho) -->

# Guardrails — Numis Concierge

As guardas escrevem-se **ANTES** de pôr algo a correr sozinho (C3 · Capacidades). Esta
lista é a fonte de verdade do que exige aprovação. Complementa as convenções globais.

## Nunca, sem aprovação explícita
- **Email / mensagens** (Resend, futuro) — só **rascunhos**. O Mário aprova e envia.
- **Publicar conteúdo** em qualquer plataforma — nunca sem aprovação.
- **Apagar / sobrescrever dados** no Supabase — só com **pré-visualização (dry-run)** primeiro.
  Nota do domínio: "não tenho" é `quantidade = 0`, **nunca DELETE** na `collection`.
- **Ações irreversíveis** em geral — confirmar antes.
- **Git** — commit/push só quando pedido; nunca em `main` sem branch; nunca `--no-verify`.
- **Segredos** — nunca imprimir `SUPABASE_SERVICE_ROLE_KEY`, `NUMISTA_API_KEY` ou outras no
  chat; nunca commitar `.env.local`.

## Específico do domínio (catálogo é fonte de verdade)
- **Não criar moedas novas** (`catalog_coins`/`catalog_issues`) sem prova de emissão por
  fonte permitida (banco central, Numista, Maktun). O HTML do colecionador só prova **posse**.
- **Não inventar** metal, grau, preços, fotos, `km_ref`, `numista_id` — campos sem dados
  ficam `null` até virem de fonte fidedigna.
- **Não editar `lib/data/catalog.ts` à mão** (é gerado por `scripts/parse-html-catalog.mjs`).
- Entradas ambíguas/duplicadas → **revisão manual**, nunca auto-merge.

## Enriquecimento externo (scripts, offline)
- Sempre `--probe` antes de gastar quota Numista. Respeitar rate limits e robots.txt (Maktun).
- Não hotlink de imagens: descarregar e migrar para Supabase Storage antes de apontar a BD.
- Guardar origem (`source_url`/id externo) nos logs de importação.

## Autonomia permitida (interno, sem gate)
Ler, classificar, calcular valores de mercado, resumir, gerar rascunhos de import,
preparar previews, correr auditoria. Tudo o que **não sai para fora** nem **apaga dados**.

## Dívida de segurança a fechar (gate para automação)
- **Gate de password ≠ auth real.** RLS da `collection` está **aberto a `anon`**
  (migration `006`). Antes de qualquer automação multi-user: aplicar
  `007_revert_collection_anon_PASSO_C.sql`, preencher `collection.user_id` e filtrar por
  `auth.uid()`. Ver `decisions/`.

## Idempotência
Qualquer rotina agendada (futuro: enriquecimento, alertas) tem de ser **idempotente** —
correr 2× não duplica nada. O enriquecimento já é resumível (salta o que está feito).
