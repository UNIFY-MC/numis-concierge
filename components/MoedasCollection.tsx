'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getCatalogCoins, getCatalogIssues, getCollection,
  upsertCollectionItem, applyToAllYears,
} from '@/lib/catalog'
import { estadoDe } from '@/lib/types'
import { valorReal } from '@/lib/valor'
import { casaEmissor } from '@/lib/emissores'
import type { DisplayRow, CatalogCoin, CollectionItem, PaisAgregado } from '@/lib/types'
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
        const itemByIssue = new Map<string, CollectionItem>()
        for (const it of collection) if (it.catalog_issue_id) itemByIssue.set(it.catalog_issue_id, it)
        const built = issues
          .map((issue) => {
            const coin = coinById.get(issue.catalog_coin_id)
            return coin ? { issue, coin, item: itemByIssue.get(issue.id) ?? null } : null
          })
          .filter((r): r is DisplayRow => r !== null)
        setRows(built)
      })
      .catch((e) => setErro(e.message ?? String(e)))
      .finally(() => setLoading(false))
  }, [])

  // Stats globais (fixas, sobre tudo)
  const stats = useMemo(() => {
    const s = { total: rows.length, set: 0, cad: 0, naotem: 0, vSet: 0, vCad: 0, emissores: 0 }
    const codigos = new Set<string>()
    for (const r of rows) {
      codigos.add(r.coin.pais_codigo)
      const e = estadoDe(r.item)
      if (e === 'set') { s.set++; s.vSet += valorReal(r.coin, r.item) }
      else if (e === 'caderneta') { s.cad++; s.vCad += valorReal(r.coin, r.item) }
      else s.naotem++
    }
    s.emissores = codigos.size
    return s
  }, [rows])

  // Filtro estado + pesquisa
  const visibleRows = useMemo(() => {
    const q = pesquisa.trim().toLowerCase()
    return rows.filter((r) => {
      const e = estadoDe(r.item)
      if (estado === 'tenho' && e === 'naotem') return false
      if ((estado === 'set' || estado === 'caderneta' || estado === 'naotem') && e !== estado) return false
      if (q) {
        const hay = `${r.coin.pais_nome} ${r.coin.denominacao ?? ''} ${r.issue.ano}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, estado, pesquisa])

  // Agregados por país (contagens completas sobre todas as rows do país)
  const agregados = useMemo(() => {
    const m = new Map<string, PaisAgregado>()
    for (const r of rows) {
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
      if (e === 'set') { a.set++; a.valorSet += valorReal(r.coin, r.item) }
      else if (e === 'caderneta') { a.cad++; a.valorCad += valorReal(r.coin, r.item) }
      else a.falta++
    }
    // Se o álbum por casas já existe, o cartão residual da Alemanha são as moedas
    // ainda por atribuir a uma casa.
    const temCasas = [...m.keys()].some((k) => k.startsWith('de-'))
    const residualDe = m.get('de')
    if (temCasas && residualDe) residualDe.nome = 'Alemanha · por atribuir'
    return m
  }, [rows])

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

  // Grupos de em-falta para impressão (sobre o catálogo completo, ignorando o filtro)
  const gruposFalta = useMemo<GrupoFalta[]>(() => {
    const m = new Map<string, GrupoFalta>()
    for (const r of rows) {
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
  }, [rows, agregados])

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

  async function guardar(input: CoinSheetSave) {
    if (!selecionada) return
    const formato = input.estado === 'caderneta' ? 'caderneta' : input.estado === 'set' ? 'set' : null
    const saved = await upsertCollectionItem({
      catalogCoinId: selecionada.coin.id,
      catalogIssueId: selecionada.issue.id,
      quantidade: input.quantidade,
      formatoPosse: formato,
      casaMoeda: input.casaMoeda,
      grau: input.grau,
      valorBase: input.valorBase,
      foto: input.foto,
      notaPrivada: input.nota,
    })
    if (input.aplicarTodos) {
      await applyToAllYears(selecionada.coin.id, input.valorBase, input.foto)
    }
    setRows((prev) => prev.map((r) => {
      if (r.issue.id === selecionada.issue.id) return { ...r, item: saved }
      if (input.aplicarTodos && r.coin.id === selecionada.coin.id && r.item) {
        return { ...r, item: { ...r.item, valor_base: input.valorBase, foto1: input.foto } }
      }
      return r
    }))
  }

  // Atualização rápida de quantidade (vista Tabela), sem abrir o CoinSheet.
  // Preserva o formato/grau/valor já guardados; qtd 0 → "não tem".
  async function alterarQuantidade(row: DisplayRow, novaQtd: number) {
    const qtd = Math.max(0, novaQtd)
    const atual = row.item
    const formato = qtd === 0 ? null : (atual?.formato_posse ?? 'set')
    const saved = await upsertCollectionItem({
      catalogCoinId: row.coin.id,
      catalogIssueId: row.issue.id,
      quantidade: qtd,
      formatoPosse: formato,
      casaMoeda: atual?.casa_moeda ?? null,
      grau: atual?.grau ?? null,
      valorBase: atual?.valor_base ?? null,
      foto: atual?.foto1 ?? null,
      notaPrivada: atual?.nota_privada ?? null,
    })
    setRows((prev) => prev.map((r) => (r.issue.id === row.issue.id ? { ...r, item: saved } : r)))
  }

  // Atualização rápida de estado (S/C/nulo) sem abrir o CoinSheet.
  // null → não tem (qtd=0). Caso contrário preserva qtd (mínimo 1).
  async function alterarEstado(row: DisplayRow, formato: 'set' | 'caderneta' | null) {
    const qtd = formato === null ? 0 : Math.max(1, row.item?.quantidade ?? 1)
    const saved = await upsertCollectionItem({
      catalogCoinId: row.coin.id,
      catalogIssueId: row.issue.id,
      quantidade: qtd,
      formatoPosse: formato,
      casaMoeda: row.item?.casa_moeda ?? null,
      grau: row.item?.grau ?? null,
      valorBase: row.item?.valor_base ?? null,
      foto: row.item?.foto1 ?? null,
      notaPrivada: row.item?.nota_privada ?? null,
    })
    setRows((prev) => prev.map((r) => (r.issue.id === row.issue.id ? { ...r, item: saved } : r)))
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
        const formato = d.estado === 'caderneta' ? 'caderneta' : d.estado === 'set' ? 'set' : null
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
      const itemByIssue = new Map<string, CollectionItem>()
      for (const it of collection) if (it.catalog_issue_id) itemByIssue.set(it.catalog_issue_id, it)
      setRows((prev) => prev.map((r) => ({ ...r, item: itemByIssue.get(r.issue.id) ?? null })))
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
          onEstado={alterarEstado}
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
