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
  [/\bOlympic Team\b/gi, 'Equipa Olímpica'],
  [/\bWorld Youth Day\b/gi, 'Jornada Mundial da Juventude'],
  [/\bDiscoveries?\b/gi, 'Descobrimentos'], [/\bDiscovery\b/gi, 'Descobrimento'],
  [/\bRepublic\b/gi, 'República'], [/\bAutonomy\b/gi, 'Autonomia'],
  [/\bDeath\b/gi, 'morte'], [/\bBirth\b/gi, 'nascimento'],
  [/\bHuman Rights\b/gi, 'Direitos Humanos'],
  // termos temáticos das comemorativas/coleção recentes (séc. XXI)
  [/Heroes and Creatures of Mythology/gi, 'Heróis e Criaturas da Mitologia'],
  [/\bMythology\b/gi, 'Mitologia'], [/\bPhoenix\b/gi, 'Fénix'], [/\bUnicorn\b/gi, 'Unicórnio'],
  [/\bOdysseus\b/gi, 'Ulisses'],
  [/Dinosaurs? in Portugal/gi, 'Dinossauros de Portugal'], [/\bDinosaurs?\b/gi, 'Dinossauros'],
  [/Indo-Portuguese Furniture/gi, 'Mobiliário Indo-Português'], [/\bFurniture\b/gi, 'Mobiliário'],
  [/Lighthouses? of Portugal/gi, 'Faróis de Portugal'], [/\bLighthouses?\b/gi, 'Faróis'],
  [/Portuguese tiles/gi, 'Azulejaria Portuguesa'], [/\btiles\b/gi, 'azulejos'],
  [/Portuguese Musicians/gi, 'Músicos Portugueses'], [/\bMusicians\b/gi, 'Músicos'],
  [/Sustainable Development/gi, 'Desenvolvimento Sustentável'],
  [/World Scouting and Youth Movements/gi, 'Escutismo Mundial e Movimentos Juvenis'],
  [/Free Elections/gi, 'Eleições em Liberdade'],
  [/Freedom and Democracy/gi, 'Liberdade e Democracia'],
  [/\bConstitution\b/gi, 'Constituição'], [/\bFreedom\b/gi, 'Liberdade'], [/\bDemocracy\b/gi, 'Democracia'],
  [/Carnation Revolution/gi, 'Revolução dos Cravos'],
  [/Numismatic Treasures/gi, 'Tesouros Numismáticos'], [/\bNumismatic\b/gi, 'Numismáticos'],
  [/\bTreasures?\b/gi, 'Tesouros'], [/\bCharter\b/gi, 'Foral'],
  [/Ibero-American Capitals/gi, 'Capitais Ibero-Americanas'], [/\bCapitals?\b/gi, 'Capitais'],
  [/Skating Federation/gi, 'Federação de Patinagem'], [/\bSkating\b/gi, 'Patinagem'],
  [/Contemporary Urban Art/gi, 'Arte Contemporânea Urbana'],
  [/Draw a [Cc]oin/gi, 'Desenhar a Moeda'], [/\bKnowledge\b/gi, 'Conhecimento'],
  [/Digital World/gi, 'Mundo Digital'], [/Sea Literacy/gi, 'Literacia dos Mares'],
  [/Longleaf spearmint/gi, 'Hortelã-brava-de-folha-longa'],
  [/Peace between nations/gi, 'Paz entre as Nações'],
  // termos recorrentes da coleção 2004-2022
  [/World Heritage/gi, 'Património Mundial'], [/Historic Cent(er|re)/gi, 'Centro Histórico'],
  [/\bMonastery\b/gi, 'Mosteiro'], [/\bCathedral\b/gi, 'Sé'], [/Convent of Christ/gi, 'Convento de Cristo'],
  [/\bWine Region\b/gi, 'Região Vinhateira'], [/Vineyard Culture/gi, 'Cultura da Vinha'],
  [/\bLandscape\b/gi, 'Paisagem'], [/\bFortifications?\b/gi, 'Fortificações'],
  [/Endangered (Fauna|Animal) Species/gi, 'Espécies Animais Ameaçadas'],
  [/Endangered (Flora|Vegetal) Species/gi, 'Espécies Vegetais Ameaçadas'],
  [/Endangered Species/gi, 'Espécies Ameaçadas'], [/Protected Species/gi, 'Espécies Protegidas'],
  [/Iberian Lynx/gi, 'Lince Ibérico'], [/Iberi[ae]n Wolf/gi, 'Lobo Ibérico'],
  [/Imperial Eagle/gi, 'Águia Imperial'], [/\bDolphin\b/gi, 'Golfinho'], [/Sea Horse/gi, 'Cavalo-marinho'],
  [/four leaf clover/gi, 'Trevo de Quatro Folhas'],
  [/\bModernism\b/gi, 'Modernismo'], [/\bRenaissance\b/gi, 'Renascença'], [/Baroque( age)?/gi, 'Barroco'],
  [/Ages of Europe\s*-?\s*Gothic|Europa-Star:\s*Gothic|\bGothic\b/gi, 'Gótico'],
  [/Glass and Iron ages?/gi, 'Idade do Vidro e do Ferro'],
  [/Portuguese Architecture/gi, 'Arquitetura Portuguesa'], [/\bArchitecture\b/gi, 'Arquitetura'],
  [/Red Cross/gi, 'Cruz Vermelha'], [/Military Aviation/gi, 'Aviação Militar'],
  [/National Health Servi[c|s]e/gi, 'Serviço Nacional de Saúde'], [/\bOmbudsman\b/gi, 'Provedor de Justiça'],
  [/Climate Change/gi, 'Alterações Climáticas'], [/peace in Europe/gi, 'Paz na Europa'],
  [/Our Lady of Fátima/gi, 'Nossa Senhora de Fátima'], [/Intangible Heritage/gi, 'Património Imaterial'],
  [/Granary houses/gi, 'Espigueiros'], [/\bArmistice\b/gi, 'Armistício'],
  [/Circu[nm].?[- ]?[Nn]avigation/gi, 'Circum-navegação'], [/\bMarathon\b/gi, 'Maratona'],
  [/Olympic Sailing/gi, 'Vela Olímpica'], [/\bSailing\b/gi, 'Vela'],
  [/Childhood games|Childhood Games/gi, 'Jogos de Infância'], [/\bPorcelain\b/gi, 'Porcelana'],
  [/Natural wonders/gi, 'Maravilhas Naturais'], [/the youth and the future/gi, 'A Juventude e o Futuro'],
  [/Prince Henry the Navigator/gi, 'Infante D. Henrique, o Navegador'],
  [/\bMembership\b/gi, 'Adesão'], [/School-Ship/gi, 'Navio-Escola'], [/\bSubmarine\b/gi, 'Submarino'],
  [/\bUniversity\b/gi, 'Universidade'], [/Army (Institute )?Pupils?/gi, 'Pupilos do Exército'],
  [/\bEqual Opportunities\b/gi, 'Igualdade de Oportunidades'], [/Forest Reserve/gi, 'Reserva Florestal'],
  [/Nature Park/gi, 'Parque Natural'], [/\bExpansion of the European Union\b/gi, 'Alargamento da União Europeia'],
  [/Portuguese Language/gi, 'Língua Portuguesa'], [/\bScouting\b/gi, 'Escutismo'],
  [/\bNo date\b/gi, 's/ data'], [/\bPrince Regent\b/gi, 'Príncipe Regente'],
  [/\bSilver edition\b/gi, 'edição em prata'], [/\bGold edition\b/gi, 'edição em ouro'],
  [/\s*-\s*Silver Color\b/gi, ' (cor prata)'], [/\s*-\s*Silver\b/gi, ' (prata)'], [/\s*-\s*Gold\b/gi, ' (ouro)'],
  [/(\d+)(st|nd|rd|th)\b/gi, '$1.º'],
  [/\byears?\b/gi, 'anos'],
]

export function traduzNumis(s: string): string {
  let out = s
  for (const [re, sub] of SUBST) out = out.replace(re, sub)
  return out.replace(/\s{2,}/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim()
}

// Grupo de parênteses no fim da string, tolerante a UM nível de aninhamento
// ("(Maria II in Exile (1828-1833))", "(Governo Civil do Porto(G.C.P))"). O
// `[^()]*` simples parava no 1.º ')' e deixava o inglês vazar para a coluna Moeda.
const PAREN_FIM = /\s*\((?:[^()]|\([^()]*\))*\)\s*$/
const PAREN_FIM_CAP = /\(((?:[^()]|\([^()]*\))*)\)\s*$/

// Denominação sem o tema entre parênteses ("2½ Ecu (…)" → "2½ Ecu").
export function denomLimpa(c: CatalogCoin): string {
  const base = (c.denominacao || c.titulo || '').split(';').map((s) => s.trim()).pop() || ''
  let v = base.replace(PAREN_FIM, '').trim() || base
  // A Maktun por vezes mete "Portugal 5 euro 2023" na denominação: tirar o nome do
  // país à frente do valor e o ano no fim, deixando só o valor ("5 euro").
  v = v.replace(/\s+\d{4}$/, '').replace(/^[A-Za-zÀ-ÿ.]+\s+(?=\d)/, '').trim() || v
  return traduzNumis(v)
}

// Tema/comemoração: o campo tema (comemorativas) ou o que está entre parênteses
// na denominação (coleção/ECU), traduzido.
export function temaLimpo(c: CatalogCoin): string {
  if (c.tema) return traduzNumis(c.tema)
  const m = (c.denominacao || '').match(PAREN_FIM_CAP)
  return m ? traduzNumis(m[1]) : ''
}
