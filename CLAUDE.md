# Numis Concierge

> Plataforma de gestão e avaliação de moedas e colecções numismáticas.
> Stack: Next.js · TypeScript · React · Tailwind · Supabase · Vercel · Anthropic SDK · Resend

Segue as convenções globais em ~/.claude/CLAUDE.md.

## Módulos
- `lib/moedas.ts` — ÚNICA fonte de queries ao Supabase para moedas
- `lib/supabase.ts` — cliente browser
- `lib/types.ts` — tipos partilhados do domínio
- `components/` — um ficheiro por componente
- `app/(app)/moedas/page.tsx` — só composição

## Modelo de dados
Schema Supabase: `numis` (isolado do `public` dos outros projectos no mesmo cluster)
`numis.moedas`: id uuid PK, nome text, pais text, ano int, valor_facial text, metal text, estado enum(VF/XF/AU/UNC/PF), notas text, created_at, updated_at

## Env vars
Ver `.env.local.example` — Supabase + Anthropic + Resend

## Não fazer
- Não criar ficheiros HTML
- Não chamar supabase fora de `lib/`
- Não usar localStorage
- Não pôr lógica nas páginas
- Não usar JavaScript (só TypeScript)
