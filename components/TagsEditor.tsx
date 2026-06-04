'use client'

import { useEffect, useRef, useState } from 'react'
import {
  getTags, criarTag, getTagsDeCoin, adicionarTagACoin, removerTagDeCoin, type Tag,
} from '@/lib/tags'

// Editor das coleções temáticas (tags) de uma moeda. Uma moeda pode pertencer a
// várias coleções ("Descobrimentos", "Prata"…) sem ser duplicada.
export default function TagsEditor({ catalogCoinId }: { catalogCoinId: string }) {
  const [todas, setTodas] = useState<Tag[]>([])
  const [minhas, setMinhas] = useState<Set<string>>(new Set())
  const [aberto, setAberto] = useState(false)
  const [nova, setNova] = useState('')
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([getTags(), getTagsDeCoin(catalogCoinId)])
      .then(([t, ids]) => { setTodas(t); setMinhas(new Set(ids)) })
      .catch(() => {})
  }, [catalogCoinId])

  useEffect(() => {
    function fora(e: MouseEvent) { if (box.current && !box.current.contains(e.target as Node)) setAberto(false) }
    if (aberto) document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  async function toggle(t: Tag) {
    if (minhas.has(t.id)) {
      setMinhas((s) => { const n = new Set(s); n.delete(t.id); return n })
      await removerTagDeCoin(catalogCoinId, t.id)
    } else {
      setMinhas((s) => new Set(s).add(t.id))
      await adicionarTagACoin(catalogCoinId, t.id)
    }
  }
  async function criar() {
    const nome = nova.trim()
    if (!nome) return
    const existe = todas.find((t) => t.nome.toLowerCase() === nome.toLowerCase())
    const t = existe ?? await criarTag(nome)
    if (!existe) setTodas((p) => [...p, t].sort((a, b) => a.nome.localeCompare(b.nome, 'pt')))
    setMinhas((s) => new Set(s).add(t.id))
    await adicionarTagACoin(catalogCoinId, t.id)
    setNova('')
  }

  const minhasTags = todas.filter((t) => minhas.has(t.id))

  return (
    <div className="relative" ref={box}>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-mp-ink-faint">Coleções temáticas</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {minhasTags.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-1 rounded-full bg-mp-primary-soft px-2 py-0.5 text-xs font-semibold text-mp-primary-strong">
            {t.nome}
            <button onClick={() => toggle(t)} className="text-mp-primary-strong/70 hover:text-mp-primary-strong" aria-label="Remover">×</button>
          </span>
        ))}
        <button onClick={() => setAberto((v) => !v)}
          className="rounded-full border border-dashed border-mp-border px-2 py-0.5 text-xs text-mp-ink-soft hover:border-mp-gold hover:text-mp-gold-strong">
          + coleção
        </button>
      </div>

      {aberto && (
        <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-2xl border border-mp-border bg-mp-surface p-2 shadow-lg">
          <div className="max-h-44 space-y-0.5 overflow-auto">
            {todas.length === 0 && <p className="px-1 py-2 text-xs text-mp-ink-faint">Ainda não há coleções temáticas.</p>}
            {todas.map((t) => (
              <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-mp-surface-muted">
                <input type="checkbox" checked={minhas.has(t.id)} onChange={() => toggle(t)} className="accent-mp-primary" />
                <span>{t.nome}</span>
              </label>
            ))}
          </div>
          <div className="mt-1 flex gap-1 border-t border-mp-border pt-2">
            <input value={nova} onChange={(e) => setNova(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') criar() }}
              placeholder="Nova coleção…"
              className="flex-1 rounded-lg border border-mp-border bg-mp-surface px-2 py-1 text-sm outline-none focus:border-mp-gold" />
            <button onClick={criar} className="rounded-lg bg-mp-gold px-2.5 py-1 text-xs font-semibold text-white">criar</button>
          </div>
        </div>
      )}
    </div>
  )
}
