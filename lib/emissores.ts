// Emissor / casa da moeda nacional de cada país do euro.
// Fonte: índice oficial do BCE (euro/coins/collect) + casas da moeda nacionais.
// pais_codigo SEMPRE minúsculo. Para a Alemanha, a casa concreta (cidade) vem do
// código virtual de-A…de-J (ver lib/alemanha.ts) — este mapa é o fallback geral.

export const EMISSOR_NACIONAL: Record<string, string> = {
  de: 'Münze Deutschland',
  ad: 'Govern d’Andorra',
  at: 'Münze Österreich',
  be: 'Royal Mint of Belgium',
  bg: 'Bulgarian Mint',
  cy: 'Banco Central de Chipre',
  hr: 'Croatian Mint',
  sk: 'Národná banka Slovenska',
  si: 'Banka Slovenije',
  es: 'Real Casa de la Moneda (FNMT)',
  ee: 'Eesti Pank',
  fi: 'Suomen Rahapaja (Mint of Finland)',
  fr: 'Monnaie de Paris',
  gr: 'Banco da Grécia',
  nl: 'Koninklijke Nederlandse Munt',
  ie: 'Central Bank of Ireland',
  it: 'Istituto Poligrafico e Zecca dello Stato',
  lv: 'Latvijas Banka',
  lt: 'Lietuvos bankas',
  lu: 'Banque centrale du Luxembourg',
  mt: 'Central Bank of Malta',
  mc: 'Monnaie de Paris (p/ Mónaco)',
  pt: 'Imprensa Nacional – Casa da Moeda (INCM)',
  sm: 'Istituto Poligrafico e Zecca dello Stato (p/ San Marino)',
  va: 'Istituto Poligrafico e Zecca dello Stato (p/ Vaticano)',
}

// Forma abreviada (sigla/curta) para caber numa linha na tabela.
export const EMISSOR_CURTO: Record<string, string> = {
  de: 'Münze DE', ad: 'Andorra', at: 'Münze AT', be: 'Royal Mint BE', bg: 'Bulgarian Mint',
  cy: 'BC Chipre', hr: 'Croatian Mint', sk: 'NBS', si: 'Banka SI', es: 'FNMT', ee: 'Eesti Pank',
  fi: 'Rahapaja FI', fr: 'Monnaie de Paris', gr: 'BC Grécia', nl: 'KNM', ie: 'CB Ireland',
  it: 'IPZS', lv: 'Latvijas Banka', lt: 'Lietuvos b.', lu: 'BCL', mt: 'CB Malta',
  mc: 'MdP (MC)', pt: 'INCM', sm: 'IPZS (SM)', va: 'IPZS (VA)',
}

export function emissorNacional(paisCodigo: string): string | null {
  return EMISSOR_NACIONAL[paisCodigo.split('-')[0].toLowerCase()] ?? null
}
export function emissorCurto(paisCodigo: string): string | null {
  return EMISSOR_CURTO[paisCodigo.split('-')[0].toLowerCase()] ?? null
}

// "Casa / Emissor" de uma linha: na Alemanha a cidade da casa (A=Berlim…);
// nos restantes países o emissor nacional.
import { casaAlemanha } from './alemanha'
import type { DisplayRow } from './types'

export function casaEmissor(r: DisplayRow): string {
  if (r.coin.pais_codigo === 'de' && r.issue.casa_moeda) {
    const c = casaAlemanha(`de-${r.issue.casa_moeda}`)
    return c ? `${r.issue.casa_moeda} · ${c.cidade}` : `Casa ${r.issue.casa_moeda}`
  }
  return emissorNacional(r.coin.pais_codigo) ?? '—'
}

// Versão curta para a tabela (cabe numa linha). Na Alemanha mantém a cidade da casa.
export function casaEmissorCurto(r: DisplayRow): string {
  if (r.coin.pais_codigo === 'de' && r.issue.casa_moeda) {
    const c = casaAlemanha(`de-${r.issue.casa_moeda}`)
    return c ? `${r.issue.casa_moeda} · ${c.cidade}` : `Casa ${r.issue.casa_moeda}`
  }
  return emissorCurto(r.coin.pais_codigo) ?? '—'
}
