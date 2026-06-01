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
        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
      >
        <option value="">Todos os países</option>
        {paises.map((p) => (
          <option key={p.codigo} value={p.codigo}>
            {flagOf(p.codigo)} {p.nome}
          </option>
        ))}
      </select>

      <div className="inline-flex bg-gray-100 rounded-full p-1">
        {ESTADOS.map((e) => (
          <button
            key={e.v}
            onClick={() => onEstado(e.v)}
            className={
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors ' +
              (estado === e.v
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700')
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
        className="flex-1 min-w-[180px] bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
      />
    </div>
  )
}
