'use client'

// Barra de folhas do estojo: saltar de folha e limitar a vista à folha em uso.
// Serve a grelha e a tabela — as duas vistas partilham o mesmo estado.
export default function EstojoFolhas({
  folhas,
  activa,
  soAFolha,
  onFolha,
  onSoAFolha,
}: {
  folhas: number
  activa: number
  soAFolha: boolean
  onFolha: (f: number) => void
  onSoAFolha: (v: boolean) => void
}) {
  const chip = (on: boolean) =>
    `rounded-lg px-2.5 py-1 font-sans text-xs font-semibold transition-colors ${on ? 'bg-mp-gold text-white' : 'text-mp-ink-soft hover:bg-mp-surface-muted'}`

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-mp-border bg-mp-surface p-2 print:hidden">
      <span className="px-1 font-sans text-[10px] uppercase tracking-wide text-mp-ink-faint">Folha</span>
      {Array.from({ length: folhas }, (_, i) => i + 1).map((f) => (
        <button key={f} onClick={() => onFolha(f)} className={chip(f === activa)}>{f}</button>
      ))}
      <button onClick={() => onFolha(folhas + 1)} className={chip(false)} title="Começar uma folha nova">+</button>
      <label className="ml-auto flex items-center gap-2 px-1 font-sans text-xs text-mp-ink-soft">
        <input type="checkbox" checked={soAFolha} onChange={(e) => onSoAFolha(e.target.checked)} className="h-4 w-4 accent-mp-gold" />
        Mostrar só esta folha
      </label>
    </div>
  )
}
