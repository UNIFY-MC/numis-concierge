// Casas da moeda alemãs (mint marks). Usado para dar contexto aos cartões
// virtuais de-A … de-J: emissor + cidade/região por baixo da série.
export const CASAS_ALEMANHA: Record<string, { casa: string; cidade: string }> = {
  A: { casa: 'Staatliche Münze Berlin', cidade: 'Berlim' },
  D: { casa: 'Bayerisches Hauptmünzamt', cidade: 'Munique (Baviera)' },
  F: { casa: 'Staatliche Münzen Baden-Württemberg', cidade: 'Estugarda (Bade-Vurtemberga)' },
  G: { casa: 'Staatliche Münzen Baden-Württemberg', cidade: 'Karlsruhe (Bade-Vurtemberga)' },
  J: { casa: 'Hamburgische Münze', cidade: 'Hamburgo' },
}

// Recebe o código virtual (ex. 'de-A') e devolve o emissor e cidade, ou null.
export function casaAlemanha(codigo: string): { casa: string; cidade: string } | null {
  if (!codigo.startsWith('de-')) return null
  return CASAS_ALEMANHA[codigo.slice(3)] ?? null
}
