interface StatsBarProps {
  total: number
  tenho: number
}

export default function StatsBar({ total, tenho }: StatsBarProps) {
  const pct = total > 0 ? Math.round((tenho / total) * 100) : 0
  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      <div className="bg-mp-surface border border-mp-border rounded-xl px-4 py-3">
        <div className="text-[11px] uppercase tracking-wide text-mp-ink-faint">Total</div>
        <div className="text-2xl font-serif font-semibold mt-1 tabular-nums">{total}</div>
      </div>
      <div className="bg-mp-surface border border-mp-border rounded-xl px-4 py-3">
        <div className="text-[11px] uppercase tracking-wide text-mp-ink-faint">Tenho</div>
        <div className="text-2xl font-serif font-semibold mt-1 tabular-nums text-mp-set">{tenho}</div>
      </div>
      <div className="bg-mp-surface border border-mp-border rounded-xl px-4 py-3">
        <div className="text-[11px] uppercase tracking-wide text-mp-ink-faint">Completo</div>
        <div className="text-2xl font-serif font-semibold mt-1 tabular-nums text-mp-gold-strong">{pct}%</div>
      </div>
    </div>
  )
}
