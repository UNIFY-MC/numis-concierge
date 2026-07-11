'use client'

import { useEffect, useState } from 'react'
import Flag from '@/components/Flag'
import { buscarMoedasCatalogo, adicionarMoedaAoEstojo, type MoedaCatalogo } from '@/lib/estojos'
import { getIssuesForCoin } from '@/lib/catalog'
import { formatosDe, FORMATO_LABEL } from '@/lib/types'
import type { CatalogIssue, FormatoColecao } from '@/lib/types'

const inp = 'w-full bg-mp-surface border border-mp-border rounded-lg px-3 py-2 text-sm outline-none focus:border-mp-gold'

export default function AdicionarMoedaEstojo({
  estojoId,
  onAdded,
  onClose,
}: {
  estojoId: string
  onAdded: () => void
  onClose: () => void
}) {
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<MoedaCatalogo[]>([])
  const [buscando, setBuscando] = useState(false)
  const [tipo, setTipo] = useState<MoedaCatalogo | null>(null)
  const [issues, setIssues] = useState<CatalogIssue[]>([])
  const [issueId, setIssueId] = useState('')
  const [formato, setFormato] = useState<FormatoColecao | ''>('')
  const [qtd, setQtd] = useState(1)
  const [saving, setSaving] = useState(false)

  // Pesquisa com debounce leve.
  useEffect(() => {
    if (tipo) return
    const t = termo.trim()
    if (t.length < 2) {
      setResultados([])
      return
    }
    let alive = true
    setBuscando(true)
    const id = setTimeout(() => {
      buscarMoedasCatalogo(t)
        .then((r) => alive && setResultados(r))
        .catch(() => alive && setResultados([]))
        .finally(() => alive && setBuscando(false))
    }, 250)
    return () => {
      alive = false
      clearTimeout(id)
    }
  }, [termo, tipo])

  async function escolherTipo(m: MoedaCatalogo) {
    setTipo(m)
    const its = await getIssuesForCoin(m.catalogCoinId)
    setIssues(its)
    setIssueId(its[0]?.id ?? '')
    const fmts = formatosDe(m.familia)
    setFormato(fmts[0] ?? '')
  }

  async function adicionar() {
    if (!tipo || !issueId) return
    setSaving(true)
    try {
      await adicionarMoedaAoEstojo({
        estojoId,
        catalogCoinId: tipo.catalogCoinId,
        catalogIssueId: issueId,
        formato: formato || null,
        quantidade: qtd,
      })
      onAdded()
    } finally {
      setSaving(false)
    }
  }

  const fmts = tipo ? formatosDe(tipo.familia) : []

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-mp-surface p-6 max-h-[92vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-mp-ink">Adicionar moeda ao estojo</h2>
          <button onClick={onClose} className="text-xl leading-none text-mp-ink-faint hover:text-mp-ink">×</button>
        </div>

        {!tipo ? (
          <>
            <input
              autoFocus
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Pesquisar por país, denominação ou tipo…"
              className={inp}
            />
            <div className="mt-3 space-y-1">
              {buscando && <p className="px-1 py-2 text-sm text-mp-ink-faint">A pesquisar…</p>}
              {!buscando && termo.trim().length >= 2 && resultados.length === 0 && (
                <p className="px-1 py-2 text-sm text-mp-ink-faint">Nada encontrado.</p>
              )}
              {resultados.map((m) => (
                <button
                  key={m.catalogCoinId}
                  onClick={() => escolherTipo(m)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-mp-surface-muted"
                >
                  <Flag code={m.paisCodigo} size={18} />
                  <span className="flex-1 text-mp-ink">
                    {m.denominacao ?? m.titulo}
                    <span className="text-mp-ink-faint"> · {m.paisNome}</span>
                  </span>
                  {(m.anoInicio || m.anoFim) && (
                    <span className="text-xs text-mp-ink-faint">
                      {m.anoInicio}
                      {m.anoFim && m.anoFim !== m.anoInicio ? `–${m.anoFim}` : ''}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2.5 rounded-lg bg-mp-surface-muted px-3 py-2">
              <Flag code={tipo.paisCodigo} size={18} />
              <span className="flex-1 text-sm text-mp-ink">
                {tipo.denominacao ?? tipo.titulo}
                <span className="text-mp-ink-faint"> · {tipo.paisNome}</span>
              </span>
              <button onClick={() => setTipo(null)} className="text-xs text-mp-gold-strong hover:underline">mudar</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[10px] uppercase tracking-wide text-mp-ink-faint">Ano</span>
                <select value={issueId} onChange={(e) => setIssueId(e.target.value)} className={inp}>
                  {issues.map((i) => <option key={i.id} value={i.id}>{i.ano}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wide text-mp-ink-faint">Quantidade</span>
                <input type="number" min={1} value={qtd} onChange={(e) => setQtd(parseInt(e.target.value, 10) || 1)} className={inp} />
              </label>
              {fmts.length > 0 && (
                <label className="col-span-2 block">
                  <span className="text-[10px] uppercase tracking-wide text-mp-ink-faint">Formato / acabamento</span>
                  <select value={formato} onChange={(e) => setFormato(e.target.value as FormatoColecao)} className={inp}>
                    {fmts.map((f) => <option key={f} value={f}>{FORMATO_LABEL[f]}</option>)}
                  </select>
                </label>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={() => setTipo(null)} className="flex-1 rounded-lg border border-mp-border py-2.5 text-sm font-medium text-mp-ink-soft hover:bg-mp-surface-muted">
                Voltar
              </button>
              <button onClick={adicionar} disabled={saving || !issueId} className="flex-1 rounded-lg bg-mp-gold py-2.5 text-sm font-medium text-white hover:bg-mp-gold-strong disabled:opacity-50">
                {saving ? 'A adicionar…' : 'Adicionar ao estojo'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
