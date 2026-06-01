import { useMemo, useState } from 'react'
import { estadoDe } from '@/lib/types'
import { valorReal, eur } from '@/lib/valor'
import type { DisplayRow } from '@/lib/types'
import Flag from './Flag'

interface TabelaViewProps {
  rows: DisplayRow[]
  onSelect: (row: DisplayRow) => void
  onExportar: () => void
  onQuantidade: (row: DisplayRow, qtd: number) => void
  onEstado: (row: DisplayRow, formato: 'set' | 'caderneta' | null) => void
}

type Col = 'pais' | 'tipo' | 'moeda' | 'face' | 'ano' | 'casa' | 'estado' | 'qtd' | 'valor'

function valOf(r: DisplayRow, col: Col): string | number {
  switch (col) {
    case 'pais': return r.coin.pais_nome
    case 'tipo': return r.coin.comemorativa ? 'Comemorativa' : (r.coin.tipo_emissao ?? 'Circulação')
    case 'moeda': return r.coin.comemorativa ? (r.coin.tema || r.coin.titulo || '') : (r.coin.denominacao ?? '')
    case 'face': return r.coin.valor_facial ?? 0
    case 'ano': return r.issue.ano_gregoriano ?? parseInt(r.issue.ano, 10) ?? 0
    case 'casa': return r.item?.casa_moeda || r.issue.casa_moeda || ''
    case 'estado': return estadoDe(r.item)
    case 'qtd': return r.item?.quantidade ?? 0
    case 'valor': return estadoDe(r.item) === 'naotem' ? 0 : valorReal(r.coin, r.item)
  }
}

// Botões S/C — activo = fundo sólido; inactivo = ghost. Clicar no activo limpa (→ não tem).
function EstadoSelector({ est, onChange }: {
  est: 'set' | 'caderneta' | 'naotem'
  onChange: (f: 'set' | 'caderneta' | null) => void
}) {
  const btn = (label: string, val: 'set' | 'caderneta', activeCls: string) => {
    const ativo = est === val
    return (
      <button
        onClick={() => onChange(ativo ? null : val)}
        title={ativo ? 'Retirar (→ não tem)' : val === 'set' ? 'Marcar como Set' : 'Marcar como Caderneta'}
        className={
          'px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none border transition-colors ' +
          (ativo ? activeCls : 'border-mp-border text-mp-ink-faint hover:border-mp-ink-soft hover:text-mp-ink-soft')
        }
      >
        {label}
      </button>
    )
  }
  return (
    <div className="flex gap-1">
      {btn('S', 'set', 'border-mp-set bg-mp-set-bg text-mp-set')}
      {btn('C', 'caderneta', 'border-mp-caderneta bg-mp-caderneta-bg text-mp-caderneta')}
    </div>
  )
}

export default function TabelaView({ rows, onSelect, onExportar, onQuantidade, onEstado }: TabelaViewProps) {
  const [sort, setSort] = useState<{ col: Col; dir: 1 | -1 }>({ col: 'pais', dir: 1 })

  const ordenadas = useMemo(() => {
    return [...rows].sort((a, b) => {
      const va = valOf(a, sort.col), vb = valOf(b, sort.col)
      let cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb))
      if (cmp === 0) cmp = a.coin.pais_nome.localeCompare(b.coin.pais_nome)
        || (a.issue.ano_gregoriano ?? 0) - (b.issue.ano_gregoriano ?? 0)
      return cmp * sort.dir
    })
  }, [rows, sort])

  function th(col: Col, label: string, extra = '') {
    const ativo = sort.col === col
    return (
      <th
        onClick={() => setSort((s) => ({ col, dir: s.col === col && s.dir === 1 ? -1 : 1 }))}
        className={'px-3 py-2 font-semibold cursor-pointer select-none whitespace-nowrap hover:text-mp-ink ' + extra}
      >
        {label}{ativo ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
      </th>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-mp-ink-soft">{rows.length} moedas no catálogo (com o filtro atual)</p>
        <button
          onClick={onExportar}
          className="border border-mp-gold rounded-lg px-3 py-2 text-sm font-semibold text-mp-gold-strong hover:bg-mp-falta-bg"
        >
          ⤓ Exportar Excel
        </button>
      </div>

      <div className="border border-mp-border rounded-2xl overflow-auto max-h-[70vh] bg-mp-surface">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-mp-surface-muted text-mp-ink-soft text-left text-[11px] uppercase tracking-wide z-10">
            <tr>
              {th('pais', 'País')}
              {th('tipo', 'Tipo')}
              {th('moeda', 'Moeda / Comemoração')}
              {th('face', 'Face', 'text-right')}
              {th('ano', 'Ano')}
              {th('casa', 'Casa')}
              {th('estado', 'Estado')}
              {th('qtd', 'Qtd', 'text-right')}
              {th('valor', 'Valor', 'text-right')}
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((r) => {
              const est = estadoDe(r.item)
              return (
                <tr
                  key={r.issue.id}
                  onClick={() => onSelect(r)}
                  className="border-t border-mp-border/60 hover:bg-mp-surface-muted cursor-pointer"
                >
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5"><Flag code={r.coin.pais_codigo} size={14} /> {r.coin.pais_nome}</span>
                  </td>
                  <td className="px-3 py-1.5 text-mp-ink-soft">{r.coin.comemorativa ? 'Comemorativa' : (r.coin.tipo_emissao ?? 'Circulação')}</td>
                  <td className="px-3 py-1.5 max-w-[260px] truncate" title={String(valOf(r, 'moeda'))}>{valOf(r, 'moeda') || '—'}</td>
                  <td className="px-3 py-1.5 text-right">{r.coin.valor_facial != null ? eur(r.coin.valor_facial) : '—'}</td>
                  <td className="px-3 py-1.5">{r.issue.ano}</td>
                  <td className="px-3 py-1.5">{r.item?.casa_moeda || r.issue.casa_moeda || '—'}</td>
                  <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <EstadoSelector est={est} onChange={(f) => onEstado(r, f)} />
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onQuantidade(r, (r.item?.quantidade ?? 0) - 1)}
                        disabled={(r.item?.quantidade ?? 0) <= 0}
                        className="w-6 h-6 rounded border border-mp-border text-mp-ink-soft hover:bg-mp-surface disabled:opacity-30 leading-none"
                        aria-label="Menos um"
                      >−</button>
                      <input
                        type="number"
                        min={0}
                        value={r.item?.quantidade ?? 0}
                        onChange={(e) => onQuantidade(r, parseInt(e.target.value, 10) || 0)}
                        className="w-12 text-center bg-mp-surface border border-mp-border rounded px-1 py-0.5 text-sm outline-none focus:border-mp-gold"
                      />
                      <button
                        onClick={() => onQuantidade(r, (r.item?.quantidade ?? 0) + 1)}
                        className="w-6 h-6 rounded border border-mp-border text-mp-ink-soft hover:bg-mp-surface leading-none"
                        aria-label="Mais um"
                      >+</button>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right text-mp-gold-strong">{est === 'naotem' ? '—' : eur(valorReal(r.coin, r.item))}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
