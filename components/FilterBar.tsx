export type EstadoFiltro = 'todas' | 'tenho' | 'set' | 'caderneta' | 'naotem'

interface FilterBarProps {
  estado: EstadoFiltro
  pesquisa: string
  onEstado: (v: EstadoFiltro) => void
  onPesquisa: (v: string) => void
  onExportar: () => void
  onImportar: () => void
}

const PILLS: { v: EstadoFiltro; label: string; dot?: string }[] = [
  { v: 'todas', label: 'Todas' },
  { v: 'tenho', label: 'Que tenho' },
  { v: 'set', label: 'Set', dot: 'bg-mp-set' },
  { v: 'caderneta', label: 'Caderneta', dot: 'bg-mp-caderneta' },
  { v: 'naotem', label: 'Não tem', dot: 'bg-mp-falta' },
]

export default function FilterBar({
  estado, pesquisa, onEstado, onPesquisa, onExportar, onImportar,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center mb-4">
      <div className="inline-flex bg-mp-surface-muted rounded-full p-1 flex-wrap">
        {PILLS.map((p) => (
          <button
            key={p.v}
            onClick={() => onEstado(p.v)}
            className={
              'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ' +
              (estado === p.v ? 'bg-mp-gold text-white shadow-sm' : 'text-mp-ink-soft hover:text-mp-ink')
            }
          >
            {p.dot && <span className={'w-2 h-2 rounded-full ' + p.dot} />}
            {p.label}
          </button>
        ))}
      </div>

      <div className="relative flex-1 min-w-[180px]">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mp-ink-faint">⌕</span>
        <input
          value={pesquisa}
          onChange={(e) => onPesquisa(e.target.value)}
          placeholder="Procurar país, ano, denominação…"
          className="w-full bg-mp-surface border border-mp-border rounded-full pl-9 pr-4 py-2 text-sm outline-none focus:border-mp-gold"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={onExportar}
          className="border border-mp-border bg-mp-surface rounded-lg px-3 py-2 text-sm font-medium text-mp-ink-soft hover:bg-mp-surface-muted"
        >
          ⤓ Exportar
        </button>
        <button
          onClick={onImportar}
          className="border border-mp-border bg-mp-surface rounded-lg px-3 py-2 text-sm font-medium text-mp-ink-soft hover:bg-mp-surface-muted"
        >
          ⤒ Importar
        </button>
      </div>
    </div>
  )
}
