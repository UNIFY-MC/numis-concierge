export type SortBy = 'pais' | 'pct' | 'total'

interface SortBarProps {
  sort: SortBy
  onChange: (s: SortBy) => void
}

const OPCOES: { v: SortBy; label: string }[] = [
  { v: 'pais', label: 'País (A-Z)' },
  { v: 'pct', label: '% completo' },
  { v: 'total', label: 'Total de moedas' },
]

export default function SortBar({ sort, onChange }: SortBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
      <span className="text-mp-ink-faint">Ordenar por:</span>
      {OPCOES.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={
            'rounded-lg px-3 py-1.5 font-medium transition-colors ' +
            (sort === o.v
              ? 'bg-mp-gold text-white'
              : 'border border-mp-border text-mp-ink-soft hover:bg-mp-surface-muted')
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
