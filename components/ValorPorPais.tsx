import { flagOf } from '@/lib/flags'
import { eur } from '@/lib/valor'
import type { PaisAgregado } from '@/lib/types'

interface ValorPorPaisProps {
  paises: PaisAgregado[]
  totalGeral: number
}

export default function ValorPorPais({ paises, totalGeral }: ValorPorPaisProps) {
  const ordenados = [...paises]
    .map((p) => ({ ...p, valor: p.valorSet + p.valorCad }))
    .sort((a, b) => b.valor - a.valor)
  const max = ordenados.length > 0 ? ordenados[0].valor : 1

  return (
    <div className="bg-mp-surface border border-mp-border rounded-2xl p-5">
      <h2 className="font-serif text-lg font-semibold mb-2">Valor de mercado por emissor</h2>
      <p className="text-xs text-mp-ink-soft bg-mp-surface-muted rounded-lg px-3 py-2 mb-4">
        Total estimado da coleção: <b className="text-mp-gold-strong">{eur(totalGeral)}</b>. Cada barra mostra{' '}
        <span className="text-mp-set">set</span> + <span className="text-mp-caderneta">caderneta</span>.
        Valor = base (editável) × estado de conservação (por defeito Standard ×1.00).
      </p>

      <div className="space-y-1.5">
        {ordenados.map((p) => {
          const setPct = max > 0 ? (p.valorSet / max) * 100 : 0
          const cadPct = max > 0 ? (p.valorCad / max) * 100 : 0
          return (
            <div key={p.codigo} className="flex items-center gap-2 text-xs">
              <span className="w-5 flex-none text-center">{flagOf(p.codigo)}</span>
              <span className="w-20 flex-none truncate text-mp-ink-soft">{p.nome}</span>
              <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="flex-1 h-2" aria-hidden>
                <rect x="0" y="0" width="100" height="8" rx="4" fill="var(--mp-coin-empty)" />
                <rect x="0" y="0" width={setPct} height="8" fill="var(--mp-set)" />
                <rect x={setPct} y="0" width={cadPct} height="8" fill="var(--mp-caderneta)" />
              </svg>
              <span className="w-20 flex-none text-right font-serif text-mp-gold-strong">{eur(p.valor)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
