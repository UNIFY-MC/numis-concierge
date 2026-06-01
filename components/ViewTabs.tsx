export type Vista = 'emissor' | 'valor' | 'tabela'

interface ViewTabsProps {
  vista: Vista
  onChange: (v: Vista) => void
}

const TABS: { v: Vista; label: string }[] = [
  { v: 'emissor', label: 'Por Emissor' },
  { v: 'valor', label: 'Valor por País' },
  { v: 'tabela', label: 'Tabela' },
]

export default function ViewTabs({ vista, onChange }: ViewTabsProps) {
  return (
    <div className="flex gap-1 border-b border-mp-border mb-4">
      {TABS.map((t) => (
        <button
          key={t.v}
          onClick={() => onChange(t.v)}
          className={
            'font-serif px-4 py-2 text-sm rounded-t-lg -mb-px border-b-2 transition-colors ' +
            (vista === t.v
              ? 'border-mp-gold text-mp-gold-strong'
              : 'border-transparent text-mp-ink-soft hover:text-mp-ink')
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
