import { useEffect, useMemo, useState } from 'react'
import { estadoDe, denomCurta } from '@/lib/types'
import { valorReal, eur } from '@/lib/valor'
import { casaAlemanha } from '@/lib/alemanha'
import type { DisplayRow, Estado } from '@/lib/types'
import DenominacaoRow from './DenominacaoRow'
import CoinList from './CoinList'
import PaisIntro from './PaisIntro'
import ColecaoAlema from './ColecaoAlema'
import Flag from './Flag'

interface PaisDetalheProps {
  paisCodigo: string
  paisNome: string
  rows: DisplayRow[]
  onVoltar: () => void
  onSelect: (row: DisplayRow) => void
  onImprimir: () => void
}

interface LinhaMatriz {
  key: string
  label: string
  rank: number
  porAno: Map<string, DisplayRow[]>
}

interface Aba {
  anos: string[]
  linhas: LinhaMatriz[]
  stats: { set: number; cad: number; falta: number; vSet: number; vCad: number }
  total: number
}

type AbaTipo = 'circulacao' | 'comemorativas' | 'colecao'

function construirAba(rows: DisplayRow[], comemorativas: boolean): Aba {
  const anosSet = new Set<string>()
  const linhasMap = new Map<string, LinhaMatriz>()
  const stats = { set: 0, cad: 0, falta: 0, vSet: 0, vCad: 0 }

  for (const r of rows) {
    anosSet.add(r.issue.ano)
    // Circulação: uma linha por valor facial. Comemorativas: uma linha por tipo (coin.id).
    const key = comemorativas ? `c${r.coin.id}` : `s${r.coin.valor_facial}`
    const label = comemorativas
      ? (r.coin.tema || r.coin.denominacao || r.coin.titulo || '2€')
      : denomCurta(r.coin.valor_facial, r.coin.denominacao)
    const rank = comemorativas ? (r.coin.html_rank ?? 20) : (r.coin.html_rank ?? 0)

    let linha = linhasMap.get(key)
    if (!linha) {
      linha = { key, label, rank, porAno: new Map() }
      linhasMap.set(key, linha)
    }
    const arr = linha.porAno.get(r.issue.ano) ?? []
    arr.push(r)
    linha.porAno.set(r.issue.ano, arr)

    const est = estadoDe(r.item)
    if (est === 'set') { stats.set++; stats.vSet += valorReal(r.coin, r.item) }
    else if (est === 'caderneta') { stats.cad++; stats.vCad += valorReal(r.coin, r.item) }
    else { stats.falta++ }
  }

  const anos = [...anosSet].sort((a, b) => {
    const na = parseInt(a, 10), nb = parseInt(b, 10)
    return (isNaN(na) ? 0 : na) - (isNaN(nb) ? 0 : nb) || a.localeCompare(b)
  })
  const linhas = comemorativas
    ? [...linhasMap.values()].sort((a, b) => a.label.localeCompare(b.label))
    : [...linhasMap.values()].sort((a, b) => a.rank - b.rank)
  return { anos, linhas, stats, total: rows.length }
}

export default function PaisDetalhe({
  paisCodigo, paisNome, rows, onVoltar, onSelect, onImprimir,
}: PaisDetalheProps) {
  // Filtro: chips set/caderneta/não tem escondem as restantes. Vazio = mostra tudo.
  const [filtro, setFiltro] = useState<Set<Estado>>(new Set())
  const [aba, setAba] = useState<AbaTipo>('circulacao')
  const [vistaComem, setVistaComem] = useState<'lista' | 'matriz'>('lista')

  // Ao trocar de país, recomeçar na aba Circulação (a aba Coleção só existe em
  // alguns países — evita ficar presa numa aba inválida).
  useEffect(() => { setAba('circulacao'); setVistaComem('lista') }, [paisCodigo])

  // Stats e total sempre sobre o conjunto completo (chips mostram os totais reais).
  const statsTab = useMemo(() => ({
    circulacao: construirAba(rows.filter((r) => !r.coin.comemorativa), false),
    comemorativas: construirAba(rows.filter((r) => r.coin.comemorativa), true),
  }), [rows])

  // Vista filtrada pelo estado selecionado.
  const { circulacao, comemorativas, rowsComem } = useMemo(() => {
    const passa = (r: DisplayRow) => filtro.size === 0 || filtro.has(estadoDe(r.item))
    const rc = rows.filter((r) => r.coin.comemorativa && passa(r))
    return {
      circulacao: construirAba(rows.filter((r) => !r.coin.comemorativa && passa(r)), false),
      comemorativas: construirAba(rc, true),
      rowsComem: rc,
    }
  }, [rows, filtro])

  const ativa = aba === 'circulacao' ? circulacao : comemorativas
  const { anos, linhas } = ativa
  const stats = (aba === 'circulacao' ? statsTab.circulacao : statsTab.comemorativas).stats
  const totalTab = (aba === 'circulacao' ? statsTab.circulacao : statsTab.comemorativas).total
  const naColecao = stats.set + stats.cad
  const pct = totalTab > 0 ? Math.round((naColecao / totalTab) * 100) : 0
  const ehComem = aba === 'comemorativas'
  const ehColecao = aba === 'colecao'
  const ehAlemanha = paisCodigo.split('-')[0] === 'de'
  const casa = casaAlemanha(paisCodigo)

  function toggle(e: Estado) {
    setFiltro((cur) => {
      const next = new Set(cur)
      if (next.has(e)) next.delete(e)
      else next.add(e)
      return next
    })
  }

  const chipBase = 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-shadow cursor-pointer'
  const chipAtivo = (on: boolean) => (on ? ' ring-2 ring-mp-gold ring-offset-1 ring-offset-mp-surface' : ' hover:opacity-80')
  const tabBase = 'px-4 py-2 text-sm font-medium rounded-lg transition-colors'

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
          onClick={onImprimir}
          className="border border-mp-gold rounded-lg px-3 py-2 text-sm font-semibold text-mp-gold-strong hover:bg-mp-falta-bg disabled:opacity-50"
          disabled={stats.falta === 0}
        >
          🖨 Imprimir lista de em falta ({stats.falta})
        </button>
      </div>

      <div className="border border-mp-border rounded-2xl overflow-hidden bg-mp-surface">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-mp-border print:hidden">
          <Flag code={paisCodigo.split('-')[0]} size={26} />
          <div className="flex-1 min-w-[160px]">
            <h2 className="font-serif text-lg font-semibold text-mp-ink">{paisNome}</h2>
            {casa && (
              <p className="text-[11px] text-mp-ink-soft leading-tight">{casa.casa} · {casa.cidade}</p>
            )}
            <p className="text-xs text-mp-ink-faint">{totalTab} moedas · {naColecao} na coleção · {pct}%</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => toggle('set')}
              className={chipBase + ' bg-mp-set-bg text-mp-set' + chipAtivo(filtro.has('set'))}
            >
              <span className="w-2 h-2 rounded-full bg-mp-set" /> set {stats.set} · {eur(stats.vSet)}
            </button>
            <button
              type="button"
              onClick={() => toggle('caderneta')}
              className={chipBase + ' bg-mp-caderneta-bg text-mp-caderneta' + chipAtivo(filtro.has('caderneta'))}
            >
              <span className="w-2 h-2 rounded-full bg-mp-caderneta" /> caderneta {stats.cad} · {eur(stats.vCad)}
            </button>
            <button
              type="button"
              onClick={() => toggle('naotem')}
              className={chipBase + ' bg-mp-falta-bg text-mp-falta' + chipAtivo(filtro.has('naotem'))}
            >
              <span className="w-2 h-2 rounded-full bg-mp-falta" /> não tem {stats.falta}
            </button>
          </div>
          <span className="text-sm text-mp-ink-soft">
            Valor da coleção <b className="font-serif text-mp-gold-strong">{eur(stats.vSet + stats.vCad)}</b>
          </span>
        </div>

        <PaisIntro paisCodigo={paisCodigo} />

        {/* Tabs Circulação / Comemorativas */}
        <div className="flex gap-2 px-4 pt-3 print:hidden">
          <button
            onClick={() => setAba('circulacao')}
            className={tabBase + (aba === 'circulacao' ? ' bg-mp-gold text-white' : ' text-mp-ink-soft hover:bg-mp-surface-muted')}
          >
            Circulação ({circulacao.total})
          </button>
          <button
            onClick={() => setAba('comemorativas')}
            className={tabBase + (aba === 'comemorativas' ? ' bg-mp-gold text-white' : ' text-mp-ink-soft hover:bg-mp-surface-muted')}
          >
            Comemorativas ({statsTab.comemorativas.total})
          </button>
          {ehAlemanha && (
            <button
              onClick={() => setAba('colecao')}
              className={tabBase + (ehColecao ? ' bg-mp-gold text-white' : ' text-mp-ink-soft hover:bg-mp-surface-muted')}
            >
              Coleção
            </button>
          )}
          {ehComem && (
            <div className="ml-auto flex gap-1 rounded-lg bg-mp-surface-muted p-0.5">
              <button
                onClick={() => setVistaComem('lista')}
                className={'px-3 py-1 text-xs font-medium rounded-md ' + (vistaComem === 'lista' ? 'bg-mp-surface text-mp-ink shadow-sm' : 'text-mp-ink-soft')}
              >
                ☰ Lista
              </button>
              <button
                onClick={() => setVistaComem('matriz')}
                className={'px-3 py-1 text-xs font-medium rounded-md ' + (vistaComem === 'matriz' ? 'bg-mp-surface text-mp-ink shadow-sm' : 'text-mp-ink-soft')}
              >
                ▦ Matriz
              </button>
            </div>
          )}
        </div>

        {ehColecao && ehAlemanha ? (
          <div className="print:hidden">
            <ColecaoAlema />
          </div>
        ) : ehComem && vistaComem === 'lista' ? (
          <div className="print:hidden py-1">
            {rowsComem.length === 0
              ? <p className="text-sm text-mp-ink-faint px-4 py-8 text-center">Sem comemorativas para este país.</p>
              : <CoinList rows={rowsComem} onSelect={onSelect} destaque={filtro} />}
          </div>
        ) : (
        /* Matriz com scroll horizontal */
        <div className="overflow-x-auto print:hidden">
          {linhas.length === 0 ? (
            <p className="text-sm text-mp-ink-faint px-4 py-8 text-center">
              Sem {ehComem ? 'comemorativas' : 'moedas de circulação'} para este país.
            </p>
          ) : (
            <div className="min-w-max">
              <div className={`flex items-end pt-3 ${ehComem ? 'pl-28' : 'pl-12'}`}>
                {anos.map((ano) => (
                  <div key={ano} className="w-[72px] flex-none text-center">
                    <span className="font-serif text-sm font-semibold text-mp-gold-strong">{ano}</span>
                  </div>
                ))}
              </div>
              <div className="pb-3">
                {linhas.map((l) => (
                  <DenominacaoRow
                    key={l.key}
                    label={l.label}
                    comemorativa={ehComem}
                    anos={anos}
                    porAno={l.porAno}
                    onSelect={onSelect}
                    destaque={filtro}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
