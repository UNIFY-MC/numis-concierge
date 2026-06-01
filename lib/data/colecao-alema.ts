// Moedas de coleção emitidas pela Alemanha (Münze Deutschland), além das 2€
// comemorativas de circulação. Fontes oficiais: Deutsche Bundesbank
// (Sammlermünzen) + Münze Deutschland (shop.muenze-deutschland.de).
// Curso legal APENAS na Alemanha (ao contrário das 2€, válidas na zona euro).
//
// Cada emissão é cunhada nas 5 casas: A=Berlim, D=Munique, F=Estugarda,
// G=Karlsruhe, J=Hamburgo. Normalmente só a marca da cunha difere, por isso o
// conjunto "completo" tem 5 exemplares por moeda (campo `casas`).
// vf = valor facial (€). serie = série anual. metal = liga/acabamento.

export type CasaAlema = 'A' | 'D' | 'F' | 'G' | 'J'
export const CASAS_ALEMAS: CasaAlema[] = ['A', 'D', 'F', 'G', 'J']

export interface MoedaColecaoAlema {
  ano: number
  vf: number
  tema: string
  serie?: string
  metal: string
  casas: CasaAlema[]
}

const TODAS = CASAS_ALEMAS

export const COLECAO_ALEMA: MoedaColecaoAlema[] = [
  // 5 € — moedas com anel de polímero (cuproníquel + anel colorido)
  { ano: 2016, vf: 5, tema: 'Planeta Terra (Blauer Planet Erde)', serie: '5€ Polímero', metal: 'Cuproníquel + anel polímero', casas: TODAS },
  { ano: 2017, vf: 5, tema: 'Zona Tropical (Tropische Zone)', serie: 'Klimazonen der Erde', metal: 'Cuproníquel + anel polímero', casas: TODAS },
  { ano: 2018, vf: 5, tema: 'Zona Subtropical (Subtropische Zone)', serie: 'Klimazonen der Erde', metal: 'Cuproníquel + anel polímero', casas: TODAS },
  { ano: 2019, vf: 5, tema: 'Zona Temperada (Gemäßigte Zone)', serie: 'Klimazonen der Erde', metal: 'Cuproníquel + anel polímero', casas: TODAS },
  { ano: 2020, vf: 5, tema: 'Zona Subpolar (Subpolare Zone)', serie: 'Klimazonen der Erde', metal: 'Cuproníquel + anel polímero', casas: TODAS },
  { ano: 2021, vf: 5, tema: 'Zona Polar (Polare Zone)', serie: 'Klimazonen der Erde', metal: 'Cuproníquel + anel polímero', casas: TODAS },
  { ano: 2022, vf: 5, tema: 'Abelha (Honigbiene)', serie: 'Wunderwelt Insekten', metal: 'Cuproníquel + anel polímero', casas: TODAS },
  { ano: 2023, vf: 5, tema: 'Borboleta (Schwalbenschwanz)', serie: 'Wunderwelt Insekten', metal: 'Cuproníquel + anel polímero', casas: TODAS },
  { ano: 2024, vf: 5, tema: 'Joaninha (Marienkäfer)', serie: 'Wunderwelt Insekten', metal: 'Cuproníquel + anel polímero', casas: TODAS },
  { ano: 2025, vf: 5, tema: 'Libélula (Libelle)', serie: 'Wunderwelt Insekten', metal: 'Cuproníquel + anel polímero', casas: TODAS },

  // 20 € — prata Ag 925 (Stempelglanz + Spiegelglanz). Desde 2016.
  { ano: 2016, vf: 20, tema: 'Nellie Bly / 125 anos volta ao mundo', metal: 'Prata Ag 925', casas: TODAS },
  { ano: 2016, vf: 20, tema: '125.º Nascimento de Otto Dix', metal: 'Prata Ag 925', casas: TODAS },
  { ano: 2017, vf: 20, tema: '500 Anos da Reforma (Reformation)', metal: 'Prata Ag 925', casas: TODAS },
  { ano: 2018, vf: 20, tema: '100 Anos da Sendung mit der Maus', metal: 'Prata Ag 925', casas: TODAS },
  { ano: 2019, vf: 20, tema: '250.º Nascimento de Alexander von Humboldt', metal: 'Prata Ag 925', casas: TODAS },
  { ano: 2020, vf: 20, tema: '250.º Nascimento de Ludwig van Beethoven', metal: 'Prata Ag 925', casas: TODAS },
  { ano: 2021, vf: 20, tema: 'Rotkäppchen (Capuchinho Vermelho)', serie: 'Grimms Märchen', metal: 'Prata Ag 925', casas: TODAS },
  { ano: 2022, vf: 20, tema: '50 Anos do Jogo Memory', metal: 'Prata Ag 925', casas: TODAS },
  { ano: 2023, vf: 20, tema: '100 Anos do Filme "Die Häschenschule"', metal: 'Prata Ag 925', casas: TODAS },
  { ano: 2024, vf: 20, tema: '125.º Nascimento de Erich Kästner', metal: 'Prata Ag 925', casas: TODAS },

  // 25 € — prata fina Ag 999, Tellerprägung (relevo 3D). Série Natal 2021-2025.
  { ano: 2021, vf: 25, tema: 'Christmette / Natal (Tellerprägung)', serie: 'Weihnachten 25€', metal: 'Prata Ag 999', casas: TODAS },
  { ano: 2022, vf: 25, tema: 'Mercado de Natal (Tellerprägung)', serie: 'Weihnachten 25€', metal: 'Prata Ag 999', casas: TODAS },
  { ano: 2023, vf: 25, tema: 'Presépio (Tellerprägung)', serie: 'Weihnachten 25€', metal: 'Prata Ag 999', casas: TODAS },
  { ano: 2024, vf: 25, tema: 'Anjo / Natal (Tellerprägung)', serie: 'Weihnachten 25€', metal: 'Prata Ag 999', casas: TODAS },
  { ano: 2025, vf: 25, tema: 'Natal (Tellerprägung)', serie: 'Weihnachten 25€', metal: 'Prata Ag 999', casas: TODAS },

  // 35 € — prata. Nova série "Weihnachtslieder" (canções de Natal) a partir de 2026.
  { ano: 2026, vf: 35, tema: 'Weihnachtslieder (1.ª emissão)', serie: 'Weihnachtslieder', metal: 'Prata', casas: TODAS },

  // 20 € ouro — 1/8 oz, ouro 999,9
  { ano: 2010, vf: 20, tema: 'Eiche (Carvalho)', serie: 'Deutscher Wald (Ouro)', metal: 'Ouro 999,9 · 1/8 oz', casas: TODAS },
  { ano: 2011, vf: 20, tema: 'Buche (Faia)', serie: 'Deutscher Wald (Ouro)', metal: 'Ouro 999,9 · 1/8 oz', casas: TODAS },
  { ano: 2012, vf: 20, tema: 'Fichte (Abeto)', serie: 'Deutscher Wald (Ouro)', metal: 'Ouro 999,9 · 1/8 oz', casas: TODAS },
  { ano: 2013, vf: 20, tema: 'Kiefer (Pinheiro)', serie: 'Deutscher Wald (Ouro)', metal: 'Ouro 999,9 · 1/8 oz', casas: TODAS },
  { ano: 2014, vf: 20, tema: 'Kastanie (Castanheiro)', serie: 'Deutscher Wald (Ouro)', metal: 'Ouro 999,9 · 1/8 oz', casas: TODAS },
  { ano: 2015, vf: 20, tema: 'Linde (Tília)', serie: 'Deutscher Wald (Ouro)', metal: 'Ouro 999,9 · 1/8 oz', casas: TODAS },
  { ano: 2016, vf: 20, tema: 'Nachtigall (Rouxinol)', serie: 'Heimische Vögel (Ouro)', metal: 'Ouro 999,9 · 1/8 oz', casas: TODAS },
  { ano: 2017, vf: 20, tema: 'Mauersegler (Andorinhão)', serie: 'Heimische Vögel (Ouro)', metal: 'Ouro 999,9 · 1/8 oz', casas: TODAS },
  { ano: 2018, vf: 20, tema: 'Uhu (Bufo-real)', serie: 'Heimische Vögel (Ouro)', metal: 'Ouro 999,9 · 1/8 oz', casas: TODAS },
  { ano: 2019, vf: 20, tema: 'Wanderfalke (Falcão-peregrino)', serie: 'Heimische Vögel (Ouro)', metal: 'Ouro 999,9 · 1/8 oz', casas: TODAS },
  { ano: 2020, vf: 20, tema: 'Weißstorch (Cegonha-branca)', serie: 'Heimische Vögel (Ouro)', metal: 'Ouro 999,9 · 1/8 oz', casas: TODAS },
  { ano: 2021, vf: 20, tema: 'Rotkehlchen (Pisco-de-peito-ruivo)', serie: 'Heimische Vögel (Ouro)', metal: 'Ouro 999,9 · 1/8 oz', casas: TODAS },

  // 50 € ouro — 1/4 oz, ouro 999,9
  { ano: 2017, vf: 50, tema: 'Lutherrose (Reforma)', metal: 'Ouro 999,9 · 1/4 oz', casas: TODAS },
  { ano: 2018, vf: 50, tema: 'Orgel (Órgão) — Musikinstrumente', serie: 'Musikinstrumente (Ouro)', metal: 'Ouro 999,9 · 1/4 oz', casas: TODAS },
  { ano: 2019, vf: 50, tema: 'Pauke (Tímbale)', serie: 'Musikinstrumente (Ouro)', metal: 'Ouro 999,9 · 1/4 oz', casas: TODAS },
  { ano: 2020, vf: 50, tema: 'Harfe (Harpa)', serie: 'Musikinstrumente (Ouro)', metal: 'Ouro 999,9 · 1/4 oz', casas: TODAS },
  { ano: 2021, vf: 50, tema: 'Violine (Violino)', serie: 'Musikinstrumente (Ouro)', metal: 'Ouro 999,9 · 1/4 oz', casas: TODAS },

  // 100 € ouro — 1/2 oz, ouro 999,9. UNESCO-Welterbe (2003-2019) — Säulen der Demokratie (2020-2022)
  { ano: 2003, vf: 100, tema: 'Quedlinburg', serie: 'UNESCO-Welterbe (Ouro)', metal: 'Ouro 999,9 · 1/2 oz', casas: TODAS },
  { ano: 2004, vf: 100, tema: 'Bamberg', serie: 'UNESCO-Welterbe (Ouro)', metal: 'Ouro 999,9 · 1/2 oz', casas: TODAS },
  { ano: 2005, vf: 100, tema: 'Weimar (Klassisches Weimar)', serie: 'UNESCO-Welterbe (Ouro)', metal: 'Ouro 999,9 · 1/2 oz', casas: TODAS },
  { ano: 2006, vf: 100, tema: 'Wartburg', serie: 'UNESCO-Welterbe (Ouro)', metal: 'Ouro 999,9 · 1/2 oz', casas: TODAS },
  { ano: 2009, vf: 100, tema: 'Trier (Tréveris)', serie: 'UNESCO-Welterbe (Ouro)', metal: 'Ouro 999,9 · 1/2 oz', casas: TODAS },
  { ano: 2014, vf: 100, tema: 'Kloster Lorsch', serie: 'UNESCO-Welterbe (Ouro)', metal: 'Ouro 999,9 · 1/2 oz', casas: TODAS },
  { ano: 2019, vf: 100, tema: 'Schlösser Augustusburg und Falkenlust', serie: 'UNESCO-Welterbe (Ouro)', metal: 'Ouro 999,9 · 1/2 oz', casas: TODAS },
  { ano: 2020, vf: 100, tema: 'Einigkeit (Unidade)', serie: 'Säulen der Demokratie (Ouro)', metal: 'Ouro 999,9 · 1/2 oz', casas: TODAS },
  { ano: 2021, vf: 100, tema: 'Recht (Direito)', serie: 'Säulen der Demokratie (Ouro)', metal: 'Ouro 999,9 · 1/2 oz', casas: TODAS },
  { ano: 2022, vf: 100, tema: 'Freiheit (Liberdade)', serie: 'Säulen der Demokratie (Ouro)', metal: 'Ouro 999,9 · 1/2 oz', casas: TODAS },

  // 200 € ouro — 1 oz, ouro 999,9 (emissões raras)
  { ano: 2002, vf: 200, tema: 'Einführung des Euro (Introdução do Euro)', metal: 'Ouro 999,9 · 1 oz', casas: TODAS },
]
