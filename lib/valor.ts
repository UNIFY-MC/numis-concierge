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

export function eur(n: number): string {
  return '€ ' + n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
