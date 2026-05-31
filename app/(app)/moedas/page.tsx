'use client'

import { useEffect, useState } from 'react'
import { getMoedas } from '@/lib/moedas'
import type { Moeda } from '@/lib/types'

export default function MoedasPage() {
  const [moedas, setMoedas] = useState<Moeda[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMoedas().then(setMoedas).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-400">A carregar…</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Colecção</h1>
      {moedas.length === 0 ? (
        <p className="text-gray-400">Nenhuma moeda adicionada ainda.</p>
      ) : (
        <ul className="space-y-2">
          {moedas.map((m) => (
            <li key={m.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex justify-between items-center">
              <div>
                <span className="font-medium">{m.nome}</span>
                <span className="text-gray-400 text-sm ml-2">{m.pais}{m.ano ? ` · ${m.ano}` : ''}</span>
              </div>
              {m.estado && (
                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{m.estado}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
