'use client'

import { useState } from 'react'
import { mudarVarianteAlocacao, type EstojoConteudoItem, type VarianteOpcao } from '@/lib/estojos'

// Variante de um exemplar já arrumado. Trocar aqui move o exemplar para a linha
// de posse da outra variante — não é preciso retirar e voltar a inserir.
export default function EstojoVariante({
  item,
  opcoes,
  onGuardado,
}: {
  item: EstojoConteudoItem
  opcoes: VarianteOpcao[]
  onGuardado: () => void
}) {
  const [saving, setSaving] = useState(false)
  const doAno = opcoes.filter((o) => o.ano === (item.ano ?? ''))

  if (doAno.length <= 1) return <span className="text-mp-ink-soft">{item.variante ?? '—'}</span>

  async function trocar(issueId: string) {
    if (!issueId || issueId === item.issueId) return
    setSaving(true)
    try {
      await mudarVarianteAlocacao(item.alocacaoId, issueId)
      onGuardado()
    } finally {
      setSaving(false)
    }
  }

  return (
    <select
      value={item.issueId ?? ''}
      disabled={saving}
      onChange={(e) => trocar(e.target.value)}
      className="h-7 rounded-md border border-mp-border bg-mp-surface px-1 text-xs text-mp-ink outline-none focus:border-mp-gold disabled:opacity-50"
    >
      {doAno.map((o) => (
        <option key={o.issueId} value={o.issueId}>{o.label}</option>
      ))}
    </select>
  )
}
