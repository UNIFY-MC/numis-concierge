'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Flag from '@/components/Flag'
import EstojoQuickAdd from '@/components/EstojoQuickAdd'
import { eur } from '@/lib/valor'
import { getConteudoEstojo, getEstojo, removerDoEstojo, type EstojoConteudoItem, type Estojo } from '@/lib/estojos'

const FORMATO_CURTO: Record<string, string> = {
  bnc: 'BNC',
  proof: 'Proof',
  normal: 'Normal',
  carteira_fdc: 'Carteira FDC',
  carteira_bebe: 'Carteira bebé',
}
const METAIS_PT: Record<string, string> = {
  gold: 'Ouro', silver: 'Prata', copper: 'Cobre', bronze: 'Bronze', brass: 'Latão',
  nickel: 'Níquel', bimetallic: 'Bimetálica', 'copper-nickel': 'Cuproníquel', cupronickel: 'Cuproníquel',
  steel: 'Aço', billon: 'Bolhão', tin: 'Estanho', zinc: 'Zinco',
}
const metalPt = (m: string | null) => (m ? METAIS_PT[m.toLowerCase()] ?? m : '—')

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
  const totalMercado = (itens ?? []).reduce((s, i) => s + (i.valorMercado ?? 0) * i.quantidade, 0)
  const proximaOrdem = (itens ?? []).reduce((m, i) => Math.max(m, i.ordem), 0) + 1

  const th = 'px-3 py-2.5 font-semibold whitespace-nowrap'
  const td = 'px-3 py-2 whitespace-nowrap'

  return (
    <div className="w-full px-6 py-8">
      <Link href="/estojos" className="mb-4 inline-flex items-center gap-1 font-sans text-sm text-mp-ink-soft hover:text-mp-ink">
        ← Estojos
      </Link>

      <header className="mb-5">
        <h1 className="font-serif text-3xl font-semibold text-mp-gold-strong">{estojo?.nome ?? 'Estojo'}</h1>
        <p className="mt-1 font-sans text-sm text-mp-ink-soft">
          {estojo?.localizacao && <span className="text-mp-ink">📍 {estojo.localizacao} · </span>}
          {itens && `${itens.length} moedas · ${totalExemplares} exemplares`}
          {totalMercado > 0 && <span> · <b className="font-serif text-mp-gold-strong">{eur(totalMercado)}</b> mercado</span>}
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
        <div className="overflow-x-auto rounded-2xl border border-mp-border bg-mp-surface">
          <table className="w-full text-left font-sans text-sm">
            <thead>
              <tr className="border-b border-mp-border text-[11px] uppercase tracking-wide text-mp-ink-faint">
                <th className={th}>#</th>
                <th className={th}>Moeda</th>
                <th className={th}>Coleção / Série</th>
                <th className={th}>Ano</th>
                <th className={th}>Variante</th>
                <th className={th}>Estado</th>
                <th className={th}>Grau</th>
                <th className={th}>Metal</th>
                <th className={th + ' text-right'}>Valor mercado</th>
                <th className={th + ' text-right'}>Qtd</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i, idx) => (
                <tr key={i.alocacaoId} className="border-b border-mp-border last:border-0 hover:bg-mp-surface-muted">
                  <td className={td + ' font-serif font-semibold text-mp-gold'}>{i.ordem || idx + 1}</td>
                  <td className={td}>
                    <span className="flex items-center gap-2.5 text-mp-ink">
                      <Flag code={i.paisCodigo} size={18} />
                      <span>
                        {i.denominacao ?? i.titulo}
                        {i.paisNome && <span className="text-mp-ink-faint"> · {i.paisNome}</span>}
                      </span>
                    </span>
                  </td>
                  <td className={td + ' text-mp-ink-soft'}>{i.serie ?? '—'}</td>
                  <td className={td + ' text-mp-ink-soft'}>{i.ano ?? '—'}</td>
                  <td className={td + ' text-mp-ink-soft'}>{i.variante ?? '—'}</td>
                  <td className={td + ' text-mp-ink-soft'}>{i.formato ? FORMATO_CURTO[i.formato] ?? i.formato : '—'}</td>
                  <td className={td + ' text-mp-ink-soft'}>{i.grau ?? '—'}</td>
                  <td className={td + ' text-mp-ink-soft'}>{metalPt(i.metal)}</td>
                  <td className={td + ' text-right tabular-nums text-mp-gold-strong'}>{i.valorMercado != null ? eur(i.valorMercado * i.quantidade) : '—'}</td>
                  <td className={td + ' text-right font-medium text-mp-ink'}>{i.quantidade}</td>
                  <td className={td + ' text-right'}>
                    <button onClick={() => remover(i.collectionId)} title="Retirar deste estojo" className="rounded-lg px-2 py-1 text-xs text-mp-falta hover:bg-mp-falta-bg">
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
