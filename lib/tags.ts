import { supabase } from './supabase'

// Coleções temáticas livres (N:N): uma moeda pode ter várias tags ("Descobrimentos",
// "Prata", "UNESCO"…) e aparecer em várias coleções sem ser duplicada.
export interface Tag {
  id: string
  nome: string
  cor: string | null
  descricao: string | null
  created_at: string
}

export async function getTags(): Promise<Tag[]> {
  const { data, error } = await supabase.from('tags').select('*').order('nome')
  if (error) throw error
  return data ?? []
}

export async function criarTag(nome: string, cor?: string): Promise<Tag> {
  const { data, error } = await supabase.from('tags').insert({ nome: nome.trim(), cor: cor ?? null }).select().single()
  if (error) throw error
  return data
}

export async function apagarTag(id: string): Promise<void> {
  const { error } = await supabase.from('tags').delete().eq('id', id)
  if (error) throw error
}

// Mapa catalog_coin_id → ids das tags. Carregado uma vez para a coleção.
export async function getCoinTags(): Promise<Map<string, Set<string>>> {
  const PAGE = 1000
  let from = 0
  const m = new Map<string, Set<string>>()
  for (;;) {
    const { data, error } = await supabase.from('coin_tags').select('catalog_coin_id, tag_id').range(from, from + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const ct of data) {
      const s = m.get(ct.catalog_coin_id) ?? new Set<string>()
      s.add(ct.tag_id); m.set(ct.catalog_coin_id, s)
    }
    if (data.length < PAGE) break
    from += PAGE
  }
  return m
}

export async function getTagsDeCoin(catalogCoinId: string): Promise<string[]> {
  const { data, error } = await supabase.from('coin_tags').select('tag_id').eq('catalog_coin_id', catalogCoinId)
  if (error) throw error
  return (data ?? []).map((r) => r.tag_id)
}

export async function adicionarTagACoin(catalogCoinId: string, tagId: string): Promise<void> {
  const { error } = await supabase.from('coin_tags').insert({ catalog_coin_id: catalogCoinId, tag_id: tagId })
  if (error && !/duplicate|unique/i.test(error.message)) throw error
}

export async function removerTagDeCoin(catalogCoinId: string, tagId: string): Promise<void> {
  const { error } = await supabase.from('coin_tags').delete().eq('catalog_coin_id', catalogCoinId).eq('tag_id', tagId)
  if (error) throw error
}

// Atribuição em LOTE: junta/remove um conjunto de moedas a uma coleção de uma vez
// (por categoria/filtro). Idempotente sem depender de constraint: filtra contra
// as que já lá estão e insere só as novas. Devolve quantas foram efetivamente
// adicionadas.
export async function adicionarTagEmLote(tagId: string, coinIds: string[]): Promise<number> {
  const existentes = new Set<string>()
  {
    const PAGE = 1000; let from = 0
    for (;;) {
      const { data, error } = await supabase.from('coin_tags').select('catalog_coin_id').eq('tag_id', tagId).range(from, from + PAGE - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      for (const r of data) existentes.add(r.catalog_coin_id as string)
      if (data.length < PAGE) break
      from += PAGE
    }
  }
  const novos = [...new Set(coinIds)].filter((id) => !existentes.has(id))
  for (let i = 0; i < novos.length; i += 500) {
    const rows = novos.slice(i, i + 500).map((id) => ({ catalog_coin_id: id, tag_id: tagId }))
    const { error } = await supabase.from('coin_tags').insert(rows)
    if (error) throw error
  }
  return novos.length
}

export async function removerTagEmLote(tagId: string, coinIds: string[]): Promise<number> {
  for (let i = 0; i < coinIds.length; i += 500) {
    const { error } = await supabase.from('coin_tags').delete().eq('tag_id', tagId).in('catalog_coin_id', coinIds.slice(i, i + 500))
    if (error) throw error
  }
  return coinIds.length
}
