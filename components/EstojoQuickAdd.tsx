'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  getPaisesCatalogo,
  adicionarMoedaAoEstojo,
  varianteSimples,
  type PaisCatalogo,
} from '@/lib/estojos'
import { getCatalogPais, getIssuesPais } from '@/lib/catalog'
import { eraDe } from '@/lib/series'
import { formatosDe, FORMATO_LABEL } from '@/lib/types'
import type { CatalogCoin, CatalogIssue, FormatoColecao } from '@/lib/types'

const cel = 'h-9 rounded-lg border border-mp-border bg-mp-surface px-2 text-sm text-mp-ink outline-none focus:border-mp-gold'

interface Grupo { chave: string; label: string; ord: number }
function grupoDe(coin: CatalogCoin): Grupo {
  const era = eraDe(coin.serie_ord)
  if (era) return { chave: 'era:' + era.chave, label: `${era.icone} ${era.label}`, ord: era.min }
  switch (coin.familia) {
    case 'euro_circulacao':
    case 'euro_comemorativa': return { chave: 'fam:euro', label: '⭐ Euro', ord: 40 }
    case 'euro_colecao': return { chave: 'fam:euro_col', label: '⭐ Euro · Coleção', ord: 45 }
    case 'historico': return { chave: 'fam:hist', label: '🏛️ Histórico', ord: 30 }
    default: return { chave: 'fam:outros', label: '❓ Outras', ord: 90 }
  }
}
const anoNum = (i: CatalogIssue) => i.ano_gregoriano ?? parseInt(i.ano, 10) ?? 0

export default function EstojoQuickAdd({
  estojoId,
  proximaOrdem,
  onAdded,
}: {
  estojoId: string
  proximaOrdem: number
  onAdded: () => void
}) {
  const [paises, setPaises] = useState<PaisCatalogo[]>([])
  const [paisSel, setPaisSel] = useState('')
  const [coins, setCoins] = useState<CatalogCoin[]>([])
  const [issues, setIssues] = useState<CatalogIssue[]>([])
  const [loadingPais, setLoadingPais] = useState(false)

  const [colSel, setColSel] = useState('')
  const [periodoSel, setPeriodoSel] = useState('')
  const [moedaSel, setMoedaSel] = useState('')
  const [varianteSel, setVarianteSel] = useState('')
  const [issueId, setIssueId] = useState('')
  const [formato, setFormato] = useState<FormatoColecao | ''>('')
  const [qtd, setQtd] = useState(1)
  const [saving, setSaving] = useState(false)

  useEffect(() => { getPaisesCatalogo().then(setPaises).catch(() => setPaises([])) }, [])

  // Carrega o catálogo do país (uma vez por país) para filtrar em cascata no cliente.
  useEffect(() => {
    if (!paisSel) { setCoins([]); setIssues([]); return }
    let alive = true
    setLoadingPais(true)
    Promise.all([getCatalogPais(paisSel), getIssuesPais(paisSel)])
      .then(([cs, is]) => { if (alive) { setCoins(cs); setIssues(is) } })
      .finally(() => { if (alive) setLoadingPais(false) })
    return () => { alive = false }
  }, [paisSel])

  const grupos = useMemo(() => {
    const m = new Map<string, Grupo>()
    for (const c of coins) { const g = grupoDe(c); if (!m.has(g.chave)) m.set(g.chave, g) }
    return [...m.values()].sort((a, b) => a.ord - b.ord)
  }, [coins])

  const coinsGrupo = useMemo(() => (colSel ? coins.filter((c) => grupoDe(c).chave === colSel) : []), [coins, colSel])

  const periodos = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of coinsGrupo) if (c.serie) m.set(c.serie, Math.min(m.get(c.serie) ?? 999, c.serie_ord ?? 999))
    return [...m.entries()].sort((a, b) => a[1] - b[1]).map(([s]) => s)
  }, [coinsGrupo])

  const coinsPeriodo = useMemo(
    () => (periodoSel ? coinsGrupo.filter((c) => c.serie === periodoSel) : coinsGrupo),
    [coinsGrupo, periodoSel],
  )

  const moedas = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of coinsPeriodo) {
      const d = c.denominacao ?? c.titulo
      if (d) m.set(d, Math.min(m.get(d) ?? Infinity, c.valor_facial ?? Infinity))
    }
    return [...m.entries()].sort((a, b) => a[1] - b[1]).map(([d]) => d)
  }, [coinsPeriodo])

  const coinsMoeda = useMemo(
    () => coinsPeriodo.filter((c) => (c.denominacao ?? c.titulo) === moedaSel),
    [coinsPeriodo, moedaSel],
  )

  const variantes = useMemo(() => {
    const s = new Set<string>()
    for (const c of coinsMoeda) { const v = varianteSimples(c.titulo, null, null); if (v) s.add(v) }
    return [...s]
  }, [coinsMoeda])

  const resolvedCoin = useMemo(() => {
    if (coinsMoeda.length === 0) return null
    if (coinsMoeda.length === 1) return coinsMoeda[0]
    if (varianteSel) return coinsMoeda.find((c) => varianteSimples(c.titulo, null, null) === varianteSel) ?? coinsMoeda[0]
    return coinsMoeda[0]
  }, [coinsMoeda, varianteSel])

  const anos = useMemo(
    () => (resolvedCoin ? issues.filter((i) => i.catalog_coin_id === resolvedCoin.id).sort((a, b) => anoNum(a) - anoNum(b)) : []),
    [issues, resolvedCoin],
  )
  const fmts = resolvedCoin ? formatosDe(resolvedCoin.familia) : []

  // Clampar ano e formato quando o alvo muda (mantém a escolha se ainda válida).
  useEffect(() => {
    if (anos.length && !anos.some((i) => i.id === issueId)) setIssueId(anos[0].id)
  }, [anos, issueId])
  useEffect(() => {
    if (fmts.length && !fmts.includes(formato as FormatoColecao)) {
      setFormato(fmts.includes('normal' as FormatoColecao) ? ('normal' as FormatoColecao) : fmts[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedCoin])

  async function adicionar() {
    if (!resolvedCoin || !issueId) return
    setSaving(true)
    try {
      await adicionarMoedaAoEstojo({
        estojoId,
        catalogCoinId: resolvedCoin.id,
        catalogIssueId: issueId,
        formato: formato || null,
        quantidade: qtd,
      })
      onAdded() // mantém todos os filtros (memória) para a próxima moeda
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-mp-border bg-mp-surface-muted/50 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col">
          <span className="mb-0.5 text-[10px] uppercase tracking-wide text-mp-ink-faint">Ordem</span>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-mp-gold font-serif text-sm font-semibold text-white" title="Nº de ordem no estojo">{proximaOrdem}</span>
        </div>

        <Campo label="País">
          <select value={paisSel} onChange={(e) => { setPaisSel(e.target.value); setColSel(''); setPeriodoSel(''); setMoedaSel(''); setVarianteSel('') }} className={cel + ' w-36'}>
            <option value="">País…</option>
            {paises.map((p) => <option key={p.codigo} value={p.codigo}>{p.nome}</option>)}
          </select>
        </Campo>

        <Campo label="Coleção">
          <select value={colSel} disabled={!grupos.length} onChange={(e) => { setColSel(e.target.value); setPeriodoSel(''); setMoedaSel(''); setVarianteSel('') }} className={cel + ' w-40 disabled:opacity-50'}>
            <option value="">{loadingPais ? 'A carregar…' : 'Coleção…'}</option>
            {grupos.map((g) => <option key={g.chave} value={g.chave}>{g.label}</option>)}
          </select>
        </Campo>

        {periodos.length > 1 && (
          <Campo label="Período">
            <select value={periodoSel} onChange={(e) => { setPeriodoSel(e.target.value); setMoedaSel(''); setVarianteSel('') }} className={cel + ' w-44'}>
              <option value="">Todos</option>
              {periodos.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Campo>
        )}

        <Campo label="Moeda">
          <select value={moedaSel} disabled={!colSel} onChange={(e) => { setMoedaSel(e.target.value); setVarianteSel('') }} className={cel + ' w-40 disabled:opacity-50'}>
            <option value="">Moeda…</option>
            {moedas.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Campo>

        <Campo label="Ano">
          <select value={issueId} disabled={!anos.length} onChange={(e) => setIssueId(e.target.value)} className={cel + ' w-24 disabled:opacity-50'}>
            {anos.length === 0 ? <option value="">Ano</option> : anos.map((i) => <option key={i.id} value={i.id}>{i.ano}</option>)}
          </select>
        </Campo>

        {variantes.length > 0 && (
          <Campo label="Variante">
            <select value={varianteSel} onChange={(e) => setVarianteSel(e.target.value)} className={cel + ' w-40'}>
              <option value="">— nenhuma —</option>
              {variantes.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Campo>
        )}

        {fmts.length > 0 && (
          <Campo label="Estado">
            <select value={formato} onChange={(e) => setFormato(e.target.value as FormatoColecao)} className={cel + ' w-32'}>
              {fmts.map((f) => <option key={f} value={f}>{FORMATO_LABEL[f]}</option>)}
            </select>
          </Campo>
        )}

        <Campo label="Qtd">
          <input type="number" min={1} value={qtd} onChange={(e) => setQtd(parseInt(e.target.value, 10) || 1)} className={cel + ' w-16 text-center'} />
        </Campo>

        <button onClick={adicionar} disabled={saving || !resolvedCoin || !issueId} className="h-9 rounded-lg bg-mp-gold px-4 text-sm font-semibold text-white hover:bg-mp-gold-strong disabled:opacity-40">
          {saving ? '…' : 'Adicionar'}
        </button>
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-mp-ink-faint">
        Escolhe país e coleção uma vez — a linha guarda a escolha anterior; muda só o que difere (normalmente o ano) e Adicionar.
      </p>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="mb-0.5 text-[10px] uppercase tracking-wide text-mp-ink-faint">{label}</span>
      {children}
    </div>
  )
}
