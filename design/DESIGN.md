<!-- last_updated: 2026-06-18 · owner: Mário Carvalho · scope: fonte de verdade visual (formato Stitch, 9 secções) -->

# DESIGN.md — Moedas do Pinto (Numis Concierge)

> Fonte de verdade visual da app. Espelha fielmente `app/globals.css` (`@theme inline`) e
> `app/layout.tsx` (`next/font`). **Nada aqui é inventado** — todos os valores saem do código.
> A fonte técnica continua a ser `app/globals.css`; este documento é a leitura humana **e**
> de máquina. Validação visual viva: `/showcase` (`app/showcase/page.tsx`).

---

## 1. Visual Theme & Atmosphere

- **Identidade**: *Moedas do Pinto* — numismática quente. Creme + dourado de moeda, com um
  primário violeta a dar energia de produto (nav activa, dashboard, ações).
- **Mood**: artesanal mas moderno; acolhedor, não corporativo. Fundo creme (nunca branco
  puro, nunca cinza frio), tinta quente (nunca preto puro).
- **Densidade**: média — cards arejados, números grandes em serifa como protagonistas.
- **Filosofia**: a moeda é o herói; a cor codifica posse (set / caderneta / não tem).
- **Anti-referências**: dashboards SaaS cinzentos/azuis frios, Material default, neon,
  dark-mode (não existe), paleta default do Tailwind (proibida).

---

## 2. Color Palette & Roles

Tema único (claro). Sem `.dark`. Token → valor → função → classe Tailwind.

### Fundos e superfícies
| Token | Valor | Função | Classe |
|---|---|---|---|
| `--mp-bg` | `#f7f3ec` | fundo creme quente da app | `bg-mp-bg` |
| `--mp-surface` | `#fffdf8` | cards / superfícies elevadas | `bg-mp-surface` |
| `--mp-surface-muted` | `#f1eadf` | chips, linhas alternadas | `bg-mp-surface-muted` |
| `--mp-border` | `#e8dfd0` | contornos suaves | `border-mp-border` |

### Marca — dourado/âmbar
| Token | Valor | Função | Classe |
|---|---|---|---|
| `--mp-gold` | `#d79a2e` | dourado de moeda, botão primário, valores | `text-mp-gold` / `bg-mp-gold` |
| `--mp-gold-strong` | `#9f6f25` | valores fortes, hover | `text-mp-gold-strong` |
| `--mp-gold-soft` | `#f1d494` | realces claros | `bg-mp-gold-soft` |

### Primário Numis — ações, links, nav activa, energia do dashboard
| Token | Valor | Função | Classe |
|---|---|---|---|
| `--mp-primary` | `#7651e8` | ação primária, nav activa | `text-mp-primary` / `bg-mp-primary` |
| `--mp-primary-strong` | `#5636c7` | hover/pressed | `text-mp-primary-strong` |
| `--mp-primary-soft` | `#eee7ff` | fundos suaves, accent | `bg-mp-primary-soft` |
| `--mp-primary-mid` | `#9a6af0` | meio do gradiente de título | (gradiente) |
| `--mp-primary-warm` | `#df8a3d` | fim do gradiente de título | (gradiente) |

### Texto
| Token | Valor | Função | Classe |
|---|---|---|---|
| `--mp-ink` | `#211b16` | texto principal (quente, não preto) | `text-mp-ink` |
| `--mp-ink-soft` | `#6d665d` | subtítulos, metadata | `text-mp-ink-soft` |
| `--mp-ink-faint` | `#a79e91` | labels, anos inativos | `text-mp-ink-faint` |

### Estados da coleção (codificação semântica)
| Token | Valor | Função | Classe | Fundo |
|---|---|---|---|---|
| `--mp-set` | `#24aa73` | verde — em set | `text-mp-set` / `bg-mp-set` | `--mp-set-bg` `#e6f6ee` |
| `--mp-caderneta` | `#2f85dc` | azul — em caderneta | `text-mp-caderneta` / `bg-mp-caderneta` | `--mp-caderneta-bg` `#e5f0fc` |
| `--mp-falta` | `#a88454` | cobre — não tem | `text-mp-falta` / `bg-mp-falta` | `--mp-falta-bg` `#f3eadf` |
| `--mp-bebe` | `#b07cc6` | lilás — caderneta bebé | `text-mp-bebe` / `bg-mp-bebe` | `--mp-bebe-bg` `#f1e7f6` |

### Discos de moeda
| Token | Valor | Função | Classe |
|---|---|---|---|
| `--mp-coin` | `#d79a2e` | cobre/bronze da moeda | `bg-mp-coin` |
| `--mp-coin-dark` | `#9f6f25` | aro escuro | `bg-mp-coin-dark` |
| `--mp-coin-empty` | `#d8d0c2` | moeda em falta (contorno claro) | `bg-mp-coin-empty` |

### Gradientes (não-tokenizáveis em classe; via `style` com CSS var — exceção legítima)
- `--mp-hero-grad` — fundo do hero do dashboard.
- `--mp-title-grad` — `linear-gradient` do título (primary → mid → warm). Aplicado por
  `style={{ backgroundImage: 'var(--mp-title-grad)' }}` + `bg-clip-text`.

### Ponte shadcn/ui
Os tokens shadcn (`--primary`, `--card`, `--muted`, `--ring`…) **herdam** os `--mp-*`
(ver `:root` em `globals.css`). Usar `bg-primary`, `text-muted-foreground`, `border-border`
é equivalente a usar a identidade Moedas do Pinto — não é paleta externa.

---

## 3. Typography Rules

Famílias via `next/font/google` em `app/layout.tsx`:

| Papel | Família | Pesos | Variável | Classe |
|---|---|---|---|---|
| Títulos, números/KPIs grandes | **Fraunces** (serifa) | 500/600/700 | `--font-serif` | `font-serif` |
| UI, corpo, labels | **Inter** (sans) | 400/500/600/700/800 | `--font-sans` | `font-sans` |

- **Não há `font-mono`.** Números grandes usam **serifa** (Fraunces) de propósito — é a
  assinatura da marca. Não introduzir mono sem decisão (ver `decisions/`).
- `body` herda `font-sans` (`globals.css`). Aplicar `font-serif` explicitamente em títulos,
  valores e KPIs.
- Escala: usar as utilities nativas do Tailwind (`text-xs`…`text-5xl`) — não há escala
  tipográfica tokenizada própria.

> Deriva conhecida: o `CLAUDE.md` antigo dizia "corpo em Outfit"; o código usa **Inter**.
> O código é a verdade. Ver `learnings.md`.

---

## 4. Component Stylings

Primitivos em `components/ui/` (shadcn adaptado à identidade). Domínio em `components/`.

| Primitivo | Variantes / notas |
|---|---|
| `Button` | variantes: `default` (bg-primary), `destructive`, `outline`, `secondary`, `ghost`, `link`. tamanhos: `xs`, `sm`, `default`, `lg`, `icon`, `icon-xs/sm/lg`. raio `rounded-md`, foco com `ring-ring/50`. |
| `Badge` | chips de estado/contagem; herda tokens semânticos. |
| `Card` | `Card` + `CardHeader/Title/Description/Action/Content/Footer`. superfície `bg-mp-surface`. |
| `Progress` | barra; usa `transform: translateX` (exceção `style` por dado). |
| `Tabs` | `Tabs/TabsList/TabsTrigger/TabsContent`; trigger activo a dourado/primary. |
| `Separator` | divisória `--mp-border`. |
| `Avatar` | `Avatar/Image/Fallback/Badge/Group/GroupCount`. |

Componentes de domínio relevantes: `CoinDisc` (disco SVG de moeda), `Flag` (bandeiras SVG),
`Dashboard`, `CoinSheet` (modal), `TabelaView`, `Sidebar`.

---

## 5. Layout Principles

- **Espaçamento**: escala Tailwind nativa (múltiplos de `0.25rem`). Cards com `gap`/`p`
  generosos (arejado).
- **Grelhas**: grelha de países responsiva (~4 colunas desktop → colapsa em mobile).
- **Raio base**: `--radius` = `1.125rem` (18px) — botões e cards arredondados.
- **Whitespace**: fundo creme respira; superfícies elevam-se por cor (`bg-mp-surface`), não
  por borda pesada.

---

## 6. Depth & Elevation

- Elevação por **cor**, não sombra forte: `bg-mp-bg` (base) → `bg-mp-surface` (elevado) →
  `bg-mp-surface-muted` (recuado/linhas).
- Bordas suaves `border-mp-border`. Sombras discretas (shadcn `shadow-xs` em `outline`).
- Scrim de modais: `bg-black/40` (exceção neutra permitida).

---

## 7. Do's and Don'ts

**Do**
- Toda a cor/raio vem de tokens `--mp-*` (ou tokens shadcn que os herdam).
- Estados da coleção sempre nas cores semânticas (set verde / caderneta azul / falta cobre / bebé lilás).
- Números/títulos em `font-serif`; UI em `font-sans`.

**Don't**
- ❌ Paleta default do Tailwind (`bg-gray-*`, `text-amber-*`…) — proibida.
- ❌ Hex hardcoded em componentes de UI.
- ❌ Ficheiros CSS novos (só `globals.css`).
- ❌ `style` inline, exceto valor vindo de **dados** (largura de barra, gradiente via CSS var).

**Exceções legítimas (não corrigir)**
- `components/Flag.tsx` — bandeiras SVG com as cores **oficiais** de cada país (não são tokens).
- `components/CoinDisc.tsx` — `#fff` em SVG de moeda (ilustração).
- `text-white` sobre dourado/primário/estados — contraste sobre fundo colorido (permitido).
- `bg-black/40` — scrim de modal (`CoinSheet`).

---

## 8. Responsive Behavior

- Mobile-first; grelha de países colapsa de ~4 col → 2 → 1.
- Sidebar colapsável em ecrãs pequenos.
- Touch targets ≥ tamanho `default`/`sm` dos botões (h-9/h-8).
- Tabelas largas (`TabelaView`) com scroll horizontal em mobile.

---

## 9. Agent Prompt Guide

Referência rápida para gerar UI consistente:

```
Fundo da app:        bg-mp-bg          (creme #f7f3ec)
Cartão/superfície:   bg-mp-surface     (#fffdf8)
Texto principal:     text-mp-ink       (#211b16)
Texto secundário:    text-mp-ink-soft
Marca/valores:       text-mp-gold / text-mp-gold-strong
Botão primário:      bg-mp-primary text-white   (violeta #7651e8)
Estado em set:       text-mp-set / bg-mp-set-bg       (verde)
Estado caderneta:    text-mp-caderneta / bg-mp-caderneta-bg  (azul)
Estado não tem:      text-mp-falta / bg-mp-falta-bg   (cobre)
Caderneta bebé:      text-mp-bebe / bg-mp-bebe-bg     (lilás)
Títulos/KPIs:        font-serif (Fraunces)
Corpo/UI:            font-sans  (Inter)
Raio:                rounded-[1.125rem] ou rounded-md (via --radius)
```

**Prompts prontos**
- *"Card de país: `bg-mp-surface`, nome em `font-serif text-mp-ink`, % em `text-mp-gold`,
  barra multicolor set/caderneta/falta, 3 chips com dots semânticos."*
- *"KPI: número grande `font-serif text-mp-gold-strong`, label `text-mp-ink-faint font-sans`."*

> Cross-check (2026-06-18): todos os tokens deste documento existem em `app/globals.css`
> e vice-versa. 26 tokens `--mp-*` + ponte shadcn. Sem deriva. Sem `--chart-*`, sem `.dark`.
