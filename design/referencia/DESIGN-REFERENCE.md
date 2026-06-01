# Referência de design — Moedas do Pinto (HTML original)

> Spec visual extraída dos screenshots do HTML original (`caderneta-euros (3).html`).
> Objectivo: replicar aspeto E funcionalidades na app Next.js.
> Os PNG originais não estão versionados (colados no chat). Se quiseres os ficheiros,
> coloca-os nesta pasta (`design/referencia/`).

## Identidade visual
- Tema **creme quente + dourado** (tokens `--mp-*` em `app/globals.css`).
- Título "Moedas do **Pinto**" — "Pinto" em dourado; logo circular dourado (moeda) à esquerda.
- Subtítulo: "Coleção por país · colunas por ano · set · caderneta · não tem".
- Títulos/números grandes em **serifa** (Fraunces); corpo em sans (Outfit).

## 1. Barra de estatísticas (5 cards)
Cards `bg-mp-surface`, número grande em serifa:
1. **Total catálogo** — 4738 · "25 emissores"
2. **Em set** — 2403 (verde mp-set) · "€ 1442.29"
3. **Em caderneta** — 1620 (azul mp-caderneta) · "€ 1595.69"
4. **Não tem** — 715 (cobre mp-falta) · "84.9% completo"
5. **Valor de mercado** — € 3037,98 (dourado) · "set + caderneta"

## 2. Filtros
- Pills: **Todas** (activa, fundo dourado) · Que tenho · ● Set (dot verde) · ● Caderneta (dot azul) · Não tem
- Campo de pesquisa com lupa: "Procurar país, ano, denominação…"
- Botões à direita: "⤓ Exportar" e "⤒ Importar"

## 3. Tabs + Sort
- Tabs: **Por Emissor** (activa) · Valor por País
- Ordenar por: **País (A–Z)** (activa, dourado) · % completo · Total de moedas

## 4. Grelha de países (vista "Por Emissor", topo)
Cards em grelha responsiva (~4 colunas desktop), `bg-mp-surface`:
- Bandeira + nome (serifa) + **%** à direita (dourado)
- "X moedas · Y na coleção"
- **Barra multicolor**: verde (set) + azul (caderneta) + resto creme (falta)
- 3 chips: "set N" (dot verde) · "caderneta N" (dot azul) · "não tem N" (dot cobre)
- "Valor da coleção € X" (dourado) em baixo
- Países com sufixo aparecem como "Portugal Bebé · carteira", "San Marino · carteira", "Vaticano · carteira"

Dados visíveis (para validação):
Alemanha 94% 248·232 (set185/cad47/não16) €222,24 · Andorra 93% 88·82 (58/24/6) €42,68 ·
Austria 93% 217·202 (189/13/15) €127,62 · Belgica 86% 275·237 (73/164/38) €219,24 ·
Bulgaria 100% 17·17 (8/9/0) €13,76 · Chipre 90% 156·140 (121/19/16) €73,96 ·
Croacia 57% 37·21 (8/13/16) €17,76 · Eslovaquia 91% 172·156 (110/46/16) €135,58 ·
Espanha 100% 248·248 (224/24/0) €156,64 · Luxemburgo 100% 236·236 (194/42/0) €173,00 ·
Portugal 66% 233·153 (102/51/80) €152,74 · Portugal Bebé carteira 96% 200·192 (0/192/8) €93,12

## 5. Vista de detalhe por país — MATRIZ (o mais importante)
Cabeçalho:
- Botões "← Todos os países" e "🖨 Imprimir lista de em falta (N)"
- Bandeira + nome + "X moedas · Y na coleção · Z%"
- Chips: "set N · €valor" · "caderneta N · €valor" · "não tem N"
- "Valor da coleção € X" à direita

Matriz (ex. Andorra):
- **Colunas = anos** (2014…2024), cabeçalho de ano em **dourado serifa**
- **Linhas = denominações** (1c, 2c, 5c, 10c, 20c, 50c, 1€, 2€, comemorativas), label à esquerda
- Cada **célula** = uma issue:
  · **Disco SVG** da moeda: cor por metal (1c/2c/5c cobre, 10c/20c/50c Nordic Gold, 1€/2€ bimetálica dourado/prata; em falta = cinza claro `mp-coin-empty`)
  · Texto no disco: denominação curta (ex "1c") + ano
  · **Dot de estado** (canto sup. dir.): verde=set, azul=caderneta, contorno claro=não tem
  · **Badge quantidade** (canto inf. esq., nº pequeno): cinza se 1, cobre se 0, dourado se >1
  · **Valor** por baixo: "€0.01"
  · Link "**Numista ↗**" (dourado pequeno) — URL de pesquisa país+denom+ano
- Scroll horizontal se os anos não couberem
- Performance: só renderiza o país aberto

## 6. CoinSheet (modal de edição)
Aberto ao clicar numa célula. `bg-mp-surface`, cantos arredondados, scrim escuro:
- Topo: disco grande + bandeira + nome país + "denominação · ano"
- Chips info: "Circulação" · "Face € 0.01" · etiqueta · denom curta
- **ESTADO DE POSSE**: 3 botões — Set (verde, dot verde) · Caderneta (azul, dot azul) · Não tem (cobre, dot cobre). O activo fica preenchido com a cor do estado.
- "FOTO DA MOEDA (URL)" — input + checkbox "Aplicar foto e valor a todos os anos de <país> · <denom>"
- "ESTADO DE CONSERVAÇÃO" (select, default "Padrão (Standard)") + "VALOR BASE (€) — por exemplar" (input)
- "QUANTIDADE — nº de exemplares que tens" (input)
- Caixa "Valor real estimado (quantidade × base × conservação)" → € X (dourado grande)
- "OBSERVAÇÕES" (textarea)
- Botão largo "🔍 Abrir na Numista"
- Rodapé: "Fechar" (contorno) + "**Guardar**" (dourado)

## 7. Vista "Valor por País"
- Título "Valor de mercado por emissor"
- Nota: "Total estimado da coleção: € 3037,98. Cada barra mostra set + caderneta.
  Valor = base (editável) × estado de conservação (por defeito Standard ×1.00)."
- Lista ordenada por valor desc: bandeira + nome + **barra horizontal** (verde set + azul caderneta sobre trilho creme) + "€ X" à direita
- Ordem: Portugal €225,86 · Alemanha €222,24 · Belgica €219,24 · San Marino €183,96 …

## Cálculo de valores (sem campo de preço guardado)
- `valorReal = quantidade × valor_facial × multiplicador_grau`
- Grau default "Padrão (Standard)" = ×1.00 → valor = quantidade × face
- Multiplicadores originais: Standard 1.0, Mau/G 0.5, Razoável/VG 0.7, Bom/F 0.85,
  MBC/VF 1.0, BC/XF 1.3, AU 1.6, UNC 2.0, FDC/Proof 2.6
- Estado tri-valor vive em `collection.formato_posse` (set/caderneta) + ausência/qty0 = não tem
