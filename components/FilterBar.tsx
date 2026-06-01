import { flagOf } from '@/lib/flags'

export type EstadoFiltro = 'todas' | 'tenho' | 'naotenho'

export interface PaisOption {
  codigo: string
  nome: string
}

interface FilterBarProps {
  paises: PaisOption[]
  pais: string
  estado: EstadoFiltro
  pesquisa: string
  onPais: (v: string) => void
  onEstado: (v: EstadoFiltro) => void
  onPesquisa: (v: string) => void
}

const ESTADOS: { v: EstadoFiltro; label: string }[] = [
  { v: 'todas', label: 'Todas' },
  { v: 'tenho', label: 'Tenho' },
  { v: 'naotenho', label: 'Não tenho' },
]

export default function FilterBar({
  paises, pais, estado, pesquisa, onPais, onEstado, onPesquisa,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center mb-5">
      <select
        value={pais}
        onChange={(e) => onPais(e.target.value)}
        className="bg-mp-surface border border-mp-border rounded-lg px-3 py-2 text-sm outline-none focus:border-mp-gold"
      >
        <option value="">Todos os países</option>
        {paises.map((p) => (
          <option key={p.codigo} value={p.codigo}>
            {flagOf(p.codigo)} {p.nome}
          </option>
        ))}
      </select>

      <div className="inline-flex bg-mp-surface-muted rounded-full p-1">
        {ESTADOS.map((e) => (
          <button
            key={e.v}
            onClick={() => onEstado(e.v)}
            className={
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors ' +
              (estado === e.v
                ? 'bg-mp-gold text-white shadow-sm'
                : 'text-mp-ink-soft hover:text-mp-ink')
            }
          >
            {e.label}
          </button>
        ))}
      </div>

      <input
        value={pesquisa}
        onChange={(e) => onPesquisa(e.target.value)}
        placeholder="Procurar país, ano, denominação…"
        className="flex-1 min-w-[180px] bg-mp-surface border border-mp-border rounded-lg px-3 py-2 text-sm outline-none focus:border-mp-gold"
      />
    </div>
  )
}
