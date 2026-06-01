'use client'

import { useEffect, useState } from 'react'
import { getEnquadramento } from '@/lib/enquadramento'
import type { PaisEnquadramento } from '@/lib/enquadramento'

interface PaisIntroProps {
  paisCodigo: string
}

export default function PaisIntro({ paisCodigo }: PaisIntroProps) {
  const [data, setData] = useState<PaisEnquadramento | null>(null)
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    setData(null)
    setAberto(false)
    getEnquadramento(paisCodigo).then(setData)
  }, [paisCodigo])

  if (!data?.introducao) return null

  const preview = data.introducao.slice(0, 200)
  const longo = data.introducao.length > 200

  return (
    <div className="mx-4 mt-3 mb-1 rounded-xl border border-mp-border bg-mp-surface-muted px-4 py-3 text-sm text-mp-ink-soft print:hidden">
      {data.titulo && (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-mp-gold-strong">
          {data.titulo}
        </p>
      )}
      <p className="leading-relaxed whitespace-pre-line">
        {aberto ? data.introducao : preview}
        {longo && !aberto && '…'}
      </p>
      {longo && (
        <button
          onClick={() => setAberto((v) => !v)}
          className="mt-1 text-xs text-mp-gold hover:underline"
        >
          {aberto ? 'Mostrar menos' : 'Ler mais'}
        </button>
      )}
      <p className="mt-2 text-[10px] text-mp-ink-faint">Fonte: {data.fonte}</p>
    </div>
  )
}
