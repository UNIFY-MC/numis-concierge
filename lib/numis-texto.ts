import type { CatalogCoin } from './types'

// A Maktun mete o tema dentro da denominação ("2½ Ecu (Prince Henry...)") e em
// inglês. Estes helpers separam a denominação do tema e traduzem os termos
// numismáticos mais comuns para PT-PT (tradução de superfície, não substitui a
// descrição oficial da Numista — essa virá quando a key for renovada).

// Substituições (ordem importa: específicas primeiro). Evitamos genéricos
// arriscados (the/of) para não estragar nomes próprios.
const SUBST: [RegExp, string][] = [
  [/Prince Henry the Navigator/gi, 'Infante D. Henrique, o Navegador'],
  [/Henry the Navigator/gi, 'Henrique, o Navegador'],
  [/\bthe Navigator\b/gi, 'o Navegador'],
  [/Europe and the New Worlds?/gi, 'Europa e os Novos Mundos'],
  [/\bExplorer\s+/gi, ''],
  [/King John/gi, 'D. João'], [/King Manuel/gi, 'D. Manuel'], [/King Sebastian/gi, 'D. Sebastião'],
  [/King Peter/gi, 'D. Pedro'], [/King Louis/gi, 'D. Luís'], [/King Charles/gi, 'D. Carlos'],
  [/King Afonso/gi, 'D. Afonso'], [/King Alphonso/gi, 'D. Afonso'], [/King Denis/gi, 'D. Dinis'],
  [/King Edward/gi, 'D. Duarte'], [/King Ferdinand/gi, 'D. Fernando'], [/King Joseph/gi, 'D. José'],
  [/King Sancho/gi, 'D. Sancho'], [/Queen Mary/gi, 'D. Maria'], [/Queen Maria/gi, 'D. Maria'],
  [/\bKing\s+/gi, 'D. '], [/\bQueen\s+/gi, 'D. '],
  [/Bicentenary/gi, 'Bicentenário'], [/Centennial/gi, 'Centenário'], [/Centenary/gi, 'Centenário'],
  [/Anniversary/gi, 'Aniversário'],
  [/\bWorld Cup\b/gi, 'Mundial de Futebol'], [/\bOlympic Games\b/gi, 'Jogos Olímpicos'],
  [/\bDiscoveries?\b/gi, 'Descobrimentos'], [/\bDiscovery\b/gi, 'Descobrimento'],
  [/\bRepublic\b/gi, 'República'], [/\bAutonomy\b/gi, 'Autonomia'],
  [/\bDeath\b/gi, 'morte'], [/\bBirth\b/gi, 'nascimento'],
  [/\bHuman Rights\b/gi, 'Direitos Humanos'],
  [/\bNo date\b/gi, 's/ data'], [/\bPrince Regent\b/gi, 'Príncipe Regente'],
  [/\bSilver edition\b/gi, 'edição em prata'], [/\bGold edition\b/gi, 'edição em ouro'],
  [/(\d+)(st|nd|rd|th)\b/gi, '$1.º'],
  [/\byears?\b/gi, 'anos'],
]

export function traduzNumis(s: string): string {
  let out = s
  for (const [re, sub] of SUBST) out = out.replace(re, sub)
  return out.replace(/\s{2,}/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim()
}

// Denominação sem o tema entre parênteses ("2½ Ecu (…)" → "2½ Ecu").
export function denomLimpa(c: CatalogCoin): string {
  const base = (c.denominacao || c.titulo || '').split(';').map((s) => s.trim()).pop() || ''
  const semParent = base.replace(/\s*\([^)]*\)\s*$/, '').trim() || base
  return traduzNumis(semParent)
}

// Tema/comemoração: o campo tema (comemorativas) ou o que está entre parênteses
// na denominação (coleção/ECU), traduzido.
export function temaLimpo(c: CatalogCoin): string {
  if (c.tema) return traduzNumis(c.tema)
  const m = (c.denominacao || '').match(/\(([^)]+)\)\s*$/)
  return m ? traduzNumis(m[1]) : ''
}
