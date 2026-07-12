'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Bell,
  ChevronDown,
  CircleHelp,
  Coins,
  Gem,
  Goal,
  Grid2X2,
  Lightbulb,
  Search,
  Settings,
  Sparkles,
  Trophy,
} from 'lucide-react'
import {
  getDashboard,
  type AtividadeRecente as AtividadeRecenteT,
  type DashboardData,
  type MoedaEmFalta,
  type PontoTimeline,
  type ValorPais,
} from '@/lib/dashboard'
import Flag from '@/components/Flag'

const DONO = 'Pinto'

function fmtEuro(n: number) {
  return `${n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

function fmtInt(n: number) {
  return n.toLocaleString('pt-PT')
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const router = useRouter()

  useEffect(() => {
    let alive = true
    getDashboard()
      .then((d) => {
        if (alive) {
          setData(d)
          setLoading(false)
        }
      })
      .catch(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-mp-bg text-mp-ink">
      <div className="w-full px-4 py-5 md:px-6">
        <TopBar />

        <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <main className="space-y-5">
            <Hero q={q} setQ={setQ} onSearch={() => router.push('/moedas')} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SoonCard
                icon={<Sparkles size={16} />}
                title="Hoje na numismática"
                text="Efemérides e novidades do mundo das moedas."
                note="Requer fonte de notícias externa"
              />
              <SoonCard
                icon={<Coins size={16} />}
                title="Moeda do dia"
                text="Uma moeda em destaque, com foto e curiosidades."
                note="Requer curadoria + fotos"
              />
              <SoonCard
                icon={<Trophy size={16} />}
                title="Ranking Portugal"
                text="Comparação entre colecionadores."
                note="Requer contas multi-utilizador"
              />
            </div>

            <CollectionsSection data={data} loading={loading} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <GoalCard />
              <MissingCoinsCard data={data} loading={loading} />
              <CountryValueCard data={data} loading={loading} />
            </div>

            <NumisPanel />
          </main>

          <aside className="space-y-4">
            <CompletionCard data={data} loading={loading} />
            <ValueCard data={data} loading={loading} />
            <RecentActivityCard data={data} loading={loading} />
            <ProfileCard data={data} loading={loading} />
          </aside>
        </div>
      </div>
    </div>
  )
}

function TopBar() {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-sm font-semibold text-mp-ink">
        Bom dia, {DONO} <span className="text-mp-primary">👋</span>
      </p>

      <div className="flex flex-1 items-center justify-end gap-3">
        <IconButton label="Notificações">
          <Bell size={18} />
        </IconButton>
        <IconButton label="Definições">
          <Settings size={18} />
        </IconButton>
        <div className="flex items-center gap-2.5 rounded-2xl border border-mp-border bg-mp-surface py-1.5 pl-2 pr-3 shadow-sm">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-mp-primary font-semibold text-white">P</span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-mp-ink">{DONO}</p>
            <p className="text-[11px] text-mp-ink-soft">Ver perfil</p>
          </div>
          <ChevronDown size={14} className="text-mp-ink-faint" />
        </div>
      </div>
    </div>
  )
}

function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-2xl border border-mp-border bg-mp-surface text-mp-ink-soft shadow-sm transition-colors hover:text-mp-primary-strong"
    >
      {children}
    </button>
  )
}

function Hero({
  q,
  setQ,
  onSearch,
}: {
  q: string
  setQ: (v: string) => void
  onSearch: () => void
}) {
  return (
    <section
      className="relative overflow-visible rounded-[28px] border border-mp-border px-6 py-5 shadow-sm md:px-8 lg:min-h-[20rem] lg:px-9 lg:py-4"
      style={{
        background: 'var(--mp-hero-grad)',
      }}
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-mp-primary-soft/55" />
      <div className="pointer-events-none absolute right-14 top-16 hidden h-10 w-10 rounded-full bg-mp-primary-soft/70 md:block" />

      <div className="relative grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_34rem]">
        <div>
          <h1 className="mt-2 max-w-2xl font-serif text-4xl font-bold leading-[1.04] text-mp-ink md:text-5xl xl:text-6xl">
            A tua coleção
            <br />
            de{' '}
            <span
              className="inline-block bg-clip-text text-transparent"
              style={{ backgroundImage: 'var(--mp-title-grad)' }}
            >
              numismática
            </span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-mp-ink-soft">
            Explora, organiza e valoriza a tua coleção. O Numis está aqui para te ajudar.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/moedas"
              className="inline-flex items-center gap-2 rounded-2xl bg-mp-ink px-5 py-3 text-sm font-semibold text-mp-surface transition-opacity hover:opacity-90"
            >
              Ver coleção de Euros <ArrowRight size={15} />
            </Link>
            <span className="inline-flex items-center gap-2 rounded-2xl border border-mp-border bg-mp-surface px-5 py-3 text-sm font-semibold text-mp-ink-soft">
              <Lightbulb size={15} className="text-mp-gold" /> Outro facto
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
          {['Moedas raras', 'Euro 2€', 'Portugal', 'Provas', 'Comemorativas'].map((label) => (
            <Link
              key={label}
              href="/moedas"
              className="rounded-full bg-mp-primary-soft px-3 py-1 text-xs font-semibold text-mp-primary-strong transition-colors hover:bg-mp-primary hover:text-white"
            >
              {label}
            </Link>
          ))}
          </div>

          <form
            className="mt-4 flex max-w-2xl items-center gap-2 rounded-2xl border border-mp-border bg-mp-surface px-4 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault()
              onSearch()
            }}
          >
            <Search size={17} className="shrink-0 text-mp-ink-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Procurar moedas, países, catálogos..."
              className="min-w-0 flex-1 bg-transparent py-3 text-sm text-mp-ink outline-none placeholder:text-mp-ink-faint"
            />
            <button type="submit" className="rounded-xl bg-mp-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-mp-primary-strong">
              Buscar
            </button>
          </form>
        </div>

        <div className="relative -mt-8 hidden h-[22.5rem] lg:block">
          <div className="absolute -top-10 right-0">
            <NumisMascot size={430} />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45 }}
            className="absolute -left-24 top-12 z-10 max-w-[14rem] rounded-2xl rounded-br-sm border border-mp-border bg-mp-surface px-4 py-3 text-sm leading-5 text-mp-ink shadow-sm"
          >
            Olá! Eu sou o <span className="font-semibold text-mp-primary">Numis</span>.
            Pergunta-me qualquer coisa sobre a tua coleção.
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function CollectionsSection({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  const total = data?.cobertura.total ?? 1
  const setPct = ((data?.cobertura.set ?? 0) / total) * 100
  const cadPct = ((data?.cobertura.caderneta ?? 0) / total) * 100

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold text-mp-ink">As tuas coleções</h2>
        <Link href="/moedas" className="text-xs font-semibold text-mp-primary-strong hover:underline">
          Abrir todas →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Link href="/moedas" className="rounded-[24px] border border-mp-border bg-mp-surface p-5 shadow-sm transition-transform hover:-translate-y-0.5">
          <div className="mb-5 flex items-center justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-mp-coin text-lg font-semibold text-white">
              €
            </span>
            <ArrowRight size={16} className="text-mp-primary-strong" />
          </div>
          <p className="text-sm font-semibold text-mp-ink">Euros por País</p>
          <p className="mb-4 text-[11px] text-mp-ink-soft">
            {loading || !data ? 'A carregar...' : `${data.emissores} emissores · catálogo euro`}
          </p>
          <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-mp-surface-muted">
            <span className="bg-mp-set" style={{ width: `${setPct}%` }} />
            <span className="bg-mp-caderneta" style={{ width: `${cadPct}%` }} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Pill>{loading || !data ? '...' : `${fmtInt(data.totalIssues)} moedas`}</Pill>
            <Pill tone="gold">{loading || !data ? '...' : `${data.cobertura.completoPct}% completo`}</Pill>
          </div>
        </Link>

        <CollectionSoon icon={<Coins size={16} />} title="Comemorativas €2" subtitle="2€ de toda a Europa" />
        <CollectionSoon icon={<span className="text-xs font-bold">PT</span>} title="Moedas de Portugal" subtitle="Escudos & coleções INCM" />
        <CollectionSoon icon={<Gem size={16} />} title="Moedas do Mundo" subtitle="Fora da Zona Euro" />
        <div className="grid min-h-[10rem] place-items-center rounded-[24px] border-2 border-dashed border-mp-border bg-mp-surface/45 p-5 text-mp-ink-faint">
          <div className="text-center">
            <span className="block text-3xl leading-none">+</span>
            <span className="text-xs">Nova coleção</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function CollectionSoon({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="rounded-[24px] border border-mp-border bg-mp-surface p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-mp-primary-soft text-mp-primary-strong">
          {icon}
        </span>
        <SoonPill />
      </div>
      <p className="text-sm font-semibold text-mp-ink">{title}</p>
      <p className="text-[11px] text-mp-ink-soft">{subtitle}</p>
    </div>
  )
}

function NumisPanel() {
  const questions = [
    'Quais são as moedas de 2€ mais valiosas?',
    'Como sei se uma moeda é rara?',
    'Qual o valor desta moeda?',
  ]

  return (
    <section className="rounded-[28px] border border-mp-border bg-mp-falta-bg p-5 md:p-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[16rem_minmax(0,1fr)_15rem]">
        <div>
          <span className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-mp-primary text-white">
            <CircleHelp size={20} />
          </span>
          <h3 className="font-serif text-xl font-semibold leading-snug text-mp-ink">
            Pergunta-me
            <br />
            qualquer coisa
          </h3>
          <p className="mt-2 text-sm leading-5 text-mp-ink-soft">
            Estou aqui para te ajudar a descobrir, organizar e valorizar a tua coleção.
          </p>
        </div>

        <div className="self-center space-y-2">
          {questions.map((q) => (
            <span key={q} className="flex items-center justify-between rounded-2xl bg-mp-surface px-4 py-3 text-sm text-mp-ink-soft">
              {q}
              <ArrowRight size={15} className="text-mp-primary-strong" />
            </span>
          ))}
        </div>

        <div className="rounded-2xl bg-mp-surface p-4">
          <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-mp-ink">
            <Lightbulb size={16} className="text-mp-gold" /> Dica do Numis
          </p>
          <p className="text-xs leading-5 text-mp-ink-soft">
            As moedas em Proof ou FDC costumam ter maior valor de mercado.
          </p>
          <span className="mt-3 inline-block text-xs font-semibold text-mp-primary-strong">Saber mais →</span>
        </div>
      </div>
    </section>
  )
}

function SoonCard({ icon, title, text, note }: { icon: React.ReactNode; title: string; text: string; note: string }) {
  return (
    <section className="flex h-full flex-col rounded-[24px] border border-mp-border bg-mp-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-serif text-base font-semibold text-mp-ink">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-mp-primary-soft text-mp-primary-strong">
            {icon}
          </span>
          {title}
        </h3>
        <SoonPill />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-mp-border bg-mp-bg/45 px-3 py-7 text-center">
        <p className="max-w-[14rem] text-xs text-mp-ink-soft">{text}</p>
        <p className="mt-1 text-[11px] text-mp-ink-faint">{note}</p>
      </div>
    </section>
  )
}

function GoalCard() {
  return (
    <SoonCard
      icon={<Goal size={16} />}
      title="Objetivo da semana"
      text="Define e acompanha metas da tua coleção."
      note="Requer funcionalidade de metas"
    />
  )
}

function MissingCoinsCard({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  const missing: MoedaEmFalta[] = data?.faltam ?? []

  return (
    <section className="flex h-full flex-col rounded-[24px] border border-mp-border bg-mp-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-serif text-base font-semibold text-mp-ink">Faltam-te estas moedas</h3>
        <Link href="/moedas" className="text-[11px] font-semibold text-mp-primary-strong hover:underline">
          Ver →
        </Link>
      </div>
      {loading ? (
        <p className="text-xs text-mp-ink-faint">A carregar...</p>
      ) : missing.length === 0 ? (
        <p className="text-xs text-mp-ink-soft">Tens todos os tipos do catálogo.</p>
      ) : (
        <ul className="space-y-2">
          {missing.slice(0, 5).map((coin) => (
            <li key={coin.titulo} className="flex items-center gap-2.5">
              <Flag code={coin.codigo} size={16} />
              <span className="min-w-0 flex-1 truncate text-xs text-mp-ink">{coin.titulo}</span>
              <span className="shrink-0 text-[10px] text-mp-ink-faint">{coin.nome}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CountryValueCard({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  const rows: ValorPais[] = data?.valorPorPais ?? []
  const max = Math.max(...rows.map((r) => r.valorFacial), 1)

  return (
    <section className="flex h-full flex-col rounded-[24px] border border-mp-border bg-mp-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-serif text-base font-semibold text-mp-ink">Valor por país</h3>
        <Link href="/moedas" className="text-[11px] font-semibold text-mp-primary-strong hover:underline">
          Ver tudo →
        </Link>
      </div>
      {loading ? (
        <p className="text-xs text-mp-ink-faint">A carregar...</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-mp-ink-soft">Ainda não tens moedas na coleção.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.slice(0, 5).map((row) => (
            <li key={row.codigo}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Flag code={row.codigo} size={14} />
                  <span className="truncate text-xs text-mp-ink">{row.nome}</span>
                </span>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-mp-ink">{fmtEuro(row.valorFacial)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-mp-surface-muted">
                <span className="block h-full rounded-full bg-mp-primary" style={{ width: `${(row.valorFacial / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CompletionCard({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  return (
    <div className="rounded-[24px] border border-mp-border bg-mp-surface p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-mp-ink">A tua coleção</p>
        <Link href="/moedas" className="text-[11px] font-semibold text-mp-primary-strong hover:underline">
          Ver tudo →
        </Link>
      </div>
      <Donut data={data} loading={loading} />
      <ul className="mt-3 space-y-2">
        <Legend color="bg-mp-set" label="Em set" value={loading || !data ? null : fmtInt(data.cobertura.set)} strong />
        <Legend color="bg-mp-caderneta" label="Em caderneta" value={loading || !data ? null : fmtInt(data.cobertura.caderneta)} strong />
        <Legend color="bg-mp-coin-empty" label="Não tem" value={loading || !data ? null : fmtInt(data.cobertura.naotem)} strong />
      </ul>
    </div>
  )
}

function ValueCard({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  return (
    <div className="rounded-[24px] border border-mp-border bg-mp-surface p-5 shadow-sm">
      <p className="mb-1 text-sm font-semibold text-mp-ink">Valor da tua coleção</p>
      <p className="text-3xl font-extrabold tabular-nums tracking-tight text-mp-ink">
        {loading || !data ? '...' : fmtEuro(data.valorFacial.colecao)}
      </p>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <p className="text-[11px] text-mp-ink-soft">valor facial · set + caderneta</p>
        {!loading && data && data.atividade30d.valorFacial > 0 && (
          <span className="shrink-0 rounded-full bg-mp-set-bg px-2 py-0.5 text-[11px] font-semibold text-mp-set">
            + {fmtEuro(data.atividade30d.valorFacial)} (30d)
          </span>
        )}
      </div>
      {!loading && data && (
        <div className="mt-3">
          <Sparkline data={data.timeline} />
        </div>
      )}
    </div>
  )
}

function RecentActivityCard({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  const items: AtividadeRecenteT[] = data?.recentes ?? []

  return (
    <div className="rounded-[24px] border border-mp-border bg-mp-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-mp-ink">Atividade recente</p>
        <Link href="/moedas" className="text-[11px] font-semibold text-mp-primary-strong hover:underline">
          Ver tudo →
        </Link>
      </div>
      {loading ? (
        <p className="text-xs text-mp-ink-faint">A carregar...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-mp-ink-soft">Sem atividade nos últimos 30 dias.</p>
      ) : (
        <ul className="space-y-3">
          {items.slice(0, 5).map((item, index) => (
            <li key={`${item.titulo}-${index}`} className="flex items-center gap-2.5">
              <Flag code={item.paisCodigo.split('-')[0].toLowerCase()} size={16} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-mp-ink">{item.titulo}</p>
                <p className="text-[10px] text-mp-ink-faint">{formatLabel(item.formato)} · {relativeTime(item.updatedAt)}</p>
              </div>
              <span className="shrink-0 text-[11px] font-semibold tabular-nums text-mp-ink">x{item.quantidade}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ProfileCard({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  return (
    <div className="rounded-[24px] border border-mp-border bg-mp-surface p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-mp-primary text-base font-semibold text-white">P</span>
        <div>
          <p className="text-sm font-semibold text-mp-ink">{DONO}</p>
          <p className="text-[11px] text-mp-ink-soft">Colecionador de euros</p>
        </div>
      </div>
      <div className="mb-3 flex items-center justify-between border-b border-mp-border pb-3">
        <span className="text-xs text-mp-ink-soft">Total de moedas</span>
        <span className="text-lg font-extrabold tabular-nums tracking-tight text-mp-ink">
          {loading || !data ? '...' : fmtInt(data.totalIssues)}
        </span>
      </div>
      <ul className="space-y-2.5">
        <Legend color="bg-mp-set" label="Em set" value={loading || !data ? null : fmtEuro(data.valorFacial.set)} />
        <Legend color="bg-mp-caderneta" label="Em caderneta" value={loading || !data ? null : fmtEuro(data.valorFacial.caderneta)} />
        <Legend color="bg-mp-coin-empty" label="Não tem" value={loading || !data ? null : fmtEuro(data.valorFacial.naotem)} />
      </ul>
      <Link
        href="/moedas"
        className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-mp-primary-soft px-5 py-3 text-sm font-semibold text-mp-primary-strong transition-colors hover:bg-mp-primary hover:text-white"
      >
        <Grid2X2 size={15} /> Ver coleção completa
      </Link>
    </div>
  )
}

function Donut({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  const r = 52
  const sw = 16
  const c = 2 * Math.PI * r
  const total = data?.cobertura.total ?? 1
  const segments = data
    ? [
        { value: data.cobertura.set, color: 'var(--mp-set)' },
        { value: data.cobertura.caderneta, color: 'var(--mp-caderneta)' },
        { value: data.cobertura.naotem, color: 'var(--mp-coin-empty)' },
      ]
    : []
  let offset = 0

  return (
    <div className="relative grid place-items-center py-2">
      <svg width="150" height="150" viewBox="0 0 160 160" className="-rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--mp-surface-muted)" strokeWidth={sw} />
        {!loading &&
          segments.map((segment, index) => {
            const len = (segment.value / total) * c
            const el = (
              <circle
                key={index}
                cx="80"
                cy="80"
                r={r}
                fill="none"
                stroke={segment.color}
                strokeWidth={sw}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
              />
            )
            offset += len
            return el
          })}
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-extrabold tabular-nums tracking-tight text-mp-ink">
          {loading || !data ? '...' : `${data.cobertura.completoPct}%`}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-mp-ink-faint">completo</p>
      </div>
    </div>
  )
}

function Legend({ color, label, value, strong }: { color: string; label: string; value: string | null; strong?: boolean }) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-xs text-mp-ink-soft">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        {label}
      </span>
      <span className={`text-xs font-semibold tabular-nums ${strong ? 'text-mp-ink' : 'text-mp-ink-soft'}`}>
        {value ?? '...'}
      </span>
    </li>
  )
}

function Sparkline({ data, width = 280, height = 44 }: { data: PontoTimeline[]; width?: number; height?: number }) {
  if (!data || data.length < 2) {
    return <div className="flex h-11 items-center justify-center text-xs text-mp-ink-faint">Sem atividade recente</div>
  }
  const max = Math.max(...data.map((d) => d.count), 1)
  const pts = data.map((d, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - (d.count / max) * (height - 8) - 4
    return [x, y] as const
  })
  const path = pts.map((p, index) => `${index === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
  const area = `${path} L${width},${height} L0,${height} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="mp-dashboard-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--mp-primary)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--mp-primary)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#mp-dashboard-spark)" />
      <path d={path} fill="none" stroke="var(--mp-primary)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, index) => (data[index].count > 0 ? <circle key={index} cx={p[0]} cy={p[1]} r="2.5" fill="var(--mp-primary)" /> : null))}
    </svg>
  )
}

function NumisMascot({ size = 240 }: { size?: number }) {
  const [imgOk, setImgOk] = useState(true)
  const reduce = useReducedMotion()
  const boxW = size
  const boxH = Math.round(size * 1.11)

  return (
    <div className="relative select-none" style={{ width: boxW, height: boxH }}>
      <motion.div
        aria-hidden
        className="absolute inset-x-12 top-8 h-56 rounded-full"
        style={{ background: 'radial-gradient(circle, var(--mp-primary-soft) 0%, transparent 72%)' }}
        animate={reduce ? {} : { opacity: [0.45, 0.75, 0.45], scale: [0.98, 1.04, 0.98] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="absolute inset-0 grid place-items-end"
        animate={{}}
      >
        {imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/numis-hero.png?v=5"
            alt="Numis"
            width={size}
            height={boxH}
            onError={() => setImgOk(false)}
            className="object-contain"
            style={{ width: size, height: 'auto' }}
          />
        ) : (
          <NumisFallback size={size} />
        )}
      </motion.div>
    </div>
  )
}

function FloatingCoin({ className, delay, reduce, small }: { className?: string; delay: number; reduce: boolean; small?: boolean }) {
  const d = small ? 18 : 24
  return (
    <motion.svg
      width={d}
      height={d}
      viewBox="0 0 24 24"
      aria-hidden
      className={`${className} drop-shadow-sm`}
      animate={reduce ? {} : { y: [0, -10, 0], rotate: [0, 12, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <circle cx="12" cy="12" r="10" fill="var(--mp-coin)" stroke="var(--mp-coin-dark)" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="var(--mp-surface)" strokeOpacity="0.6" strokeWidth="1" strokeDasharray="2 3" />
      <text x="12" y="16" textAnchor="middle" fontFamily="serif" fontSize="10" fontWeight="700" fill="var(--mp-surface)">
        €
      </text>
    </motion.svg>
  )
}

function NumisFallback({ size = 220 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" role="img" aria-label="Numis" className="drop-shadow-md">
      <circle cx="80" cy="82" r="62" fill="var(--mp-falta-bg)" />
      <circle cx="80" cy="84" r="50" fill="var(--mp-coin)" stroke="var(--mp-coin-dark)" strokeWidth="3" />
      <circle cx="80" cy="84" r="42" fill="none" stroke="var(--mp-surface)" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="3 5" />
      <g fill="none" stroke="var(--mp-ink)" strokeWidth="3.5">
        <circle cx="64" cy="78" r="12" />
        <circle cx="96" cy="78" r="12" />
        <path d="M76 78h8" strokeLinecap="round" />
      </g>
      <circle cx="64" cy="78" r="3.5" fill="var(--mp-ink)" />
      <circle cx="96" cy="78" r="3.5" fill="var(--mp-ink)" />
      <path d="M64 100q16 14 32 0" fill="none" stroke="var(--mp-ink)" strokeWidth="3.5" strokeLinecap="round" />
      <text x="80" y="60" textAnchor="middle" fontFamily="serif" fontSize="20" fontWeight="700" fill="var(--mp-surface)">
        €
      </text>
    </svg>
  )
}

function Pill({ children, tone }: { children: React.ReactNode; tone?: 'gold' }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone === 'gold' ? 'bg-mp-primary-soft text-mp-primary-strong' : 'bg-mp-surface-muted text-mp-ink'}`}>
      {children}
    </span>
  )
}

function SoonPill() {
  return (
    <span className="rounded-full bg-mp-surface-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-mp-ink-soft">
      em breve
    </span>
  )
}

function formatLabel(format: string) {
  if (format === 'bnc') return 'BNC'
  if (format === 'proof') return 'Proof'
  if (format === 'carteira_bebe') return 'Carteira Bebé'
  if (format === 'carteira_fdc') return 'Carteira FDC'
  return format
}

function relativeTime(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 30) return `há ${days} dias`
  return new Date(iso).toLocaleDateString('pt-PT')
}
