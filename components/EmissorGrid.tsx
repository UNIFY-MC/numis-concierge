import type { PaisAgregado } from '@/lib/types'
import PaisCard from './PaisCard'

interface EmissorGridProps {
  paises: PaisAgregado[]
  onSelect: (codigo: string) => void
}

export default function EmissorGrid({ paises, onSelect }: EmissorGridProps) {
  if (paises.length === 0) {
    return <p className="text-mp-ink-faint py-8 text-center">Sem países para este filtro.</p>
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {paises.map((p) => (
        <PaisCard key={p.codigo} p={p} onClick={() => onSelect(p.codigo)} />
      ))}
    </div>
  )
}
