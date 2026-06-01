import { estadoDe, denomCurta } from '@/lib/types'
import { valorReal, eur } from '@/lib/valor'
import { numistaUrl } from '@/lib/numista'
import type { DisplayRow, Estado } from '@/lib/types'
import CoinDisc from './CoinDisc'

interface CoinCellProps {
  row: DisplayRow
  onClick: () => void
  destaque?: Set<Estado>
}

export default function CoinCell({ row, onClick, destaque }: CoinCellProps) {
  const estado = estadoDe(row.item)
  const esbatido = !!destaque && destaque.size > 0 && !destaque.has(estado)
  const short = denomCurta(row.coin.valor_facial, row.coin.denominacao)
  const qtd = row.item?.quantidade ?? 0
  const valor = valorReal(row.coin, row.item)

  const badgeCor =
    qtd === 0 ? 'bg-mp-falta text-white'
      : qtd > 1 ? 'bg-mp-gold text-white'
        : 'bg-mp-surface-muted text-mp-ink-soft'

  return (
    <div className={'flex flex-col items-center w-16 flex-none transition-opacity ' + (esbatido ? 'opacity-20' : 'opacity-100')}>
      <button onClick={onClick} className="relative group" aria-label={`${short} ${row.issue.ano}`}>
        <CoinDisc short={short} ano={row.issue.ano} estado={estado} size={54} />
        <span
          className={
            'absolute -top-0.5 right-1 w-2.5 h-2.5 rounded-full ' +
            (estado === 'set' ? 'bg-mp-set' : estado === 'caderneta' ? 'bg-mp-caderneta' : 'bg-mp-coin-empty')
          }
          aria-hidden
        />
        {estado !== 'naotem' && (
          <span className={'absolute -bottom-0.5 left-0 text-[9px] font-semibold rounded px-1 leading-tight ' + badgeCor}>
            {qtd}
          </span>
        )}
      </button>
      <span className={'text-[9.5px] mt-0.5 ' + (estado === 'naotem' ? 'text-mp-ink-faint' : 'text-mp-gold-strong')}>
        {estado === 'naotem' ? '—' : eur(valor)}
      </span>
      <a
        href={numistaUrl(row.coin, row.issue)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-[8.5px] text-mp-gold hover:underline"
      >
        Numista ↗
      </a>
    </div>
  )
}
