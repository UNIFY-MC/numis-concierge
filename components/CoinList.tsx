import { estadoDe } from '@/lib/types'
import { valorReal, eur } from '@/lib/valor'
import { numistaUrl } from '@/lib/numista'
import type { DisplayRow, Estado } from '@/lib/types'
import CoinDisc from './CoinDisc'

interface CoinListProps {
  rows: DisplayRow[]
  onSelect: (row: DisplayRow) => void
  destaque?: Set<Estado>
}

const BADGE: Record<Estado, { label: string; cls: string }> = {
  set: { label: 'Set', cls: 'bg-mp-set-bg text-mp-set' },
  caderneta: { label: 'Caderneta', cls: 'bg-mp-caderneta-bg text-mp-caderneta' },
  naotem: { label: 'Não tem', cls: 'bg-mp-falta-bg text-mp-falta' },
}

export default function CoinList({ rows, onSelect, destaque }: CoinListProps) {
  const ordenadas = [...rows].sort((a, b) => {
    const ya = a.issue.ano_gregoriano ?? parseInt(a.issue.ano, 10) ?? 0
    const yb = b.issue.ano_gregoriano ?? parseInt(b.issue.ano, 10) ?? 0
    return ya - yb || (a.coin.tema ?? '').localeCompare(b.coin.tema ?? '')
  })

  return (
    <div className="divide-y divide-mp-border/60">
      {ordenadas.map((r) => {
        const estado = estadoDe(r.item)
        const esbatido = !!destaque && destaque.size > 0 && !destaque.has(estado)
        const nome = r.coin.tema || r.coin.titulo || r.coin.denominacao || 'Comemorativa 2€'
        const foto = r.item?.foto1 || r.coin.anverso_img
        const badge = BADGE[estado]
        return (
          <button
            key={r.issue.id}
            onClick={() => onSelect(r)}
            className={'w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-mp-surface-muted transition-opacity ' + (esbatido ? 'opacity-30' : 'opacity-100')}
          >
            <div className="flex-none">
              {foto ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={foto} alt="" className="h-10 w-10 rounded-full object-cover bg-mp-surface-muted ring-1 ring-mp-border" />
              ) : (
                <CoinDisc short="2€" ano={r.issue.ano} estado={estado} size={40} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-mp-ink truncate">{nome}</p>
              <p className="text-xs text-mp-ink-faint">{r.issue.ano}{r.issue.casa_moeda ? ` · Casa ${r.issue.casa_moeda}` : ''}</p>
            </div>
            <span className={'text-[11px] font-medium rounded-full px-2 py-0.5 flex-none ' + badge.cls}>{badge.label}</span>
            <span className="text-sm text-mp-gold-strong font-serif w-16 text-right flex-none">
              {estado === 'naotem' ? '—' : eur(valorReal(r.coin, r.item))}
            </span>
            <a
              href={numistaUrl(r.coin, r.issue)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] text-mp-gold hover:underline flex-none w-14 text-right"
            >
              Numista ↗
            </a>
          </button>
        )
      })}
    </div>
  )
}
