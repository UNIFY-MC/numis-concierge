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
  const { data, error } = await supabase
    .from('collection')
    .select('*')
  if (error) throw error
  return data ?? []
}
