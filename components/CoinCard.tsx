import type { DisplayRow } from '@/lib/types'

interface CoinCardProps {
  row: DisplayRow
  onClick: () => void
}

export default function CoinCard({ row, onClick }: CoinCardProps) {
  const tenho = !!row.item && row.item.quantidade > 0
  const qtd = row.item?.quantidade ?? 0

  return (
    <button
      onClick={onClick}
      className={
        'text-left bg-white border rounded-xl px-3 py-2.5 transition-colors hover:border-amber-400 ' +
        (tenho ? 'border-emerald-200' : 'border-gray-100')
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-900">{row.issue.ano}</span>
        <span
          className={
            'w-2.5 h-2.5 rounded-full flex-none ' +
            (tenho ? 'bg-emerald-500' : 'bg-gray-200')
          }
          aria-label={tenho ? 'Tenho' : 'Não tenho'}
        />
      </div>
      <div className="text-xs text-gray-500 mt-0.5 truncate">
        {row.coin.denominacao ?? row.coin.titulo}
      </div>
      <div className="flex items-center gap-2 mt-1.5 text-[11px]">
        {tenho && qtd > 1 && (
          <span className="bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 tabular-nums">
            ×{qtd}
          </span>
        )}
        {row.item?.grau && (
          <span className="bg-amber-50 text-amber-700 rounded px-1.5 py-0.5 font-mono">
            {row.item.grau}
          </span>
        )}
      </div>
    </button>
  )
}
