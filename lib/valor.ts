import type { CatalogCoin, CollectionItem } from './types'

// Graus de conservação + multiplicadores — EXACTOS do HTML original (linha 274).
// Não inventados.
export const GRADES: { label: string; mult: number }[] = [
  { label: 'Padrão (Standard)', mult: 1.0 },
  { label: 'Mau · G', mult: 0.5 },
  { label: 'Razoável · VG', mult: 0.7 },
  { label: 'Bom · F', mult: 0.85 },
  { label: 'Muito Bom · MBC/VF', mult: 1.0 },
  { label: 'Excelente · BC/XF', mult: 1.3 },
  { label: 'Soberba · AU', mult: 1.6 },
  { label: 'Não circulada · UNC', mult: 2.0 },
  { label: 'FDC / Proof', mult: 2.6 },
]

export const GRADE_DEFAULT = 'Padrão (Standard)'

export function gradeMult(grau: string | null | undefined): number {
  const g = GRADES.find((x) => x.label === grau)
  return g ? g.mult : 1.0
}

function baseVal(facial: number | null, item: CollectionItem | null): number {
  if (item?.valor_base != null) return Number(item.valor_base)
  return facial ?? 0
}

// Valor real estimado = quantidade × valor base × multiplicador de conservação.
// Não tem (sem item ou quantidade 0) → 0.
export function valorReal(coin: CatalogCoin, item: CollectionItem | null): number {
  if (!item || item.quantidade <= 0) return 0
  return item.quantidade * baseVal(coin.valor_facial, item) * gradeMult(item.grau)
}

// Valor de todos os exemplares de uma moeda (soma dos formatos: set+caderneta+bebé).
export function valorColecao(coin: CatalogCoin, itens: CollectionItem[]): number {
  return itens.reduce((s, it) => s + valorReal(coin, it), 0)
}

export function eur(n: number): string {
  return '€ ' + n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Valor de mercado ajustado ao grau ───────────────────────────────────────
// chaves do precos_mercado (Numista g/vg/f/vf/xf/au/unc; escudos bc/mbc/bela) que
// correspondem ao grau (label da app) selecionado no exemplar.
function chavesDoGrau(grau: string | null | undefined): string[] {
  const g = grau || ''
  if (/UNC|circulada|FDC|Proof/i.test(g)) return ['unc']
  if (/Soberba|\bAU\b/i.test(g)) return ['au']
  if (/Excelente|\bXF\b|\bBC\b/i.test(g)) return ['xf', 'bela']
  if (/Muito Bom|MBC|\bVF\b/i.test(g)) return ['vf', 'mbc']
  if (/Bom|\bF\b/i.test(g)) return ['f', 'bc']
  if (/Razo|\bVG\b/i.test(g)) return ['vg']
  if (/Mau|\bG\b/i.test(g)) return ['g']
  return []
}
// label de grau a que o valor_mercado guardado se refere (para escalar por multiplicador)
const GRAU_KEY_LABEL: Record<string, string> = {
  unc: 'Não circulada · UNC', au: 'Soberba · AU', xf: 'Excelente · BC/XF', bela: 'Excelente · BC/XF',
  vf: 'Muito Bom · MBC/VF', mbc: 'Muito Bom · MBC/VF', f: 'Bom · F', bc: 'Bom · F',
  vg: 'Razoável · VG', g: 'Mau · G',
}
// Valor de mercado UNITÁRIO no grau do exemplar: usa o preço exato desse grau
// (precos_mercado) se existir; senão escala o valor representativo pelo
// multiplicador de conservação relativo ao grau a que o valor se refere.
export function valorMercadoGrau(
  valorMercado: number | null | undefined,
  precos: Record<string, number> | null | undefined,
  grauMercado: string | null | undefined,
  grau: string | null | undefined,
): number | null {
  if (valorMercado == null) return null
  if (!grau) return valorMercado
  if (precos) {
    for (const k of chavesDoGrau(grau)) {
      const v = precos[k]
      if (v != null && Number.isFinite(Number(v))) return Number(v)
    }
  }
  const ref = gradeMult(GRAU_KEY_LABEL[grauMercado || 'unc'] || 'Não circulada · UNC') || 2.0
  return valorMercado * (gradeMult(grau) / ref)
}
