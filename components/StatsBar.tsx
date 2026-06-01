interface StatsBarProps {
  total: number
  tenho: number
}

export default function StatsBar({ total, tenho }: StatsBarProps) {
  const pct = total > 0 ? Math.round((tenho / total) * 100) : 0
  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
        <div className="text-[11px] uppercase tracking-wide text-gray-400">Total</div>
        <div className="text-2xl font-semibold mt-1 tabular-nums">{total}</div>
      </div>
      <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
        <div className="text-[11px] uppercase tracking-wide text-gray-400">Tenho</div>
        <div className="text-2xl font-semibold mt-1 tabular-nums text-emerald-600">{tenho}</div>
      </div>
      <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
        <div className="text-[11px] uppercase tracking-wide text-gray-400">Completo</div>
        <div className="text-2xl font-semibold mt-1 tabular-nums text-amber-600">{pct}%</div>
      </div>
    </div>
  )
}
