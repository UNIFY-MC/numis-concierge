import { supabase } from './supabase'
import type { CatalogCoin, CatalogIssue, CollectionItem } from './types'

export async function getCatalogCoins(): Promise<CatalogCoin[]> {
  const { data, error } = await supabase
    .from('catalog_coins')
    .select('*')
    .order('pais_nome', { ascending: true })
  if (error) throw error
  return data ?? []
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

export async function getIssuesForCoin(catalogCoinId: string): Promise<CatalogIssue[]> {
  const { data, error } = await supabase
    .from('catalog_issues')
    .select('*')
    .eq('catalog_coin_id', catalogCoinId)
    .order('ano_gregoriano', { ascending: true })
  if (error) throw error
  return data ?? []
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
  grau?: string | null
  notaPrivada?: string | null
}

// Cria ou actualiza o exemplar de uma issue. Nunca apaga (ver dívida técnica
// do RLS anon na migration 006): "não tenho" é guardado como quantidade=0.
export async function upsertCollectionItem(input: CollectionUpsert): Promise<CollectionItem> {
  const { data: existing, error: selErr } = await supabase
    .from('collection')
    .select('id')
    .eq('catalog_issue_id', input.catalogIssueId)
    .limit(1)
    .maybeSingle()
  if (selErr) throw selErr

  const fields = {
    catalog_coin_id: input.catalogCoinId,
    catalog_issue_id: input.catalogIssueId,
    quantidade: input.quantidade,
    formato_posse: input.formatoPosse ?? null,
    grau: input.grau ?? null,
    nota_privada: input.notaPrivada ?? null,
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
