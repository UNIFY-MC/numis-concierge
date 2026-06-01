import { useMemo, useState } from 'react'
import { eur } from '@/lib/valor'
import { COLECAO_ALEMA, type MoedaColecaoAlema } from '@/lib/data/colecao-alema'

// Secção "Coleção" do detalhe da Alemanha: moedas de coleção (5/20/25/35€ prata,
// 5€ polímero, 20/50/100/200€ ouro) emitidas pela Münze Deutschland, além das 2€
// comemorativas. Cada moeda é cunhada nas 5 casas (A/D/F/G/J) — o conjunto
// completo tem 5 exemplares. Catálogo de referência (curso legal só na Alemanha).

function vfLabel(vf: number): string {
  return eur(vf).replace('€ ', '') + ' €'
}

export default function ColecaoAlema() {
  const [serieFiltro, setSerieFiltro] = useState('')

  const series = useMemo(() => {
    const s = new Set<string>()
    for (const m of COLECAO_ALEMA) if (m.serie) s.add(m.serie)
    return [...s].sort((a, b) => a.localeCompare(b, 'pt'))
  }, [])

  const filtradas = useMemo(
    () => (serieFiltro ? COLECAO_ALEMA.filter((m) => m.serie === serieFiltro) : COLECAO_ALEMA),
    [serieFiltro],
  )

  const porAno = useMemo(() => {
    const m = new Map<number, MoedaColecaoAlema[]>()
    for (const moeda of filtradas) {
      const arr = m.get(moeda.ano) ?? []
      arr.push(moeda)
      m.set(moeda.ano, arr)
    }
    return [...m.entries()].sort((a, b) => b[0] - a[0])
  }, [filtradas])

  return (
    <div className="px-4 py-4">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <p className="text-xs text-mp-ink-soft bg-mp-surface-muted rounded-lg px-3 py-2 flex-1 min-w-[220px]">
          Moedas de coleção da <b>Münze Deutschland</b> além das 2€: 5€ com anel de polímero,
          20/25/35€ em prata e 20/50/100/200€ em ouro. Cada moeda é cunhada nas <b>5 casas
          (A·D·F·G·J)</b> — o conjunto completo tem 5 exemplares. Curso legal só na Alemanha.
        </p>
        <select
          value={serieFiltro}
          onChange={(e) => setSerieFiltro(e.target.value)}
          className="h-9 rounded-lg border border-mp-border bg-mp-surface px-2 text-sm text-mp-ink outline-none focus:border-mp-gold"
        >
          <option value="">Todas as séries ({COLECAO_ALEMA.length})</option>
          {series.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="space-y-5">
        {porAno.map(([ano, moedas]) => (
          <div key={ano}>
            <div className="flex items-baseline gap-2 mb-2">
              <h3 className="font-serif text-lg font-semibold text-mp-gold-strong">{ano}</h3>
              <span className="text-xs text-mp-ink-faint">{moedas.length} moedas</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {moedas.map((m, i) => (
                <div key={`${ano}-${i}`} className="border border-mp-border rounded-xl px-3 py-2.5 bg-mp-surface">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-mp-ink leading-tight">{m.tema}</span>
                    <span className="flex-none text-xs font-serif font-semibold text-mp-gold-strong">{vfLabel(m.vf)}</span>
                  </div>
                  {m.serie && <p className="text-[11px] text-mp-ink-soft mt-0.5">{m.serie}</p>}
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    <span className="text-[10px] rounded px-1.5 py-0.5 bg-mp-surface-muted text-mp-ink-soft">
                      {m.metal}
                    </span>
                    <span className="text-[10px] text-mp-ink-faint">
                      casas {m.casas.join('·')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
