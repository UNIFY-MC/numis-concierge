import { supabase } from './supabase'
import type { CatalogCoin, CatalogIssue, CollectionItem } from './types'

// Colunas do catálogo SEM o maktun_raw (jsonb pesado, ~uso interno): com 8900+
// moedas, trazer o raw são dezenas de MB e trava a UI. Listamos o que a app usa.
const COLS_COIN =
  'id, titulo, categoria, familia, serie, serie_ord, moeda_hist, ano_inicio, ano_fim, ' +
  'pais_codigo, pais_nome, valor_facial, unidade, moeda_codigo, denominacao, tipo_emissao, ' +
  'comemorativa, tema, composicao, metal, diametro_mm, espessura_mm, peso_g, pureza, forma, ' +
  'anverso_desc, reverso_desc, orla_tipo, orla_desc, casa_moeda, mintmark, km_ref, schon_ref, ' +
  'numista_id, anverso_img, reverso_img, face_comum, demonetizada, html_rank, created_at, updated_at'

export async function getCatalogCoins(): Promise<CatalogCoin[]> {
  // catalog_coins passou os 1000 (limite do PostgREST) — paginar a leitura.
  const PAGE = 1000
  let from = 0
  const all: CatalogCoin[] = []
  for (;;) {
    const { data, error } = await supabase
      .from('catalog_coins')
      .select(COLS_COIN)
      .order('pais_nome', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...(data as unknown as CatalogCoin[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

// Catálogo de um país (leve, sem maktun_raw) — para a vista de coleção por série.
// Paginação paralela: conta primeiro, puxa as páginas em simultâneo.
export async function getCatalogPais(paisCodigo: string): Promise<CatalogCoin[]> {
  const { count, error } = await supabase
    .from('catalog_coins').select('id', { count: 'exact', head: true }).eq('pais_codigo', paisCodigo)
  if (error) throw error
  return fetchAllParallel<CatalogCoin>(count ?? 0, (from, to) =>
    supabase.from('catalog_coins').select(COLS_COIN).eq('pais_codigo', paisCodigo)
      .order('serie_ord', { ascending: true }).range(from, to) as unknown as PromiseLike<{ data: CatalogCoin[] | null; error: unknown }>,
  )
}

// Resumo de países no catálogo (código, nome, nº de tipos) — agregado no servidor
// (RPC), uma query em vez de percorrer o catálogo todo.
export async function getPaisesResumo(): Promise<{ codigo: string; nome: string; total: number }[]> {
  const { data, error } = await supabase.rpc('paises_resumo')
  if (error) throw error
  return (data ?? []).map((r: { codigo: string; nome: string; total: number }) => ({ codigo: r.codigo, nome: r.nome, total: Number(r.total) }))
}

// Moedas + emissões de uma coleção nomeada (tag). Multi-país: junta as moedas
// com essa tag de qualquer país. Usado no browser de coleções.
export async function getColecaoCoinsIssues(tagId: string): Promise<{ coins: CatalogCoin[]; issues: CatalogIssue[] }> {
  const ids: string[] = []
  {
    const PAGE = 1000; let from = 0
    for (;;) {
      const { data, error } = await supabase.from('coin_tags').select('catalog_coin_id').eq('tag_id', tagId).range(from, from + PAGE - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      ids.push(...data.map((r) => r.catalog_coin_id as string))
      if (data.length < PAGE) break
      from += PAGE
    }
  }
  if (ids.length === 0) return { coins: [], issues: [] }
  const coins: CatalogCoin[] = []
  const issues: CatalogIssue[] = []
  for (let i = 0; i < ids.length; i += 200) {
    const lote = ids.slice(i, i + 200)
    const [{ data: cs, error: e1 }, { data: is, error: e2 }] = await Promise.all([
      supabase.from('catalog_coins').select(COLS_COIN).in('id', lote),
      supabase.from('catalog_issues').select('*').in('catalog_coin_id', lote),
    ])
    if (e1) throw e1
    if (e2) throw e2
    coins.push(...((cs ?? []) as unknown as CatalogCoin[]))
    issues.push(...((is ?? []) as unknown as CatalogIssue[]))
  }
  return { coins, issues }
}

// IDs das moedas que casam com um filtro de categoria — para atribuição em lote
// a uma coleção (ex. todos os 2€ de Portugal, todas as comemorativas euro).
export interface FiltroLote { pais?: string; familia?: string; valorFacial?: number; comemorativa?: boolean }
export async function getCoinIdsByFiltro(f: FiltroLote): Promise<string[]> {
  const PAGE = 1000
  let from = 0
  const ids: string[] = []
  for (;;) {
    let q = supabase.from('catalog_coins').select('id')
    if (f.pais) q = q.eq('pais_codigo', f.pais)
    if (f.familia) q = q.eq('familia', f.familia)
    if (f.valorFacial != null) q = q.eq('valor_facial', f.valorFacial)
    if (f.comemorativa != null) q = q.eq('comemorativa', f.comemorativa)
    const { data, error } = await q.range(from, from + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    ids.push(...data.map((r) => r.id as string))
    if (data.length < PAGE) break
    from += PAGE
  }
  return ids
}

export async function getCatalogByCountry(paisCodigo: string): Promise<CatalogCoin[]> {
  const { data, error } = await supabase
    .from('catalog_coins')
    .select('*')
    .eq('pais_codigo', paisCodigo)
    .order('html_rank', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getCatalogIssues(): Promise<CatalogIssue[]> {
  const PAGE = 1000
  let from = 0
  const all: CatalogIssue[] = []
  for (;;) {
    const { data, error } = await supabase
      .from('catalog_issues')
      .select('*')
      .order('ano_gregoriano', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

// Issues de um país (via inner join ao catalog_coins) — para a vista de coleção
// por série poder montar a tabela editável sem carregar as issues do mundo todo.
export async function getIssuesPais(paisCodigo: string): Promise<CatalogIssue[]> {
  const { count, error } = await supabase
    .from('catalog_issues').select('id, catalog_coins!inner(pais_codigo)', { count: 'exact', head: true })
    .eq('catalog_coins.pais_codigo', paisCodigo)
  if (error) throw error
  return fetchAllParallel<CatalogIssue>(count ?? 0, (from, to) =>
    supabase.from('catalog_issues').select('*, catalog_coins!inner(pais_codigo)')
      .eq('catalog_coins.pais_codigo', paisCodigo).order('ano_gregoriano', { ascending: true })
      .range(from, to) as unknown as PromiseLike<{ data: CatalogIssue[] | null; error: unknown }>,
  )
}

export async function getIssuesForCoin(catalogCoinId: string): Promise<CatalogIssue[]> {
  const { data, error } = await supabase
    .from('catalog_issues')
    .select('*')
    .eq('catalog_coin_id', catalogCoinId)
    .order('ano_gregoriano', { ascending: true })
  if (error) throw error
  return data ?? []
}

// Preferências de UI (ex. colunas/ordenação da tabela). Sem localStorage — vive
// na BD (1 linha por chave; global, chega para uso pessoal).
export async function getUiPrefs<T>(chave: string): Promise<T | null> {
  const { data, error } = await supabase.from('ui_prefs').select('prefs').eq('chave', chave).maybeSingle()
  if (error) return null
  return (data?.prefs as T) ?? null
}
export async function setUiPrefs(chave: string, prefs: unknown): Promise<void> {
  // upsert manual (a anon não tem política de UPSERT garantida): tenta update, senão insert.
  const { data } = await supabase.from('ui_prefs').select('chave').eq('chave', chave).maybeSingle()
  if (data) await supabase.from('ui_prefs').update({ prefs, updated_at: new Date().toISOString() }).eq('chave', chave)
  else await supabase.from('ui_prefs').insert({ chave, prefs })
}

// ─── Cache em memória ────────────────────────────────────────────────────────
// O catálogo é efetivamente imutável durante a sessão (só muda por import offline),
// por isso carrega-se uma vez por grupo de família e reutiliza-se entre navegações.
// A coleção muda com as edições → invalida-se explicitamente após cada escrita.
const coinsFamCache = new Map<string, Promise<CatalogCoin[]>>()
const issuesFamCache = new Map<string, Promise<CatalogIssue[]>>()
let collectionCache: Promise<CollectionItem[]> | null = null

export function invalidateCollection(): void {
  collectionCache = null
}

export function getCollection(): Promise<CollectionItem[]> {
  return (collectionCache ??= fetchCollection())
}

// Paginação paralela: conta primeiro, depois puxa todas as páginas em simultâneo.
// Latência ≈ 1 pedido (não a soma das páginas) — entrada muito mais rápida.
const PAGE = 1000
async function fetchAllParallel<T>(
  total: number,
  fetchRange: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const reqs: PromiseLike<{ data: T[] | null; error: unknown }>[] = []
  for (let from = 0; from < total; from += PAGE) reqs.push(fetchRange(from, Math.min(from + PAGE, total) - 1))
  const results = await Promise.all(reqs)
  const all: T[] = []
  for (const r of results) {
    if (r.error) throw r.error
    if (r.data) all.push(...r.data)
  }
  return all
}

async function fetchCollection(): Promise<CollectionItem[]> {
  const { count, error } = await supabase.from('collection').select('id', { count: 'exact', head: true })
  if (error) throw error
  return fetchAllParallel<CollectionItem>(count ?? 0, (from, to) =>
    supabase.from('collection').select('*').range(from, to),
  )
}

// Catálogo só do grupo de família activo (lazy) — evita descarregar o catálogo
// inteiro (>13k tipos) quando a vista só mostra, ex., o euro (~800 tipos).
export function getCatalogCoinsByFamilias(familias: string[]): Promise<CatalogCoin[]> {
  const key = [...familias].sort().join(',')
  let p = coinsFamCache.get(key)
  if (!p) {
    p = fetchCoinsByFamilias(familias)
    coinsFamCache.set(key, p)
  }
  return p
}

async function fetchCoinsByFamilias(familias: string[]): Promise<CatalogCoin[]> {
  const { count, error } = await supabase
    .from('catalog_coins')
    .select('id', { count: 'exact', head: true })
    .in('familia', familias)
  if (error) throw error
  return fetchAllParallel<CatalogCoin>(count ?? 0, (from, to) =>
    supabase
      .from('catalog_coins')
      .select(COLS_COIN)
      .in('familia', familias)
      .order('pais_nome', { ascending: true })
      .range(from, to) as unknown as PromiseLike<{ data: CatalogCoin[] | null; error: unknown }>,
  )
}

export function getIssuesByFamilias(familias: string[]): Promise<CatalogIssue[]> {
  const key = [...familias].sort().join(',')
  let p = issuesFamCache.get(key)
  if (!p) {
    p = fetchIssuesByFamilias(familias)
    issuesFamCache.set(key, p)
  }
  return p
}

async function fetchIssuesByFamilias(familias: string[]): Promise<CatalogIssue[]> {
  const total = await countIssuesByFamilias(familias)
  return fetchAllParallel<CatalogIssue>(total, (from, to) =>
    supabase
      .from('catalog_issues')
      .select('*, catalog_coins!inner(familia)')
      .in('catalog_coins.familia', familias)
      .order('ano_gregoriano', { ascending: true })
      .range(from, to) as unknown as PromiseLike<{ data: CatalogIssue[] | null; error: unknown }>,
  )
}

// Contagem de variantes por grupo (para os separadores) — sem trazer linhas.
export async function countIssuesByFamilias(familias: string[]): Promise<number> {
  const { count, error } = await supabase
    .from('catalog_issues')
    .select('id, catalog_coins!inner(familia)', { count: 'exact', head: true })
    .in('catalog_coins.familia', familias)
  if (error) throw error
  return count ?? 0
}

export interface CollectionUpsert {
  catalogCoinId: string
  catalogIssueId: string
  quantidade: number
  formatoPosse?: CollectionItem['formato_posse']
  casaMoeda?: string | null
  grau?: string | null
  valorBase?: number | null
  foto?: string | null
  notaPrivada?: string | null
  defeito?: string | null  // erro/variante de cunhagem (eixo deslocado, off-center…)
}

// Cria ou actualiza o exemplar de uma issue. Nunca apaga (ver dívida técnica
// do RLS anon na migration 006): "não tenho" é guardado como quantidade=0.
export async function upsertCollectionItem(input: CollectionUpsert): Promise<CollectionItem> {
  // Uma linha por (issue, formato) — uma moeda pode existir em vários formatos
  // (set/caderneta/caderneta_bebe), cada um o seu exemplar.
  const formato = input.formatoPosse ?? null
  let q = supabase.from('collection').select('id').eq('catalog_issue_id', input.catalogIssueId)
  q = formato ? q.eq('formato_posse', formato) : q.is('formato_posse', null)
  const { data: existing, error: selErr } = await q.limit(1).maybeSingle()
  if (selErr) throw selErr

  const fields = {
    catalog_coin_id: input.catalogCoinId,
    catalog_issue_id: input.catalogIssueId,
    quantidade: input.quantidade,
    formato_posse: input.formatoPosse ?? null,
    casa_moeda: input.casaMoeda ?? null,
    grau: input.grau ?? null,
    valor_base: input.valorBase ?? null,
    foto1: input.foto ?? null,
    nota_privada: input.notaPrivada ?? null,
    defecto: input.defeito ?? null,
  }

  if (existing) {
    const { data, error } = await supabase
      .from('collection')
      .update(fields)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    invalidateCollection()
    return data
  }

  // Novo exemplar: carimba o dono (RLS exige user_id = auth.uid() na inserção).
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sessão inválida — inicia sessão para editar a colecção.')

  const { data, error } = await supabase
    .from('collection')
    .insert({ ...fields, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  invalidateCollection()
  return data
}

// "Aplicar foto e valor a todos os anos": actualiza valor_base + foto1 de todos os
// exemplares já existentes desse catalog_coin (não cria novos — só propaga aos que tens).
export async function applyToAllYears(
  catalogCoinId: string,
  valorBase: number | null,
  foto: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('collection')
    .update({ valor_base: valorBase, foto1: foto })
    .eq('catalog_coin_id', catalogCoinId)
  if (error) throw error
  invalidateCollection()
}
