import { denomCurta } from '@/lib/types'
import { eur } from '@/lib/valor'
import type { DisplayRow } from '@/lib/types'
import Flag from './Flag'

export interface GrupoFalta {
  codigo: string
  nome: string
  faltam: DisplayRow[]
}

function tipoLabel(coin: DisplayRow['coin']): string {
  return coin.comemorativa ? 'Comemorativa' : (coin.tipo_emissao ?? 'Circulação')
}

function ordenar(rows: DisplayRow[]): DisplayRow[] {
  return [...rows].sort((a, b) => {
    // 1.º por ano (gregoriano), 2.º por valor facial da moeda
    const ya = a.issue.ano_gregoriano ?? (parseInt(a.issue.ano, 10) || 0)
    const yb = b.issue.ano_gregoriano ?? (parseInt(b.issue.ano, 10) || 0)
    if (ya !== yb) return ya - yb
    const va = a.coin.valor_facial ?? 0
    const vb = b.coin.valor_facial ?? 0
    if (va !== vb) return va - vb
    return a.issue.ano.localeCompare(b.issue.ano)
  })
}

export default function PrintFalta({ grupos }: { grupos: GrupoFalta[] }) {
  const hoje = new Date().toLocaleDateString('pt-PT')
  return (
    <div className="hidden print:block text-mp-ink">
      {grupos.map((g, i) => {
        const lista = ordenar(g.faltam)
        const totalFacial = lista.reduce((s, r) => s + (r.coin.valor_facial ?? 0), 0)
        return (
          <section key={g.codigo} className={i > 0 ? 'break-before-page pt-8' : ''}>
            <div className="flex items-center gap-3 mb-1">
              <Flag code={g.codigo.split('-')[0]} size={30} />
              <h1 className="font-serif text-2xl font-semibold leading-tight">
                Moedas em falta — {g.nome}
              </h1>
            </div>
            <p className="text-sm text-mp-ink-soft mb-3">
              {lista.length} moeda(s) por adquirir · valor facial total {eur(totalFacial)} · gerado em {hoje}
            </p>
            <div className="border-t-2 border-mp-gold mb-1" />

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-mp-ink-faint text-left">
                  <th className="w-7" />
                  <th className="py-2 font-semibold">Ano</th>
                  <th className="py-2 font-semibold">Moeda</th>
                  <th className="py-2 font-semibold">Tipo</th>
                  <th className="py-2 font-semibold text-right">Valor facial</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => (
                  <tr key={r.issue.id} className="border-t border-mp-border/70">
                    <td className="py-1.5">
                      <span className="inline-block w-3.5 h-3.5 border border-mp-ink-faint rounded-[3px] align-middle" />
                    </td>
                    <td className="py-1.5">{r.issue.ano}</td>
                    <td className="py-1.5 font-semibold">
                      {denomCurta(r.coin.valor_facial, r.coin.denominacao)}
                    </td>
                    <td className="py-1.5 text-mp-ink-soft">{tipoLabel(r.coin)}</td>
                    <td className="py-1.5 text-right">{eur(r.coin.valor_facial ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="text-[11px] text-mp-ink-faint text-right mt-3">
              Moedas do Pinto · lista de aquisições
            </p>
          </section>
        )
      })}
    </div>
  )
}
