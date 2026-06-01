import { useId } from 'react'
import type { Estado } from '@/lib/types'

interface CoinDiscProps {
  short: string
  ano: string
  estado: Estado
  size?: number
}

// Disco SVG de moeda. Cores via tokens --mp-* (presentation attributes, não style inline).
export default function CoinDisc({ short, ano, estado, size = 56 }: CoinDiscProps) {
  const gid = useId()
  const presente = estado !== 'naotem'
  const ring =
    estado === 'set' ? 'var(--mp-set)'
      : estado === 'caderneta' ? 'var(--mp-caderneta)'
        : 'var(--mp-coin-empty)'
  const c0 = presente ? 'var(--mp-coin)' : 'var(--mp-coin-empty)'
  const c1 = presente ? 'var(--mp-coin-dark)' : 'var(--mp-coin-empty)'
  const tint = presente ? '#fff' : 'var(--mp-ink-faint)'

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`${short} ${ano}`}>
      <defs>
        <radialGradient id={gid} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor={c0} />
          <stop offset="100%" stopColor={c1} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill={`url(#${gid})`} stroke={ring} strokeWidth="4" />
      <circle cx="50" cy="50" r="39" fill="none" stroke="rgba(0,0,0,.12)" strokeWidth="1" />
      <text x="50" y="48" textAnchor="middle" fontFamily="var(--mp-font-serif)" fontWeight="700"
        fontSize="26" fill={tint} opacity={presente ? '0.95' : '0.7'}>{short}</text>
      <text x="50" y="70" textAnchor="middle" fontFamily="var(--mp-font-sans)" fontWeight="600"
        fontSize="13" fill={tint} opacity={presente ? '0.9' : '0.6'}>{presente ? ano : '—'}</text>
    </svg>
  )
}
