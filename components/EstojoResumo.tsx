'use client'

import { useMemo, useState } from 'react'
import Flag from '@/components/Flag'
import { anoNum } from '@/components/EstojoTabela'
import { eur } from '@/lib/valor'
import type { EstojoConteudoItem } from '@/lib/estojos'

type Ordem = 'valor' | 'total' | 'ano' | 'qtd'

const ORDENS: { v: Ordem; label: string }[] = [
  { v: 'valor', label: 'Valor unitário' },
  { v: 'total', label: 'Valor total' },
  { v: 'ano', label: 'Cronológica' },
  { v: 'qtd', label: 'Quantidade' },
]

interface Junta {
  chave: string
  titulo: string
  paisCodigo: string
  paisNome: string | null
  serie: string | null
  ano: string | null
  variante: string | null
  unitario: number | null
  quantidade: number
  casas: string[]
}

// Junta as moedas iguais do estojo todo (independentemente da folha) e ordena
// pelo critério escolhido — para ver o que vale mais ou percorrer por data.
export default function EstojoResumo({ itens }: { itens: EstojoConteudoItem[] }) {
  const [ordem, setOrdem] = useState<Ordem>('valor')
  const [desc, setDesc] = useState(true)

  const juntas = useMemo(() => {
    const m = new Map<string, Junta>()
    for (const i of itens) {
      const chave = `${i.issueId ?? i.titulo}|${i.formato ?? ''}`
      const j = m.get(chave)
      const casa = i.linha && i.coluna ? `F${i.folha ?? 1}·L${i.linha}·C${i.coluna}` : '—'
      if (j) {
        j.quantidade += i.quantidade
        j.casas.push(casa)
      } else {
        m.set(chave, {
          chave,
          titulo: i.denominacao ?? i.titulo,
          paisCodigo: i.paisCodigo,
          paisNome: i.paisNome,
          serie: i.serie,
          ano: i.ano,
          variante: i.variante,
          unitario: i.valorMercado,
          quantidade: i.quantidade,
          casas: [casa],
        })
      }
    }
    const sinal = desc ? -1 : 1
    return [...m.values()].sort((a, b) => {
      const cmp =
        ordem === 'ano' ? anoNum(a.ano) - anoNum(b.ano)
          : ordem === 'qtd' ? a.quantidade - b.quantidade
            : ordem === 'total' ? (a.unitario ?? 0) * a.quantidade - (b.unitario ?? 0) * b.quantidade
              : (a.unitario ?? 0) - (b.unitario ?? 0)
      return cmp * sinal || a.titulo.localeCompare(b.titulo, 'pt')
    })
  }, [itens, ordem, desc])

  const total = juntas.reduce((s, j) => s + (j.unitario ?? 0) * j.quantidade, 0)
  const exemplares = juntas.reduce((s, j) => s + j.quantidade, 0)
  const th = 'px-3 py-2.5 font-semibold whitespace-nowrap'
  const td = 'px-3 py-2 whitespace-nowrap'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-mp-border bg-mp-surface p-2">
        <span className="px-1 font-sans text-[10px] uppercase tracking-wide text-mp-ink-faint">Ordenar por</span>
        {ORDENS.map((o) => (
          <button
            key={o.v}
            onClick={() => (ordem === o.v ? setDesc(!desc) : setOrdem(o.v))}
            className={`rounded-lg px-2.5 py-1 font-sans text-xs font-semibold transition-colors ${
              ordem === o.v ? 'bg-mp-gold text-white' : 'text-mp-ink-soft hover:bg-mp-surface-muted'
            }`}
          >
            {o.label}
            {ordem === o.v && <span className="ml-1">{desc ? '↓' : '↑'}</span>}
          </button>
        ))}
        <span className="ml-auto px-1 font-sans text-xs text-mp-ink-soft">
          {juntas.length} moedas distintas · {exemplares} exemplares ·{' '}
          <b className="font-serif text-mp-gold-strong">{eur(total)}</b>
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-mp-border bg-mp-surface">
        <table className="w-full text-left font-sans text-sm">
          <thead>
            <tr className="border-b border-mp-border text-[11px] uppercase tracking-wide text-mp-ink-faint">
              <th className={th}>#</th>
              <th className={th}>Moeda</th>
              <th className={th}>Coleção / Série</th>
              <th className={th}>Ano</th>
              <th className={th}>Variante</th>
              <th className={th}>Casas</th>
              <th className={th + ' text-right'}>Qtd</th>
              <th className={th + ' text-right'}>Unitário</th>
              <th className={th + ' text-right'}>Total</th>
            </tr>
          </thead>
          <tbody>
            {juntas.map((j, idx) => (
              <tr key={j.chave} className="border-b border-mp-border last:border-0 hover:bg-mp-surface-muted">
                <td className={td + ' font-serif font-semibold text-mp-gold'}>{idx + 1}</td>
                <td className={td}>
                  <span className="flex items-center gap-2.5 text-mp-ink">
                    <Flag code={j.paisCodigo} size={18} />
                    <span>
                      {j.titulo}
                      {j.paisNome && <span className="text-mp-ink-faint"> · {j.paisNome}</span>}
                    </span>
                  </span>
                </td>
                <td className={td + ' text-mp-ink-soft'}>{j.serie ?? '—'}</td>
                <td className={td + ' text-mp-ink-soft'}>{j.ano ?? '—'}</td>
                <td className={td + ' text-mp-ink-soft'}>{j.variante ?? '—'}</td>
                <td className={td + ' text-[11px] text-mp-ink-faint'}>{j.casas.join(' · ')}</td>
                <td className={td + ' text-right font-medium text-mp-ink'}>{j.quantidade}</td>
                <td className={td + ' text-right tabular-nums text-mp-ink-soft'}>{j.unitario != null ? eur(j.unitario) : '—'}</td>
                <td className={td + ' text-right tabular-nums font-medium text-mp-gold-strong'}>
                  {j.unitario != null ? eur(j.unitario * j.quantidade) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
