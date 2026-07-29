'use client'

import { useState } from 'react'
import { atualizarEstojo, criarEstojo, type Estojo } from '@/lib/estojos'

const inp = 'w-full bg-mp-surface border border-mp-border rounded-lg px-3 py-2 text-sm outline-none focus:border-mp-gold'
const lbl = 'block text-[11px] uppercase tracking-wide text-mp-ink-faint mb-1'

// Criar/editar estojo. A grelha (linhas × colunas por folha) replica o álbum
// físico e é o que permite dizer onde exactamente está cada moeda.
export default function EstojoModal({
  estojo,
  onClose,
  onGuardado,
}: {
  estojo: Estojo | null
  onClose: () => void
  onGuardado: () => void
}) {
  const [nome, setNome] = useState(estojo?.nome ?? '')
  const [tipo, setTipo] = useState(estojo?.tipo ?? '')
  const [localizacao, setLocalizacao] = useState(estojo?.localizacao ?? '')
  const [linhas, setLinhas] = useState(estojo?.linhas ? String(estojo.linhas) : '')
  const [colunas, setColunas] = useState(estojo?.colunas ? String(estojo.colunas) : '')
  // Estojo novo assume grelha (o caso normal é um livro/dossier com folhas iguais).
  const [comGrelha, setComGrelha] = useState(estojo ? !!(estojo.linhas && estojo.colunas) : true)
  const [saving, setSaving] = useState(false)

  async function guardar() {
    if (!nome.trim()) return
    setSaving(true)
    try {
      const input = {
        nome,
        tipo,
        localizacao,
        linhas: comGrelha ? parseInt(linhas, 10) || null : null,
        colunas: comGrelha ? parseInt(colunas, 10) || null : null,
      }
      if (estojo) await atualizarEstojo(estojo.id, input)
      else await criarEstojo(input)
      onGuardado()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-mp-surface p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 font-serif text-xl font-semibold text-mp-ink">{estojo ? 'Editar estojo' : 'Novo estojo'}</h2>
        <label className="block mb-3">
          <span className={lbl}>Nome</span>
          <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Livro 13" className={inp} />
        </label>
        <label className="block mb-3">
          <span className={lbl}>Tipo (opcional)</span>
          <input list="tipos-estojo" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="livro, dossier, álbum, caixa…" className={inp} />
          <datalist id="tipos-estojo">
            {['livro', 'dossier', 'álbum', 'caixa', 'moldura', 'cápsula', 'pasta'].map((t) => <option key={t} value={t} />)}
          </datalist>
        </label>
        <label className="block mb-3">
          <span className={lbl}>Localização (opcional)</span>
          <input value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} placeholder="ex.: Cofre, Garrafeira, Sala" className={inp} />
        </label>

        <label className="mb-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={comGrelha}
            onChange={(e) => setComGrelha(e.target.checked)}
            className="h-4 w-4 accent-mp-gold"
          />
          <span className="font-sans text-sm text-mp-ink">Tem grelha (linhas × colunas por folha)</span>
        </label>

        {comGrelha ? (
          <>
            <div className="mb-2 grid grid-cols-2 gap-3">
              <label className="block">
                <span className={lbl}>Linhas por folha</span>
                <input type="number" min={1} max={50} value={linhas} onChange={(e) => setLinhas(e.target.value)} placeholder="4" className={inp} />
              </label>
              <label className="block">
                <span className={lbl}>Colunas por folha</span>
                <input type="number" min={1} max={50} value={colunas} onChange={(e) => setColunas(e.target.value)} placeholder="3" className={inp} />
              </label>
            </div>
            <p className="mb-5 text-[11px] text-mp-ink-faint">
              A grelha de cada folha do livro/dossier. O número de folhas é livre: cresce à medida que arrumas.
            </p>
          </>
        ) : (
          <p className="mb-5 text-[11px] text-mp-ink-faint">
            Sem grelha as moedas entram por ordem de chegada, sem casa fixa. Podes ligar a grelha mais tarde.
          </p>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-mp-border py-2.5 text-sm font-medium text-mp-ink-soft hover:bg-mp-surface-muted">
            Cancelar
          </button>
          <button onClick={guardar} disabled={saving || !nome.trim()} className="flex-1 rounded-lg bg-mp-gold py-2.5 text-sm font-medium text-white hover:bg-mp-gold-strong disabled:opacity-50">
            {saving ? 'A guardar…' : estojo ? 'Guardar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  )
}
