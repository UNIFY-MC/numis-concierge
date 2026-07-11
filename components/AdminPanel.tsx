import Link from 'next/link'
import type { Collector, PlatformStats } from '@/lib/admin'

function fmtInt(n: number) {
  return n.toLocaleString('pt-PT')
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

const PLANO_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', business: 'Business' }

export default function AdminPanel({
  stats,
  collectors,
}: {
  stats: PlatformStats
  collectors: Collector[]
}) {
  const cards = [
    { label: 'Colecionadores', valor: stats.colecionadores },
    { label: 'Moedas (todas as colecções)', valor: stats.moedasTotais },
    { label: 'Tipos no catálogo', valor: stats.tiposCatalogo },
    { label: 'Variantes no catálogo', valor: stats.variantesCatalogo },
  ]

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-mp-gold-strong">Administração</h1>
        <p className="mt-1 font-sans text-sm text-mp-ink-soft">
          Visão global da plataforma. Vês todos os colecionadores e as suas colecções.
        </p>
      </header>

      <section className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-mp-border bg-mp-surface p-5">
            <p className="font-serif text-3xl font-semibold text-mp-gold">{fmtInt(c.valor)}</p>
            <p className="mt-1 font-sans text-xs text-mp-ink-soft">{c.label}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 font-sans text-sm font-semibold uppercase tracking-wide text-mp-ink-faint">
          Colecionadores
        </h2>
        <div className="overflow-hidden rounded-2xl border border-mp-border bg-mp-surface">
          <table className="w-full text-left font-sans text-sm">
            <thead>
              <tr className="border-b border-mp-border text-xs uppercase tracking-wide text-mp-ink-faint">
                <th className="px-4 py-3 font-semibold">Colecionador</th>
                <th className="px-4 py-3 font-semibold">Plano</th>
                <th className="px-4 py-3 text-right font-semibold">Moedas</th>
                <th className="px-4 py-3 text-right font-semibold">Países</th>
                <th className="px-4 py-3 font-semibold">Membro desde</th>
              </tr>
            </thead>
            <tbody>
              {collectors.map((c) => (
                <tr key={c.id} className="border-b border-mp-border last:border-0 hover:bg-mp-surface-muted">
                  <td className="px-4 py-3">
                    <Link href={`/admin/utilizador/${c.id}`} className="flex flex-col">
                      <span className="font-medium text-mp-ink">
                        {c.nome ?? c.username ?? 'Sem nome'}
                        {c.isAdmin && (
                          <span className="ml-2 rounded-full bg-mp-primary-soft px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-mp-primary-strong">
                            admin
                          </span>
                        )}
                      </span>
                      {c.username && <span className="text-xs text-mp-ink-faint">@{c.username}</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-mp-ink-soft">{PLANO_LABEL[c.plano] ?? c.plano}</td>
                  <td className="px-4 py-3 text-right font-medium text-mp-ink">{fmtInt(c.moedas)}</td>
                  <td className="px-4 py-3 text-right text-mp-ink-soft">{fmtInt(c.paises)}</td>
                  <td className="px-4 py-3 text-mp-ink-soft">{fmtData(c.criadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
