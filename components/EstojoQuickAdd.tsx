'use client'

import { useEffect, useRef, useState } from 'react'
import Flag from '@/components/Flag'
import {
  getPaisesCatalogo,
  buscarMoedasDoPais,
  adicionarMoedaAoEstojo,
  type MoedaCatalogo,
  type PaisCatalogo,
} from '@/lib/estojos'
import { getIssuesForCoin } from '@/lib/catalog'
import { formatosDe } from '@/lib/types'
import type { CatalogIssue, FormatoColecao } from '@/lib/types'

const cel = 'h-9 rounded-lg border border-mp-border bg-mp-surface px-2 text-sm text-mp-ink outline-none focus:border-mp-gold'

// Barra de entrada em linha: país (fixo) → moeda (filtrada) → ano → qtd → adicionar.
// Fica sempre aberta para meter muitas moedas depressa; o país mantém-se entre adições.
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
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<MoedaCatalogo[]>([])
  const [aberto, setAberto] = useState(false)
  const [tipo, setTipo] = useState<MoedaCatalogo | null>(null)
  const [issues, setIssues] = useState<CatalogIssue[]>([])
  const [issueId, setIssueId] = useState('')
  const [formato, setFormato] = useState<FormatoColecao | ''>('')
  const [qtd, setQtd] = useState(1)
  const [saving, setSaving] = useState(false)
  const moedaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getPaisesCatalogo().then(setPaises).catch(() => setPaises([]))
  }, [])

  useEffect(() => {
    if (!paisSel || tipo) { setResultados([]); return }
    let alive = true
    const id = setTimeout(() => {
      buscarMoedasDoPais(paisSel, termo).then((r) => alive && setResultados(r)).catch(() => alive && setResultados([]))
    }, 180)
    return () => { alive = false; clearTimeout(id) }
  }, [paisSel, termo, tipo])

  async function escolher(m: MoedaCatalogo) {
    setTipo(m)
    setTermo(m.denominacao ?? m.titulo)
    setAberto(false)
    const its = await getIssuesForCoin(m.catalogCoinId)
    setIssues(its)
    setIssueId(its[its.length - 1]?.id ?? its[0]?.id ?? '')
    setFormato(formatosDe(m.familia)[0] ?? '')
  }

  function limparMoeda() {
    setTipo(null)
    setTermo('')
    setIssues([])
    setIssueId('')
    moedaRef.current?.focus()
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
      setQtd(1)
      limparMoeda() // mantém o país, pronto para a próxima moeda
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-mp-border bg-mp-surface-muted/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-mp-gold font-serif text-sm font-semibold text-white" title="Nº de ordem no estojo">
          {proximaOrdem}
        </span>

        <select
          value={paisSel}
          onChange={(e) => { setPaisSel(e.target.value); limparMoeda() }}
          className={cel + ' w-40'}
        >
          <option value="">País…</option>
          {paises.map((p) => <option key={p.codigo} value={p.codigo}>{p.nome} ({p.total})</option>)}
        </select>

        <div className="relative min-w-[220px] flex-1">
          <input
            ref={moedaRef}
            value={termo}
            disabled={!paisSel}
            onChange={(e) => { setTermo(e.target.value); setTipo(null); setAberto(true) }}
            onFocus={() => { if (!tipo) setAberto(true) }}
            placeholder={paisSel ? 'Moeda (ex.: 2 euro, escudo)…' : 'Escolhe o país primeiro'}
            className={cel + ' w-full disabled:opacity-50'}
          />
          {aberto && !tipo && resultados.length > 0 && (
            <div className="absolute left-0 top-full z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-mp-border bg-mp-surface p-1 shadow-lg">
              {resultados.map((m) => (
                <button
                  key={m.catalogCoinId}
                  onClick={() => escolher(m)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-mp-surface-muted"
                >
                  <Flag code={m.paisCodigo} size={16} />
                  <span className="flex-1 truncate text-mp-ink">{m.denominacao ?? m.titulo}</span>
                  {(m.anoInicio || m.anoFim) && (
                    <span className="shrink-0 text-xs text-mp-ink-faint">{m.anoInicio}{m.anoFim && m.anoFim !== m.anoInicio ? `–${m.anoFim}` : ''}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <select value={issueId} onChange={(e) => setIssueId(e.target.value)} disabled={!tipo} className={cel + ' w-24 disabled:opacity-50'}>
          {issues.length === 0 ? <option value="">Ano</option> : issues.map((i) => <option key={i.id} value={i.id}>{i.ano}</option>)}
        </select>

        <input
          type="number"
          min={1}
          value={qtd}
          onChange={(e) => setQtd(parseInt(e.target.value, 10) || 1)}
          title="Quantidade"
          className={cel + ' w-16 text-center'}
        />

        <button
          onClick={adicionar}
          disabled={saving || !tipo || !issueId}
          className="h-9 rounded-lg bg-mp-gold px-4 text-sm font-semibold text-white hover:bg-mp-gold-strong disabled:opacity-40"
        >
          {saving ? '…' : 'Adicionar'}
        </button>
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-mp-ink-faint">
        Escolhe o país uma vez e vai adicionando moeda a moeda — cada uma fica com o nº de ordem no estojo.
      </p>
    </div>
  )
}
