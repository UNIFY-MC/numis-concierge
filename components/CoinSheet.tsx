import { useEffect, useState } from 'react'
import { flagOf } from '@/lib/flags'
import { GRAUS, FORMATOS_POSSE } from '@/lib/types'
import type { DisplayRow, CollectionItem } from '@/lib/types'

interface CoinSheetProps {
  row: DisplayRow
  onClose: () => void
  onSave: (input: {
    tenho: boolean
    quantidade: number
    formatoPosse: CollectionItem['formato_posse']
    grau: string | null
    notaPrivada: string | null
  }) => Promise<void>
}

export default function CoinSheet({ row, onClose, onSave }: CoinSheetProps) {
  const item = row.item
  const [tenho, setTenho] = useState(!!item && item.quantidade > 0)
  const [quantidade, setQuantidade] = useState(item?.quantidade && item.quantidade > 0 ? item.quantidade : 1)
  const [formato, setFormato] = useState<CollectionItem['formato_posse']>(item?.formato_posse ?? 'set')
  const [grau, setGrau] = useState(item?.grau ?? '')
  const [nota, setNota] = useState(item?.nota_privada ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function guardar() {
    setSaving(true)
    try {
      await onSave({
        tenho,
        quantidade: tenho ? Math.max(1, quantidade) : 0,
        formatoPosse: formato,
        grau: grau || null,
        notaPrivada: nota || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-mp-surface w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[92vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-5">
          <span className="text-3xl flex-none">{flagOf(row.coin.pais_codigo)}</span>
          <div className="flex-1">
            <h2 className="text-lg font-serif font-semibold leading-tight text-mp-ink">{row.coin.pais_nome}</h2>
            <p className="text-sm text-mp-ink-soft">
              {row.coin.denominacao ?? row.coin.titulo} · <strong>{row.issue.ano}</strong>
            </p>
          </div>
          <button onClick={onClose} className="text-mp-ink-faint hover:text-mp-ink text-xl leading-none">×</button>
        </div>

        <div className="mb-4">
          <span className="block text-[11px] uppercase tracking-wide text-mp-ink-faint mb-2">Posse</span>
          <div className="flex gap-2">
            <button
              onClick={() => setTenho(true)}
              className={
                'flex-1 rounded-lg py-2.5 text-sm font-medium border ' +
                (tenho ? 'border-mp-set bg-mp-set-bg text-mp-set' : 'border-mp-border text-mp-ink-soft')
              }
            >
              Tenho
            </button>
            <button
              onClick={() => setTenho(false)}
              className={
                'flex-1 rounded-lg py-2.5 text-sm font-medium border ' +
                (!tenho ? 'border-mp-falta bg-mp-falta-bg text-mp-falta' : 'border-mp-border text-mp-ink-soft')
              }
            >
              Não tenho
            </button>
          </div>
        </div>

        {tenho && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-mp-ink-faint mb-1">Quantidade</span>
              <input
                type="number"
                min={1}
                value={quantidade}
                onChange={(e) => setQuantidade(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-mp-surface border border-mp-border rounded-lg px-3 py-2 text-sm outline-none focus:border-mp-gold"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-mp-ink-faint mb-1">Formato</span>
              <select
                value={formato ?? ''}
                onChange={(e) => setFormato((e.target.value || null) as CollectionItem['formato_posse'])}
                className="w-full bg-mp-surface border border-mp-border rounded-lg px-3 py-2 text-sm outline-none focus:border-mp-gold"
              >
                {FORMATOS_POSSE.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wide text-mp-ink-faint mb-1">Conservação</span>
              <select
                value={grau}
                onChange={(e) => setGrau(e.target.value)}
                className="w-full bg-mp-surface border border-mp-border rounded-lg px-3 py-2 text-sm outline-none focus:border-mp-gold"
              >
                <option value="">—</option>
                {GRAUS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        <label className="block mb-5">
          <span className="block text-[11px] uppercase tracking-wide text-mp-ink-faint mb-1">Nota</span>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            className="w-full bg-mp-surface border border-mp-border rounded-lg px-3 py-2 text-sm outline-none focus:border-mp-gold resize-y"
          />
        </label>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-mp-border rounded-lg py-2.5 text-sm font-medium text-mp-ink-soft hover:bg-mp-surface-muted"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={saving}
            className="flex-1 bg-mp-gold text-white rounded-lg py-2.5 text-sm font-medium hover:bg-mp-gold-strong disabled:opacity-50"
          >
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
