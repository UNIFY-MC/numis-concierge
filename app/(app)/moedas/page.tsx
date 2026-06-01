'use client'

import { useEffect, useState } from 'react'
import { getCatalogCoins, getCollection } from '@/lib/catalog'

export default function MoedasPage() {
  const [coins, setCoins] = useState(0)
  const [colecao, setColecao] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getCatalogCoins(), getCollection()])
      .then(([c, col]) => {
        setCoins(c.length)
        setColecao(col.length)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-400">A carregar…</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Numis Concierge</h1>
      <p className="text-gray-600 mb-6">Catálogo migrado e ligado ao Supabase.</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl px-5 py-4">
          <div className="text-xs uppercase tracking-wide text-gray-400">Tipos no catálogo</div>
          <div className="text-3xl font-semibold mt-1">{coins}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl px-5 py-4">
          <div className="text-xs uppercase tracking-wide text-gray-400">Na colecção</div>
          <div className="text-3xl font-semibold mt-1">{colecao}</div>
        </div>
      </div>
    </div>
  )
}
