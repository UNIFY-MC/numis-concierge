'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  getCatalogCoins, getCatalogIssues, getCollection, upsertCollectionItem,
} from '@/lib/catalog'
import type { DisplayRow, CatalogCoin, CollectionItem } from '@/lib/types'
import StatsBar from './StatsBar'
import FilterBar, { type EstadoFiltro, type PaisOption } from './FilterBar'
import PaisGroup from './PaisGroup'
import CoinSheet from './CoinSheet'

function isOwned(item: CollectionItem | null): boolean {
  return !!item && item.quantidade > 0
}

export default function MoedasCollection() {
  const [rows, setRows] = useState<DisplayRow[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [pais, setPais] = useState('')
  const [estado, setEstado] = useState<EstadoFiltro>('todas')
  const [pesquisa, setPesquisa] = useState('')
  const [selecionada, setSelecionada] = useState<DisplayRow | null>(null)

  useEffect(() => {
    Promise.all([getCatalogCoins(), getCatalogIssues(), getCollection()])
      .then(([coins, issues, collection]) => {
        const coinById = new Map<string, CatalogCoin>(coins.map((c) => [c.id, c]))
        const itemByIssue = new Map<string, CollectionItem>()
        for (const it of collection) {
          if (it.catalog_issue_id) itemByIssue.set(it.catalog_issue_id, it)
        }
        const built: DisplayRow[] = issues
          .map((issue) => {
            const coin = coinById.get(issue.catalog_coin_id)
            if (!coin) return null
            return { issue, coin, item: itemByIssue.get(issue.id) ?? null }
          })
          .filter((r): r is DisplayRow => r !== null)
        setRows(built)
      })
      .catch((e) => setErro(e.message ?? String(e)))
      .finally(() => setLoading(false))
  }, [])

  const paises: PaisOption[] = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of rows) if (!m.has(r.coin.pais_codigo)) m.set(r.coin.pais_codigo, r.coin.pais_nome)
    return [...m.entries()]
      .map(([codigo, nome]) => ({ codigo, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
  }, [rows])

  // Filtro base (país + pesquisa) — alimenta as stats (% completo significativo)
  const baseRows = useMemo(() => {
    const q = pesquisa.trim().toLowerCase()
    return rows.filter((r) => {
      if (pais && r.coin.pais_codigo !== pais) return false
      if (q) {
        const hay = `${r.coin.pais_nome} ${r.coin.denominacao ?? ''} ${r.coin.titulo} ${r.issue.ano}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, pais, pesquisa])

  // Filtro de estado aplicado por cima (não afecta as stats)
  const visibleRows = useMemo(() => {
    if (estado === 'todas') return baseRows
    return baseRows.filter((r) => (estado === 'tenho' ? isOwned(r.item) : !isOwned(r.item)))
  }, [baseRows, estado])

  const stats = useMemo(() => ({
    total: baseRows.length,
    tenho: baseRows.filter((r) => isOwned(r.item)).length,
  }), [baseRows])

  // Agrupar visibleRows por país
  const grupos = useMemo(() => {
    const byPais = new Map<string, DisplayRow[]>()
    for (const r of visibleRows) {
      const arr = byPais.get(r.coin.pais_codigo) ?? []
      arr.push(r)
      byPais.set(r.coin.pais_codigo, arr)
    }
    for (const arr of byPais.values()) {
      arr.sort((a, b) =>
        (a.coin.html_rank ?? 0) - (b.coin.html_rank ?? 0) ||
        (a.issue.ano_gregoriano ?? 0) - (b.issue.ano_gregoriano ?? 0))
    }
    // Totais por país calculados sobre baseRows (independente do filtro de estado)
    const totalByPais = new Map<string, { total: number; tenho: number }>()
    for (const r of baseRows) {
      const t = totalByPais.get(r.coin.pais_codigo) ?? { total: 0, tenho: 0 }
      t.total++
      if (isOwned(r.item)) t.tenho++
      totalByPais.set(r.coin.pais_codigo, t)
    }
    return [...byPais.entries()]
      .map(([codigo, gRows]) => ({
        codigo,
        nome: gRows[0].coin.pais_nome,
        rows: gRows,
        total: totalByPais.get(codigo)?.total ?? gRows.length,
        tenho: totalByPais.get(codigo)?.tenho ?? 0,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
  }, [visibleRows, baseRows])

  async function guardar(input: {
    tenho: boolean
    quantidade: number
    formatoPosse: CollectionItem['formato_posse']
    grau: string | null
    notaPrivada: string | null
  }) {
    if (!selecionada) return
    const saved = await upsertCollectionItem({
      catalogCoinId: selecionada.coin.id,
      catalogIssueId: selecionada.issue.id,
      quantidade: input.quantidade,
      formatoPosse: input.formatoPosse,
      grau: input.grau,
      notaPrivada: input.notaPrivada,
    })
    setRows((prev) =>
      prev.map((r) => (r.issue.id === selecionada.issue.id ? { ...r, item: saved } : r)))
  }

  if (loading) return <div className="p-8 text-gray-400">A carregar…</div>
  if (erro) return <div className="p-8 text-red-500">Erro: {erro}</div>

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-5">A minha colecção</h1>

      <StatsBar total={stats.total} tenho={stats.tenho} />

      <FilterBar
        paises={paises}
        pais={pais}
        estado={estado}
        pesquisa={pesquisa}
        onPais={setPais}
        onEstado={setEstado}
        onPesquisa={setPesquisa}
      />

      {grupos.length === 0 ? (
        <p className="text-gray-400 py-8 text-center">Sem moedas para este filtro.</p>
      ) : (
        <div className="space-y-3">
          {grupos.map((g) => (
            <PaisGroup
              key={g.codigo}
              paisCodigo={g.codigo}
              paisNome={g.nome}
              rows={g.rows}
              totalNoPais={g.total}
              tenhoNoPais={g.tenho}
              onSelect={setSelecionada}
            />
          ))}
        </div>
      )}

      {selecionada && (
        <CoinSheet
          row={selecionada}
          onClose={() => setSelecionada(null)}
          onSave={guardar}
        />
      )}
    </div>
  )
}
