'use client'

import { useState } from 'react'
import { destrancarEstojo, trancarEstojo } from '@/lib/estojos'

// PIN de 4 dígitos do estojo. Fechar grava o PIN; reabrir exige o mesmo.
export default function EstojoTrinco({
  estojoId,
  fechado,
  onClose,
  onFeito,
}: {
  estojoId: string
  fechado: boolean
  onClose: () => void
  onFeito: () => void
}) {
  const [pin, setPin] = useState('')
  const [confirma, setConfirma] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const soDigitos = (v: string) => v.replace(/\D/g, '').slice(0, 4)
  const valido = pin.length === 4 && (fechado || confirma === pin)

  async function guardar() {
    if (!valido) return
    setSaving(true)
    setErro(null)
    try {
      const ok = fechado ? await destrancarEstojo(estojoId, pin) : await trancarEstojo(estojoId, pin)
      if (!ok) {
        setErro(fechado ? 'PIN errado.' : 'Não foi possível fechar o estojo.')
        return
      }
      onFeito()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falhou.')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full rounded-lg border border-mp-border bg-mp-surface px-3 py-2 text-center font-serif text-2xl tracking-[0.5em] outline-none focus:border-mp-gold'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xs rounded-2xl bg-mp-surface p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 font-serif text-xl font-semibold text-mp-ink">
          {fechado ? 'Reabrir estojo' : 'Fechar estojo'}
        </h2>
        <p className="mb-4 font-sans text-xs text-mp-ink-soft">
          {fechado
            ? 'Escreve o PIN de 4 dígitos para voltar a editar.'
            : 'Escolhe um PIN de 4 dígitos. Fechado, o estojo fica em leitura.'}
        </p>

        <input
          autoFocus
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(soDigitos(e.target.value))}
          onKeyDown={(e) => { if (e.key === 'Enter' && valido) guardar() }}
          placeholder="••••"
          className={inp}
        />
        {!fechado && (
          <input
            inputMode="numeric"
            value={confirma}
            onChange={(e) => setConfirma(soDigitos(e.target.value))}
            onKeyDown={(e) => { if (e.key === 'Enter' && valido) guardar() }}
            placeholder="repetir"
            className={inp + ' mt-2'}
          />
        )}
        {erro && <p className="mt-2 font-sans text-xs font-medium text-mp-falta">{erro}</p>}

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-mp-border py-2.5 font-sans text-sm font-medium text-mp-ink-soft hover:bg-mp-surface-muted">
            Cancelar
          </button>
          <button onClick={guardar} disabled={!valido || saving} className="flex-1 rounded-lg bg-mp-gold py-2.5 font-sans text-sm font-medium text-white hover:bg-mp-gold-strong disabled:opacity-50">
            {saving ? '…' : fechado ? 'Reabrir' : 'Fechar'}
          </button>
        </div>
      </div>
    </div>
  )
}
