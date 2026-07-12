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

// Candidato = (moeda × ano × variante) concreta que se pode adicionar.
interface Candidato {
  coinId: string; issueId: string; ano: string; anoG: number
  denom: string; facial: number; familia: string | null; metal: string | null; vlabel: string
}

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
  const [paisSel, setPaisSel] = useState('pt') // Portugal por defeito
  const [coins, setCoins] = useState<CatalogCoin[]>([])
  const [issues, setIssues] = useState<CatalogIssue[]>([])
  const [loadingPais, setLoadingPais] = useState(false)

  const [colSel, setColSel] = useState('')
  const [periodoSel, setPeriodoSel] = useState('')
  const [moedaSel, setMoedaSel] = useState('')
  const [anoSel, setAnoSel] = useState('')
  const [varSel, setVarSel] = useState('') // issueId da variante
  const [formato, setFormato] = useState<FormatoColecao | ''>('')
  const [qtd, setQtd] = useState(1)
  const [saving, setSaving] = useState(false)

  useEffect(() => { getPaisesCatalogo().then(setPaises).catch(() => setPaises([])) }, [])

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

  // Todos os candidatos (moeda×ano×variante) do grupo/período — base para o filtro cruzado.
  const candidatos = useMemo<Candidato[]>(() => {
    const out: Candidato[] = []
    for (const c of coinsPeriodo) {
      for (const i of issues.filter((x) => x.catalog_coin_id === c.id)) {
        out.push({
          coinId: c.id, issueId: i.id, ano: i.ano, anoG: anoNum(i),
          denom: c.denominacao ?? c.titulo, facial: c.valor_facial ?? Infinity,
          familia: c.familia, metal: c.metal ?? null,
          vlabel: varianteSimples(c.titulo, i.mintmark_variante ?? null, i.etiqueta ?? null) || 'Base',
        })
      }
    }
    return out
  }, [coinsPeriodo, issues])

  // Moeda e Ano são intermutáveis: cada um mostra as opções compatíveis com o outro.
  const moedas = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of candidatos) if (!anoSel || c.ano === anoSel) m.set(c.denom, Math.min(m.get(c.denom) ?? Infinity, c.facial))
    return [...m.entries()].sort((a, b) => a[1] - b[1]).map(([d]) => d)
  }, [candidatos, anoSel])

  const anos = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of candidatos) if (!moedaSel || c.denom === moedaSel) m.set(c.ano, Math.min(m.get(c.ano) ?? Infinity, c.anoG))
    return [...m.entries()].sort((a, b) => a[1] - b[1]).map(([a]) => a)
  }, [candidatos, moedaSel])

  const candSel = useMemo(
    () => (moedaSel && anoSel ? candidatos.filter((c) => c.denom === moedaSel && c.ano === anoSel) : []),
    [candidatos, moedaSel, anoSel],
  )
  const resolved = useMemo(() => candSel.find((c) => c.issueId === varSel) ?? candSel[0] ?? null, [candSel, varSel])
  const fmts = resolved ? formatosDe(resolved.familia) : []

  useEffect(() => { if (candSel.length && !candSel.some((c) => c.issueId === varSel)) setVarSel(candSel[0].issueId) }, [candSel, varSel])
  useEffect(() => {
    if (fmts.length && !fmts.includes(formato as FormatoColecao)) {
      setFormato(fmts.includes('normal' as FormatoColecao) ? ('normal' as FormatoColecao) : fmts[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved])

  async function adicionar() {
    if (!resolved) return
    setSaving(true)
    try {
      await adicionarMoedaAoEstojo({
        estojoId, catalogCoinId: resolved.coinId, catalogIssueId: resolved.issueId,
        formato: formato || null, quantidade: qtd,
      })
      onAdded()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-mp-border bg-mp-surface-muted/50 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <Campo label="Ordem">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-mp-gold font-serif text-sm font-semibold text-white" title="Nº de ordem no estojo">{proximaOrdem}</span>
        </Campo>

        <Campo label="País">
          <select value={paisSel} onChange={(e) => { setPaisSel(e.target.value); setColSel(''); setPeriodoSel(''); setMoedaSel(''); setAnoSel(''); setVarSel('') }} className={cel + ' w-36'}>
            <option value="">País…</option>
            {paises.map((p) => <option key={p.codigo} value={p.codigo}>{p.nome}</option>)}
          </select>
        </Campo>

        <Campo label="Coleção">
          <select value={colSel} disabled={!grupos.length} onChange={(e) => { setColSel(e.target.value); setPeriodoSel(''); setMoedaSel(''); setAnoSel(''); setVarSel('') }} className={cel + ' w-40 disabled:opacity-50'}>
            <option value="">{loadingPais ? 'A carregar…' : 'Coleção…'}</option>
            {grupos.map((g) => <option key={g.chave} value={g.chave}>{g.label}</option>)}
          </select>
        </Campo>

        {periodos.length > 1 && (
          <Campo label="Período">
            <select value={periodoSel} onChange={(e) => { setPeriodoSel(e.target.value); setMoedaSel(''); setAnoSel(''); setVarSel('') }} className={cel + ' w-44'}>
              <option value="">Todos</option>
              {periodos.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Campo>
        )}

        <Campo label="Moeda">
          <select value={moedaSel} disabled={!colSel} onChange={(e) => { setMoedaSel(e.target.value); setVarSel('') }} className={cel + ' w-40 disabled:opacity-50'}>
            <option value="">Moeda…</option>
            {moedas.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Campo>

        <Campo label="Ano">
          <select value={anoSel} disabled={!colSel} onChange={(e) => { setAnoSel(e.target.value); setVarSel('') }} className={cel + ' w-24 disabled:opacity-50'}>
            <option value="">Ano…</option>
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </Campo>

        <Campo label="Variante">
          <select value={varSel} disabled={candSel.length <= 1} onChange={(e) => setVarSel(e.target.value)} className={cel + ' w-40 disabled:opacity-50'} title="Variante da moeda nesse ano">
            {candSel.length === 0 ? <option value="">—</option> : candSel.map((c) => <option key={c.issueId} value={c.issueId}>{c.vlabel}</option>)}
          </select>
        </Campo>

        {fmts.length > 0 && (
          <Campo label="Estado">
            <select value={formato} onChange={(e) => setFormato(e.target.value as FormatoColecao)} className={cel + ' w-32'}>
              {fmts.map((f) => <option key={f} value={f}>{FORMATO_LABEL[f]}</option>)}
            </select>
          </Campo>
        )}

        <Campo label="Metal">
          <span className={cel + ' inline-flex w-24 items-center bg-mp-surface-muted text-mp-ink-soft'} title="Metal do catálogo (automático)">
            {resolved?.metal ?? '—'}
          </span>
        </Campo>

        <Campo label="Qtd">
          <input type="number" min={1} value={qtd} onChange={(e) => setQtd(parseInt(e.target.value, 10) || 1)} className={cel + ' w-16 text-center'} />
        </Campo>

        <button onClick={adicionar} disabled={saving || !resolved} className="h-9 rounded-lg bg-mp-gold px-4 text-sm font-semibold text-white hover:bg-mp-gold-strong disabled:opacity-40">
          {saving ? '…' : 'Adicionar'}
        </button>
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-mp-ink-faint">
        Portugal por defeito. Escolhe moeda e ano por qualquer ordem; a variante fica "Base" quando não há variedade.
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
