import { eur } from '@/lib/valor'
import type { CSSProperties } from 'react'
import type { Estojo, EstojoConteudoItem } from '@/lib/estojos'

// Folha de catalogação do estojo: mapa das casas (para meter dentro do dossier)
// seguido da lista completa. Só sai na impressão.
export default function EstojoPrint({ estojo, itens }: { estojo: Estojo; itens: EstojoConteudoItem[] }) {
  const hoje = new Date().toLocaleDateString('pt-PT')
  const temGrelha = !!(estojo.linhas && estojo.colunas)
  const exemplares = itens.reduce((s, i) => s + i.quantidade, 0)
  const mercado = itens.reduce((s, i) => s + (i.valorMercado ?? 0) * i.quantidade, 0)
  const folhas = Math.max(1, itens.reduce((m, i) => Math.max(m, i.folha ?? 1), 1))
  const casas = temGrelha ? estojo.linhas! * estojo.colunas! * folhas : null

  const porCasa = new Map<string, EstojoConteudoItem>()
  for (const i of itens) if (i.linha && i.coluna) porCasa.set(`${i.folha ?? 1}:${i.linha}:${i.coluna}`, i)
  const grid = { '--cols': estojo.colunas ?? 1 } as CSSProperties

  const th = 'py-2 text-left font-semibold'
  const td = 'py-1.5 align-top'

  return (
    <div className="hidden text-mp-ink print:block">
      <h1 className="font-serif text-2xl font-semibold leading-tight">{estojo.nome}</h1>
      <p className="mb-3 text-sm text-mp-ink-soft">
        {estojo.tipo && `${estojo.tipo} · `}
        {estojo.localizacao && `${estojo.localizacao} · `}
        {temGrelha && `${estojo.linhas}×${estojo.colunas} por folha · ${folhas} ${folhas === 1 ? 'folha' : 'folhas'} · `}
        {casas != null ? `${itens.length}/${casas} casas` : `${itens.length} moedas`} · {exemplares} exemplares
        {mercado > 0 && ` · ${eur(mercado)} de mercado`} · gerado em {hoje}
      </p>
      <div className="mb-3 border-t-2 border-mp-gold" />

      {temGrelha &&
        Array.from({ length: folhas }, (_, n) => n + 1).map((f) => (
          <section key={f} className="mb-4 break-inside-avoid">
            <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-mp-ink-faint">Folha {f}</h2>
            <div style={grid} className="grid gap-1 [grid-template-columns:repeat(var(--cols),minmax(0,1fr))]">
              {Array.from({ length: estojo.linhas! * estojo.colunas! }, (_, n) => {
                const linha = Math.floor(n / estojo.colunas!) + 1
                const coluna = (n % estojo.colunas!) + 1
                const item = porCasa.get(`${f}:${linha}:${coluna}`)
                return (
                  <div key={n} className="min-h-[3.2rem] rounded border border-mp-border p-1 text-[10px] leading-tight">
                    <span className="block text-[8px] uppercase tracking-wide text-mp-ink-faint">L{linha}·C{coluna}</span>
                    {item ? (
                      <>
                        <span className="block font-medium">{item.denominacao ?? item.titulo}</span>
                        <span className="block text-mp-ink-soft">{item.ano ?? '—'}</span>
                      </>
                    ) : (
                      <span className="block text-mp-ink-faint">vazia</span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-mp-ink-faint">
            {temGrelha && <th className={th}>Casa</th>}
            <th className={th}>Moeda</th>
            <th className={th}>País</th>
            <th className={th}>Série</th>
            <th className={th}>Ano</th>
            <th className={th}>Estado</th>
            <th className={th + ' text-right'}>Qtd</th>
            <th className={th + ' text-right'}>Mercado</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((i) => (
            <tr key={i.alocacaoId} className="border-t border-mp-border/70">
              {temGrelha && (
                <td className={td}>{i.linha && i.coluna ? `F${i.folha ?? 1}·L${i.linha}·C${i.coluna}` : '—'}</td>
              )}
              <td className={td + ' font-medium'}>{i.denominacao ?? i.titulo}</td>
              <td className={td}>{i.paisNome ?? i.paisCodigo}</td>
              <td className={td}>{i.serie ?? '—'}</td>
              <td className={td}>{i.ano ?? '—'}</td>
              <td className={td}>{i.grau ?? i.formato ?? '—'}</td>
              <td className={td + ' text-right'}>{i.quantidade}</td>
              <td className={td + ' text-right'}>{i.valorMercado != null ? eur(i.valorMercado * i.quantidade) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
