'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Flag from '@/components/Flag'
import { getConteudoEstojo, getEstojos, type EstojoConteudoItem, type Estojo } from '@/lib/estojos'

const FORMATO_CURTO: Record<string, string> = {
  bnc: 'BNC',
  proof: 'Proof',
  normal: 'Normal',
  carteira_fdc: 'Carteira FDC',
  carteira_bebe: 'Carteira bebé',
}

export default function EstojoDetalhe({ id }: { id: string }) {
  const [estojo, setEstojo] = useState<Estojo | null>(null)
  const [itens, setItens] = useState<EstojoConteudoItem[] | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([getEstojos(), getConteudoEstojo(id)])
      .then(([estojos, conteudo]) => {
        if (!alive) return
        setEstojo(estojos.find((e) => e.id === id) ?? null)
        setItens(conteudo)
      })
      .catch(() => alive && setItens([]))
    return () => {
      alive = false
    }
  }, [id])

  const totalExemplares = (itens ?? []).reduce((s, i) => s + i.quantidade, 0)

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <Link href="/estojos" className="mb-4 inline-flex items-center gap-1 font-sans text-sm text-mp-ink-soft hover:text-mp-ink">
        ← Estojos
      </Link>

      <header className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-mp-gold-strong">{estojo?.nome ?? 'Estojo'}</h1>
        {itens && (
          <p className="mt-1 font-sans text-sm text-mp-ink-soft">
            {itens.length} moedas · {totalExemplares} exemplares
          </p>
        )}
      </header>

      {itens === null ? (
        <p className="font-sans text-sm text-mp-ink-soft">A carregar…</p>
      ) : itens.length === 0 ? (
        <p className="rounded-2xl border border-mp-border bg-mp-surface p-6 font-sans text-sm text-mp-ink-soft">
          Este estojo ainda não tem moedas.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-mp-border bg-mp-surface">
          <table className="w-full text-left font-sans text-sm">
            <thead>
              <tr className="border-b border-mp-border text-xs uppercase tracking-wide text-mp-ink-faint">
                <th className="px-4 py-3 font-semibold">Moeda</th>
                <th className="px-4 py-3 font-semibold">Ano</th>
                <th className="px-4 py-3 font-semibold">Formato</th>
                <th className="px-4 py-3 text-right font-semibold">Qtd</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr key={i.collectionId} className="border-b border-mp-border last:border-0 hover:bg-mp-surface-muted">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5 text-mp-ink">
                      <Flag code={i.paisCodigo} size={18} />
                      <span>
                        {i.denominacao ?? i.titulo}
                        {i.paisNome && <span className="text-mp-ink-faint"> · {i.paisNome}</span>}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-mp-ink-soft">{i.ano ?? '—'}</td>
                  <td className="px-4 py-3 text-mp-ink-soft">{i.formato ? FORMATO_CURTO[i.formato] ?? i.formato : '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-mp-ink">{i.quantidade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
