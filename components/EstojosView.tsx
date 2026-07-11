'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getEstojosComResumo, criarEstojo, type EstojoResumo } from '@/lib/estojos'

function fmtInt(n: number) {
  return n.toLocaleString('pt-PT')
}

const SEM_LOC = 'Sem localização'

export default function EstojosView() {
  const [estojos, setEstojos] = useState<EstojoResumo[] | null>(null)
  const [criar, setCriar] = useState(false)

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
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-mp-gold-strong">Estojos</h1>
          <p className="mt-1 font-sans text-sm text-mp-ink-soft">
            Onde cada moeda está guardada. {estojos && `${estojos.length} estojos · ${fmtInt(totalMoedas)} moedas.`}
          </p>
        </div>
        <button
          onClick={() => setCriar(true)}
          className="shrink-0 rounded-xl bg-mp-gold px-4 py-2.5 font-sans text-sm font-semibold text-white hover:bg-mp-gold-strong"
        >
          + Novo estojo
        </button>
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
                {lista.map((e) => (
                  <Link
                    key={e.id}
                    href={`/estojos/${e.id}`}
                    className="group rounded-2xl border border-mp-border bg-mp-surface p-5 transition-colors hover:border-mp-gold"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-lg font-semibold text-mp-ink group-hover:text-mp-gold-strong">
                        {e.nome}
                      </h3>
                      {e.tipo && (
                        <span className="shrink-0 rounded-full bg-mp-surface-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-mp-ink-soft">
                          {e.tipo}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 font-serif text-2xl font-semibold text-mp-gold">{fmtInt(e.moedas)}</p>
                    <p className="font-sans text-xs text-mp-ink-soft">moedas · {fmtInt(e.exemplares)} exemplares</p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {criar && (
        <NovoEstojoModal
          onClose={() => setCriar(false)}
          onCriado={async () => {
            setCriar(false)
            await recarregar()
          }}
        />
      )}
    </div>
  )
}

function NovoEstojoModal({ onClose, onCriado }: { onClose: () => void; onCriado: () => void }) {
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('')
  const [localizacao, setLocalizacao] = useState('')
  const [saving, setSaving] = useState(false)

  const inp = 'w-full bg-mp-surface border border-mp-border rounded-lg px-3 py-2 text-sm outline-none focus:border-mp-gold'
  const lbl = 'block text-[11px] uppercase tracking-wide text-mp-ink-faint mb-1'

  async function guardar() {
    if (!nome.trim()) return
    setSaving(true)
    try {
      await criarEstojo({ nome, tipo, localizacao })
      onCriado()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-mp-surface p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 font-serif text-xl font-semibold text-mp-ink">Novo estojo</h2>
        <label className="block mb-3">
          <span className={lbl}>Nome</span>
          <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Álbum Euros" className={inp} />
        </label>
        <label className="block mb-3">
          <span className={lbl}>Tipo (opcional)</span>
          <input list="tipos-estojo" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="álbum, caixa, moldura…" className={inp} />
          <datalist id="tipos-estojo">
            {['álbum', 'caixa', 'moldura', 'cápsula', 'pasta'].map((t) => <option key={t} value={t} />)}
          </datalist>
        </label>
        <label className="block mb-5">
          <span className={lbl}>Localização (opcional)</span>
          <input value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} placeholder="ex.: Cofre, Casa do pai, Sala" className={inp} />
        </label>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-mp-border py-2.5 text-sm font-medium text-mp-ink-soft hover:bg-mp-surface-muted">
            Cancelar
          </button>
          <button onClick={guardar} disabled={saving || !nome.trim()} className="flex-1 rounded-lg bg-mp-gold py-2.5 text-sm font-medium text-white hover:bg-mp-gold-strong disabled:opacity-50">
            {saving ? 'A criar…' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  )
}
