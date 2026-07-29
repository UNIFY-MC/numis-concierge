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
  linhas: number | null
  colunas: number | null
  fechado: boolean
}

// Casa física de uma moeda dentro do estojo: folha (página do álbum) + linha + coluna.
export interface Posicao {
  folha: number
  linha: number
  coluna: number
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

const ESTOJO_COLS = 'id, nome, tipo, cor, descricao, localizacao, linhas, colunas, fechado'

export interface EstojoResumo extends Estojo {
  moedas: number // exemplares distintos (linhas de colecção) neste estojo
  exemplares: number // soma das quantidades
  folhas: number // folhas em uso (1 quando ainda não há nada arrumado)
  casas: number | null // capacidade total = linhas × colunas × folhas (null sem grelha)
  valorMercado: number
}

export interface EstojoConteudoItem {
  alocacaoId: string
  collectionId: string
  coinId: string | null
  issueId: string | null
  ordem: number
  folha: number | null
  linha: number | null
  coluna: number | null
  quantidade: number
  titulo: string
  denominacao: string | null
  paisCodigo: string
  paisNome: string | null
  serie: string | null
  ano: string | null
  variante: string | null
  metal: string | null
  valorFacial: number | null
  valorMercado: number | null
  formato: string | null
  grau: string | null
  anverso: string | null
  reverso: string | null
}

// Próximo número de ordem livre num estojo (max+1), para entrada em linha.
async function proximaOrdem(estojoId: string): Promise<number> {
  const { data } = await supabase
    .from('colecao_estojo')
    .select('ordem')
    .eq('estojo_id', estojoId)
    .order('ordem', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  return (data?.ordem ?? 0) + 1
}

export async function getProximaOrdem(estojoId: string): Promise<number> {
  return proximaOrdem(estojoId)
}

const chaveCasa = (p: { folha: number | null; linha: number | null; coluna: number | null }) =>
  `${p.folha ?? 1}:${p.linha}:${p.coluna}`

// Primeira casa livre: varre folha a folha, da esquerda para a direita e de cima
// para baixo, como se arruma na realidade. Nunca recua antes de `desdeFolha` —
// quem está a inserir fica na folha onde vai, mesmo que atrás tenha buracos.
// Sem grelha definida, continua a contar linhas na folha 1.
export function proximaPosicao(
  ocupadas: { folha: number | null; linha: number | null; coluna: number | null }[],
  linhas: number | null,
  colunas: number | null,
  desdeFolha = 1,
): Posicao {
  const usadas = new Set(ocupadas.filter((o) => o.linha && o.coluna).map(chaveCasa))
  if (!linhas || !colunas) {
    const maxLinha = ocupadas.reduce((m, o) => Math.max(m, o.linha ?? 0), 0)
    return { folha: 1, linha: maxLinha + 1, coluna: 1 }
  }
  const inicio = Math.max(1, desdeFolha)
  const maxFolha = Math.max(inicio, ocupadas.reduce((m, o) => Math.max(m, o.folha ?? 1), 1))
  for (let f = inicio; f <= maxFolha + 1; f++) {
    for (let l = 1; l <= linhas; l++) {
      for (let c = 1; c <= colunas; c++) {
        if (!usadas.has(`${f}:${l}:${c}`)) return { folha: f, linha: l, coluna: c }
      }
    }
  }
  return { folha: maxFolha + 1, linha: 1, coluna: 1 }
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

export interface EstojoInput {
  nome: string
  tipo?: string | null
  localizacao?: string | null
  linhas?: number | null
  colunas?: number | null
}

const grelhaValida = (n: number | null | undefined) => (n && n > 0 ? Math.min(50, Math.round(n)) : null)

export async function criarEstojo(input: EstojoInput): Promise<Estojo> {
  const { data, error } = await supabase
    .from('estojos')
    .insert({
      user_id: await uid(),
      nome: input.nome.trim(),
      tipo: input.tipo?.trim() || null,
      localizacao: input.localizacao?.trim() || null,
      linhas: grelhaValida(input.linhas),
      colunas: grelhaValida(input.colunas),
    })
    .select(ESTOJO_COLS)
    .single()
  if (error) throw error
  return data
}

export async function atualizarEstojo(id: string, input: EstojoInput): Promise<Estojo> {
  const { data, error } = await supabase
    .from('estojos')
    .update({
      nome: input.nome.trim(),
      tipo: input.tipo?.trim() || null,
      localizacao: input.localizacao?.trim() || null,
      linhas: grelhaValida(input.linhas),
      colunas: grelhaValida(input.colunas),
    })
    .eq('id', id)
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

// Trinco do estojo. O PIN (4 dígitos) é comparado na BD — o browser nunca vê o
// hash. Fechado, a própria BD recusa mexer nas casas.
export async function trancarEstojo(id: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('estojo_trancar', { p_id: id, p_pin: pin })
  if (error) throw error
  return data === true
}

export async function destrancarEstojo(id: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('estojo_destrancar', { p_id: id, p_pin: pin })
  if (error) throw error
  return data === true
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
// Cada casa (folha/linha/coluna) é uma linha própria: duas moedas iguais em
// casas diferentes NÃO se somam — só se somam quando caem na mesma casa.
export async function adicionarMoedaAoEstojo(input: {
  estojoId: string
  catalogCoinId: string
  catalogIssueId: string
  formato: string | null
  quantidade: number
  posicao?: Posicao | null
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

  // 2. alocar à casa indicada (só soma se a MESMA moeda já estiver nessa casa)
  const pos = input.posicao ?? null
  const ocupante = pos
    ? (
        await supabase
          .from('colecao_estojo')
          .select('id, collection_id, quantidade')
          .eq('estojo_id', input.estojoId)
          .eq('folha', pos.folha)
          .eq('linha', pos.linha)
          .eq('coluna', pos.coluna)
          .maybeSingle()
      ).data
    : null

  if (ocupante && ocupante.collection_id !== collectionId) {
    throw new Error(`A casa folha ${pos!.folha} · linha ${pos!.linha} · coluna ${pos!.coluna} já está ocupada.`)
  }

  if (ocupante) {
    const { error } = await supabase
      .from('colecao_estojo')
      .update({ quantidade: ocupante.quantidade + qtd })
      .eq('id', ocupante.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('colecao_estojo').insert({
      user_id: meu,
      collection_id: collectionId,
      estojo_id: input.estojoId,
      quantidade: qtd,
      ordem: await proximaOrdem(input.estojoId),
      folha: pos?.folha ?? null,
      linha: pos?.linha ?? null,
      coluna: pos?.coluna ?? null,
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

// Retira UMA casa (a moeda pode ocupar várias no mesmo estojo).
export async function removerAlocacao(alocacaoId: string): Promise<void> {
  const { error } = await supabase.from('colecao_estojo').delete().eq('id', alocacaoId)
  if (error) throw error
}

// Arruma nas primeiras casas livres tudo o que está no estojo sem casa atribuída,
// pela ordem em que lá entrou. Para quando se define a grelha depois das moedas.
export async function arrumarSemCasa(estojoId: string, linhas: number, colunas: number): Promise<number> {
  const { data, error } = await supabase
    .from('colecao_estojo')
    .select('id, ordem, folha, linha, coluna')
    .eq('estojo_id', estojoId)
  if (error) throw error
  const todas = (data ?? []) as { id: string; ordem: number | null; folha: number | null; linha: number | null; coluna: number | null }[]
  const ocupadas = todas.filter((r) => r.linha != null && r.coluna != null)
  const soltas = todas
    .filter((r) => r.linha == null || r.coluna == null)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))

  for (const r of soltas) {
    const pos = proximaPosicao(ocupadas, linhas, colunas)
    const { error: e } = await supabase
      .from('colecao_estojo')
      .update({ folha: pos.folha, linha: pos.linha, coluna: pos.coluna })
      .eq('id', r.id)
    if (e) throw e
    ocupadas.push({ id: r.id, ordem: r.ordem, ...pos })
  }
  return soltas.length
}

export interface VarianteOpcao {
  issueId: string
  ano: string
  label: string
}

// Variantes (issues) dos tipos presentes no estojo, para trocar a variante de um
// exemplar já arrumado sem ter de o retirar e voltar a inserir.
export async function getVariantesDeCoins(coinIds: string[]): Promise<Record<string, VarianteOpcao[]>> {
  const ids = [...new Set(coinIds.filter(Boolean))]
  if (ids.length === 0) return {}
  const { data, error } = await supabase
    .from('catalog_issues')
    .select('id, catalog_coin_id, ano, mintmark_variante, etiqueta, catalog_coins:catalog_coin_id ( titulo )')
    .in('catalog_coin_id', ids)
  if (error) throw error

  type Row = {
    id: string; catalog_coin_id: string; ano: string | null
    mintmark_variante: string | null; etiqueta: string | null
    catalog_coins: { titulo: string } | null
  }
  const map: Record<string, VarianteOpcao[]> = {}
  for (const r of (data ?? []) as unknown as Row[]) {
    ;(map[r.catalog_coin_id] ??= []).push({
      issueId: r.id,
      ano: r.ano ?? '',
      label: varianteSimples(r.catalog_coins?.titulo ?? null, r.mintmark_variante, r.etiqueta) ?? 'Base',
    })
  }
  // Base primeiro: é o que se quer por defeito.
  for (const lista of Object.values(map)) {
    lista.sort((a, b) => Number(b.label === 'Base') - Number(a.label === 'Base') || a.label.localeCompare(b.label, 'pt'))
  }
  return map
}

// Troca a variante de um exemplar arrumado: a alocação passa a apontar para a
// linha de posse do novo issue (criando-a se preciso). Move o exemplar de uma
// variante para a outra, sem mexer no resto da colecção.
export async function mudarVarianteAlocacao(alocacaoId: string, novoIssueId: string): Promise<void> {
  const { data: aloc, error: eA } = await supabase
    .from('colecao_estojo')
    .select('id, collection_id, quantidade')
    .eq('id', alocacaoId)
    .single()
  if (eA) throw eA

  const { data: antiga, error: eC } = await supabase
    .from('collection')
    .select('id, user_id, catalog_coin_id, catalog_issue_id, formato_posse, quantidade')
    .eq('id', aloc.collection_id)
    .single()
  if (eC) throw eC
  if (antiga.catalog_issue_id === novoIssueId) return

  let q = supabase
    .from('collection')
    .select('id, quantidade')
    .eq('catalog_issue_id', novoIssueId)
  q = antiga.formato_posse ? q.eq('formato_posse', antiga.formato_posse) : q.is('formato_posse', null)
  const { data: nova } = await q.limit(1).maybeSingle()

  let novoId: string
  if (nova) {
    novoId = nova.id
    await supabase
      .from('collection')
      .update({ quantidade: Math.max(nova.quantidade, 0) + aloc.quantidade })
      .eq('id', nova.id)
  } else {
    const { data, error } = await supabase
      .from('collection')
      .insert({
        user_id: antiga.user_id,
        catalog_coin_id: antiga.catalog_coin_id,
        catalog_issue_id: novoIssueId,
        formato_posse: antiga.formato_posse,
        quantidade: aloc.quantidade,
      })
      .select('id')
      .single()
    if (error) throw error
    novoId = data.id
  }

  const { error: eU } = await supabase
    .from('colecao_estojo')
    .update({ collection_id: novoId })
    .eq('id', alocacaoId)
  if (eU) throw eU

  // A posse antiga perde o exemplar movido, mas nunca desce abaixo do que lá
  // continua arrumado noutras casas.
  const { data: restantes } = await supabase
    .from('colecao_estojo')
    .select('quantidade')
    .eq('collection_id', antiga.id)
  const soma = (restantes ?? []).reduce((s: number, r: { quantidade: number }) => s + r.quantidade, 0)
  await supabase
    .from('collection')
    .update({ quantidade: Math.max(antiga.quantidade - aloc.quantidade, soma, 0) })
    .eq('id', antiga.id)

  invalidateCollection()
}

// Corrige a casa de um exemplar já arrumado.
export async function moverAlocacao(alocacaoId: string, pos: Posicao): Promise<void> {
  const { error } = await supabase
    .from('colecao_estojo')
    .update({ folha: pos.folha, linha: pos.linha, coluna: pos.coluna })
    .eq('id', alocacaoId)
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
  // O mesmo exemplar pode ocupar várias casas do mesmo estojo — a ficha mostra o total.
  const map: Record<string, AlocacaoEdit[]> = {}
  for (const r of (data ?? []) as { collection_id: string; estojo_id: string; quantidade: number }[]) {
    const lista = (map[r.collection_id] ??= [])
    const ja = lista.find((a) => a.estojoId === r.estojo_id)
    if (ja) ja.quantidade += r.quantidade
    else lista.push({ estojoId: r.estojo_id, quantidade: r.quantidade })
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

  // Acerta a quantidade por estojo mexendo só na linha sem casa atribuída — as
  // moedas já arrumadas numa casa (folha/linha/coluna) não se tocam.
  for (const a of validos) {
    const { data: rows } = await supabase
      .from('colecao_estojo')
      .select('id, quantidade, linha, coluna')
      .eq('collection_id', collectionId)
      .eq('estojo_id', a.estojoId)
    const lista = (rows ?? []) as { id: string; quantidade: number; linha: number | null; coluna: number | null }[]
    const arrumadas = lista.filter((r) => r.linha != null && r.coluna != null)
    const soltas = lista.filter((r) => r.linha == null || r.coluna == null)
    const emCasas = arrumadas.reduce((s, r) => s + r.quantidade, 0)
    const resto = a.quantidade - emCasas

    const sobra = resto > 0 ? soltas.slice(1) : soltas
    if (sobra.length) {
      const { error } = await supabase.from('colecao_estojo').delete().in('id', sobra.map((r) => r.id))
      if (error) throw error
    }
    if (resto <= 0) continue

    if (soltas[0]) {
      const { error } = await supabase.from('colecao_estojo').update({ quantidade: resto }).eq('id', soltas[0].id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('colecao_estojo').insert({
        user_id: meu,
        collection_id: collectionId,
        estojo_id: a.estojoId,
        quantidade: resto,
        ordem: await proximaOrdem(a.estojoId),
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
    supabase
      .from('colecao_estojo')
      .select('estojo_id, quantidade, folha, collection:collection_id ( catalog_issues:catalog_issue_id ( valor_mercado ) )'),
  ])
  if (aloc.error) throw aloc.error

  type Linha = {
    estojo_id: string
    quantidade: number
    folha: number | null
    collection: { catalog_issues: { valor_mercado: number | null } | null } | null
  }
  const conta: Record<string, { moedas: number; exemplares: number; folhas: number; valor: number }> = {}
  for (const a of (aloc.data ?? []) as unknown as Linha[]) {
    const c = (conta[a.estojo_id] ??= { moedas: 0, exemplares: 0, folhas: 1, valor: 0 })
    c.moedas += 1
    c.exemplares += a.quantidade
    c.folhas = Math.max(c.folhas, a.folha ?? 1)
    c.valor += Number(a.collection?.catalog_issues?.valor_mercado ?? 0) * a.quantidade
  }

  return estojos.map((e) => {
    const c = conta[e.id]
    const folhas = c?.folhas ?? 1
    return {
      ...e,
      moedas: c?.moedas ?? 0,
      exemplares: c?.exemplares ?? 0,
      folhas,
      casas: e.linhas && e.colunas ? e.linhas * e.colunas * folhas : null,
      valorMercado: c?.valor ?? 0,
    }
  })
}

export async function getConteudoEstojo(estojoId: string): Promise<EstojoConteudoItem[]> {
  const { data, error } = await supabase
    .from('colecao_estojo')
    .select(
      'id, quantidade, ordem, folha, linha, coluna, collection:collection_id ( id, formato_posse, grau, foto1, ' +
        'catalog_coin_id, catalog_issue_id, ' +
        'catalog_coins:catalog_coin_id ( titulo, denominacao, pais_codigo, pais_nome, serie, metal, valor_facial, anverso_img, reverso_img ), ' +
        'catalog_issues:catalog_issue_id ( ano, valor_mercado, mintmark_variante, etiqueta, anverso_img, reverso_img ) )',
    )
    .eq('estojo_id', estojoId)
  if (error) throw error

  type Row = {
    id: string
    quantidade: number
    ordem: number | null
    folha: number | null
    linha: number | null
    coluna: number | null
    collection: {
      id: string
      formato_posse: string | null
      grau: string | null
      foto1: string | null
      catalog_coin_id: string | null
      catalog_issue_id: string | null
      catalog_coins: {
        titulo: string; denominacao: string | null; pais_codigo: string; pais_nome: string | null
        serie: string | null; metal: string | null; valor_facial: number | null
        anverso_img: string | null; reverso_img: string | null
      } | null
      catalog_issues: {
        ano: string | null; valor_mercado: number | null; mintmark_variante: string | null; etiqueta: string | null
        anverso_img: string | null; reverso_img: string | null
      } | null
    } | null
  }

  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.collection)
    .map((r) => {
      const c = r.collection!.catalog_coins
      const i = r.collection!.catalog_issues
      return {
        alocacaoId: r.id,
        collectionId: r.collection!.id,
        coinId: r.collection!.catalog_coin_id,
        issueId: r.collection!.catalog_issue_id,
        ordem: r.ordem ?? 0,
        folha: r.folha,
        linha: r.linha,
        coluna: r.coluna,
        quantidade: r.quantidade,
        titulo: c?.titulo ?? '—',
        denominacao: c?.denominacao ?? null,
        paisCodigo: c?.pais_codigo ?? '',
        paisNome: c?.pais_nome ?? null,
        serie: c?.serie ?? null,
        ano: i?.ano ?? null,
        variante: varianteSimples(c?.titulo ?? null, i?.mintmark_variante ?? null, i?.etiqueta ?? null),
        metal: c?.metal ?? null,
        valorFacial: c?.valor_facial != null ? Number(c.valor_facial) : null,
        valorMercado: i?.valor_mercado != null ? Number(i.valor_mercado) : null,
        formato: r.collection!.formato_posse,
        grau: r.collection!.grau,
        // Foto do exemplar primeiro; depois a da variante; por fim a do tipo.
        anverso: r.collection!.foto1 ?? i?.anverso_img ?? c?.anverso_img ?? null,
        reverso: i?.reverso_img ?? c?.reverso_img ?? null,
      }
    })
    .sort(ordenarPorCasa)
}

// Ordem de leitura do estojo: folha, depois linha, depois coluna. Sem casa
// atribuída, cai para o nº de ordem (entradas antigas).
export function ordenarPorCasa(a: EstojoConteudoItem, b: EstojoConteudoItem): number {
  const arrumado = (i: EstojoConteudoItem) => i.linha != null && i.coluna != null
  if (arrumado(a) !== arrumado(b)) return arrumado(a) ? -1 : 1
  if (!arrumado(a)) return a.ordem - b.ordem
  return (
    (a.folha ?? 1) - (b.folha ?? 1) || (a.linha ?? 0) - (b.linha ?? 0) || (a.coluna ?? 0) - (b.coluna ?? 0)
  )
}

const VARIANTE_RE = /pattern|countermark|contramarca|aberto|fechado|m[oó]dulo|mule|h[ií]brid|error|erro|restrike|essai|pi[eé]fort|variet|variante|overdate|sobredata|ensaio|prova/i
export function varianteSimples(titulo: string | null, mintmark: string | null, etiqueta: string | null): string | null {
  const parts: string[] = []
  const m = (titulo ?? '').match(/\(([^)]+)\)\s*$/)
  if (m && VARIANTE_RE.test(m[1])) parts.push(m[1].trim())
  if (mintmark) parts.push(String(mintmark))
  if (etiqueta) parts.push(String(etiqueta))
  const out = [...new Set(parts)].join(' · ')
  return out || null
}
