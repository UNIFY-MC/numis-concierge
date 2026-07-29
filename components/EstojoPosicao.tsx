'use client'

import { useEffect, useState } from 'react'
import { moverAlocacao, type EstojoConteudoItem } from '@/lib/estojos'

// Casa de uma moeda, editável na própria linha da tabela (corrigir arrumação).
export default function EstojoPosicao({
  item,
  grelha,
  onGuardado,
}: {
  item: EstojoConteudoItem
  grelha: { linhas: number | null; colunas: number | null }
  onGuardado: () => void
}) {
  const [folha, setFolha] = useState(String(item.folha ?? 1))
  const [linha, setLinha] = useState(item.linha != null ? String(item.linha) : '')
  const [coluna, setColuna] = useState(item.coluna != null ? String(item.coluna) : '')
  const [erro, setErro] = useState(false)

  useEffect(() => {
    setFolha(String(item.folha ?? 1))
    setLinha(item.linha != null ? String(item.linha) : '')
    setColuna(item.coluna != null ? String(item.coluna) : '')
  }, [item.folha, item.linha, item.coluna])

  async function guardar() {
    const f = parseInt(folha, 10) || 1
    const l = parseInt(linha, 10)
    const c = parseInt(coluna, 10)
    if (!l || !c) return
    if (f === item.folha && l === item.linha && c === item.coluna) return
    try {
      setErro(false)
      await moverAlocacao(item.alocacaoId, { folha: f, linha: l, coluna: c })
      onGuardado()
    } catch {
      setErro(true)
    }
  }

  const cel = `h-7 w-11 rounded-md border bg-mp-surface px-1 text-center text-xs text-mp-ink outline-none focus:border-mp-gold ${erro ? 'border-mp-falta' : 'border-mp-border'}`

  return (
    <span className="flex items-center gap-1" title={erro ? 'Casa ocupada' : 'Folha · linha · coluna'}>
      <input value={folha} onChange={(e) => setFolha(e.target.value)} onBlur={guardar} className={cel} inputMode="numeric" />
      <input value={linha} onChange={(e) => setLinha(e.target.value)} onBlur={guardar} className={cel} inputMode="numeric" placeholder={grelha.linhas ? `1-${grelha.linhas}` : 'L'} />
      <input value={coluna} onChange={(e) => setColuna(e.target.value)} onBlur={guardar} className={cel} inputMode="numeric" placeholder={grelha.colunas ? `1-${grelha.colunas}` : 'C'} />
    </span>
  )
}
