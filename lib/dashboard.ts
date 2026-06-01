import { supabase } from './supabase'

// O cliente já está ligado ao schema `numis` (lib/supabase.ts). O estado de
// posse vive em collection.formato_posse (set / caderneta / caderneta_bebe);
// "tenho" = quantidade > 0.

export interface DashboardData {
  totalCatalogo: number
  colecao: { set: number; caderneta: number; bebe: number; total: number }
  valorFacialTotal: number
  recentes: AtividadeRecente[]
  timeline: PontoTimeline[]
  categorias: CategoriaResumo[]
}

export interface CategoriaResumo {
  key: 'circulacao' | 'comemorativa' | 'colecao'
  label: string
  total: number      // tipos no catálogo
  comPosse: number   // tipos distintos que já tens
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
  valorFacial: number
}

export async function getDashboard(): Promise<DashboardData> {
  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

  const [coinsRes, circRes, comemRes, colecaoRes, recentesRes] = await Promise.all([
    supabase.from('catalog_coins').select('id', { count: 'exact', head: true }),
    supabase.from('catalog_coins').select('id', { count: 'exact', head: true }).eq('comemorativa', false),
    supabase.from('catalog_coins').select('id', { count: 'exact', head: true }).eq('comemorativa', true),
    supabase
      .from('collection')
      .select('formato_posse, quantidade, catalog_coin_id, catalog_coins(valor_facial, comemorativa)'),
    supabase
      .from('collection')
      .select('formato_posse, quantidade, updated_at, catalog_coins(valor_facial, titulo, pais_codigo)')
      .gt('quantidade', 0)
      .gte('updated_at', trintaDiasAtras)
      .order('updated_at', { ascending: false }),
  ])

  const totalCatalogo = coinsRes.count ?? 0

  const colecao = { set: 0, caderneta: 0, bebe: 0, total: 0 }
  let valorFacialTotal = 0
  const comPosseCirc = new Set<string>()
  const comPosseComem = new Set<string>()
  for (const row of (colecaoRes.data ?? []) as unknown as Array<{ formato_posse: string | null; quantidade: number; catalog_coin_id: string | null; catalog_coins: { valor_facial: number | null; comemorativa: boolean | null } | null }>) {
    const qty = row.quantidade ?? 0
    if (qty <= 0) continue
    const vf = row.catalog_coins?.valor_facial ?? 0
    if (row.formato_posse === 'set') colecao.set += qty
    else if (row.formato_posse === 'caderneta') colecao.caderneta += qty
    else if (row.formato_posse === 'caderneta_bebe') colecao.bebe += qty
    else continue
    valorFacialTotal += vf * qty
    if (row.catalog_coin_id) (row.catalog_coins?.comemorativa ? comPosseComem : comPosseCirc).add(row.catalog_coin_id)
  }
  colecao.total = colecao.set + colecao.caderneta + colecao.bebe

  const categorias: CategoriaResumo[] = [
    { key: 'circulacao', label: 'Circulação', total: circRes.count ?? 0, comPosse: comPosseCirc.size },
    { key: 'comemorativa', label: 'Comemorativas 2€', total: comemRes.count ?? 0, comPosse: comPosseComem.size },
    { key: 'colecao', label: 'Coleção (ouro/prata)', total: 0, comPosse: 0 },
  ]

  const rec = (recentesRes.data ?? []) as unknown as Array<{ formato_posse: string | null; quantidade: number; updated_at: string; catalog_coins: { valor_facial: number | null; titulo: string | null; pais_codigo: string | null } | null }>

  const recentes: AtividadeRecente[] = rec.slice(0, 10).map((r) => ({
    titulo: r.catalog_coins?.titulo ?? '—',
    paisCodigo: r.catalog_coins?.pais_codigo ?? '',
    formato: r.formato_posse ?? 'set',
    quantidade: r.quantidade ?? 0,
    valorFacial: r.catalog_coins?.valor_facial ?? 0,
    updatedAt: r.updated_at,
  }))

  const porDia: Record<string, { count: number; valorFacial: number }> = {}
  for (const r of rec) {
    const dia = r.updated_at?.slice(0, 10)
    if (!dia) continue
    if (!porDia[dia]) porDia[dia] = { count: 0, valorFacial: 0 }
    porDia[dia].count += r.quantidade ?? 0
    porDia[dia].valorFacial += (r.catalog_coins?.valor_facial ?? 0) * (r.quantidade ?? 0)
  }
  const timeline: PontoTimeline[] = Object.entries(porDia)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, v]) => ({ dia, ...v }))

  return { totalCatalogo, colecao, valorFacialTotal, recentes, timeline, categorias }
}
