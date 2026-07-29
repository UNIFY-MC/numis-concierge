'use client'

import Flag from '@/components/Flag'
import type { CSSProperties } from 'react'
import type { EstojoConteudoItem, Posicao } from '@/lib/estojos'

// Réplica visual do estojo: uma folha por página do álbum, cada casa uma moeda.
export default function EstojoGrelha({
  itens,
  linhas,
  colunas,
  posicao,
  onEscolher,
  onRemover,
}: {
  itens: EstojoConteudoItem[]
  linhas: number
  colunas: number
  posicao: Posicao
  onEscolher: (p: Posicao) => void
  onRemover: (alocacaoId: string) => void
}) {
  const porCasa = new Map<string, EstojoConteudoItem>()
  for (const i of itens) if (i.linha && i.coluna) porCasa.set(`${i.folha ?? 1}:${i.linha}:${i.coluna}`, i)

  const maxFolha = itens.reduce((m, i) => Math.max(m, i.folha ?? 1), 1)
  const folhas = Array.from({ length: Math.max(maxFolha, posicao.folha) }, (_, i) => i + 1)
  const soltas = itens.filter((i) => !i.linha || !i.coluna)
  const grid = { '--cols': colunas } as CSSProperties

  return (
    <div className="space-y-6">
      {folhas.map((f) => (
        <section key={f}>
          <h3 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-mp-ink-faint">
            Folha {f}
          </h3>
          <div
            style={grid}
            className="grid gap-2 [grid-template-columns:repeat(var(--cols),minmax(0,1fr))]"
          >
            {Array.from({ length: linhas * colunas }, (_, n) => {
              const linha = Math.floor(n / colunas) + 1
              const coluna = (n % colunas) + 1
              const item = porCasa.get(`${f}:${linha}:${coluna}`)
              const activa = posicao.folha === f && posicao.linha === linha && posicao.coluna === coluna
              return (
                <Casa
                  key={n}
                  item={item}
                  activa={activa}
                  etiqueta={`L${linha} · C${coluna}`}
                  onEscolher={() => onEscolher({ folha: f, linha, coluna })}
                  onRemover={onRemover}
                />
              )
            })}
          </div>
        </section>
      ))}

      {soltas.length > 0 && (
        <p className="font-sans text-xs text-mp-ink-soft">
          {soltas.length} exemplares neste estojo ainda sem casa atribuída (ver tabela).
        </p>
      )}
    </div>
  )
}

function Casa({
  item,
  activa,
  etiqueta,
  onEscolher,
  onRemover,
}: {
  item: EstojoConteudoItem | undefined
  activa: boolean
  etiqueta: string
  onEscolher: () => void
  onRemover: (alocacaoId: string) => void
}) {
  const base = 'group relative aspect-square rounded-xl border p-2 text-left transition-colors'
  const estado = item
    ? 'border-mp-border bg-mp-surface hover:border-mp-gold'
    : 'border-dashed border-mp-border bg-mp-surface-muted/40 hover:border-mp-gold'
  const foco = activa ? ' ring-2 ring-mp-gold' : ''

  return (
    <button type="button" onClick={onEscolher} className={`${base} ${estado}${foco}`} title={etiqueta}>
      <span className="absolute right-1.5 top-1.5 font-sans text-[9px] uppercase tracking-wide text-mp-ink-faint">
        {etiqueta}
      </span>
      {item ? (
        <span className="flex h-full flex-col justify-center gap-1 pt-3">
          <Flag code={item.paisCodigo} size={16} />
          <span className="font-sans text-[11px] font-medium leading-tight text-mp-ink">
            {item.denominacao ?? item.titulo}
          </span>
          <span className="font-serif text-xs text-mp-gold-strong">{item.ano ?? '—'}</span>
          {item.quantidade > 1 && (
            <span className="font-sans text-[10px] text-mp-ink-faint">×{item.quantidade}</span>
          )}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onRemover(item.alocacaoId) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onRemover(item.alocacaoId) } }}
            className="absolute bottom-1.5 right-1.5 hidden rounded-md px-1.5 py-0.5 font-sans text-[10px] text-mp-falta hover:bg-mp-falta-bg group-hover:block"
          >
            Retirar
          </span>
        </span>
      ) : (
        <span className="grid h-full place-items-center font-serif text-lg text-mp-ink-faint group-hover:text-mp-gold">
          +
        </span>
      )}
    </button>
  )
}
