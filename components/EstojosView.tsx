'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import EstojoModal from '@/components/EstojoModal'
import EstojosPrint from '@/components/EstojosPrint'
import { eur } from '@/lib/valor'
import { getEstojosComResumo, type EstojoResumo } from '@/lib/estojos'

function fmtInt(n: number) {
  return n.toLocaleString('pt-PT')
}

const SEM_LOC = 'Sem localização'

export default function EstojosView() {
  const [estojos, setEstojos] = useState<EstojoResumo[] | null>(null)
  const [criar, setCriar] = useState(false)
  const [editar, setEditar] = useState<EstojoResumo | null>(null)

  async function recarregar() {
    setEstojos(await getEstojosComResumo())
  }

  useEffect(() => {
    getEstojosComResumo()
      .then(setEstojos)
      .catch(() => setEstojos([]))
  }, [])

  const totalMoedas = (estojos ?? []).reduce((s, e) => s + e.moedas, 0)

  // Agrupar por localização
  const porLocal = new Map<string, EstojoResumo[]>()
  for (const e of estojos ?? []) {
    const loc = e.localizacao?.trim() || SEM_LOC
    const arr = porLocal.get(loc) ?? []
    arr.push(e)
    porLocal.set(loc, arr)
  }

  return (
    <div className="w-full px-4 lg:px-6 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-mp-gold-strong">Estojos</h1>
          <p className="mt-1 font-sans text-sm text-mp-ink-soft">
            Onde cada moeda está guardada. {estojos && `${estojos.length} estojos · ${fmtInt(totalMoedas)} moedas.`}
          </p>
        </div>
        <div className="flex shrink-0 gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="rounded-xl border border-mp-border bg-mp-surface px-4 py-2.5 font-sans text-sm font-semibold text-mp-ink-soft hover:border-mp-gold hover:text-mp-gold-strong"
          >
            Imprimir inventário
          </button>
          <button
            onClick={() => setCriar(true)}
            className="rounded-xl bg-mp-gold px-4 py-2.5 font-sans text-sm font-semibold text-white hover:bg-mp-gold-strong"
          >
            + Novo estojo
          </button>
        </div>
      </header>

      {estojos === null ? (
        <p className="font-sans text-sm text-mp-ink-soft">A carregar…</p>
      ) : estojos.length === 0 ? (
        <div className="rounded-2xl border border-mp-border bg-mp-surface p-6">
          <p className="font-sans text-sm text-mp-ink-soft">
            Ainda não há estojos. Cria o primeiro e adiciona-lhe moedas por pesquisa.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {[...porLocal.entries()].map(([loc, lista]) => (
            <section key={loc}>
              <h2 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wide text-mp-ink-faint">
                {loc}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {lista.map((e) => <Card key={e.id} e={e} onEditar={() => setEditar(e)} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      {estojos && estojos.length > 0 && <EstojosPrint estojos={estojos} />}

      {(criar || editar) && (
        <EstojoModal
          estojo={editar}
          onClose={() => { setCriar(false); setEditar(null) }}
          onGuardado={async () => {
            setCriar(false)
            setEditar(null)
            await recarregar()
          }}
        />
      )}
    </div>
  )
}

// Cartão de estojo: identidade (tipo, localização), ocupação e valor — o que se
// quer saber sem abrir.
function Card({ e, onEditar }: { e: EstojoResumo; onEditar: () => void }) {
  const pct = e.casas ? Math.min(100, Math.round((e.moedas / e.casas) * 100)) : null
  return (
    <div className="relative">
      <Link
        href={`/estojos/${e.id}`}
        className="group block rounded-2xl border border-mp-border bg-mp-surface p-5 transition-colors hover:border-mp-gold"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-lg font-semibold text-mp-ink group-hover:text-mp-gold-strong">{e.nome}</h3>
          {e.tipo && (
            <span className="mr-14 shrink-0 rounded-full bg-mp-surface-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-mp-ink-soft">
              {e.tipo}
            </span>
          )}
        </div>

        <p className="mt-3 font-serif text-2xl font-semibold text-mp-gold">
          {fmtInt(e.moedas)}
          {e.casas != null && <span className="text-base text-mp-ink-faint"> / {fmtInt(e.casas)}</span>}
        </p>
        <p className="font-sans text-xs text-mp-ink-soft">
          {e.casas != null ? 'casas ocupadas' : 'moedas'} · {fmtInt(e.exemplares)} exemplares
        </p>

        {pct != null && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-mp-surface-muted">
            <div className="h-full rounded-full bg-mp-gold" style={{ width: `${pct}%` }} />
          </div>
        )}

        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[11px] text-mp-ink-faint">
          {e.linhas && e.colunas && <span>grelha {e.linhas}×{e.colunas}</span>}
          {e.casas != null && <span>· {fmtInt(e.folhas)} {e.folhas === 1 ? 'folha' : 'folhas'}</span>}
          {e.valorMercado > 0 && (
            <span className="ml-auto font-serif text-sm font-semibold text-mp-gold-strong">{eur(e.valorMercado)}</span>
          )}
        </p>
      </Link>
      <button
        onClick={onEditar}
        className="absolute right-3 top-3 rounded-lg px-2 py-1 font-sans text-[11px] text-mp-ink-soft hover:bg-mp-surface-muted hover:text-mp-gold-strong print:hidden"
      >
        Editar
      </button>
    </div>
  )
}
