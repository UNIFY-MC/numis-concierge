import type { Familia } from '@/lib/types'

// Grupo de topo: separa o euro que se coleciona em sets/cadernetas das moedas
// de coleção (>2€, ECU) e do histórico pré-euro. Mapeia para familia(s) da BD.
export type GrupoFamilia = 'euro' | 'colecao' | 'historico'

export const FAMILIAS_DO_GRUPO: Record<GrupoFamilia, Familia[]> = {
  euro: ['euro_circulacao', 'euro_comemorativa'],
  colecao: ['euro_colecao'],
  historico: ['historico'],
}

interface FamiliaTabsProps {
  grupo: GrupoFamilia
  onChange: (g: GrupoFamilia) => void
  contagens: Record<GrupoFamilia, number>
}

const TABS: { v: GrupoFamilia; label: string }[] = [
  { v: 'euro', label: 'Euro' },
  { v: 'colecao', label: 'Coleção' },
  { v: 'historico', label: 'Histórico' },
]

export default function FamiliaTabs({ grupo, onChange, contagens }: FamiliaTabsProps) {
  return (
    <div className="inline-flex gap-1 p-1 rounded-xl bg-mp-surface-muted border border-mp-border mb-4">
      {TABS.map((t) => (
        <button
          key={t.v}
          onClick={() => onChange(t.v)}
          className={
            'px-3.5 py-1.5 text-sm rounded-lg font-semibold transition-colors ' +
            (grupo === t.v
              ? 'bg-mp-gold text-white shadow-sm'
              : 'text-mp-ink-soft hover:text-mp-ink')
          }
        >
          {t.label}
          <span className={'ml-1.5 text-xs font-normal ' + (grupo === t.v ? 'text-white/80' : 'text-mp-ink-faint')}>
            {contagens[t.v]}
          </span>
        </button>
      ))}
    </div>
  )
}
