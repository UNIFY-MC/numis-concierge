'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getDashboard, type DashboardData, type PontoTimeline } from '@/lib/dashboard'
import Flag from './Flag'

const FORMATO_LABEL: Record<string, string> = {
  set: 'Tenho', caderneta: 'Caderneta', caderneta_bebe: 'Bebé', naotem: 'Não tenho',
}
const FORMATO_DOT: Record<string, string> = {
  set: 'bg-mp-set', caderneta: 'bg-mp-caderneta', caderneta_bebe: 'bg-mp-bebe', naotem: 'bg-mp-falta',
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
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      <header className="mb-8">
        <p className="font-sans text-sm text-mp-ink-soft">{greeting()},</p>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold text-mp-ink">
          Moedas do Pinto
        </h1>
        <p className="font-sans text-sm text-mp-ink-soft mt-1">
          O estado da tua colecção de euros num relance.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi label="Exemplares" valor={loading ? null : `${data?.colecao.total ?? 0}`} nota="na colecção" />
        <Kpi label="Valor facial" valor={loading ? null : `${fmt(data?.valorFacialTotal ?? 0)} €`} nota="o que tens" />
        <Kpi label="Catálogo" valor={loading ? null : `${data?.totalCatalogo ?? 0}`} nota="tipos no DB" />
        <Kpi
          label="Cobertura"
          valor={loading || !data ? null : `${Math.round((data.colecao.total / Math.max(data.totalCatalogo, 1)) * 100)}%`}
          nota="do catálogo"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 rounded-2xl border border-mp-border bg-mp-surface p-5">
          <p className="font-sans text-xs uppercase tracking-wide text-mp-ink-faint mb-1">Distribuição</p>
          <h2 className="font-serif text-lg font-semibold text-mp-ink mb-4">Estado da colecção</h2>
          {loading || !data ? (
            <div className="h-3 rounded-full bg-mp-surface-muted animate-pulse" />
          ) : (
            <Progresso colecao={data.colecao} catalogTotal={data.totalCatalogo} />
          )}
        </div>

        <div className="rounded-2xl border border-mp-border bg-mp-surface p-5">
          <p className="font-sans text-xs uppercase tracking-wide text-mp-ink-faint mb-1">Últimos 30 dias</p>
          <h2 className="font-serif text-lg font-semibold text-mp-ink mb-3">Actividade</h2>
          {loading || !data ? (
            <div className="h-14 rounded-lg bg-mp-surface-muted animate-pulse" />
          ) : (
            <>
              <Sparkline data={data.timeline} />
              <p className="font-sans text-[11px] text-mp-ink-soft mt-2">
                {data.timeline.reduce((s, d) => s + d.count, 0)} exemplares actualizados
              </p>
            </>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-mp-border bg-mp-surface overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-mp-border">
          <p className="font-sans text-xs uppercase tracking-wide text-mp-ink-faint">Recentes</p>
          <h2 className="font-serif text-lg font-semibold text-mp-ink">Últimas actualizações</h2>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded-lg bg-mp-surface-muted animate-pulse" />)}
          </div>
        ) : !data?.recentes.length ? (
          <p className="px-5 py-10 text-center font-sans text-sm text-mp-ink-soft">
            Sem actualizações nos últimos 30 dias.
          </p>
        ) : (
          <ul className="divide-y divide-mp-border">
            {data.recentes.map((r, i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-3">
                <span className="shrink-0"><Flag code={(r.paisCodigo || 'eu').split('-')[0]} size={20} /></span>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm text-mp-ink font-medium truncate">{r.titulo}</p>
                  <p className="font-sans text-[11px] text-mp-ink-soft">
                    {r.quantidade}× · {fmt(r.valorFacial)} € · {tempoAtras(r.updatedAt)}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className={`w-2 h-2 rounded-full ${FORMATO_DOT[r.formato] ?? 'bg-mp-ink-faint'}`} />
                  <span className="font-sans text-xs text-mp-ink-soft">{FORMATO_LABEL[r.formato] ?? r.formato}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href="/moedas"
        className="flex items-center justify-center gap-2 rounded-2xl bg-mp-gold px-5 py-4 font-sans font-semibold text-white hover:opacity-90 transition-opacity"
      >
        Ver a minha colecção completa →
      </Link>
    </div>
  )
}

function Kpi({ label, valor, nota }: { label: string; valor: string | null; nota: string }) {
  return (
    <div className="rounded-2xl border border-mp-border bg-mp-surface p-4">
      <p className="font-sans text-xs uppercase tracking-wide text-mp-ink-faint mb-1.5">{label}</p>
      {valor === null ? (
        <div className="h-8 w-16 rounded bg-mp-surface-muted animate-pulse" />
      ) : (
        <p className="font-serif text-2xl md:text-3xl font-semibold text-mp-gold-strong tabular-nums">{valor}</p>
      )}
      <p className="font-sans text-[11px] text-mp-ink-soft mt-1">{nota}</p>
    </div>
  )
}

function Progresso({
  colecao,
  catalogTotal,
}: {
  colecao: DashboardData['colecao']
  catalogTotal: number
}) {
  const pct = (n: number) => Math.round((n / Math.max(catalogTotal, 1)) * 100)
  const segs = [
    { label: 'Tenho', count: colecao.set, color: 'bg-mp-set' },
    { label: 'Caderneta', count: colecao.caderneta, color: 'bg-mp-caderneta' },
    { label: 'Bebé', count: colecao.bebe, color: 'bg-mp-bebe' },
  ]
  return (
    <div className="space-y-3">
      <div className="flex gap-0.5 h-3 rounded-full overflow-hidden bg-mp-surface-muted">
        {segs.map((s) =>
          s.count > 0 ? (
            <div key={s.label} className={`${s.color} transition-all duration-700`} style={{ width: `${pct(s.count)}%` }} title={`${s.label}: ${s.count}`} />
          ) : null
        )}
      </div>
      <div className="flex gap-4 flex-wrap">
        {segs.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${s.color}`} />
            <span className="font-sans text-xs text-mp-ink-soft">{s.label}</span>
            <span className="font-sans text-xs font-semibold text-mp-ink">{s.count}</span>
          </span>
        ))}
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
