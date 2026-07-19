'use client'

import { useEffect } from 'react'

// Regista o service worker (necessário para a app ser instalável no Android/Chrome).
// Só em produção: em dev um SW activo serve build antigo e confunde o hot reload.
export function RegistarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    const registar = () => navigator.serviceWorker.register('/sw.js').catch(() => {})
    if (document.readyState === 'complete') registar()
    else window.addEventListener('load', registar)
    return () => window.removeEventListener('load', registar)
  }, [])

  return null
}
