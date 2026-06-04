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

export const ERAS: Era[] = [
  { chave: 'monarquia', label: 'Monarquia', icone: '👑', min: 1, max: 33 },
  { chave: 'escudo', label: 'República · Escudo', icone: '🏛️', min: 34, max: 36 },
  { chave: 'euro', label: 'Euro', icone: '⭐', min: 37, max: 43 },
  { chave: 'ilhas', label: 'Ilhas & Ultramar', icone: '🏝️', min: 50, max: 52 },
  { chave: 'fichas', label: 'Fichas & Tokens', icone: '🎟️', min: 60, max: 60 },
  { chave: 'outras', label: 'Por classificar', icone: '❓', min: 90, max: 99 },
]

export function eraDe(serieOrd: number | null): Era | null {
  if (serieOrd == null) return null
  return ERAS.find((e) => serieOrd >= e.min && serieOrd <= e.max) ?? null
}
