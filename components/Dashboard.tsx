'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getDashboard, type DashboardData, type PontoTimeline, type CategoriaResumo } from '@/lib/dashboard'
import Flag from './Flag'

const FORMATO_LABEL: Record<string, string> = {
  set: 'Tenho', caderneta: 'Caderneta', caderneta_bebe: 'Bebé', naotem: 'Não tenho',
}
const FORMATO_DOT: Record<string, string> = {
  set: 'bg-mp-set', caderneta: 'bg-mp-caderneta', caderneta_bebe: 'bg-mp-bebe', naotem: 'bg-mp-falta',
}

// Cor de cada cartão de coleção (estilo pastel do exemplo de referência).
const CAT_ESTILO: Record<CategoriaResumo['key'], { card: string; chip: string; barra: string }> = {
  circulacao: { card: 'bg-mp-caderneta-bg', chip: 'text-mp-caderneta', barra: 'bg-mp-caderneta' },
  comemorativa: { card: 'bg-mp-set-bg', chip: 'text-mp-set', barra: 'bg-mp-set' },
  colecao: { card: 'bg-mp-bebe-bg', chip: 'text-mp-bebe', barra: 'bg-mp-bebe' },
}

function fmt(n: number, d = 2) {
  return n.toLocaleString('pt-PT', { minimumFractionDigits: d, maximumFractionDigits: d })
}
function tempoAtras(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `há ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h / 24)}d`
}
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 19) return 'Boa tarde'
  return 'Boa noite'
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getDashboard()
      .then((d) => { if (alive) { setData(d); setLoading(false) } })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Coluna principal ─────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <header className="mb-6">
            <p className="font-sans text-sm text-mp-ink-soft">{greeting()},</p>
            <h1 className="font-serif text-4xl md:text-5xl font-semibold text-mp-ink leading-[1.05]">
              Investe na tua<br />coleção
            </h1>
            <p className="font-sans text-sm text-mp-ink-soft mt-2">
              O estado das tuas moedas de euro num relance.
            </p>
          </header>

          <h2 className="font-sans text-sm font-semibold text-mp-ink mb-3">As tuas coleções</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {(loading || !data ? PLACEHOLDER_CATS : data.categorias).map((c) => (
              <CategoriaCard key={c.key} c={c} loading={loading} />
            ))}
          </div>

          {/* Card do agente Numis (por construir) */}
          <NumisCard />
        </div>

        {/* ─── Painel lateral ───────────────────────────────────────────── */}
        <aside className="space-y-4">
          <div className="rounded-3xl border border-mp-border bg-mp-surface p-5">
            <p className="font-sans text-xs uppercase tracking-wide text-mp-ink-faint mb-1">A minha coleção</p>
            <p className="font-serif text-3xl font-semibold text-mp-gold-strong tabular-nums">
              {loading || !data ? '—' : `${fmt(data.valorFacialTotal)} €`}
            </p>
            <p className="font-sans text-[11px] text-mp-ink-soft">valor facial · {data?.colecao.total ?? 0} exemplares</p>

            {!loading && data && (
              <div className="mt-4">
                <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden bg-mp-surface-muted">
                  {([['set', data.colecao.set], ['caderneta', data.colecao.caderneta], ['caderneta_bebe', data.colecao.bebe]] as const).map(([k, n]) =>
                    n > 0 ? <div key={k} className={FORMATO_DOT[k]} style={{ width: `${(n / Math.max(data.colecao.total, 1)) * 100}%` }} title={`${FORMATO_LABEL[k]}: ${n}`} /> : null,
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  {([['set', data.colecao.set], ['caderneta', data.colecao.caderneta], ['caderneta_bebe', data.colecao.bebe]] as const).map(([k, n]) => (
                    <span key={k} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${FORMATO_DOT[k]}`} />
                      <span className="font-sans text-[11px] text-mp-ink-soft">{FORMATO_LABEL[k]}</span>
                      <span className="font-sans text-[11px] font-semibold text-mp-ink">{n}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-mp-border bg-mp-surface p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="font-sans text-xs uppercase tracking-wide text-mp-ink-faint">Actividade</p>
              <span className="font-sans text-[10px] text-mp-ink-faint">30 dias</span>
            </div>
            {loading || !data ? (
              <div className="h-14 rounded-lg bg-mp-surface-muted animate-pulse" />
            ) : (
              <Sparkline data={data.timeline} />
            )}
          </div>

          <div className="rounded-3xl border border-mp-border bg-mp-surface overflow-hidden">
            <p className="px-5 pt-4 font-sans text-xs uppercase tracking-wide text-mp-ink-faint">Últimas actualizações</p>
            {loading ? (
              <div className="p-5 space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-8 rounded bg-mp-surface-muted animate-pulse" />)}</div>
            ) : !data?.recentes.length ? (
              <p className="px-5 py-6 font-sans text-xs text-mp-ink-soft">Sem actualizações recentes.</p>
            ) : (
              <ul className="divide-y divide-mp-border mt-2">
                {data.recentes.slice(0, 6).map((r, i) => (
                  <li key={i} className="flex items-center gap-2.5 px-5 py-2.5">
                    <span className="shrink-0"><Flag code={(r.paisCodigo || 'eu').split('-')[0]} size={16} /></span>
                    <span className="flex-1 min-w-0 font-sans text-xs text-mp-ink truncate">{r.titulo}</span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${FORMATO_DOT[r.formato] ?? 'bg-mp-ink-faint'}`} title={FORMATO_LABEL[r.formato] ?? r.formato} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link href="/moedas" className="flex items-center justify-center gap-2 rounded-3xl bg-mp-gold px-5 py-4 font-sans font-semibold text-white hover:bg-mp-gold-strong transition-colors">
            Ver a coleção completa →
          </Link>
        </aside>
      </div>
    </div>
  )
}

const PLACEHOLDER_CATS: CategoriaResumo[] = [
  { key: 'circulacao', label: 'Circulação', total: 0, comPosse: 0 },
  { key: 'comemorativa', label: 'Comemorativas 2€', total: 0, comPosse: 0 },
  { key: 'colecao', label: 'Coleção (ouro/prata)', total: 0, comPosse: 0 },
]

function CategoriaCard({ c, loading }: { c: CategoriaResumo; loading: boolean }) {
  const e = CAT_ESTILO[c.key]
  const pct = c.total > 0 ? Math.round((c.comPosse / c.total) * 100) : 0
  const emBreve = c.total === 0
  return (
    <Link
      href="/moedas"
      className={`block rounded-3xl ${e.card} p-5 transition-transform hover:-translate-y-0.5 ${emBreve ? 'pointer-events-none opacity-70' : ''}`}
    >
      <div className="flex items-center justify-between mb-6">
        <span className={`inline-flex items-center gap-1.5 font-sans text-xs font-semibold ${e.chip}`}>
          <span className="grid place-items-center w-6 h-6 rounded-lg bg-mp-surface/70">◉</span>
          {c.label}
        </span>
        {emBreve
          ? <span className="font-sans text-[10px] font-semibold text-mp-ink-soft bg-mp-surface/70 rounded-full px-2 py-0.5">Em breve</span>
          : <span className={`font-sans text-xs font-semibold ${e.chip}`}>{pct}%</span>}
      </div>
      <p className="font-serif text-3xl font-semibold text-mp-ink tabular-nums">
        {loading ? '—' : emBreve ? '—' : c.comPosse}
        {!emBreve && <span className="font-sans text-base text-mp-ink-soft"> / {c.total}</span>}
      </p>
      <p className="font-sans text-[11px] text-mp-ink-soft mb-3">{emBreve ? 'a importar da Numista' : 'na tua coleção'}</p>
      {!emBreve && (
        <div className="h-1.5 rounded-full overflow-hidden bg-mp-surface/60">
          <div className={`h-full ${e.barra}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </Link>
  )
}

function NumisCard() {
  return (
    <div className="rounded-3xl p-5 text-white bg-mp-gold relative overflow-hidden">
      <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-2 font-sans text-xs font-semibold">
            <span className="grid place-items-center w-7 h-7 rounded-xl bg-white/20 font-serif">N</span>
            Numis · assistente numismático
          </span>
          <span className="font-sans text-[10px] font-semibold bg-white/20 rounded-full px-2 py-0.5">Em breve</span>
        </div>
        <p className="font-serif text-xl font-semibold leading-snug mb-1">
          Pergunta tudo sobre as tuas moedas
        </p>
        <p className="font-sans text-sm text-white/85">
          Tiragens, valor, raridade, o que te falta e onde encontrar — um agente que conhece
          o teu catálogo e a tua coleção. Em construção.
        </p>
      </div>
    </div>
  )
}

function Sparkline({ data, width = 280, height = 56 }: { data: PontoTimeline[]; width?: number; height?: number }) {
  if (!data || data.length < 2) {
    return <div className="h-14 flex items-center justify-center font-sans text-xs text-mp-ink-faint">Sem actividade recente</div>
  }
  const max = Math.max(...data.map((d) => d.count), 1)
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - (d.count / max) * (height - 8) - 4
    return [x, y] as const
  })
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
  const area = `${path} L${width},${height} L0,${height} Z`
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="mp-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--mp-gold)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--mp-gold)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#mp-spark)" />
      <path d={path} fill="none" stroke="var(--mp-gold-strong)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (data[i].count > 0 ? <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="var(--mp-gold-strong)" /> : null))}
    </svg>
  )
}
