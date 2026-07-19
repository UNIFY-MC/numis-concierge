<!-- last_updated: 2026-07-19 · owner: Mário · scope: cadência (C4) — o que corre à mão, supervisionado ou sozinho -->

# Cadência — Numis Concierge (C4)

O 4.º C é o **último** passo, não o primeiro. Só se sobe um degrau com os 3 Cs no sítio
(`Context.md` · `connections.md` · `guardrails.md`) e as guardas escritas.

> Método e anti-padrões gerais: `docs/cadencia.md` do kit de arranque.
> Este ficheiro é o **registo concreto** do numis.coins.

## A escada

```
MANUAL              →   SUPERVISIONADO          →   AGENDADO
tu pedes, ele faz       ele faz, tu aprovas          corre sozinho
```

## Estado actual das rotinas

| Rotina | Degrau | Gatilho | Guarda | Notas |
|---|---|---|---|---|
| Import/enriquecimento Numista | **Manual** | a pedido | fonte de verdade obrigatória; ambíguos ficam p/ revisão | 2 chaves API (mario+matilde, alternar p/ rate limit) |
| Enriquecimento Maktun (fotos/metadados) | **Manual** | a pedido | match inequívoco; guardar `source_url`; migrar imagens p/ Storage (sem hotlink) | respeitar robots.txt e rate limits |
| Regenerar catálogo estático | **Manual** | quando o HTML muda | `lib/data/catalog.ts` NUNCA à mão — só `scripts/parse-html-catalog.mjs` | 4738 entradas |
| Marcar posse na coleção | **Manual** | uso normal da app | "não tenho" = `quantidade 0`, **nunca DELETE** | |

**Nada está agendado, e neste projeto é quase de propósito:** o catálogo de euro muda
devagar (novas emissões são raras) e cada import mexe na fonte de verdade — o custo de um
agendamento errado é sujar o catálogo, o benefício é mínimo.

## Regras de progressão (não negociáveis)

1. **Só se agenda o que já corre bem à mão há ~1 semana.**
2. **Uma automação nova por semana. Não mais.**
3. **Guardas primeiro** — ver `guardrails.md` (dry-run antes de qualquer escrita em massa).
4. **Idempotência** — reimportar 2× nunca duplica moedas nem emissões.
5. **Notificação + rasto** — toda a run regista origem (`source_url`) e resultado.

## Candidato seguinte (quando fizer sentido)

**Verificação mensal de novas emissões** (bancos centrais/Numista) em modo supervisionado:
o agente propõe as novas entradas com prova, o Mário aprova. Antes disso, resolver os
2 P0 da auditoria (auth/RLS) — não se automatiza escrita numa BD sem RLS.
