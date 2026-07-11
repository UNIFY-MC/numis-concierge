'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Flag from '@/components/Flag'
import EstojoQuickAdd from '@/components/EstojoQuickAdd'
import { getConteudoEstojo, getEstojo, removerDoEstojo, type EstojoConteudoItem, type Estojo } from '@/lib/estojos'

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

  async function carregar() {
    const [e, conteudo] = await Promise.all([getEstojo(id), getConteudoEstojo(id)])
    setEstojo(e)
    setItens(conteudo)
  }

  useEffect(() => {
    carregar().catch(() => setItens([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function remover(collectionId: string) {
    await removerDoEstojo(collectionId, id)
    await carregar()
  }

  const totalExemplares = (itens ?? []).reduce((s, i) => s + i.quantidade, 0)
  const proximaOrdem = (itens ?? []).reduce((m, i) => Math.max(m, i.ordem), 0) + 1

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <Link href="/estojos" className="mb-4 inline-flex items-center gap-1 font-sans text-sm text-mp-ink-soft hover:text-mp-ink">
        ← Estojos
      </Link>

      <header className="mb-5">
        <h1 className="font-serif text-3xl font-semibold text-mp-gold-strong">{estojo?.nome ?? 'Estojo'}</h1>
        <p className="mt-1 font-sans text-sm text-mp-ink-soft">
          {estojo?.localizacao && <span className="text-mp-ink">📍 {estojo.localizacao} · </span>}
          {itens && `${itens.length} moedas · ${totalExemplares} exemplares`}
        </p>
      </header>

      <EstojoQuickAdd estojoId={id} proximaOrdem={proximaOrdem} onAdded={carregar} />

      {itens === null ? (
        <p className="font-sans text-sm text-mp-ink-soft">A carregar…</p>
      ) : itens.length === 0 ? (
        <p className="rounded-2xl border border-mp-border bg-mp-surface p-6 font-sans text-sm text-mp-ink-soft">
          Este estojo ainda não tem moedas. Usa a barra acima para pesquisar e adicionar.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-mp-border bg-mp-surface">
          <table className="w-full text-left font-sans text-sm">
            <thead>
              <tr className="border-b border-mp-border text-xs uppercase tracking-wide text-mp-ink-faint">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Moeda</th>
                <th className="px-4 py-3 font-semibold">Ano</th>
                <th className="px-4 py-3 font-semibold">Formato</th>
                <th className="px-4 py-3 text-right font-semibold">Qtd</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i, idx) => (
                <tr key={i.alocacaoId} className="border-b border-mp-border last:border-0 hover:bg-mp-surface-muted">
                  <td className="px-4 py-3 font-serif font-semibold text-mp-gold">{i.ordem || idx + 1}</td>
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
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => remover(i.collectionId)}
                      title="Retirar deste estojo"
                      className="rounded-lg px-2 py-1 text-xs text-mp-falta hover:bg-mp-falta-bg"
                    >
                      Retirar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
