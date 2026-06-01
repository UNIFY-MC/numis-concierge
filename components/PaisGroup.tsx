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
    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/60">
      <button
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
      >
        <span className="text-xl flex-none">{flagOf(paisCodigo)}</span>
        <span className="flex-1 text-left">
          <span className="font-semibold text-gray-900">{paisNome}</span>
          <span className="block text-xs text-gray-400">
            {tenhoNoPais} de {totalNoPais} · {pct}%
          </span>
        </span>
        <progress
          value={pct}
          max={100}
          className="w-24 h-1.5 flex-none appearance-none overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-gray-200 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-amber-500 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-amber-500"
        />
        <span className={'text-gray-400 transition-transform ' + (aberto ? 'rotate-180' : '')}>
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
