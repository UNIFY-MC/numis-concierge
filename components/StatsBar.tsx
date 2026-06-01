import { eur } from '@/lib/valor'

interface StatsBarProps {
  total: number
  emissores: number
  set: number
  caderneta: number
  naotem: number
  valorSet: number
  valorCad: number
}

export default function StatsBar({
  total, emissores, set, caderneta, naotem, valorSet, valorCad,
}: StatsBarProps) {
  const tenho = set + caderneta
  const pct = total > 0 ? (tenho / total) * 100 : 0
  const valorTotal = valorSet + valorCad

  const card = 'bg-mp-surface border border-mp-border rounded-xl px-4 py-3'
  const label = 'text-[10.5px] uppercase tracking-wide text-mp-ink-faint'
  const num = 'text-2xl font-serif font-semibold mt-1 tabular-nums leading-none'
  const sub = 'text-[11px] text-mp-ink-faint mt-1.5'

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
      <div className={card}>
        <div className={label}>Total catálogo</div>
        <div className={num}>{total}</div>
        <div className={sub}>{emissores} emissores</div>
      </div>
      <div className={card}>
        <div className={label}>● Em set</div>
        <div className={num + ' text-mp-set'}>{set}</div>
        <div className={sub}>{eur(valorSet)}</div>
      </div>
      <div className={card}>
        <div className={label}>● Em caderneta</div>
        <div className={num + ' text-mp-caderneta'}>{caderneta}</div>
        <div className={sub}>{eur(valorCad)}</div>
      </div>
      <div className={card}>
        <div className={label}>● Não tem</div>
        <div className={num + ' text-mp-falta'}>{naotem}</div>
        <div className={sub}>{pct.toFixed(1)}% completo</div>
      </div>
      <div className={card}>
        <div className={label}>Valor de mercado</div>
        <div className={num + ' text-mp-gold-strong'}>{eur(valorTotal)}</div>
        <div className={sub}>set + caderneta</div>
      </div>
    </div>
  )
}
