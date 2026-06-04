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
export async function getCatalogPais(paisCodigo: string): Promise<CatalogCoin[]> {
  const PAGE = 1000
  let from = 0
  const all: CatalogCoin[] = []
  for (;;) {
    const { data, error } = await supabase
      .from('catalog_coins')
      .select(COLS_COIN)
      .eq('pais_codigo', paisCodigo)
      .order('serie_ord', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...(data as unknown as CatalogCoin[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
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
  const PAGE = 1000
  let from = 0
  const all: CatalogIssue[] = []
  for (;;) {
    const { data, error } = await supabase
      .from('catalog_issues')
      .select('*, catalog_coins!inner(pais_codigo)')
      .eq('catalog_coins.pais_codigo', paisCodigo)
      .order('ano_gregoriano', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...(data as unknown as CatalogIssue[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
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

export async function getCollection(): Promise<CollectionItem[]> {
  const PAGE = 1000
  let from = 0
  const all: CollectionItem[] = []
  for (;;) {
    const { data, error } = await supabase
      .from('collection')
      .select('*')
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
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
    return data
  }

  const { data, error } = await supabase
    .from('collection')
    .insert(fields)
    .select()
    .single()
  if (error) throw error
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
}
