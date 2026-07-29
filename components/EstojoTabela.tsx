'use client'

import { useMemo, useState } from 'react'
import Flag from '@/components/Flag'
import EstojoPosicao from '@/components/EstojoPosicao'
import EstojoVariante from '@/components/EstojoVariante'
import { eur } from '@/lib/valor'
import { ordenarPorCasa, type EstojoConteudoItem, type VarianteOpcao } from '@/lib/estojos'

const FORMATO_CURTO: Record<string, string> = {
  bnc: 'BNC', proof: 'Proof', normal: 'Normal', carteira_fdc: 'Carteira FDC', carteira_bebe: 'Carteira bebé',
}
const METAIS_PT: Record<string, string> = {
  gold: 'Ouro', silver: 'Prata', copper: 'Cobre', bronze: 'Bronze', brass: 'Latão',
  nickel: 'Níquel', bimetallic: 'Bimetálica', 'copper-nickel': 'Cuproníquel', cupronickel: 'Cuproníquel',
  steel: 'Aço', billon: 'Bolhão', tin: 'Estanho', zinc: 'Zinco',
}
export const metalPt = (m: string | null) => (m ? METAIS_PT[m.toLowerCase()] ?? m : '—')
export const formatoPt = (f: string | null) => (f ? FORMATO_CURTO[f] ?? f : '—')
export const anoNum = (a: string | null) => parseInt(a ?? '', 10) || 0

type Campo = 'casa' | 'moeda' | 'serie' | 'ano' | 'variante' | 'estado' | 'grau' | 'metal' | 'valor' | 'qtd'

const CHAVE: Record<Campo, (i: EstojoConteudoItem) => string | number> = {
  casa: (i) => (i.folha ?? 1) * 1e6 + (i.linha ?? 0) * 1e3 + (i.coluna ?? 0),
  moeda: (i) => i.denominacao ?? i.titulo,
  serie: (i) => i.serie ?? '',
  ano: (i) => anoNum(i.ano),
  variante: (i) => i.variante ?? '',
  estado: (i) => formatoPt(i.formato),
  grau: (i) => i.grau ?? '',
  metal: (i) => metalPt(i.metal),
  valor: (i) => (i.valorMercado ?? 0) * i.quantidade,
  qtd: (i) => i.quantidade,
}

const COLUNAS: { campo: Campo; label: string; direita?: boolean }[] = [
  { campo: 'casa', label: 'Folha · Linha · Coluna' },
  { campo: 'moeda', label: 'Moeda' },
  { campo: 'serie', label: 'Coleção / Série' },
  { campo: 'ano', label: 'Ano' },
  { campo: 'variante', label: 'Variante' },
  { campo: 'estado', label: 'Estado' },
  { campo: 'grau', label: 'Grau' },
  { campo: 'metal', label: 'Metal' },
  { campo: 'valor', label: 'Valor mercado', direita: true },
  { campo: 'qtd', label: 'Qtd', direita: true },
]

export default function EstojoTabela({
  itens,
  temGrelha,
  grelha,
  variantes,
  bloqueado,
  onRecarregar,
  onRemover,
}: {
  itens: EstojoConteudoItem[]
  temGrelha: boolean
  grelha: { linhas: number | null; colunas: number | null }
  variantes: Record<string, VarianteOpcao[]>
  bloqueado: boolean
  onRecarregar: () => void
  onRemover: (alocacaoId: string) => void
}) {
  const [ord, setOrd] = useState<{ campo: Campo | null; desc: boolean }>({ campo: null, desc: false })

  const lista = useMemo(() => {
    if (!ord.campo) return [...itens].sort(ordenarPorCasa)
    const chave = CHAVE[ord.campo]
    const sinal = ord.desc ? -1 : 1
    return [...itens].sort((a, b) => {
      const x = chave(a)
      const y = chave(b)
      const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt')
      return cmp * sinal || ordenarPorCasa(a, b)
    })
  }, [itens, ord])

  function ordenarPor(campo: Campo) {
    setOrd((cur) => (cur.campo === campo ? { campo, desc: !cur.desc } : { campo, desc: false }))
  }

  const th = 'px-3 py-2.5 font-semibold whitespace-nowrap'
  const td = 'px-3 py-2 whitespace-nowrap'
  const colunas = COLUNAS.filter((c) => c.campo !== 'casa' || temGrelha)

  return (
    <div className="overflow-x-auto rounded-2xl border border-mp-border bg-mp-surface">
      <table className="w-full text-left font-sans text-sm">
        <thead>
          <tr className="border-b border-mp-border text-[11px] uppercase tracking-wide text-mp-ink-faint">
            <th className={th}>#</th>
            {colunas.map((c) => (
              <th key={c.campo} className={th + (c.direita ? ' text-right' : '')}>
                <button
                  onClick={() => ordenarPor(c.campo)}
                  className={`uppercase tracking-wide hover:text-mp-gold-strong ${ord.campo === c.campo ? 'text-mp-gold-strong' : ''}`}
                >
                  {c.label}
                  {ord.campo === c.campo && <span className="ml-1">{ord.desc ? '↓' : '↑'}</span>}
                </button>
              </th>
            ))}
            <th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {lista.map((i, idx) => (
            <tr key={i.alocacaoId} className="border-b border-mp-border last:border-0 hover:bg-mp-surface-muted">
              <td className={td + ' font-serif font-semibold text-mp-gold'}>{idx + 1}</td>
              {temGrelha && (
                <td className={td}>
                  {bloqueado ? (
                    <span className="text-mp-ink-soft">
                      {i.linha && i.coluna ? `F${i.folha ?? 1} · L${i.linha} · C${i.coluna}` : '—'}
                    </span>
                  ) : (
                    <EstojoPosicao item={i} grelha={grelha} onGuardado={onRecarregar} />
                  )}
                </td>
              )}
              <td className={td}>
                <span className="flex items-center gap-2.5 text-mp-ink">
                  <Flag code={i.paisCodigo} size={18} />
                  <span>
                    {i.denominacao ?? i.titulo}
                    {i.paisNome && <span className="text-mp-ink-faint"> · {i.paisNome}</span>}
                  </span>
                </span>
              </td>
              <td className={td + ' text-mp-ink-soft'}>{i.serie ?? '—'}</td>
              <td className={td + ' text-mp-ink-soft'}>{i.ano ?? '—'}</td>
              <td className={td + ' text-mp-ink-soft'}>
                {bloqueado ? (
                  i.variante ?? '—'
                ) : (
                  <EstojoVariante item={i} opcoes={variantes[i.coinId ?? ''] ?? []} onGuardado={onRecarregar} />
                )}
              </td>
              <td className={td + ' text-mp-ink-soft'}>{formatoPt(i.formato)}</td>
              <td className={td + ' text-mp-ink-soft'}>{i.grau ?? '—'}</td>
              <td className={td + ' text-mp-ink-soft'}>{metalPt(i.metal)}</td>
              <td className={td + ' text-right tabular-nums text-mp-gold-strong'}>
                {i.valorMercado != null ? eur(i.valorMercado * i.quantidade) : '—'}
              </td>
              <td className={td + ' text-right font-medium text-mp-ink'}>{i.quantidade}</td>
              <td className={td + ' text-right'}>
                {!bloqueado && (
                  <button onClick={() => onRemover(i.alocacaoId)} title="Retirar desta casa" className="rounded-lg px-2 py-1 text-xs text-mp-falta hover:bg-mp-falta-bg">
                    Retirar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
