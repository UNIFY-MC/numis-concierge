// Catálogo global de tipos de moeda (numis.catalog_coins)
export interface CatalogCoin {
  id: string
  titulo: string
  categoria: 'coin' | 'banknote' | 'token' | 'exonumia'
  pais_codigo: string
  pais_nome: string
  valor_facial: number | null
  unidade: string | null
  moeda_codigo: string | null
  denominacao: string | null
  tipo_emissao: 'Circulação' | 'Comemorativa' | 'Proof' | 'BU' | 'Piéfort' | 'Essai' | null
  comemorativa: boolean
  serie: string | null
  tema: string | null
  composicao: string | null
  metal: string | null
  diametro_mm: number | null
  espessura_mm: number | null
  peso_g: number | null
  pureza: number | null
  forma: string | null
  anverso_desc: string | null
  reverso_desc: string | null
  orla_tipo: string | null
  orla_desc: string | null
  casa_moeda: string | null
  mintmark: string | null
  km_ref: string | null
  schon_ref: string | null
  numista_id: number | null
  anverso_img: string | null
  reverso_img: string | null
  face_comum: string | null
  demonetizada: boolean
  html_rank: number | null
  created_at: string
  updated_at: string
}

// Variante por ano / casa da moeda (numis.catalog_issues)
export interface CatalogIssue {
  id: string
  catalog_coin_id: string
  ano: string
  ano_gregoriano: number | null
  casa_moeda: string | null
  mintmark_variante: string | null
  tiragem: number | null
  tiragem_proof: number | null
  tiragem_bu: number | null
  data_emissao: string | null
  numista_issue_id: number | null
  etiqueta: string | null
  html_est0: 0 | 1 | 2
  html_obs: string | null
  html_qf: number
  html_verde: boolean
  notas: string | null
  created_at: string
}

// Linha de apresentação: junta issue + o seu coin + o exemplar na colecção (se houver)
export interface DisplayRow {
  issue: CatalogIssue
  coin: CatalogCoin
  item: CollectionItem | null
}

export const FORMATOS_POSSE = [
  'set', 'caderneta', 'carteira', 'circulacao', 'proof', 'slab', 'outro',
] as const

// Agregado por país (para a grelha e a vista de valor)
export interface PaisAgregado {
  codigo: string
  nome: string
  total: number
  set: number
  cad: number
  falta: number
  valorSet: number
  valorCad: number
}

// Estado de uma issue na coleção (derivado de collection)
export type Estado = 'set' | 'caderneta' | 'naotem'

export function estadoDe(item: CollectionItem | null): Estado {
  if (!item || item.quantidade <= 0) return 'naotem'
  return item.formato_posse === 'caderneta' ? 'caderneta' : 'set'
}

// Denominação curta a partir do valor facial (1c … 2€); fallback para comemorativas
export function denomCurta(facial: number | null, denom: string | null): string {
  const map: Record<string, string> = {
    '0.01': '1c', '0.02': '2c', '0.05': '5c', '0.1': '10c',
    '0.2': '20c', '0.5': '50c', '1': '1€', '2': '2€',
  }
  if (facial != null) {
    const k = String(facial)
    if (map[k]) return map[k]
  }
  return (denom ?? '').replace('Moed.', '').replace('Moeda de ', '').slice(0, 6) || '—'
}

// Exemplar na colecção pessoal (numis.collection)
export interface CollectionItem {
  id: string
  catalog_coin_id: string
  catalog_issue_id: string | null
  user_id: string | null
  quantidade: number
  formato_posse: 'set' | 'caderneta' | 'carteira' | 'circulacao' | 'proof' | 'slab' | 'outro' | null
  grau: string | null
  grau_sistema: 'Sheldon' | 'Europeu' | 'Simplificado' | null
  certificador: string | null
  numero_certificacao: string | null
  para_troca: boolean
  nota_publica: string | null
  valor_base: number | null
  preco_compra: number | null
  moeda_compra: string | null
  data_compra: string | null
  local_compra: string | null
  nota_privada: string | null
  armazenamento: string | null
  defecto: string | null
  rating: number | null
  foto1: string | null
  foto2: string | null
  foto3: string | null
  html_catalog_index: number | null
  created_at: string
  updated_at: string
}
