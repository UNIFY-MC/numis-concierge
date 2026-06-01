import { eur } from '@/lib/valor'
import type { PaisAgregado } from '@/lib/types'
import Flag from './Flag'

interface PaisCardProps {
  p: PaisAgregado
  onClick: () => void
}

export default function PaisCard({ p, onClick }: PaisCardProps) {
  const naColecao = p.set + p.cad
  const pct = p.total > 0 ? Math.round((naColecao / p.total) * 100) : 0
  const setPct = p.total > 0 ? (p.set / p.total) * 100 : 0
  const cadPct = p.total > 0 ? (p.cad / p.total) * 100 : 0

  return (
    <button
      onClick={onClick}
      className="text-left bg-mp-surface border border-mp-border rounded-2xl p-4 hover:border-mp-gold transition-colors"
    >
      <div className="flex items-start gap-2.5">
        <span className="flex-none"><Flag code={p.codigo} size={20} /></span>
        <div className="flex-1 min-w-0">
          <h3 className="font-serif font-semibold text-mp-ink leading-tight truncate">{p.nome}</h3>
          <p className="text-[11px] text-mp-ink-faint">{p.total} moedas · {naColecao} na coleção</p>
        </div>
        <span className="font-serif font-semibold text-mp-gold-strong">{pct}%</span>
      </div>

      {/* Barra multicolor (SVG, cores por token) */}
      <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="w-full h-1.5 my-3" aria-hidden>
        <rect x="0" y="0" width="100" height="6" rx="3" fill="var(--mp-coin-empty)" />
        <rect x="0" y="0" width={setPct} height="6" fill="var(--mp-set)" />
        <rect x={setPct} y="0" width={cadPct} height="6" fill="var(--mp-caderneta)" />
      </svg>

      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <span className="inline-flex items-center gap-1 bg-mp-set-bg text-mp-set rounded px-1.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-mp-set" /> set {p.set}
        </span>
        <span className="inline-flex items-center gap-1 bg-mp-caderneta-bg text-mp-caderneta rounded px-1.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-mp-caderneta" /> caderneta {p.cad}
        </span>
        <span className="inline-flex items-center gap-1 bg-mp-falta-bg text-mp-falta rounded px-1.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-mp-falta" /> não tem {p.falta}
        </span>
      </div>

      <p className="text-xs text-mp-ink-soft mt-3">
        Valor da coleção <b className="font-serif text-mp-gold-strong">{eur(p.valorSet + p.valorCad)}</b>
      </p>
    </button>
  )
}
