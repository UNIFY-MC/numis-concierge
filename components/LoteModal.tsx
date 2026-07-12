'use client'

import { useEffect, useState } from 'react'
import { getCoinIdsByFiltro, type FiltroLote } from '@/lib/catalog'
import { adicionarTagEmLote, removerTagEmLote, type Tag } from '@/lib/tags'

const FAMILIAS: [string, string][] = [
  ['', 'Todas as famílias'],
  ['euro_circulacao', 'Euro · circulação'],
  ['euro_comemorativa', 'Euro · comemorativa 2€'],
  ['euro_colecao', 'Euro · coleção (>2€)'],
  ['historico', 'Histórico (pré-euro)'],
]

// Atribuição em lote de moedas a uma coleção, por categoria/filtro.
export default function LoteModal({ tag, paises, onClose, onDone }: {
  tag: Tag
  paises: { codigo: string; nome: string }[]
  onClose: () => void
  onDone: () => void
}) {
  const [pais, setPais] = useState('')
  const [familia, setFamilia] = useState('')
  const [valor, setValor] = useState('')
  const [comem, setComem] = useState('')
  const [ids, setIds] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const filtro: FiltroLote = {
    pais: pais || undefined,
    familia: familia || undefined,
    valorFacial: valor.trim() ? Number(valor.replace(',', '.')) : undefined,
    comemorativa: comem === '' ? undefined : comem === 'sim',
  }

  useEffect(() => {
    let alive = true
    setIds(null)
    const t = setTimeout(() => {
      getCoinIdsByFiltro(filtro).then((r) => { if (alive) setIds(r) }).catch(() => { if (alive) setIds([]) })
    }, 250)
    return () => { alive = false; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pais, familia, valor, comem])

  async function aplicar(add: boolean) {
    if (!ids || ids.length === 0) return
    setBusy(true); setMsg(null)
    try {
      const n = add ? await adicionarTagEmLote(tag.id, ids) : await removerTagEmLote(tag.id, ids)
      setMsg(add
        ? `${n} adicionadas a “${tag.nome}”${n < ids.length ? ` (${ids.length - n} já lá estavam)` : ''}.`
        : `${n} removidas de “${tag.nome}”.`)
      onDone()
    } catch { setMsg('Erro ao aplicar. Tenta de novo.') }
    finally { setBusy(false) }
  }

  const semFiltro = !pais && !familia && !valor.trim() && comem === ''

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-mp-border bg-mp-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold">Adicionar moedas em lote · <span className="text-mp-gold-strong">{tag.nome}</span></h3>
          <button onClick={onClose} className="text-mp-ink-faint hover:text-mp-ink">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-mp-ink-soft">País</span>
            <select value={pais} onChange={(e) => setPais(e.target.value)} className="w-full rounded-lg border border-mp-border bg-mp-surface px-2 py-1.5 text-sm outline-none focus:border-mp-gold">
              <option value="">Todos</option>
              {paises.map((p) => <option key={p.codigo} value={p.codigo}>{p.nome}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-mp-ink-soft">Família</span>
            <select value={familia} onChange={(e) => setFamilia(e.target.value)} className="w-full rounded-lg border border-mp-border bg-mp-surface px-2 py-1.5 text-sm outline-none focus:border-mp-gold">
              {FAMILIAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-mp-ink-soft">Valor facial (€, opcional)</span>
            <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="ex. 2"
              className="w-full rounded-lg border border-mp-border bg-mp-surface px-2 py-1.5 text-sm outline-none focus:border-mp-gold" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-mp-ink-soft">Comemorativa</span>
            <select value={comem} onChange={(e) => setComem(e.target.value)} className="w-full rounded-lg border border-mp-border bg-mp-surface px-2 py-1.5 text-sm outline-none focus:border-mp-gold">
              <option value="">Indiferente</option>
              <option value="sim">Só comemorativas</option>
              <option value="nao">Só não-comemorativas</option>
            </select>
          </label>
        </div>

        <div className="mt-4 rounded-xl bg-mp-surface-muted px-4 py-3 text-sm">
          {semFiltro ? <span className="text-mp-ink-faint">Escolhe pelo menos um filtro para evitar juntar o catálogo inteiro.</span>
            : ids === null ? <span className="text-mp-ink-faint">A contar…</span>
            : <span><b className="text-mp-gold-strong">{ids.length}</b> moedas correspondem ao filtro.</span>}
        </div>

        {msg && <p className="mt-3 text-sm text-mp-ink-soft">{msg}</p>}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={() => aplicar(false)} disabled={busy || semFiltro || !ids?.length}
            className="rounded-xl border border-mp-border px-3.5 py-2 text-sm font-medium text-mp-ink-soft hover:bg-mp-surface-muted disabled:opacity-40">
            Remover da coleção
          </button>
          <button onClick={() => aplicar(true)} disabled={busy || semFiltro || !ids?.length}
            className="rounded-xl bg-mp-gold px-4 py-2 text-sm font-semibold text-white hover:bg-mp-gold-strong disabled:opacity-40">
            {busy ? 'A aplicar…' : `Adicionar ${ids?.length ? ids.length + ' moedas' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
