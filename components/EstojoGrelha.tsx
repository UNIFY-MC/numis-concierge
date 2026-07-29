'use client'

import Flag from '@/components/Flag'
import { useState, type CSSProperties } from 'react'
import type { EstojoConteudoItem, Posicao } from '@/lib/estojos'

// Réplica visual do estojo: uma folha por página do álbum, cada casa uma moeda.
export default function EstojoGrelha({
  itens,
  linhas,
  colunas,
  posicao,
  onEscolher,
  onFolha,
  onRemover,
}: {
  itens: EstojoConteudoItem[]
  linhas: number
  colunas: number
  posicao: Posicao
  onEscolher: (p: Posicao) => void
  onFolha: (f: number) => void
  onRemover: (alocacaoId: string) => void
}) {
  // Ao inserir em série convém ver só a folha em uso; a lista toda é ruído.
  const [soAFolha, setSoAFolha] = useState(true)

  const porCasa = new Map<string, EstojoConteudoItem>()
  for (const i of itens) if (i.linha && i.coluna) porCasa.set(`${i.folha ?? 1}:${i.linha}:${i.coluna}`, i)

  const maxFolha = itens.reduce((m, i) => Math.max(m, i.folha ?? 1), 1)
  const todas = Array.from({ length: Math.max(maxFolha, posicao.folha) }, (_, i) => i + 1)
  const folhas = soAFolha ? todas.filter((f) => f === posicao.folha) : todas
  const soltas = itens.filter((i) => !i.linha || !i.coluna)
  const grid = { '--cols': colunas } as CSSProperties
  const chip = (on: boolean) =>
    `rounded-lg px-2.5 py-1 font-sans text-xs font-semibold transition-colors ${on ? 'bg-mp-gold text-white' : 'text-mp-ink-soft hover:bg-mp-surface-muted'}`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-mp-border bg-mp-surface p-2">
        <span className="px-1 font-sans text-[10px] uppercase tracking-wide text-mp-ink-faint">Folha</span>
        {todas.map((f) => (
          <button key={f} onClick={() => onFolha(f)} className={chip(f === posicao.folha)}>{f}</button>
        ))}
        <button onClick={() => onFolha(maxFolha + 1)} className={chip(false)} title="Começar uma folha nova">+</button>
        <label className="ml-auto flex items-center gap-2 px-1 font-sans text-xs text-mp-ink-soft">
          <input type="checkbox" checked={soAFolha} onChange={(e) => setSoAFolha(e.target.checked)} className="h-4 w-4 accent-mp-gold" />
          Mostrar só esta folha
        </label>
      </div>

      {folhas.map((f) => (
        <section key={f}>
          <h3 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-mp-ink-faint">
            Folha {f}
          </h3>
          <div
            style={grid}
            className="grid w-full max-w-[calc(var(--cols)*11rem)] gap-2 [grid-template-columns:repeat(var(--cols),minmax(0,1fr))]"
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
  const base = 'group relative min-h-[7.5rem] rounded-xl border p-2 pt-5 text-left transition-colors'
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
        <span className="flex flex-col gap-1">
          <span className="flex items-center justify-center gap-1">
            <Face url={item.anverso} alt="Anverso" pais={item.paisCodigo} />
            <Face url={item.reverso} alt="Reverso" pais={item.paisCodigo} />
          </span>
          <span className="truncate font-sans text-[11px] font-medium leading-tight text-mp-ink" title={item.denominacao ?? item.titulo}>
            {item.denominacao ?? item.titulo}
          </span>
          <span className="font-serif text-xs text-mp-gold-strong">
            {item.ano ?? '—'}
            {item.quantidade > 1 && <span className="ml-1 font-sans text-[10px] text-mp-ink-faint">×{item.quantidade}</span>}
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onRemover(item.alocacaoId) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onRemover(item.alocacaoId) } }}
            className="absolute bottom-1 right-1 hidden rounded-md bg-mp-surface px-1.5 py-0.5 font-sans text-[10px] text-mp-falta hover:bg-mp-falta-bg group-hover:block"
          >
            Retirar
          </span>
        </span>
      ) : (
        <span className="grid min-h-[6rem] place-items-center font-serif text-lg text-mp-ink-faint group-hover:text-mp-gold">
          +
        </span>
      )}
    </button>
  )
}

// Anverso/reverso da moeda; sem foto cai na bandeira do país.
function Face({ url, alt, pais }: { url: string | null; alt: string; pais: string }) {
  const anel = 'h-12 w-12 shrink-0 rounded-full bg-mp-surface-muted object-cover ring-1 ring-mp-border'
  if (!url) {
    return (
      <span className={`grid ${anel} place-items-center`} title={alt}>
        <Flag code={pais} size={16} />
      </span>
    )
  }
  return <img src={url} alt={alt} loading="lazy" className={anel} />
}
