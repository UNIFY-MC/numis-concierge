import type { DisplayRow } from '@/lib/types'

interface CoinCardProps {
  row: DisplayRow
  onClick: () => void
}

export default function CoinCard({ row, onClick }: CoinCardProps) {
  const tenho = !!row.item && row.item.quantidade > 0
  const caderneta = tenho && row.item?.formato_posse === 'caderneta'
  const qtd = row.item?.quantidade ?? 0

  const dotColor = !tenho
    ? 'bg-mp-coin-empty'
    : caderneta
      ? 'bg-mp-caderneta'
      : 'bg-mp-set'
  const borda = !tenho
    ? 'border-mp-border'
    : caderneta
      ? 'border-mp-caderneta-bg'
      : 'border-mp-set-bg'

  return (
    <button
      onClick={onClick}
      className={
        'text-left bg-mp-surface border rounded-xl px-3 py-2.5 transition-colors hover:border-mp-gold ' + borda
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-mp-ink">{row.issue.ano}</span>
        <span className={'w-2.5 h-2.5 rounded-full flex-none ' + dotColor} aria-hidden />
      </div>
      <div className="text-xs text-mp-ink-soft mt-0.5 truncate">
        {row.coin.denominacao ?? row.coin.titulo}
      </div>
      <div className="flex items-center gap-2 mt-1.5 text-[11px]">
        {tenho && qtd > 1 && (
          <span className="bg-mp-surface-muted text-mp-ink-soft rounded px-1.5 py-0.5 tabular-nums">
            ×{qtd}
          </span>
        )}
        {row.item?.grau && (
          <span className="bg-mp-falta-bg text-mp-gold-strong rounded px-1.5 py-0.5 font-mono">
            {row.item.grau}
          </span>
        )}
      </div>
    </button>
  )
}
