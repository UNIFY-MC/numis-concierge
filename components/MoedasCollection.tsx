'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getCatalogCoins, getCatalogIssues, getCollection,
  upsertCollectionItem, applyToAllYears,
} from '@/lib/catalog'
import { estadoDe, itemPrincipal } from '@/lib/types'
import { valorReal, valorColecao } from '@/lib/valor'
import { casaEmissor } from '@/lib/emissores'
import type { DisplayRow, CatalogCoin, CollectionItem, PaisAgregado, FormatoColecao } from '@/lib/types'
import StatsBar from './StatsBar'
import FilterBar, { type EstadoFiltro } from './FilterBar'
import ViewTabs, { type Vista } from './ViewTabs'
import SortBar, { type SortBy } from './SortBar'
import EmissorGrid from './EmissorGrid'
import PaisDetalhe from './PaisDetalhe'
import ValorPorPais from './ValorPorPais'
import TabelaView from './TabelaView'
import CoinSheet, { type CoinSheetSave } from './CoinSheet'
import PrintFalta, { type GrupoFalta } from './PrintFalta'
import FamiliaTabs, { type GrupoFamilia, FAMILIAS_DO_GRUPO } from './FamiliaTabs'

const DE_MINTS = ['A', 'D', 'F', 'G', 'J'] as const

// Alemanha desdobra-se por casa da moeda (de-A … de-J) quando a issue a tem.
function virtualCodigo(r: DisplayRow): string {
  if (r.coin.pais_codigo === 'de') {
    // Casa registada pelo coleccionador (collection) tem prioridade sobre a do catálogo.
    const casa = r.item?.casa_moeda || r.issue.casa_moeda
    if (casa && (DE_MINTS as readonly string[]).includes(casa)) return `de-${casa}`
  }
  return r.coin.pais_codigo
}

export default function MoedasCollection() {
  const [rows, setRows] = useState<DisplayRow[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [grupo, setGrupo] = useState<GrupoFamilia>('euro')
  const [vista, setVista] = useState<Vista>('emissor')
  const [sort, setSort] = useState<SortBy>('pais')
  const [estado, setEstado] = useState<EstadoFiltro>('todas')
  const [pesquisa, setPesquisa] = useState('')
  const [paisAberto, setPaisAberto] = useState<string | null>(null)
  const [selecionada, setSelecionada] = useState<DisplayRow | null>(null)
  const [imprimir, setImprimir] = useState<{ tipo: 'geral' } | { tipo: 'pais'; codigo: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([getCatalogCoins(), getCatalogIssues(), getCollection()])
      .then(([coins, issues, collection]) => {
        const coinById = new Map<string, CatalogCoin>(coins.map((c) => [c.id, c]))
        // Vários exemplares por issue (um por formato): agrupar numa lista.
        const itensByIssue = new Map<string, CollectionItem[]>()
        for (const it of collection) if (it.catalog_issue_id) {
          const arr = itensByIssue.get(it.catalog_issue_id) ?? []
          arr.push(it)
          itensByIssue.set(it.catalog_issue_id, arr)
        }
        const built = issues
          .map((issue) => {
            const coin = coinById.get(issue.catalog_coin_id)
            if (!coin) return null
            const itens = itensByIssue.get(issue.id) ?? []
            return { issue, coin, itens, item: itemPrincipal(itens) }
          })
          .filter((r): r is DisplayRow => r !== null)
        setRows(built)
      })
      .catch((e) => setErro(e.message ?? String(e)))
      .finally(() => setLoading(false))
  }, [])

  // Contagem por grupo de família (para os separadores) e subconjunto activo.
  const contagens = useMemo(() => {
    const c: Record<GrupoFamilia, number> = { euro: 0, colecao: 0, historico: 0 }
    for (const r of rows) {
      for (const [g, fams] of Object.entries(FAMILIAS_DO_GRUPO)) {
        if (r.coin.familia && fams.includes(r.coin.familia)) { c[g as GrupoFamilia]++; break }
      }
    }
    return c
  }, [rows])

  const rowsFam = useMemo(() => {
    const fams = FAMILIAS_DO_GRUPO[grupo]
    return rows.filter((r) => r.coin.familia && fams.includes(r.coin.familia))
  }, [rows, grupo])

  // Stats do grupo de família activo
  const stats = useMemo(() => {
    const s = { total: rowsFam.length, set: 0, cad: 0, naotem: 0, vSet: 0, vCad: 0, emissores: 0 }
    const codigos = new Set<string>()
    for (const r of rowsFam) {
      codigos.add(r.coin.pais_codigo)
      const e = estadoDe(r.item)
      if (e === 'set') { s.set++; s.vSet += valorColecao(r.coin, r.itens) }
      else if (e === 'caderneta') { s.cad++; s.vCad += valorColecao(r.coin, r.itens) }
      else s.naotem++
    }
    s.emissores = codigos.size
    return s
  }, [rowsFam])

  // Filtro estado + pesquisa (sobre o grupo de família activo)
  const visibleRows = useMemo(() => {
    const q = pesquisa.trim().toLowerCase()
    return rowsFam.filter((r) => {
      const e = estadoDe(r.item)
      if (estado === 'tenho' && e === 'naotem') return false
      if ((estado === 'set' || estado === 'caderneta' || estado === 'naotem') && e !== estado) return false
      if (q) {
        const hay = `${r.coin.pais_nome} ${r.coin.denominacao ?? ''} ${r.issue.ano}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rowsFam, estado, pesquisa])

  // Agregados por país (contagens completas sobre o grupo de família activo)
  const agregados = useMemo(() => {
    const m = new Map<string, PaisAgregado>()
    for (const r of rowsFam) {
      const vcode = virtualCodigo(r)
      let a = m.get(vcode)
      if (!a) {
        const nome = vcode !== r.coin.pais_codigo
          ? `${r.coin.pais_nome} ${vcode.split('-')[1]}`
          : r.coin.pais_nome
        a = { codigo: vcode, nome, flagCodigo: r.coin.pais_codigo, total: 0, set: 0, cad: 0, falta: 0, valorSet: 0, valorCad: 0 }
        m.set(vcode, a)
      }
      a.total++
      const e = estadoDe(r.item)
      if (e === 'set') { a.set++; a.valorSet += valorColecao(r.coin, r.itens) }
      else if (e === 'caderneta') { a.cad++; a.valorCad += valorColecao(r.coin, r.itens) }
      else a.falta++
    }
    // Se o álbum por casas já existe, o cartão residual da Alemanha são as moedas
    // ainda por atribuir a uma casa.
    const temCasas = [...m.keys()].some((k) => k.startsWith('de-'))
    const residualDe = m.get('de')
    if (temCasas && residualDe) residualDe.nome = 'Alemanha · por atribuir'
    return m
  }, [rowsFam])

  // Países a mostrar na grelha (os que têm rows visíveis), ordenados
  const paisesGrelha = useMemo(() => {
    const presentes = new Set(visibleRows.map((r) => virtualCodigo(r)))
    const lista = [...agregados.values()].filter((a) => presentes.has(a.codigo))
    const pctOf = (a: PaisAgregado) => (a.total > 0 ? (a.set + a.cad) / a.total : 0)
    if (sort === 'pct') lista.sort((a, b) => pctOf(b) - pctOf(a) || a.nome.localeCompare(b.nome, 'pt'))
    else if (sort === 'total') lista.sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt'))
    else lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
    return lista
  }, [agregados, visibleRows, sort])

  const rowsDoPais = useMemo(
    () => (paisAberto ? visibleRows.filter((r) => virtualCodigo(r) === paisAberto) : []),
    [visibleRows, paisAberto],
  )

  // Grupos de em-falta para impressão (sobre o grupo de família activo, ignorando o filtro estado/pesquisa)
  const gruposFalta = useMemo<GrupoFalta[]>(() => {
    const m = new Map<string, GrupoFalta>()
    for (const r of rowsFam) {
      if (estadoDe(r.item) !== 'naotem') continue
      const vcode = virtualCodigo(r)
      let g = m.get(vcode)
      if (!g) {
        const nome = agregados.get(vcode)?.nome ?? r.coin.pais_nome
        g = { codigo: vcode, nome, faltam: [] }
        m.set(vcode, g)
      }
      g.faltam.push(r)
    }
    return [...m.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
  }, [rowsFam, agregados])

  const gruposParaImprimir = useMemo<GrupoFalta[]>(() => {
    if (!imprimir) return []
    if (imprimir.tipo === 'geral') return gruposFalta
    return gruposFalta.filter((g) => g.codigo === imprimir.codigo)
  }, [imprimir, gruposFalta])

  useEffect(() => {
    if (!imprimir) return
    const onAfter = () => setImprimir(null)
    window.addEventListener('afterprint', onAfter)
    const id = window.requestAnimationFrame(() => window.print())
    return () => {
      window.removeEventListener('afterprint', onAfter)
      window.cancelAnimationFrame(id)
    }
  }, [imprimir])

  // Substitui (ou acrescenta) o exemplar de um formato e recalcula o principal.
  function aplicarSaved(prev: DisplayRow[], issueId: string, saved: CollectionItem): DisplayRow[] {
    return prev.map((r) => {
      if (r.issue.id !== issueId) return r
      const itens = [...r.itens.filter((i) => i.formato_posse !== saved.formato_posse), saved]
      return { ...r, itens, item: itemPrincipal(itens) }
    })
  }

  async function guardar(input: CoinSheetSave) {
    if (!selecionada) return
    const { coin, issue } = selecionada
    const comuns = { casaMoeda: input.casaMoeda, foto: input.foto, notaPrivada: input.nota, defeito: input.defeito }
    const saves: CollectionItem[] = []
    // Formatos marcados: gravar exemplar (qty ≥ 1, grau/valor próprios).
    for (const f of input.formatos) {
      saves.push(await upsertCollectionItem({
        catalogCoinId: coin.id, catalogIssueId: issue.id,
        quantidade: Math.max(1, f.quantidade), formatoPosse: f.formato,
        grau: f.grau, valorBase: f.valorBase, ...comuns,
      }))
    }
    // Formatos desmarcados que existiam: pôr quantidade 0 (RLS não permite apagar).
    for (const fr of input.removidos) {
      saves.push(await upsertCollectionItem({
        catalogCoinId: coin.id, catalogIssueId: issue.id,
        quantidade: 0, formatoPosse: fr, grau: null, valorBase: null, ...comuns,
      }))
    }
    if (input.aplicarTodos) await applyToAllYears(coin.id, input.formatos[0]?.valorBase ?? null, input.foto)
    setRows((prev) => {
      let next = prev
      for (const s of saves) next = aplicarSaved(next, issue.id, s)
      return next
    })
  }

  // Tabela: alterna um formato (S/C/B) sem abrir o CoinSheet. Preserva grau/valor.
  async function alterarFormato(row: DisplayRow, formato: FormatoColecao, ativo: boolean) {
    const ex = row.itens.find((i) => i.formato_posse === formato)
    const saved = await upsertCollectionItem({
      catalogCoinId: row.coin.id, catalogIssueId: row.issue.id,
      quantidade: ativo ? Math.max(1, ex?.quantidade ?? 1) : 0,
      formatoPosse: formato,
      casaMoeda: row.item?.casa_moeda ?? null,
      grau: ex?.grau ?? row.item?.grau ?? null,
      valorBase: ex?.valor_base ?? row.item?.valor_base ?? null,
      foto: ex?.foto1 ?? row.item?.foto1 ?? null,
      notaPrivada: ex?.nota_privada ?? null,
    })
    setRows((prev) => aplicarSaved(prev, row.issue.id, saved))
  }

  // Tabela: quantidade de um formato específico (S/C/B) — coluna própria.
  async function alterarFormatoQtd(row: DisplayRow, formato: FormatoColecao, qtd: number) {
    const ex = row.itens.find((i) => i.formato_posse === formato)
    const saved = await upsertCollectionItem({
      catalogCoinId: row.coin.id, catalogIssueId: row.issue.id,
      quantidade: Math.max(0, qtd), formatoPosse: formato,
      casaMoeda: row.item?.casa_moeda ?? null, grau: ex?.grau ?? null,
      valorBase: ex?.valor_base ?? null, foto: ex?.foto1 ?? null, notaPrivada: ex?.nota_privada ?? null,
    })
    setRows((prev) => aplicarSaved(prev, row.issue.id, saved))
  }

  // Tabela: stepper de quantidade — actua no formato principal (ou cria 'set').
  async function alterarQuantidade(row: DisplayRow, novaQtd: number) {
    const qtd = Math.max(0, novaQtd)
    const alvo = row.item
    const formato = (alvo?.formato_posse as FormatoColecao | undefined) ?? 'bnc'
    const saved = await upsertCollectionItem({
      catalogCoinId: row.coin.id, catalogIssueId: row.issue.id,
      quantidade: qtd, formatoPosse: formato,
      casaMoeda: alvo?.casa_moeda ?? null, grau: alvo?.grau ?? null,
      valorBase: alvo?.valor_base ?? null, foto: alvo?.foto1 ?? null,
      notaPrivada: alvo?.nota_privada ?? null,
    })
    setRows((prev) => aplicarSaved(prev, row.issue.id, saved))
  }
  // grau/qualidade inline (exemplar principal)
  async function alterarGrau(row: DisplayRow, grau: string) {
    const alvo = row.item
    if (!alvo) return
    const saved = await upsertCollectionItem({
      catalogCoinId: row.coin.id, catalogIssueId: row.issue.id,
      quantidade: Math.max(1, alvo.quantidade), formatoPosse: (alvo.formato_posse as FormatoColecao | undefined) ?? 'bnc',
      casaMoeda: alvo.casa_moeda ?? null, grau: grau || null,
      valorBase: alvo.valor_base ?? null, foto: alvo.foto1 ?? null, notaPrivada: alvo.nota_privada ?? null,
    })
    setRows((prev) => aplicarSaved(prev, row.issue.id, saved))
  }

  function exportar() {
    const dados = rows
      .filter((r) => r.item)
      .map((r) => ({
        catalog_issue_id: r.issue.id,
        pais: r.coin.pais_nome,
        denom: r.coin.denominacao,
        ano: r.issue.ano,
        estado: estadoDe(r.item),
        quantidade: r.item?.quantidade ?? 0,
        grau: r.item?.grau ?? null,
        valor_base: r.item?.valor_base ?? null,
      }))
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'moedas-do-pinto.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // Export do catálogo completo (tudo o que veio da Numista) lado a lado com o que
  // tens. CSV com ; e BOM UTF-8 — abre direto no Excel com acentos.
  function exportarCsv(linhasFonte: DisplayRow[] = visibleRows) {
    const cols = [
      'País', 'Tipo', 'Denominação / Comemoração', 'Valor facial (€)', 'Ano', 'Casa / Emissor',
      'KM#', 'Schön#', 'Peso (g)', 'Diâmetro (mm)', 'Composição', 'Numista ID',
      'Tenho?', 'Estado', 'Quantidade', 'Grau', 'Valor base (€)', 'Tiragem',
    ]
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v)
      return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    }
    const linhas = [...linhasFonte]
      .sort((a, b) =>
        a.coin.pais_nome.localeCompare(b.coin.pais_nome, 'pt')
        || casaEmissor(a).localeCompare(casaEmissor(b), 'pt')
        || Number(a.coin.comemorativa) - Number(b.coin.comemorativa)
        || (a.issue.ano_gregoriano ?? 0) - (b.issue.ano_gregoriano ?? 0)
        || (a.coin.valor_facial ?? 0) - (b.coin.valor_facial ?? 0))
      .map((r) => {
        const est = estadoDe(r.item)
        const tenho = est !== 'naotem'
        return [
          r.coin.pais_nome,
          r.coin.comemorativa ? 'Comemorativa' : (r.coin.tipo_emissao ?? 'Circulação'),
          r.coin.comemorativa ? (r.coin.tema || r.coin.titulo || r.coin.denominacao) : (r.coin.denominacao ?? ''),
          r.coin.valor_facial ?? '',
          r.issue.ano,
          casaEmissor(r),
          r.coin.km_ref ?? '',
          r.coin.schon_ref ?? '',
          r.coin.peso_g ?? '',
          r.coin.diametro_mm ?? '',
          r.coin.composicao ?? '',
          r.coin.numista_id ?? '',
          tenho ? 'Sim' : 'Não',
          est === 'set' ? 'Set' : est === 'caderneta' ? 'Caderneta' : 'Não tem',
          r.item?.quantidade ?? 0,
          r.item?.grau ?? '',
          r.item?.valor_base ?? '',
          r.issue.tiragem ?? '',
        ].map(esc).join(';')
      })
    const csv = '﻿' + cols.join(';') + '\n' + linhas.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `catalogo-moedas-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function importar() {
    fileRef.current?.click()
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const dados = JSON.parse(await f.text()) as { catalog_issue_id: string; estado: string; quantidade: number; grau?: string; valor_base?: number }[]
      const byIssue = new Map(rows.map((r) => [r.issue.id, r]))
      for (const d of dados) {
        const r = byIssue.get(d.catalog_issue_id)
        if (!r) continue
        const formato = d.estado === 'caderneta' ? 'carteira_fdc' : d.estado === 'set' ? 'bnc' : null
        await upsertCollectionItem({
          catalogCoinId: r.coin.id,
          catalogIssueId: r.issue.id,
          quantidade: d.quantidade,
          formatoPosse: formato,
          grau: d.grau ?? null,
          valorBase: d.valor_base ?? null,
        })
      }
      const collection = await getCollection()
      const itensByIssue = new Map<string, CollectionItem[]>()
      for (const it of collection) if (it.catalog_issue_id) {
        const arr = itensByIssue.get(it.catalog_issue_id) ?? []
        arr.push(it)
        itensByIssue.set(it.catalog_issue_id, arr)
      }
      setRows((prev) => prev.map((r) => {
        const itens = itensByIssue.get(r.issue.id) ?? []
        return { ...r, itens, item: itemPrincipal(itens) }
      }))
    } catch (err) {
      setErro('Importação falhou: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      e.target.value = ''
    }
  }

  if (loading) return <div className="p-8 text-mp-ink-faint">A carregar…</div>
  if (erro) return <div className="p-8 text-mp-falta">Erro: {erro}</div>

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="print:hidden">
      <header className="flex items-center gap-3 mb-6">
        <span className="w-11 h-11 rounded-full grid place-items-center bg-mp-gold text-white text-xl flex-none">⊚</span>
        <div>
          <h1 className="text-2xl font-serif font-semibold leading-none">
            Moedas do <span className="text-mp-gold">Pinto</span>
          </h1>
          <p className="text-xs text-mp-ink-soft mt-1">
            Coleção por país · colunas por ano · set · caderneta · não tem
          </p>
        </div>
      </header>

      <StatsBar
        total={stats.total}
        emissores={stats.emissores}
        set={stats.set}
        caderneta={stats.cad}
        naotem={stats.naotem}
        valorSet={stats.vSet}
        valorCad={stats.vCad}
      />

      <FilterBar
        estado={estado}
        pesquisa={pesquisa}
        onEstado={setEstado}
        onPesquisa={setPesquisa}
        onExportar={exportar}
        onExportarCsv={() => exportarCsv()}
        onImportar={importar}
      />
      <input ref={fileRef} type="file" accept="application/json" hidden onChange={onFile} />

      <FamiliaTabs grupo={grupo} onChange={(g) => { setGrupo(g); setPaisAberto(null) }} contagens={contagens} />

      <ViewTabs vista={vista} onChange={(v) => { setVista(v); setPaisAberto(null) }} />

      {vista === 'valor' ? (
        <ValorPorPais paises={[...agregados.values()]} totalGeral={stats.vSet + stats.vCad} />
      ) : vista === 'tabela' ? (
        <TabelaView
          rows={visibleRows}
          onSelect={setSelecionada}
          onExportar={() => exportarCsv()}
          onImprimir={() => setImprimir({ tipo: 'geral' })}
          onQuantidade={alterarQuantidade}
          onFormato={alterarFormato}
          onFormatoQtd={alterarFormatoQtd}
          onGrau={alterarGrau}
          prefsKey="moedas"
        />
      ) : paisAberto ? (
        <PaisDetalhe
          paisCodigo={paisAberto}
          paisNome={agregados.get(paisAberto)?.nome ?? paisAberto}
          rows={rowsDoPais}
          onVoltar={() => setPaisAberto(null)}
          onSelect={setSelecionada}
          onImprimir={() => setImprimir({ tipo: 'pais', codigo: paisAberto })}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <SortBar sort={sort} onChange={setSort} />
            <button
              onClick={() => setImprimir({ tipo: 'geral' })}
              className="border border-mp-gold rounded-lg px-3 py-2 text-sm font-semibold text-mp-gold-strong hover:bg-mp-falta-bg disabled:opacity-50"
              disabled={stats.naotem === 0}
            >
              🖨 Imprimir lista de em falta — todos os países ({stats.naotem})
            </button>
          </div>
          <EmissorGrid paises={paisesGrelha} onSelect={setPaisAberto} />
        </>
      )}

      {selecionada && (
        <CoinSheet row={selecionada} onClose={() => setSelecionada(null)} onSave={guardar} />
      )}
      </div>

      {imprimir && <PrintFalta grupos={gruposParaImprimir} />}
    </div>
  )
}
