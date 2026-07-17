'use client'

import { useEffect, useState } from 'react'

const SKINS = [
  { id: 'flx', label: 'FLX' },
  { id: 'pinto', label: 'Pinto' },
] as const

type SkinId = (typeof SKINS)[number]['id']

// Alterna o skin visual (data-skin no <html>), persistido em numis_skin.
// Preferência de dispositivo, não estado de aplicação — fica em localStorage.
export default function SkinToggle() {
  const [skin, setSkin] = useState<SkinId>('flx')

  useEffect(() => {
    const atual = document.documentElement.dataset.skin
    if (atual === 'pinto') setSkin('pinto')
  }, [])

  function aplicar(id: SkinId) {
    document.documentElement.dataset.skin = id
    try {
      localStorage.setItem('numis_skin', id)
    } catch {
      /* modo privado: o skin vive só nesta sessão */
    }
    setSkin(id)
  }

  return (
    <div className="flex items-center gap-1 rounded-full bg-mp-surface-muted p-0.5">
      {SKINS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => aplicar(s.id)}
          className={`flex-1 rounded-full px-2 py-1 font-sans text-[10px] font-semibold uppercase tracking-wide transition-colors ${
            skin === s.id ? 'bg-mp-primary-soft text-mp-primary-strong' : 'text-mp-ink-faint hover:text-mp-ink'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
