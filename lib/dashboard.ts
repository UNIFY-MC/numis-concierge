import { supabase } from './supabase'

// Camada de dados do dashboard /inicio.
// O cliente já está ligado ao schema `numis` (lib/supabase.ts).
//
// Modelo de cobertura (igual ao mockup): o universo são os 4738 catalog_issues
// (variantes ano/casa). Cada issue cai num de três estados:
//   • set       — tens pelo menos 1 exemplar em formato "set"
//   • caderneta — tens em caderneta/caderneta_bebe (e não em set)
//   • naotem    — não tens nenhum
// "Completo %" = (set + caderneta) / total. O valor por estado é FACIAL
// (valor_facial do catalog_coin da issue), nunca inventado.

export type EstadoCobertura = 'set' | 'caderneta' | 'naotem'

// Nome do país (PT-PT) por código ISO minúsculo — dados de referência da zona euro,
// não inventados. Usado só para apresentação em "Valor por país" / "Faltam".
const NOME_PAIS: Record<string, string> = {
  de: 'Alemanha', ad: 'Andorra', at: 'Áustria', be: 'Bélgica', bg: 'Bulgária',
  cy: 'Chipre', hr: 'Croácia', sk: 'Eslováquia', si: 'Eslovénia', es: 'Espanha',
  ee: 'Estónia', fi: 'Finlândia', fr: 'França', gr: 'Grécia', nl: 'Países Baixos',
  ie: 'Irlanda', it: 'Itália', lv: 'Letónia', lt: 'Lituânia', lu: 'Luxemburgo',
  mt: 'Malta', mc: 'Mónaco', pt: 'Portugal', sm: 'São Marino', va: 'Vaticano',
}
function nomePais(codigo: string): string {
  return NOME_PAIS[codigo] ?? codigo.toUpperCase()
}

export interface DashboardData {
  totalIssues: number          // universo de variantes (≈ 4738)
  totalCoins: number           // tipos no catálogo (≈ 618)
  emissores: number            // países/emissores distintos
  exemplaresTotal: number      // soma de quantidades possuídas

  cobertura: {
    set: number
    caderneta: number
    naotem: number
    total: number
    completoPct: number        // 0–100, set+caderneta sobre total
  }

  // Valor FACIAL segmentado pela cobertura (em €).
  valorFacial: {
    set: number
    caderneta: number
    naotem: number             // o que faltaria para completar, a valor facial
    colecao: number            // set + caderneta = "valor da tua coleção"
    total: number
  }

  valorMercado: number         // soma de collection.valor_base (pode ser baixo até enriqueceres)

  atividade30d: { exemplares: number; valorFacial: number }
  recentes: AtividadeRecente[]
  timeline: PontoTimeline[]

  // Valor facial das emissões que possuis (set+caderneta), agregado por país.
  valorPorPais: ValorPais[]
  // Amostra de tipos de moeda que ainda não tens (estado "não tem").
  faltam: MoedaEmFalta[]
}

export interface ValorPais {
  codigo: string
  nome: string
  valorFacial: number
  moedas: number       // nº de emissões possuídas desse país
}

export interface MoedaEmFalta {
  titulo: string
  codigo: string
  nome: string
}

export interface AtividadeRecente {
  titulo: string
  paisCodigo: string
  formato: string
  quantidade: number
  valorFacial: number
  updatedAt: string
}

export interface PontoTimeline {
  dia: string
  count: number
}

interface CoinMini {
  id: string
  valor_facial: number | null
  pais_codigo: string | null
  comemorativa: boolean | null
  titulo: string | null
}
interface IssueMini {
  id: string
  catalog_coin_id: string
}
interface ColRow {
  catalog_issue_id: string | null
  catalog_coin_id: string | null
  formato_posse: string | null
  quantidade: number | null
  valor_base: number | null
  updated_at: string
  catalog_coins: { valor_facial: number | null; titulo: string | null; pais_codigo: string | null } | null
}

async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
  page = 1000,
): Promise<T[]> {
  const all: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await build(from, from + page - 1)
    if (error) throw error
    const rows = (data as T[] | null) ?? []
    if (rows.length === 0) break
    all.push(...rows)
    if (rows.length < page) break
    from += page
  }
  return all
}

export async function getDashboard(): Promise<DashboardData> {
  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

  const [coins, issues, colRows] = await Promise.all([
    fetchAll<CoinMini>((f, t) =>
      supabase.from('catalog_coins').select('id, valor_facial, pais_codigo, comemorativa, titulo').range(f, t),
    ),
    fetchAll<IssueMini>((f, t) =>
      supabase.from('catalog_issues').select('id, catalog_coin_id').range(f, t),
    ),
    fetchAll<ColRow>((f, t) =>
      supabase
        .from('collection')
        .select('catalog_issue_id, catalog_coin_id, formato_posse, quantidade, valor_base, updated_at, catalog_coins(valor_facial, titulo, pais_codigo)')
        .gt('quantidade', 0)
        .range(f, t),
    ),
  ])

  // meta por coin: facial, país (código limpo) e título
  const facialDeCoin = new Map<string, number>()
  const paisDeCoin = new Map<string, string>()
  const tituloDeCoin = new Map<string, string>()
  const emissoresSet = new Set<string>()
  for (const c of coins) {
    facialDeCoin.set(c.id, c.valor_facial ?? 0)
    const cod = c.pais_codigo ? c.pais_codigo.split('-')[0].toLowerCase() : ''
    if (cod) { paisDeCoin.set(c.id, cod); emissoresSet.add(cod) }
    if (c.titulo) tituloDeCoin.set(c.id, c.titulo)
  }

  // facial por issue (via o seu coin)
  const facialDeIssue = new Map<string, number>()
  const coinDeIssue = new Map<string, string>()
  for (const i of issues) {
    facialDeIssue.set(i.id, facialDeCoin.get(i.catalog_coin_id) ?? 0)
    coinDeIssue.set(i.id, i.catalog_coin_id)
  }

  // cobertura: que issues tens em set / em caderneta
  const issuesSet = new Set<string>()
  const issuesCad = new Set<string>()
  let exemplaresTotal = 0
  let valorMercado = 0
  for (const r of colRows) {
    const qty = r.quantidade ?? 0
    if (qty <= 0 || !r.catalog_issue_id) continue
    exemplaresTotal += qty
    valorMercado += (r.valor_base ?? 0) * qty
    // "set" (verde) = BNC/Proof e avulsas; "caderneta" (azul) = carteiras FDC/Bebé.
    if (r.formato_posse === 'carteira_fdc' || r.formato_posse === 'carteira_bebe') issuesCad.add(r.catalog_issue_id)
    else issuesSet.add(r.catalog_issue_id)
  }
  // set tem prioridade sobre caderneta
  for (const id of issuesSet) issuesCad.delete(id)

  let setCount = 0, cadCount = 0
  let facialSet = 0, facialCad = 0, facialTotal = 0
  for (const i of issues) {
    const f = facialDeIssue.get(i.id) ?? 0
    facialTotal += f
    if (issuesSet.has(i.id)) { setCount++; facialSet += f }
    else if (issuesCad.has(i.id)) { cadCount++; facialCad += f }
  }
  const totalIssues = issues.length
  const naotemCount = totalIssues - setCount - cadCount
  const facialNaotem = facialTotal - facialSet - facialCad
  const completoPct = totalIssues > 0 ? Math.round(((setCount + cadCount) / totalIssues) * 100) : 0

  // recentes + timeline (últimos 30 dias)
  const recentesRaw = colRows
    .filter((r) => r.updated_at && r.updated_at >= trintaDiasAtras)
    .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))

  const recentes: AtividadeRecente[] = recentesRaw.slice(0, 10).map((r) => ({
    titulo: r.catalog_coins?.titulo ?? '—',
    paisCodigo: r.catalog_coins?.pais_codigo ?? '',
    formato: r.formato_posse ?? 'bnc',
    quantidade: r.quantidade ?? 0,
    valorFacial: r.catalog_coins?.valor_facial ?? 0,
    updatedAt: r.updated_at,
  }))

  const porDia: Record<string, number> = {}
  let ativos30d = 0
  let valorFacial30d = 0
  for (const r of recentesRaw) {
    const dia = r.updated_at?.slice(0, 10)
    if (!dia) continue
    const q = r.quantidade ?? 0
    porDia[dia] = (porDia[dia] ?? 0) + q
    ativos30d += q
    valorFacial30d += (r.catalog_coins?.valor_facial ?? 0) * q
  }
  const timeline: PontoTimeline[] = Object.entries(porDia)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, count]) => ({ dia, count }))

  // Valor por país: facial das emissões possuídas (set+caderneta), agrupado.
  const porPais = new Map<string, { valorFacial: number; moedas: number }>()
  for (const issueId of [...issuesSet, ...issuesCad]) {
    const coinId = coinDeIssue.get(issueId)
    if (!coinId) continue
    const cod = paisDeCoin.get(coinId)
    if (!cod) continue
    const bucket = porPais.get(cod) ?? { valorFacial: 0, moedas: 0 }
    bucket.valorFacial += facialDeCoin.get(coinId) ?? 0
    bucket.moedas += 1
    porPais.set(cod, bucket)
  }
  const valorPorPais: ValorPais[] = [...porPais.entries()]
    .map(([codigo, v]) => ({ codigo, nome: nomePais(codigo), ...v }))
    .sort((a, b) => b.valorFacial - a.valorFacial)

  // Faltam: tipos de moeda (coins) sem qualquer emissão possuída. Dedupe por título.
  const coinsPossuidos = new Set<string>()
  for (const issueId of [...issuesSet, ...issuesCad]) {
    const coinId = coinDeIssue.get(issueId)
    if (coinId) coinsPossuidos.add(coinId)
  }
  const faltam: MoedaEmFalta[] = []
  const titulosVistos = new Set<string>()
  for (const c of coins) {
    if (coinsPossuidos.has(c.id)) continue
    const titulo = tituloDeCoin.get(c.id)
    const cod = paisDeCoin.get(c.id)
    if (!titulo || !cod || titulosVistos.has(titulo)) continue
    titulosVistos.add(titulo)
    faltam.push({ titulo, codigo: cod, nome: nomePais(cod) })
    if (faltam.length >= 8) break
  }

  return {
    totalIssues,
    totalCoins: coins.length,
    emissores: emissoresSet.size,
    exemplaresTotal,
    cobertura: { set: setCount, caderneta: cadCount, naotem: naotemCount, total: totalIssues, completoPct },
    valorFacial: {
      set: facialSet,
      caderneta: facialCad,
      naotem: facialNaotem,
      colecao: facialSet + facialCad,
      total: facialTotal,
    },
    valorMercado,
    atividade30d: { exemplares: ativos30d, valorFacial: valorFacial30d },
    recentes,
    timeline,
    valorPorPais,
    faltam,
  }
}
