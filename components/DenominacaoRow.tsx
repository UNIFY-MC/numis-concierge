import type { DisplayRow, Estado } from '@/lib/types'
import CoinCell from './CoinCell'

interface DenominacaoRowProps {
  label: string
  anos: string[]
  // várias issues podem cair no mesmo ano (comemorativas) → empilhar
  porAno: Map<string, DisplayRow[]>
  onSelect: (row: DisplayRow) => void
  destaque?: Set<Estado>
}

export default function DenominacaoRow({ label, anos, porAno, onSelect, destaque }: DenominacaoRowProps) {
  return (
    <div className="flex items-stretch border-t border-mp-border/60">
      <div className="w-12 flex-none flex items-center justify-end pr-2 sticky left-0 bg-mp-surface z-10">
        <span className="text-xs font-semibold text-mp-ink">{label}</span>
      </div>
      {anos.map((ano) => {
        const rows = porAno.get(ano) ?? []
        return (
          <div key={ano} className="w-[72px] flex-none py-2 flex flex-wrap gap-1 justify-center">
            {rows.map((r) => <CoinCell key={r.issue.id} row={r} onClick={() => onSelect(r)} destaque={destaque} />)}
          </div>
        )
      })}
    </div>
  )
}
