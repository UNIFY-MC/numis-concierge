'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getCatalogCoins, getCatalogIssues, getCollection,
  upsertCollectionItem, applyToAllYears,
} from '@/lib/catalog'
import { estadoDe } from '@/lib/types'
import { valorReal } from '@/lib/valor'
import type { DisplayRow, CatalogCoin, CollectionItem, PaisAgregado } from '@/lib/types'
import StatsBar from './StatsBar'
import FilterBar, { type EstadoFiltro } from './FilterBar'
import ViewTabs, { type Vista } from './ViewTabs'
import SortBar, { type SortBy } from './SortBar'
import EmissorGrid from './EmissorGrid'
import PaisDetalhe from './PaisDetalhe'
import ValorPorPais from './ValorPorPais'
import CoinSheet, { type CoinSheetSave } from './CoinSheet'

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
      let a = m.get(r.coin.pais_codigo)
      if (!a) {
        a = { codigo: r.coin.pais_codigo, nome: r.coin.pais_nome, total: 0, set: 0, cad: 0, falta: 0, valorSet: 0, valorCad: 0 }
        m.set(r.coin.pais_codigo, a)
      }
      a.total++
      const e = estadoDe(r.item)
      if (e === 'set') { a.set++; a.valorSet += valorReal(r.coin, r.item) }
      else if (e === 'caderneta') { a.cad++; a.valorCad += valorReal(r.coin, r.item) }
      else a.falta++
    }
    return m
  }, [rows])

  // Países a mostrar na grelha (os que têm rows visíveis), ordenados
  const paisesGrelha = useMemo(() => {
    const presentes = new Set(visibleRows.map((r) => r.coin.pais_codigo))
    const lista = [...agregados.values()].filter((a) => presentes.has(a.codigo))
    const pctOf = (a: PaisAgregado) => (a.total > 0 ? (a.set + a.cad) / a.total : 0)
    if (sort === 'pct') lista.sort((a, b) => pctOf(b) - pctOf(a) || a.nome.localeCompare(b.nome, 'pt'))
    else if (sort === 'total') lista.sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt'))
    else lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
    return lista
  }, [agregados, visibleRows, sort])

  const rowsDoPais = useMemo(
    () => (paisAberto ? visibleRows.filter((r) => r.coin.pais_codigo === paisAberto) : []),
    [visibleRows, paisAberto],
  )

  async function guardar(input: CoinSheetSave) {
    if (!selecionada) return
    const formato = input.estado === 'caderneta' ? 'caderneta' : input.estado === 'set' ? 'set' : null
    const saved = await upsertCollectionItem({
      catalogCoinId: selecionada.coin.id,
      catalogIssueId: selecionada.issue.id,
      quantidade: input.quantidade,
      formatoPosse: formato,
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
        onImportar={importar}
      />
      <input ref={fileRef} type="file" accept="application/json" hidden onChange={onFile} />

      <ViewTabs vista={vista} onChange={(v) => { setVista(v); setPaisAberto(null) }} />

      {vista === 'valor' ? (
        <ValorPorPais paises={[...agregados.values()]} totalGeral={stats.vSet + stats.vCad} />
      ) : paisAberto ? (
        <PaisDetalhe
          paisCodigo={paisAberto}
          paisNome={agregados.get(paisAberto)?.nome ?? paisAberto}
          rows={rowsDoPais}
          onVoltar={() => setPaisAberto(null)}
          onSelect={setSelecionada}
        />
      ) : (
        <>
          <SortBar sort={sort} onChange={setSort} />
          <EmissorGrid paises={paisesGrelha} onSelect={setPaisAberto} />
        </>
      )}

      {selecionada && (
        <CoinSheet row={selecionada} onClose={() => setSelecionada(null)} onSave={guardar} />
      )}
    </div>
  )
}
