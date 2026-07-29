import { eur } from '@/lib/valor'
import type { EstojoResumo } from '@/lib/estojos'

// Inventário de estojos para papel: o que existe, onde está e quanto vale.
// Só aparece na impressão (mesmo padrão do PrintFalta).
export default function EstojosPrint({ estojos }: { estojos: EstojoResumo[] }) {
  const hoje = new Date().toLocaleDateString('pt-PT')
  const porLocal = new Map<string, EstojoResumo[]>()
  for (const e of estojos) {
    const loc = e.localizacao?.trim() || 'Sem localização'
    porLocal.set(loc, [...(porLocal.get(loc) ?? []), e])
  }
  const totalMoedas = estojos.reduce((s, e) => s + e.moedas, 0)
  const totalValor = estojos.reduce((s, e) => s + e.valorMercado, 0)

  const th = 'py-2 text-left font-semibold'
  const td = 'py-1.5 align-top'

  return (
    <div className="hidden text-mp-ink print:block">
      <h1 className="font-serif text-2xl font-semibold leading-tight">Inventário de estojos</h1>
      <p className="mb-3 text-sm text-mp-ink-soft">
        {estojos.length} estojos · {totalMoedas} casas ocupadas
        {totalValor > 0 && ` · ${eur(totalValor)} de mercado`} · gerado em {hoje}
      </p>
      <div className="mb-1 border-t-2 border-mp-gold" />

      {[...porLocal.entries()].map(([loc, lista]) => (
        <section key={loc} className="mb-5">
          <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-mp-ink-faint">{loc}</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-mp-ink-faint">
                <th className={th}>Estojo</th>
                <th className={th}>Tipo</th>
                <th className={th}>Grelha</th>
                <th className={th + ' text-right'}>Folhas</th>
                <th className={th + ' text-right'}>Ocupação</th>
                <th className={th + ' text-right'}>Exemplares</th>
                <th className={th + ' text-right'}>Mercado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => (
                <tr key={e.id} className="border-t border-mp-border/70">
                  <td className={td + ' font-medium'}>{e.nome}</td>
                  <td className={td}>{e.tipo ?? '—'}</td>
                  <td className={td}>{e.linhas && e.colunas ? `${e.linhas}×${e.colunas}` : '—'}</td>
                  <td className={td + ' text-right'}>{e.casas != null ? e.folhas : '—'}</td>
                  <td className={td + ' text-right'}>{e.casas != null ? `${e.moedas}/${e.casas}` : e.moedas}</td>
                  <td className={td + ' text-right'}>{e.exemplares}</td>
                  <td className={td + ' text-right'}>{e.valorMercado > 0 ? eur(e.valorMercado) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  )
}
