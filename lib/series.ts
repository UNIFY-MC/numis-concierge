// Eras de Portugal (modelo Colnect): agrupam as séries/reinados para a navegação.
// O serie_ord do catálogo (preenchido por scripts/classificar-series-pt.mjs) mapeia
// para uma destas eras.
export interface Era {
  chave: string
  label: string
  icone: string
  min: number // serie_ord mínimo (inclusivo)
  max: number // serie_ord máximo (inclusivo)
}

// serie_ord: Monarquia 1-40 (spine cronológico do Gomes), República/Escudo 41-49,
// Euro 50-69, Ilhas & Ultramar 70-79, Temáticas 80-89, Por classificar 90-99.
export const ERAS: Era[] = [
  { chave: 'monarquia', label: 'Monarquia', icone: '👑', min: 1, max: 40 },
  { chave: 'escudo', label: 'República · Escudo', icone: '🏛️', min: 41, max: 49 },
  { chave: 'euro', label: 'Euro', icone: '⭐', min: 50, max: 69 },
  { chave: 'ilhas', label: 'Ilhas & Ultramar', icone: '🏝️', min: 70, max: 79 },
  { chave: 'temas', label: 'Temáticas', icone: '🏷️', min: 80, max: 89 },
  { chave: 'outras', label: 'Por classificar', icone: '❓', min: 90, max: 99 },
]

export function eraDe(serieOrd: number | null): Era | null {
  if (serieOrd == null) return null
  return ERAS.find((e) => serieOrd >= e.min && serieOrd <= e.max) ?? null
}
