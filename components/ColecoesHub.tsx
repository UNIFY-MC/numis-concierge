'use client'

import { useEffect, useMemo, useState } from 'react'
import { getPaisesResumo } from '@/lib/catalog'
import { getTags, criarTag, apagarTag, getCoinTags, type Tag } from '@/lib/tags'
import ColecaoPortugal from './ColecaoPortugal'
import Flag from './Flag'

type Eixo = 'pais' | 'colecao'

// Hub das coleções. Dois eixos: por PAÍS (geográfico) e por COLEÇÃO nomeada
// (temática/multi-país, ex. "Euro"). Uma moeda pode estar em várias coleções.
// Ao escolher, reutiliza a vista rica (ColecaoPortugal) com a fonte respetiva.
export default function ColecoesHub() {
  const [eixo, setEixo] = useState<Eixo>('pais')
  const [paises, setPaises] = useState<{ codigo: string; nome: string; total: number }[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [contTag, setContTag] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [paisSel, setPaisSel] = useState<{ codigo: string; nome: string } | null>(null)
  const [tagSel, setTagSel] = useState<Tag | null>(null)
  const [nova, setNova] = useState('')

  useEffect(() => {
    Promise.all([getPaisesResumo(), getTags(), getCoinTags()])
      .then(([ps, tg, ctg]) => {
        setPaises(ps); setTags(tg)
        const c = new Map<string, number>()
        for (const set of ctg.values()) for (const id of set) c.set(id, (c.get(id) ?? 0) + 1)
        setContTag(c)
      })
      .finally(() => setLoading(false))
  }, [])

  async function criar() {
    const n = nova.trim()
    if (!n) return
    if (tags.some((t) => t.nome.toLowerCase() === n.toLowerCase())) { setNova(''); return }
    const t = await criarTag(n)
    setTags((p) => [...p, t].sort((a, b) => a.nome.localeCompare(b.nome, 'pt')))
    setNova('')
  }
  async function apagar(t: Tag) {
    if (!confirm(`Apagar a coleção "${t.nome}"? As moedas não são apagadas, só deixam de a integrar.`)) return
    await apagarTag(t.id)
    setTags((p) => p.filter((x) => x.id !== t.id))
    if (tagSel?.id === t.id) setTagSel(null)
  }

  const paisesComuns = useMemo(() => [...paises].sort((a, b) => b.total - a.total), [paises])

  // Vista selecionada — reutiliza ColecaoPortugal com a fonte respetiva.
  if (paisSel) {
    return (
      <div>
        <button onClick={() => setPaisSel(null)} className="ml-4 mt-3 text-sm font-semibold text-mp-gold-strong hover:underline">← todas as coleções</button>
        <ColecaoPortugal pais={paisSel.codigo} nome={paisSel.codigo === 'pt' ? undefined : paisSel.nome} />
      </div>
    )
  }
  if (tagSel) {
    return (
      <div>
        <button onClick={() => setTagSel(null)} className="ml-4 mt-3 text-sm font-semibold text-mp-gold-strong hover:underline">← todas as coleções</button>
        <ColecaoPortugal tagId={tagSel.id} nome={tagSel.nome} />
      </div>
    )
  }

  return (
    <div className="w-full px-4 py-6 lg:px-6">
      <header className="mb-5">
        <h1 className="font-serif text-2xl font-semibold">Coleções</h1>
        <p className="mt-1 text-xs text-mp-ink-soft">
          Escolhe por país (geográfico) ou por coleção nomeada — as coleções (ex. Euro) atravessam vários países e uma moeda pode estar em várias.
        </p>
      </header>

      <div className="mb-6 inline-flex gap-1 rounded-xl border border-mp-border bg-mp-surface-muted p-1">
        {([['pais', 'Por país'], ['colecao', 'Coleções nomeadas']] as [Eixo, string][]).map(([v, l]) => (
          <button key={v} onClick={() => setEixo(v)}
            className={'rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ' +
              (eixo === v ? 'bg-mp-gold text-white shadow-sm' : 'text-mp-ink-soft hover:text-mp-ink')}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-mp-ink-faint">A carregar…</div>
      ) : eixo === 'pais' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {paisesComuns.map((p) => (
            <button key={p.codigo} onClick={() => setPaisSel(p)}
              className="flex items-center gap-3 rounded-2xl border border-mp-border bg-mp-surface p-4 text-left transition-shadow hover:shadow-md">
              <Flag code={p.codigo} size={28} />
              <div className="min-w-0">
                <p className="truncate font-serif text-sm font-semibold text-mp-ink">{p.nome}</p>
                <p className="text-[11px] text-mp-ink-faint">{p.total} tipos</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <div className="mb-4 flex max-w-md gap-2">
            <input value={nova} onChange={(e) => setNova(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') criar() }}
              placeholder="Nova coleção (ex. Comemorativas 2€ PT)…"
              className="flex-1 rounded-xl border border-mp-border bg-mp-surface px-3 py-2 text-sm outline-none focus:border-mp-gold" />
            <button onClick={criar} className="rounded-xl bg-mp-gold px-4 py-2 text-sm font-semibold text-white hover:bg-mp-gold-strong">criar</button>
          </div>
          {tags.length === 0 ? (
            <p className="rounded-xl bg-mp-surface px-4 py-6 text-sm text-mp-ink-faint ring-1 ring-mp-border">
              Ainda não há coleções nomeadas. Cria uma acima e depois junta-lhe moedas na ficha de cada moeda (secção “Coleções temáticas”).
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {tags.map((t) => (
                <div key={t.id} className="group relative flex flex-col rounded-2xl border border-mp-border bg-mp-surface p-4 transition-shadow hover:shadow-md">
                  <button onClick={() => setTagSel(t)} className="flex-1 text-left">
                    <p className="truncate pr-6 font-serif text-sm font-semibold text-mp-ink">{t.nome}</p>
                    <p className="mt-2 font-serif text-2xl font-semibold text-mp-gold-strong">{contTag.get(t.id) ?? 0}</p>
                    <p className="text-[11px] text-mp-ink-faint">moedas na coleção</p>
                  </button>
                  <button onClick={() => apagar(t)} title="Apagar coleção"
                    className="absolute right-2 top-2 rounded-lg px-1.5 py-0.5 text-mp-ink-faint opacity-0 transition-opacity hover:text-mp-falta group-hover:opacity-100">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
