import { useState } from 'react'
import { flagOf } from '@/lib/flags'
import type { DisplayRow } from '@/lib/types'
import CoinCard from './CoinCard'

interface PaisGroupProps {
  paisCodigo: string
  paisNome: string
  rows: DisplayRow[]
  totalNoPais: number
  tenhoNoPais: number
  onSelect: (row: DisplayRow) => void
}

export default function PaisGroup({
  paisCodigo, paisNome, rows, totalNoPais, tenhoNoPais, onSelect,
}: PaisGroupProps) {
  const [aberto, setAberto] = useState(false)
  const pct = totalNoPais > 0 ? Math.round((tenhoNoPais / totalNoPais) * 100) : 0

  if (rows.length === 0) return null

  return (
    <div className="border border-mp-border rounded-2xl overflow-hidden bg-mp-surface">
      <button
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-mp-surface-muted"
      >
        <span className="text-xl flex-none">{flagOf(paisCodigo)}</span>
        <span className="flex-1 text-left">
          <span className="font-serif font-semibold text-mp-ink">{paisNome}</span>
          <span className="block text-xs text-mp-ink-faint">
            {tenhoNoPais} de {totalNoPais} · {pct}%
          </span>
        </span>
        <progress
          value={pct}
          max={100}
          className="w-24 h-1.5 flex-none appearance-none overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-mp-surface-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-mp-gold [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-mp-gold"
        />
        <span className={'text-mp-ink-faint transition-transform ' + (aberto ? 'rotate-180' : '')}>
          ▾
        </span>
      </button>

      {aberto && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 p-4 pt-1">
          {rows.map((row) => (
            <CoinCard key={row.issue.id} row={row} onClick={() => onSelect(row)} />
          ))}
        </div>
      )}
    </div>
  )
}
