import { supabase } from './supabase'
import { invalidateCollection } from './catalog'
import type { EstojoTag } from './types'

export interface Estojo {
  id: string
  nome: string
  tipo: string | null
  cor: string | null
  descricao: string | null
  localizacao: string | null
}

export interface MoedaCatalogo {
  catalogCoinId: string
  paisCodigo: string
  paisNome: string | null
  denominacao: string | null
  titulo: string
  valorFacial: number | null
  familia: string | null
  anoInicio: number | null
  anoFim: number | null
}

const ESTOJO_COLS = 'id, nome, tipo, cor, descricao, localizacao'

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
    .select(ESTOJO_COLS)
    .order('nome', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getEstojo(id: string): Promise<Estojo | null> {
  const { data } = await supabase.from('estojos').select(ESTOJO_COLS).eq('id', id).maybeSingle()
  return data ?? null
}

export async function criarEstojo(input: {
  nome: string
  tipo?: string | null
  localizacao?: string | null
}): Promise<Estojo> {
  const { data, error } = await supabase
    .from('estojos')
    .insert({
      user_id: await uid(),
      nome: input.nome.trim(),
      tipo: input.tipo?.trim() || null,
      localizacao: input.localizacao?.trim() || null,
    })
    .select(ESTOJO_COLS)
    .single()
  if (error) throw error
  return data
}

// Encontra pelo nome (case-insensitive) ou cria — suporta o fluxo "cria à medida".
export async function findOrCreateEstojo(nome: string, tipo?: string | null): Promise<Estojo> {
  const limpo = nome.trim()
  const { data: existing } = await supabase
    .from('estojos')
    .select(ESTOJO_COLS)
    .ilike('nome', limpo)
    .maybeSingle()
  if (existing) return existing

  const { data, error } = await supabase
    .from('estojos')
    .insert({ user_id: await uid(), nome: limpo, tipo: tipo ?? null })
    .select(ESTOJO_COLS)
    .single()
  if (error) throw error
  return data
}

export interface PaisCatalogo {
  codigo: string
  nome: string
  total: number
}

// Países presentes no catálogo (para a pesquisa em cascata começar pelo país).
export async function getPaisesCatalogo(): Promise<PaisCatalogo[]> {
  const { data, error } = await supabase.rpc('paises_catalogo')
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    codigo: r.pais_codigo as string,
    nome: (r.pais_nome as string) ?? (r.pais_codigo as string),
    total: Number(r.total ?? 0),
  }))
}

function mapMoedas(data: Record<string, unknown>[]): MoedaCatalogo[] {
  return data.map((r) => ({
    catalogCoinId: r.id as string,
    paisCodigo: r.pais_codigo as string,
    paisNome: (r.pais_nome as string) ?? null,
    denominacao: (r.denominacao as string) ?? null,
    titulo: r.titulo as string,
    valorFacial: r.valor_facial != null ? Number(r.valor_facial) : null,
    familia: (r.familia as string) ?? null,
    anoInicio: r.ano_inicio != null ? Number(r.ano_inicio) : null,
    anoFim: r.ano_fim != null ? Number(r.ano_fim) : null,
  }))
}

const MOEDA_COLS = 'id, pais_codigo, pais_nome, denominacao, titulo, valor_facial, familia, ano_inicio, ano_fim'

// Moedas (tipos) de um país, filtradas por um termo opcional (denominação/tema).
export async function buscarMoedasDoPais(paisCodigo: string, termo: string): Promise<MoedaCatalogo[]> {
  let q = supabase.from('catalog_coins').select(MOEDA_COLS).eq('pais_codigo', paisCodigo)
  const t = termo.trim().replace(/[,()%]/g, ' ').trim()
  if (t.length >= 1) q = q.or(`denominacao.ilike.%${t}%,titulo.ilike.%${t}%,tema.ilike.%${t}%`)
  const { data, error } = await q.order('valor_facial', { ascending: true }).limit(120)
  if (error) throw error
  return mapMoedas((data ?? []) as Record<string, unknown>[])
}

// Pesquisa de tipos no catálogo (por país, denominação, título ou tema).
export async function buscarMoedasCatalogo(termo: string): Promise<MoedaCatalogo[]> {
  const t = termo.trim().replace(/[,()%]/g, ' ').trim()
  if (t.length < 2) return []
  const { data, error } = await supabase
    .from('catalog_coins')
    .select('id, pais_codigo, pais_nome, denominacao, titulo, valor_facial, familia, ano_inicio, ano_fim')
    .or(`pais_nome.ilike.%${t}%,denominacao.ilike.%${t}%,titulo.ilike.%${t}%,tema.ilike.%${t}%`)
    .order('pais_nome', { ascending: true })
    .limit(40)
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    catalogCoinId: r.id as string,
    paisCodigo: r.pais_codigo as string,
    paisNome: (r.pais_nome as string) ?? null,
    denominacao: (r.denominacao as string) ?? null,
    titulo: r.titulo as string,
    valorFacial: r.valor_facial != null ? Number(r.valor_facial) : null,
    familia: (r.familia as string) ?? null,
    anoInicio: r.ano_inicio != null ? Number(r.ano_inicio) : null,
    anoFim: r.ano_fim != null ? Number(r.ano_fim) : null,
  }))
}

// Adiciona um exemplar a um estojo, garantindo a posse na colecção (regista o
// que se tem ao arrumá-lo). Mantém posse >= soma das alocações.
export async function adicionarMoedaAoEstojo(input: {
  estojoId: string
  catalogCoinId: string
  catalogIssueId: string
  formato: string | null
  quantidade: number
}): Promise<void> {
  const qtd = Math.max(1, input.quantidade)
  const meu = await uid()

  // 1. garantir a linha de posse (issue, formato)
  let q = supabase.from('collection').select('id, quantidade').eq('catalog_issue_id', input.catalogIssueId)
  q = input.formato ? q.eq('formato_posse', input.formato) : q.is('formato_posse', null)
  const { data: posse } = await q.limit(1).maybeSingle()

  let collectionId: string
  if (posse) {
    collectionId = posse.id
  } else {
    const { data, error } = await supabase
      .from('collection')
      .insert({
        user_id: meu,
        catalog_coin_id: input.catalogCoinId,
        catalog_issue_id: input.catalogIssueId,
        formato_posse: input.formato,
        quantidade: qtd,
      })
      .select('id')
      .single()
    if (error) throw error
    collectionId = data.id
  }

  // 2. alocar ao estojo (soma se já lá estava)
  const { data: aloc } = await supabase
    .from('colecao_estojo')
    .select('id, quantidade')
    .eq('collection_id', collectionId)
    .eq('estojo_id', input.estojoId)
    .maybeSingle()
  if (aloc) {
    const { error } = await supabase
      .from('colecao_estojo')
      .update({ quantidade: aloc.quantidade + qtd })
      .eq('id', aloc.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('colecao_estojo').insert({
      user_id: meu,
      collection_id: collectionId,
      estojo_id: input.estojoId,
      quantidade: qtd,
    })
    if (error) throw error
  }

  // 3. posse total nunca inferior à soma alocada
  const { data: todas } = await supabase
    .from('colecao_estojo')
    .select('quantidade')
    .eq('collection_id', collectionId)
  const somaAlocada = (todas ?? []).reduce((s: number, a: { quantidade: number }) => s + a.quantidade, 0)
  const posseAtual = posse?.quantidade ?? qtd
  if (somaAlocada > posseAtual) {
    await supabase.from('collection').update({ quantidade: somaAlocada }).eq('id', collectionId)
  }
  invalidateCollection()
}

// Retira um exemplar de um estojo (não apaga a posse — só a localização).
export async function removerDoEstojo(collectionId: string, estojoId: string): Promise<void> {
  const { error } = await supabase
    .from('colecao_estojo')
    .delete()
    .eq('collection_id', collectionId)
    .eq('estojo_id', estojoId)
  if (error) throw error
}

export interface AlocacaoEdit {
  estojoId: string
  quantidade: number
}

// Alocações actuais de um exemplar (para pré-preencher a ficha).
export async function getAlocacoesDetalhe(
  collectionIds: string[],
): Promise<Record<string, AlocacaoEdit[]>> {
  if (collectionIds.length === 0) return {}
  const { data, error } = await supabase
    .from('colecao_estojo')
    .select('collection_id, estojo_id, quantidade')
    .in('collection_id', collectionIds)
  if (error) throw error
  const map: Record<string, AlocacaoEdit[]> = {}
  for (const r of (data ?? []) as { collection_id: string; estojo_id: string; quantidade: number }[]) {
    ;(map[r.collection_id] ??= []).push({ estojoId: r.estojo_id, quantidade: r.quantidade })
  }
  return map
}

// Substitui o conjunto de alocações de um exemplar por estas (uma moeda pode estar
// em vários estojos). Mantém a posse >= soma alocada.
export async function setAlocacoes(collectionId: string, alocs: AlocacaoEdit[]): Promise<void> {
  const meu = await uid()
  const validos = alocs.filter((a) => a.estojoId && a.quantidade > 0)
  const manter = validos.map((a) => a.estojoId)

  // apaga as alocações que já não constam
  let del = supabase.from('colecao_estojo').delete().eq('collection_id', collectionId)
  if (manter.length) del = del.not('estojo_id', 'in', `(${manter.join(',')})`)
  const rDel = await del
  if (rDel.error) throw rDel.error

  // upsert de cada estojo mantido
  for (const a of validos) {
    const { data: ex } = await supabase
      .from('colecao_estojo')
      .select('id')
      .eq('collection_id', collectionId)
      .eq('estojo_id', a.estojoId)
      .maybeSingle()
    if (ex) {
      const { error } = await supabase.from('colecao_estojo').update({ quantidade: a.quantidade }).eq('id', ex.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('colecao_estojo').insert({
        user_id: meu,
        collection_id: collectionId,
        estojo_id: a.estojoId,
        quantidade: a.quantidade,
      })
      if (error) throw error
    }
  }

  // posse total nunca inferior à soma alocada
  const soma = validos.reduce((s, a) => s + a.quantidade, 0)
  if (soma > 0) {
    const { data: c } = await supabase.from('collection').select('quantidade').eq('id', collectionId).maybeSingle()
    if (c && c.quantidade < soma) {
      await supabase.from('collection').update({ quantidade: soma }).eq('id', collectionId)
    }
  }
  invalidateCollection()
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

// Todas as alocações do utilizador, por linha de colecção → estojos (com localização).
// Para a vista Moedas mostrar onde cada moeda está sem abrir a ficha.
export async function getTodasAlocacoes(): Promise<Record<string, EstojoTag[]>> {
  const PAGE = 1000
  let from = 0
  const map: Record<string, EstojoTag[]> = {}
  for (;;) {
    const { data, error } = await supabase
      .from('colecao_estojo')
      .select('collection_id, estojos:estojo_id ( nome, localizacao )')
      .range(from, from + PAGE - 1)
    if (error) throw error
    const rows = (data ?? []) as unknown as {
      collection_id: string
      estojos: { nome: string; localizacao: string | null } | null
    }[]
    for (const r of rows) {
      if (!r.estojos) continue
      ;(map[r.collection_id] ??= []).push({ nome: r.estojos.nome, localizacao: r.estojos.localizacao })
    }
    if (rows.length < PAGE) break
    from += PAGE
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
