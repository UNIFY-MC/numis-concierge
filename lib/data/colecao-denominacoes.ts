// Mapa de referência: que denominações de moedas de COLEÇÃO cada país do euro
// emite, além das 2€ comemorativas de circulação. Serve para a app saber o que
// esperar por país e validar o scrape do índice de coleção do BCE.
//
// Fontes: BCE (collect index), Wikipedia "Euro gold and silver commemorative
// coins" (por país), casas da moeda nacionais. O DETALHE moeda-a-moeda vem do
// scraper (bce-colecao-paises) ou de ficheiros dedicados (incm-colecao para PT,
// colecao-alema para DE). Aqui ficam só os nominais e materiais típicos.
//
// pais_codigo SEMPRE minúsculo. vf em €. Estas moedas são (salvo as 3€ da
// Eslovénia, que circulam) curso legal APENAS no país emissor.

export interface DenominacaoColecao {
  vf: number
  material: string // liga/metal típico
}

export interface ColecaoPais {
  pais: string
  denominacoes: DenominacaoColecao[]
  nota?: string
}

export const COLECAO_DENOMINACOES: Record<string, ColecaoPais> = {
  at: {
    pais: 'Áustria',
    denominacoes: [
      { vf: 1.5, material: 'Prata 999 (Wiener Philharmoniker bullion)' },
      { vf: 5, material: 'Prata 800/925' },
      { vf: 10, material: 'Prata 925 / Ouro' },
      { vf: 20, material: 'Prata 900' },
      { vf: 25, material: 'Prata-Nióbio (bimetálica)' },
      { vf: 50, material: 'Ouro 986/999' },
      { vf: 100, material: 'Ouro 986' },
    ],
    nota: 'Série 25€ prata-nióbio anual desde 2003 (exclusiva da Casa da Áustria).',
  },
  be: {
    pais: 'Bélgica',
    denominacoes: [
      { vf: 2.5, material: 'Cuproníquel (comemorativa)' },
      { vf: 5, material: 'Cuproníquel coloured / Prata' },
      { vf: 10, material: 'Prata 925' },
      { vf: 12.5, material: 'Ouro' },
      { vf: 20, material: 'Prata 925' },
      { vf: 50, material: 'Ouro 999' },
      { vf: 100, material: 'Ouro 999' },
    ],
  },
  cy: {
    pais: 'Chipre',
    denominacoes: [
      { vf: 5, material: 'Prata 925' },
      { vf: 10, material: 'Prata 925' },
      { vf: 20, material: 'Ouro 999' },
    ],
  },
  de: {
    pais: 'Alemanha',
    denominacoes: [
      { vf: 5, material: 'Cuproníquel + anel de polímero' },
      { vf: 10, material: 'Prata 925 (até 2015)' },
      { vf: 20, material: 'Prata 925' },
      { vf: 25, material: 'Prata 999 (Tellerprägung)' },
      { vf: 35, material: 'Prata (desde 2026)' },
      { vf: 50, material: 'Ouro 999,9 (1/4 oz)' },
      { vf: 100, material: 'Ouro 999,9 (1/2 oz)' },
      { vf: 200, material: 'Ouro 999,9 (1 oz)' },
    ],
    nota: 'Cunhada nas 5 casas A·D·F·G·J. Detalhe em colecao-alema.ts.',
  },
  ee: {
    pais: 'Estónia',
    denominacoes: [
      { vf: 7, material: 'Prata 925' },
      { vf: 8, material: 'Prata 999' },
      { vf: 10, material: 'Prata 999' },
      { vf: 12, material: 'Prata 999' },
      { vf: 20, material: 'Ouro 999,9' },
    ],
  },
  es: {
    pais: 'Espanha',
    denominacoes: [
      { vf: 10, material: 'Prata 925' },
      { vf: 12, material: 'Prata 925 (comemorativa circulação 2002-2010)' },
      { vf: 20, material: 'Prata 925' },
      { vf: 30, material: 'Prata 925' },
      { vf: 50, material: 'Prata 925 / Ouro' },
      { vf: 100, material: 'Ouro 999' },
      { vf: 200, material: 'Ouro 999' },
      { vf: 400, material: 'Ouro 999' },
    ],
  },
  fi: {
    pais: 'Finlândia',
    denominacoes: [
      { vf: 5, material: 'Cuproníquel / bimetálica (séries temáticas)' },
      { vf: 10, material: 'Prata 925' },
      { vf: 20, material: 'Prata 925' },
      { vf: 50, material: 'Ouro 917' },
      { vf: 100, material: 'Ouro 917' },
    ],
  },
  fr: {
    pais: 'França',
    denominacoes: [
      { vf: 0.25, material: 'Prata/Ouro (¼€ histórico)' },
      { vf: 10, material: 'Prata 333/900' },
      { vf: 20, material: 'Prata 333' },
      { vf: 50, material: 'Prata 900 / Ouro' },
      { vf: 100, material: 'Prata 900 / Ouro' },
      { vf: 200, material: 'Ouro 999' },
      { vf: 250, material: 'Ouro 999' },
      { vf: 500, material: 'Ouro 999' },
      { vf: 1000, material: 'Ouro 999' },
      { vf: 5000, material: 'Ouro 999' },
    ],
    nota: 'Programa muito extenso (Monnaie de Paris), nominais até 5000€.',
  },
  gr: {
    pais: 'Grécia',
    denominacoes: [
      { vf: 5, material: 'Prata 925' },
      { vf: 10, material: 'Prata 925' },
      { vf: 50, material: 'Ouro 999,9' },
      { vf: 100, material: 'Ouro 999,9' },
      { vf: 200, material: 'Ouro 999,9' },
    ],
  },
  ie: {
    pais: 'Irlanda',
    denominacoes: [
      { vf: 5, material: 'Prata / Cuproníquel' },
      { vf: 10, material: 'Prata 925' },
      { vf: 15, material: 'Prata 925' },
      { vf: 20, material: 'Ouro 999' },
      { vf: 50, material: 'Ouro 999' },
      { vf: 100, material: 'Ouro 999' },
    ],
    nota: 'Quase tudo prata; ouro só desde 2006.',
  },
  it: {
    pais: 'Itália',
    denominacoes: [
      { vf: 5, material: 'Prata 925' },
      { vf: 10, material: 'Prata 925' },
      { vf: 20, material: 'Ouro 900' },
      { vf: 50, material: 'Ouro 900' },
    ],
  },
  lv: {
    pais: 'Letónia',
    denominacoes: [
      { vf: 5, material: 'Prata 925' },
      { vf: 10, material: 'Prata 925 / Nióbio' },
      { vf: 20, material: 'Ouro 999,9' },
    ],
  },
  lt: {
    pais: 'Lituânia',
    denominacoes: [
      { vf: 1.5, material: 'Cuproníquel (comemorativa)' },
      { vf: 5, material: 'Prata 925 / coloured' },
      { vf: 10, material: 'Prata 925' },
      { vf: 20, material: 'Prata 925' },
      { vf: 50, material: 'Ouro 999,9' },
    ],
  },
  lu: {
    pais: 'Luxemburgo',
    denominacoes: [
      { vf: 5, material: 'Prata-Nióbio (via Casa da Áustria)' },
      { vf: 10, material: 'Prata 925' },
      { vf: 20, material: 'Ouro 999' },
      { vf: 25, material: 'Prata 925' },
      { vf: 50, material: 'Ouro 999' },
      { vf: 100, material: 'Ouro 999' },
    ],
  },
  mt: {
    pais: 'Malta',
    denominacoes: [
      { vf: 5, material: 'Ouro 916' },
      { vf: 10, material: 'Prata 925' },
      { vf: 15, material: 'Ouro 916' },
      { vf: 50, material: 'Ouro 916' },
      { vf: 100, material: 'Ouro 916' },
    ],
  },
  nl: {
    pais: 'Países Baixos',
    denominacoes: [
      { vf: 5, material: 'Prata 925 / coated' },
      { vf: 10, material: 'Ouro 900' },
    ],
  },
  pt: {
    pais: 'Portugal',
    denominacoes: [
      { vf: 2.5, material: 'Cuproníquel / Prata' },
      { vf: 5, material: 'Prata 925 / Cuproníquel' },
      { vf: 7.5, material: 'Prata 925 / Ouro' },
      { vf: 10, material: 'Prata 925' },
    ],
    nota: 'Detalhe completo (séries, ouro, FDC/BNC/Proof, bebé) em incm-colecao.ts.',
  },
  sk: {
    pais: 'Eslováquia',
    denominacoes: [
      { vf: 10, material: 'Prata 900' },
      { vf: 20, material: 'Prata 925' },
      { vf: 25, material: 'Prata 925' },
      { vf: 100, material: 'Ouro 900' },
    ],
  },
  si: {
    pais: 'Eslovénia',
    denominacoes: [
      { vf: 3, material: 'Bimetálica (comemorativa que circula)' },
      { vf: 30, material: 'Prata 925' },
      { vf: 100, material: 'Ouro 900' },
    ],
    nota: 'As 3€ são comemorativas de circulação (raras), não só de coleção.',
  },
  // Microestados
  va: {
    pais: 'Vaticano',
    denominacoes: [
      { vf: 5, material: 'Prata 925' },
      { vf: 10, material: 'Prata 925' },
      { vf: 20, material: 'Ouro 917' },
      { vf: 50, material: 'Ouro 917' },
    ],
  },
  sm: {
    pais: 'San Marino',
    denominacoes: [
      { vf: 5, material: 'Prata 925' },
      { vf: 10, material: 'Prata 925' },
      { vf: 20, material: 'Ouro 917' },
      { vf: 50, material: 'Ouro 917' },
    ],
  },
  mc: {
    pais: 'Mónaco',
    denominacoes: [
      { vf: 5, material: 'Prata 925' },
      { vf: 10, material: 'Prata 925' },
      { vf: 20, material: 'Ouro' },
      { vf: 100, material: 'Ouro 999' },
    ],
  },
  ad: {
    pais: 'Andorra',
    denominacoes: [
      { vf: 5, material: 'Cuproníquel / Prata' },
      { vf: 10, material: 'Prata 925' },
    ],
  },
  hr: {
    pais: 'Croácia',
    denominacoes: [
      { vf: 25, material: 'Prata / bimetálica (desde 2023)' },
    ],
    nota: 'Entrou no euro em 2023; programa de coleção recente.',
  },
}
