import { useMemo } from 'react'
import { flagOf } from '@/lib/flags'
import { estadoDe, denomCurta } from '@/lib/types'
import { valorReal, eur } from '@/lib/valor'
import type { DisplayRow } from '@/lib/types'
import DenominacaoRow from './DenominacaoRow'

interface PaisDetalheProps {
  paisCodigo: string
  paisNome: string
  rows: DisplayRow[]
  onVoltar: () => void
  onSelect: (row: DisplayRow) => void
}

interface LinhaMatriz {
  key: string
  label: string
  rank: number
  porAno: Map<string, DisplayRow[]>
}

export default function PaisDetalhe({
  paisCodigo, paisNome, rows, onVoltar, onSelect,
}: PaisDetalheProps) {
  const { anos, linhas, stats, faltam } = useMemo(() => {
    const anosSet = new Set<string>()
    const linhasMap = new Map<string, LinhaMatriz>()
    const s = { set: 0, cad: 0, falta: 0, vSet: 0, vCad: 0 }
    const faltaList: DisplayRow[] = []

    for (const r of rows) {
      anosSet.add(r.issue.ano)
      const std = !r.coin.comemorativa
      const key = std ? `s${r.coin.valor_facial}` : `c${r.coin.denominacao}`
      const label = std
        ? denomCurta(r.coin.valor_facial, r.coin.denominacao)
        : (r.coin.denominacao ?? '—').replace('Moed.', '').replace('Moeda de ', '')
      const rank = std ? (r.coin.html_rank ?? 0) : 100 + (r.coin.html_rank ?? 20)

      let linha = linhasMap.get(key)
      if (!linha) {
        linha = { key, label, rank, porAno: new Map() }
        linhasMap.set(key, linha)
      }
      const arr = linha.porAno.get(r.issue.ano) ?? []
      arr.push(r)
      linha.porAno.set(r.issue.ano, arr)

      const est = estadoDe(r.item)
      if (est === 'set') { s.set++; s.vSet += valorReal(r.coin, r.item) }
      else if (est === 'caderneta') { s.cad++; s.vCad += valorReal(r.coin, r.item) }
      else { s.falta++; faltaList.push(r) }
    }

    const anos = [...anosSet].sort((a, b) => {
      const na = parseInt(a, 10), nb = parseInt(b, 10)
      return (isNaN(na) ? 0 : na) - (isNaN(nb) ? 0 : nb) || a.localeCompare(b)
    })
    const linhas = [...linhasMap.values()].sort((a, b) => a.rank - b.rank)
    return { anos, linhas, stats: s, faltam: faltaList }
  }, [rows])

  const total = rows.length
  const naColecao = stats.set + stats.cad
  const pct = total > 0 ? Math.round((naColecao / total) * 100) : 0

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3 print:hidden">
        <button
          onClick={onVoltar}
          className="border border-mp-border rounded-lg px-3 py-2 text-sm font-medium text-mp-ink-soft hover:bg-mp-surface-muted"
        >
          ← Todos os países
        </button>
        <button
          onClick={() => window.print()}
          className="border border-mp-gold rounded-lg px-3 py-2 text-sm font-semibold text-mp-gold-strong hover:bg-mp-falta-bg"
          disabled={faltam.length === 0}
        >
          🖨 Imprimir lista de em falta ({faltam.length})
        </button>
      </div>

      <div className="border border-mp-border rounded-2xl overflow-hidden bg-mp-surface">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-mp-border">
          <span className="text-2xl">{flagOf(paisCodigo)}</span>
          <div className="flex-1 min-w-[160px]">
            <h2 className="font-serif text-lg font-semibold text-mp-ink">{paisNome}</h2>
            <p className="text-xs text-mp-ink-faint">{total} moedas · {naColecao} na coleção · {pct}%</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 bg-mp-set-bg text-mp-set rounded-lg px-2.5 py-1">
              <span className="w-2 h-2 rounded-full bg-mp-set" /> set {stats.set} · {eur(stats.vSet)}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-mp-caderneta-bg text-mp-caderneta rounded-lg px-2.5 py-1">
              <span className="w-2 h-2 rounded-full bg-mp-caderneta" /> caderneta {stats.cad} · {eur(stats.vCad)}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-mp-falta-bg text-mp-falta rounded-lg px-2.5 py-1">
              <span className="w-2 h-2 rounded-full bg-mp-falta" /> não tem {stats.falta}
            </span>
          </div>
          <span className="text-sm text-mp-ink-soft">
            Valor da coleção <b className="font-serif text-mp-gold-strong">{eur(stats.vSet + stats.vCad)}</b>
          </span>
        </div>

        {/* Matriz com scroll horizontal */}
        <div className="overflow-x-auto print:hidden">
          <div className="min-w-max">
            <div className="flex items-end pl-12 pt-3">
              {anos.map((ano) => (
                <div key={ano} className="w-[72px] flex-none text-center">
                  <span className="font-serif text-sm font-semibold text-mp-gold-strong">{ano}</span>
                </div>
              ))}
            </div>
            {/* alinhar células ao cabeçalho: cada coluna 72px (cell 64 + gap) */}
            <div className="pb-3">
              {linhas.map((l) => (
                <DenominacaoRow
                  key={l.key}
                  label={l.label}
                  anos={anos}
                  porAno={l.porAno}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Lista de em falta — só impressão */}
        <div className="hidden print:block p-4">
          <h3 className="font-serif font-semibold mb-2">Em falta — {paisNome} ({faltam.length})</h3>
          <ul className="text-sm">
            {faltam.map((r) => (
              <li key={r.issue.id}>
                {denomCurta(r.coin.valor_facial, r.coin.denominacao)} · {r.issue.ano}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
