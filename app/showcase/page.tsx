import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

const SWATCHES: { token: string; cls: string }[] = [
  { token: 'mp-bg', cls: 'bg-mp-bg' },
  { token: 'mp-surface', cls: 'bg-mp-surface' },
  { token: 'mp-surface-muted', cls: 'bg-mp-surface-muted' },
  { token: 'mp-border', cls: 'bg-mp-border' },
  { token: 'mp-gold', cls: 'bg-mp-gold' },
  { token: 'mp-gold-strong', cls: 'bg-mp-gold-strong' },
  { token: 'mp-gold-soft', cls: 'bg-mp-gold-soft' },
  { token: 'mp-primary', cls: 'bg-mp-primary' },
  { token: 'mp-primary-strong', cls: 'bg-mp-primary-strong' },
  { token: 'mp-primary-soft', cls: 'bg-mp-primary-soft' },
  { token: 'mp-set', cls: 'bg-mp-set' },
  { token: 'mp-caderneta', cls: 'bg-mp-caderneta' },
  { token: 'mp-falta', cls: 'bg-mp-falta' },
  { token: 'mp-bebe', cls: 'bg-mp-bebe' },
  { token: 'mp-coin', cls: 'bg-mp-coin' },
  { token: 'mp-coin-empty', cls: 'bg-mp-coin-empty' },
]

const STATES: { label: string; dot: string; fg: string; bg: string }[] = [
  { label: 'Em set', dot: 'bg-mp-set', fg: 'text-mp-set', bg: 'bg-mp-set-bg' },
  { label: 'Em caderneta', dot: 'bg-mp-caderneta', fg: 'text-mp-caderneta', bg: 'bg-mp-caderneta-bg' },
  { label: 'Não tem', dot: 'bg-mp-falta', fg: 'text-mp-falta', bg: 'bg-mp-falta-bg' },
  { label: 'Caderneta bebé', dot: 'bg-mp-bebe', fg: 'text-mp-bebe', bg: 'bg-mp-bebe-bg' },
]

export default function ShowcasePage() {
  return (
    <main className="mx-auto max-w-5xl space-y-10 px-6 py-10">
      <header className="space-y-1">
        <h1 className="font-serif text-4xl text-mp-gold-strong">Showcase — Moedas do Pinto</h1>
        <p className="font-sans text-mp-ink-soft">
          Validação da fundação: tokens, tipografia e primitivos. Tudo a partir de{' '}
          <code className="text-mp-ink">globals.css</code> — espelho de{' '}
          <code className="text-mp-ink">design/DESIGN.md</code>.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl text-mp-ink">Paleta</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-8">
          {SWATCHES.map((s) => (
            <div key={s.token} className="space-y-1">
              <div className={`h-14 rounded-md border border-mp-border ${s.cls}`} />
              <p className="font-sans text-xs text-mp-ink-soft">{s.token}</p>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="font-serif text-2xl text-mp-ink">Tipografia</h2>
        <p className="font-serif text-5xl text-mp-gold-strong">€ 3037,98</p>
        <p className="font-serif text-2xl text-mp-ink">Fraunces — títulos e números</p>
        <p className="font-sans text-base text-mp-ink">Inter — corpo e UI (regular)</p>
        <p className="font-sans text-sm text-mp-ink-faint">Inter — labels e metadata (faint)</p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="font-serif text-2xl text-mp-ink">Estados da coleção</h2>
        <div className="flex flex-wrap gap-3">
          {STATES.map((s) => (
            <span key={s.label} className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${s.bg}`}>
              <span className={`size-2.5 rounded-full ${s.dot}`} />
              <span className={`font-sans text-sm font-medium ${s.fg}`}>{s.label}</span>
            </span>
          ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="font-serif text-2xl text-mp-ink">Primitivos</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primário</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secundário</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-mp-ink">Portugal</CardTitle>
              <CardDescription className="text-mp-ink-soft">84.9% completo · 4738 moedas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={85} />
              <p className="font-serif text-2xl text-mp-gold">€ 1442,29</p>
            </CardContent>
          </Card>
          <Card className="bg-mp-surface-muted">
            <CardHeader>
              <CardTitle className="font-serif text-mp-ink">Superfície recuada</CardTitle>
              <CardDescription className="text-mp-ink-soft">bg-mp-surface-muted</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-sans text-sm text-mp-ink-soft">
                Elevação por cor: bg → surface → surface-muted.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
