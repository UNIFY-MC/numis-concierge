'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getEstojosComResumo, type EstojoResumo } from '@/lib/estojos'

function fmtInt(n: number) {
  return n.toLocaleString('pt-PT')
}

export default function EstojosView() {
  const [estojos, setEstojos] = useState<EstojoResumo[] | null>(null)

  useEffect(() => {
    let alive = true
    getEstojosComResumo()
      .then((e) => alive && setEstojos(e))
      .catch(() => alive && setEstojos([]))
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-mp-gold-strong">Estojos</h1>
        <p className="mt-1 font-sans text-sm text-mp-ink-soft">
          Onde cada moeda está guardada. Os estojos criam-se sozinhos ao escolher/escrever o nome numa moeda.
        </p>
      </header>

      {estojos === null ? (
        <p className="font-sans text-sm text-mp-ink-soft">A carregar…</p>
      ) : estojos.length === 0 ? (
        <div className="rounded-2xl border border-mp-border bg-mp-surface p-6">
          <p className="font-sans text-sm text-mp-ink-soft">
            Ainda não há estojos. Abre uma moeda na colecção e, no campo <strong>Estojo</strong>, escreve onde a
            guardas (ex.: “Álbum Euros”, “Caixa 1”). Aparece aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {estojos.map((e) => (
            <Link
              key={e.id}
              href={`/estojos/${e.id}`}
              className="group rounded-2xl border border-mp-border bg-mp-surface p-5 transition-colors hover:border-mp-gold"
            >
              <div className="flex items-start justify-between">
                <h2 className="font-serif text-lg font-semibold text-mp-ink group-hover:text-mp-gold-strong">
                  {e.nome}
                </h2>
                {e.tipo && (
                  <span className="rounded-full bg-mp-surface-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-mp-ink-soft">
                    {e.tipo}
                  </span>
                )}
              </div>
              <p className="mt-3 font-serif text-2xl font-semibold text-mp-gold">{fmtInt(e.moedas)}</p>
              <p className="font-sans text-xs text-mp-ink-soft">
                moedas · {fmtInt(e.exemplares)} exemplares
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
