import { supabase } from './supabase'

export interface Estojo {
  id: string
  nome: string
  tipo: string | null
  cor: string | null
  descricao: string | null
}

export interface EstojoResumo extends Estojo {
  moedas: number // exemplares distintos (linhas de colecção) neste estojo
  exemplares: number // soma das quantidades
}

export interface EstojoConteudoItem {
  collectionId: string
  quantidade: number
  titulo: string
  denominacao: string | null
  paisCodigo: string
  paisNome: string | null
  ano: string | null
  formato: string | null
  grau: string | null
}

async function uid(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sessão inválida — inicia sessão para gerir estojos.')
  return user.id
}

export async function getEstojos(): Promise<Estojo[]> {
  const { data, error } = await supabase
    .from('estojos')
    .select('id, nome, tipo, cor, descricao')
    .order('nome', { ascending: true })
  if (error) throw error
  return data ?? []
}

// Encontra pelo nome (case-insensitive) ou cria — suporta o fluxo "cria à medida".
export async function findOrCreateEstojo(nome: string, tipo?: string | null): Promise<Estojo> {
  const limpo = nome.trim()
  const { data: existing } = await supabase
    .from('estojos')
    .select('id, nome, tipo, cor, descricao')
    .ilike('nome', limpo)
    .maybeSingle()
  if (existing) return existing

  const { data, error } = await supabase
    .from('estojos')
    .insert({ user_id: await uid(), nome: limpo, tipo: tipo ?? null })
    .select('id, nome, tipo, cor, descricao')
    .single()
  if (error) throw error
  return data
}

// Substitui a alocação de um exemplar (linha da colecção) por um único estojo.
// estojo null/vazio → remove a alocação (exemplar "por arrumar"). Idempotente.
export async function setAlocacaoUnica(
  collectionId: string,
  estojoNome: string | null,
  quantidade: number,
): Promise<void> {
  const nome = estojoNome?.trim() || null

  if (!nome) {
    const { error } = await supabase.from('colecao_estojo').delete().eq('collection_id', collectionId)
    if (error) throw error
    return
  }

  const estojo = await findOrCreateEstojo(nome)
  // Apaga outras alocações desta linha e garante uma só para o estojo escolhido.
  const del = await supabase
    .from('colecao_estojo')
    .delete()
    .eq('collection_id', collectionId)
    .neq('estojo_id', estojo.id)
  if (del.error) throw del.error

  const { data: existing } = await supabase
    .from('colecao_estojo')
    .select('id')
    .eq('collection_id', collectionId)
    .eq('estojo_id', estojo.id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('colecao_estojo')
      .update({ quantidade: Math.max(1, quantidade) })
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('colecao_estojo').insert({
      user_id: await uid(),
      collection_id: collectionId,
      estojo_id: estojo.id,
      quantidade: Math.max(1, quantidade),
    })
    if (error) throw error
  }
}

// Nome do estojo por linha de colecção (para pré-preencher o formulário de edição).
export async function getEstojoPorColecao(collectionIds: string[]): Promise<Record<string, string>> {
  if (collectionIds.length === 0) return {}
  const { data, error } = await supabase
    .from('colecao_estojo')
    .select('collection_id, estojos:estojo_id ( nome )')
    .in('collection_id', collectionIds)
  if (error) throw error
  const map: Record<string, string> = {}
  for (const r of (data ?? []) as unknown as { collection_id: string; estojos: { nome: string } | null }[]) {
    if (r.estojos?.nome) map[r.collection_id] = r.estojos.nome
  }
  return map
}

export async function getEstojosComResumo(): Promise<EstojoResumo[]> {
  const [estojos, aloc] = await Promise.all([
    getEstojos(),
    supabase.from('colecao_estojo').select('estojo_id, quantidade'),
  ])
  if (aloc.error) throw aloc.error
  const conta: Record<string, { moedas: number; exemplares: number }> = {}
  for (const a of (aloc.data ?? []) as { estojo_id: string; quantidade: number }[]) {
    const c = (conta[a.estojo_id] ??= { moedas: 0, exemplares: 0 })
    c.moedas += 1
    c.exemplares += a.quantidade
  }
  return estojos.map((e) => ({
    ...e,
    moedas: conta[e.id]?.moedas ?? 0,
    exemplares: conta[e.id]?.exemplares ?? 0,
  }))
}

export async function getConteudoEstojo(estojoId: string): Promise<EstojoConteudoItem[]> {
  const { data, error } = await supabase
    .from('colecao_estojo')
    .select(
      'quantidade, collection:collection_id ( id, formato_posse, grau, ' +
        'catalog_coins:catalog_coin_id ( titulo, denominacao, pais_codigo, pais_nome ), ' +
        'catalog_issues:catalog_issue_id ( ano ) )',
    )
    .eq('estojo_id', estojoId)
  if (error) throw error

  type Row = {
    quantidade: number
    collection: {
      id: string
      formato_posse: string | null
      grau: string | null
      catalog_coins: { titulo: string; denominacao: string | null; pais_codigo: string; pais_nome: string | null } | null
      catalog_issues: { ano: string | null } | null
    } | null
  }

  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.collection)
    .map((r) => ({
      collectionId: r.collection!.id,
      quantidade: r.quantidade,
      titulo: r.collection!.catalog_coins?.titulo ?? '—',
      denominacao: r.collection!.catalog_coins?.denominacao ?? null,
      paisCodigo: r.collection!.catalog_coins?.pais_codigo ?? '',
      paisNome: r.collection!.catalog_coins?.pais_nome ?? null,
      ano: r.collection!.catalog_issues?.ano ?? null,
      formato: r.collection!.formato_posse,
      grau: r.collection!.grau,
    }))
    .sort((a, b) => (a.paisNome ?? '').localeCompare(b.paisNome ?? '') || (a.ano ?? '').localeCompare(b.ano ?? ''))
}
