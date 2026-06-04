'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  getCatalogPais, getCollection, getIssuesForCoin,
  upsertCollectionItem, applyToAllYears,
} from '@/lib/catalog'
import { ERAS, eraDe } from '@/lib/series'
import { itemPrincipal } from '@/lib/types'
import type { CatalogCoin, CollectionItem, DisplayRow } from '@/lib/types'
import CoinSheet, { type CoinSheetSave } from './CoinSheet'

// Coleção de Portugal organizada como a Colnect: Era → Série/Reinado → moedas.
// Vista de catálogo (por tipo de moeda), com indicação do que se tem.
export default function ColecaoPortugal() {
  const [coins, setCoins] = useState<CatalogCoin[]>([])
  const [col, setCol] = useState<CollectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [eraSel, setEraSel] = useState('monarquia')
  const [serieSel, setSerieSel] = useState<string | null>(null)
  const [ficha, setFicha] = useState<DisplayRow | null>(null)

  const tenho = useMemo(() => {
    const t = new Set<string>()
    for (const it of col) if (it.quantidade > 0 && it.catalog_coin_id) t.add(it.catalog_coin_id)
    return t
  }, [col])

  useEffect(() => {
    Promise.all([getCatalogPais('pt'), getCollection()])
      .then(([cs, c]) => { setCoins(cs); setCol(c) })
      .finally(() => setLoading(false))
  }, [])

  // Abre a ficha de uma moeda: busca a sua issue principal + os exemplares que tens.
  async function abrirFicha(coin: CatalogCoin) {
    const issues = await getIssuesForCoin(coin.id)
    const issue = issues[0]
    if (!issue) return
    const itens = col.filter((i) => i.catalog_issue_id === issue.id)
    setFicha({ coin, issue, itens, item: itemPrincipal(itens) })
  }

  async function guardar(input: CoinSheetSave) {
    if (!ficha) return
    const { coin, issue } = ficha
    const comuns = { casaMoeda: input.casaMoeda, foto: input.foto, notaPrivada: input.nota }
    for (const f of input.formatos) {
      await upsertCollectionItem({
        catalogCoinId: coin.id, catalogIssueId: issue.id,
        quantidade: Math.max(1, f.quantidade), formatoPosse: f.formato,
        grau: f.grau, valorBase: f.valorBase, ...comuns,
      })
    }
    for (const fr of input.removidos) {
      await upsertCollectionItem({
        catalogCoinId: coin.id, catalogIssueId: issue.id,
        quantidade: 0, formatoPosse: fr, grau: null, valorBase: null, ...comuns,
      })
    }
    if (input.aplicarTodos) await applyToAllYears(coin.id, input.formatos[0]?.valorBase ?? null, input.foto)
    const atual = await getCollection()
    setCol(atual)
    const itens = atual.filter((i) => i.catalog_issue_id === issue.id)
    setFicha({ coin, issue, itens, item: itemPrincipal(itens) })
  }

  // série → { ord, coins }
  const series = useMemo(() => {
    const m = new Map<string, { ord: number; coins: CatalogCoin[] }>()
    for (const c of coins) {
      const s = c.serie ?? 'Por classificar'
      if (!m.has(s)) m.set(s, { ord: c.serie_ord ?? 98, coins: [] })
      m.get(s)!.coins.push(c)
    }
    return m
  }, [coins])

  const contEra = useMemo(() => {
    const tot = new Map<string, number>()
    const meus = new Map<string, number>()
    for (const c of coins) {
      const e = eraDe(c.serie_ord)
      if (!e) continue
      tot.set(e.chave, (tot.get(e.chave) ?? 0) + 1)
      if (tenho.has(c.id)) meus.set(e.chave, (meus.get(e.chave) ?? 0) + 1)
    }
    return { tot, meus }
  }, [coins, tenho])

  const seriesDaEra = useMemo(() => {
    const era = ERAS.find((e) => e.chave === eraSel)
    if (!era) return []
    return [...series.entries()]
      .filter(([, v]) => v.ord >= era.min && v.ord <= era.max)
      .sort((a, b) => a[1].ord - b[1].ord)
  }, [series, eraSel])

  const coinsDaSerie = serieSel ? (series.get(serieSel)?.coins ?? []) : []

  if (loading) return <div className="p-8 text-mp-ink-faint">A carregar a coleção…</div>

  return (
    <div className="mx-auto max-w-6xl p-6">
      <header className="mb-6">
        <h1 className="font-serif text-2xl font-semibold">
          Coleção de <span className="text-mp-gold">Portugal</span>
        </h1>
        <p className="mt-1 text-xs text-mp-ink-soft">
          Organizada por era e reinado — {coins.length} tipos no catálogo, {tenho.size} na coleção
        </p>
      </header>

      {/* Eras */}
      <div className="mb-6 flex flex-wrap gap-2">
        {ERAS.filter((e) => (contEra.tot.get(e.chave) ?? 0) > 0).map((e) => {
          const ativo = e.chave === eraSel
          return (
            <button
              key={e.chave}
              onClick={() => { setEraSel(e.chave); setSerieSel(null) }}
              className={
                'flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ' +
                (ativo
                  ? 'border-mp-gold bg-mp-gold text-white shadow-sm'
                  : 'border-mp-border bg-mp-surface text-mp-ink-soft hover:text-mp-ink')
              }
            >
              <span>{e.icone}</span>
              <span>{e.label}</span>
              <span className={'text-xs font-normal ' + (ativo ? 'text-white/80' : 'text-mp-ink-faint')}>
                {contEra.meus.get(e.chave) ?? 0}/{contEra.tot.get(e.chave) ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      {serieSel ? (
        <ListaMoedas
          serie={serieSel}
          coins={coinsDaSerie}
          tenho={tenho}
          onVoltar={() => setSerieSel(null)}
          onAbrir={abrirFicha}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {seriesDaEra.map(([nome, v]) => (
            <CartaoSerie
              key={nome}
              nome={nome}
              coins={v.coins}
              tenho={tenho}
              onAbrir={() => setSerieSel(nome)}
            />
          ))}
        </div>
      )}

      {ficha && <CoinSheet row={ficha} onClose={() => setFicha(null)} onSave={guardar} />}
    </div>
  )
}

function periodo(coins: CatalogCoin[]): string {
  const anos = coins.map((c) => c.ano_inicio).filter((a): a is number => a != null)
  if (!anos.length) return '—'
  const min = Math.min(...anos), max = Math.max(...anos)
  return min === max ? `${min}` : `${min}–${max}`
}

function CartaoSerie({ nome, coins, tenho, onAbrir }: {
  nome: string; coins: CatalogCoin[]; tenho: Set<string>; onAbrir: () => void
}) {
  const meus = coins.filter((c) => tenho.has(c.id)).length
  const pct = coins.length ? Math.round((meus / coins.length) * 100) : 0
  return (
    <button
      onClick={onAbrir}
      className="flex flex-col rounded-2xl border border-mp-border bg-mp-surface p-4 text-left transition-shadow hover:shadow-md"
    >
      <span className="font-serif text-sm font-semibold leading-tight text-mp-ink">{nome}</span>
      <span className="mt-0.5 text-[11px] text-mp-ink-faint">{periodo(coins)}</span>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-serif text-2xl font-semibold text-mp-gold-strong">{meus}</span>
        <span className="text-sm text-mp-ink-faint">/ {coins.length}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mp-surface-muted">
        <div className="h-full rounded-full bg-mp-set" style={{ width: `${pct}%` }} />
      </div>
    </button>
  )
}

// Nome curto a partir do título Maktun ("Portugal; km…; 8 Escudos; (1726); Gold").
function nomeCurto(c: CatalogCoin): string {
  if (c.tema) return c.tema
  if (c.denominacao) return c.denominacao
  const partes = (c.titulo || '').split(';').map((s) => s.trim())
  return partes[2] || c.titulo || '—'
}
function metalDe(c: CatalogCoin): string | null {
  const m = (c.titulo || '').match(/\b(Gold|Silver|Copper|Bronze|Brass|Nickel|Bi-?Metallic|Cupronickel)\b/i)
  return m ? m[1] : null
}

function ListaMoedas({ serie, coins, tenho, onVoltar, onAbrir }: {
  serie: string; coins: CatalogCoin[]; tenho: Set<string>; onVoltar: () => void; onAbrir: (c: CatalogCoin) => void
}) {
  const ordenados = [...coins].sort((a, b) => (a.ano_inicio ?? 0) - (b.ano_inicio ?? 0))
  return (
    <div>
      <button onClick={onVoltar} className="mb-4 text-sm font-semibold text-mp-gold-strong hover:underline">
        ← voltar às séries
      </button>
      <h2 className="mb-4 font-serif text-xl font-semibold">{serie} <span className="text-sm font-normal text-mp-ink-faint">· {coins.length} tipos</span></h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ordenados.map((c) => {
          const meu = tenho.has(c.id)
          const metal = metalDe(c)
          return (
            <button
              key={c.id}
              onClick={() => onAbrir(c)}
              className={
                'flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-shadow hover:shadow-md ' +
                (meu ? 'border-mp-set bg-mp-set-bg' : 'border-mp-border bg-mp-surface')
              }
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-mp-surface-muted">
                {c.anverso_img
                  ? <img src={c.anverso_img} alt="" className="h-full w-full object-cover" />
                  : <span className="text-mp-coin-empty">⊚</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-mp-ink">{nomeCurto(c)}</p>
                <p className="text-[11px] text-mp-ink-faint">
                  {c.ano_inicio ?? '—'}{metal ? ` · ${metal}` : ''}
                </p>
              </div>
              <span
                className={
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ' +
                  (meu ? 'bg-mp-set text-white' : 'bg-mp-surface-muted text-mp-ink-faint')
                }
              >
                {meu ? 'tenho' : 'falta'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
