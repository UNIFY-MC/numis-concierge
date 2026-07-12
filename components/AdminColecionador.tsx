import Link from 'next/link'
import Flag from '@/components/Flag'
import type { PaisResumo } from '@/lib/admin'

function fmtInt(n: number) {
  return n.toLocaleString('pt-PT')
}

export default function AdminColecionador({
  nome,
  paises,
}: {
  nome: string
  paises: PaisResumo[]
}) {
  const totalMoedas = paises.reduce((s, p) => s + p.moedas, 0)
  const totalExemplares = paises.reduce((s, p) => s + p.exemplares, 0)

  return (
    <div className="w-full px-4 lg:px-6 py-8">
      <Link href="/admin" className="mb-4 inline-flex items-center gap-1 font-sans text-sm text-mp-ink-soft hover:text-mp-ink">
        ← Administração
      </Link>

      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-mp-gold-strong">{nome}</h1>
        <p className="mt-1 font-sans text-sm text-mp-ink-soft">
          {fmtInt(totalMoedas)} moedas · {fmtInt(totalExemplares)} exemplares · {paises.length} países
        </p>
      </header>

      {paises.length === 0 ? (
        <p className="rounded-2xl border border-mp-border bg-mp-surface p-6 font-sans text-sm text-mp-ink-soft">
          Este colecionador ainda não tem moedas.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-mp-border bg-mp-surface">
          <table className="w-full text-left font-sans text-sm">
            <thead>
              <tr className="border-b border-mp-border text-xs uppercase tracking-wide text-mp-ink-faint">
                <th className="px-4 py-3 font-semibold">País</th>
                <th className="px-4 py-3 text-right font-semibold">Moedas</th>
                <th className="px-4 py-3 text-right font-semibold">Exemplares</th>
              </tr>
            </thead>
            <tbody>
              {paises.map((p) => (
                <tr key={p.paisCodigo} className="border-b border-mp-border last:border-0 hover:bg-mp-surface-muted">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5 text-mp-ink">
                      <Flag code={p.paisCodigo} />
                      {p.paisNome}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-mp-ink">{fmtInt(p.moedas)}</td>
                  <td className="px-4 py-3 text-right text-mp-ink-soft">{fmtInt(p.exemplares)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
