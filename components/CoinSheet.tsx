import { useEffect, useState } from 'react'
import { estadoDe, denomCurta } from '@/lib/types'
import { GRADES, GRADE_DEFAULT, gradeMult, eur } from '@/lib/valor'
import { numistaUrl } from '@/lib/numista'
import type { DisplayRow, Estado } from '@/lib/types'
import CoinDisc from './CoinDisc'
import Flag from './Flag'

export interface CoinSheetSave {
  estado: Estado
  quantidade: number
  grau: string
  valorBase: number | null
  foto: string | null
  nota: string | null
  aplicarTodos: boolean
}

interface CoinSheetProps {
  row: DisplayRow
  onClose: () => void
  onSave: (input: CoinSheetSave) => Promise<void>
}

const ESTADOS: { v: Estado; label: string; cor: string }[] = [
  { v: 'set', label: 'Set', cor: 'border-mp-set bg-mp-set-bg text-mp-set' },
  { v: 'caderneta', label: 'Caderneta', cor: 'border-mp-caderneta bg-mp-caderneta-bg text-mp-caderneta' },
  { v: 'naotem', label: 'Não tem', cor: 'border-mp-falta bg-mp-falta-bg text-mp-falta' },
]

export default function CoinSheet({ row, onClose, onSave }: CoinSheetProps) {
  const item = row.item
  const facial = row.coin.valor_facial ?? 0
  const short = denomCurta(row.coin.valor_facial, row.coin.denominacao)

  const [estado, setEstado] = useState<Estado>(estadoDe(item))
  const [quantidade, setQuantidade] = useState(item?.quantidade && item.quantidade > 0 ? item.quantidade : 1)
  const [grau, setGrau] = useState(item?.grau ?? GRADE_DEFAULT)
  const [valorBase, setValorBase] = useState(String(item?.valor_base ?? facial))
  const [foto, setFoto] = useState(item?.foto1 ?? '')
  const [nota, setNota] = useState(item?.nota_privada ?? row.issue.html_obs ?? '')
  const [aplicarTodos, setAplicarTodos] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const tenho = estado !== 'naotem'
  const base = parseFloat(valorBase) || 0
  const estimado = tenho ? Math.max(1, quantidade) * base * gradeMult(grau) : 0

  const { anverso_img, reverso_img, peso_g, diametro_mm, composicao, km_ref } = row.coin
  const temFotos = !!(anverso_img || reverso_img)
  const specs = [
    peso_g != null && `${peso_g} g`,
    diametro_mm != null && `⌀ ${diametro_mm} mm`,
    composicao,
    km_ref && `KM# ${km_ref}`,
  ].filter(Boolean) as string[]

  async function guardar() {
    setSaving(true)
    try {
      await onSave({
        estado,
        quantidade: tenho ? Math.max(1, quantidade) : 0,
        grau,
        valorBase: base || null,
        foto: foto.trim() || null,
        nota: nota.trim() || null,
        aplicarTodos,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const lbl = 'block text-[11px] uppercase tracking-wide text-mp-ink-faint mb-1'
  const inp = 'w-full bg-mp-surface border border-mp-border rounded-lg px-3 py-2 text-sm outline-none focus:border-mp-gold'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-mp-surface w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[92vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-5">
          <CoinDisc short={short} ano={row.issue.ano} estado={estado} size={72} />
          <div className="flex-1">
            <h2 className="font-serif text-lg font-semibold leading-tight text-mp-ink flex items-center gap-2">
              <Flag code={row.coin.pais_codigo} size={20} /> {row.coin.pais_nome}
            </h2>
            <p className="text-sm text-mp-ink-soft">
              {row.coin.denominacao ?? row.coin.titulo} · <strong>{row.issue.ano}</strong>
            </p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {[row.coin.tipo_emissao, `Face ${eur(facial)}`, row.issue.etiqueta, short]
                .filter(Boolean)
                .map((chip, i) => (
                  <span key={i} className="text-[10px] bg-mp-surface-muted text-mp-ink-soft rounded-full px-2 py-0.5">{chip}</span>
                ))}
            </div>
          </div>
          <button onClick={onClose} className="text-mp-ink-faint hover:text-mp-ink text-xl leading-none">×</button>
        </div>

        {(temFotos || specs.length > 0) && (
          <div className="mb-5">
            {temFotos && (
              <div className="flex justify-center gap-4 mb-3">
                {anverso_img && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={anverso_img} alt="Anverso" className="h-28 w-28 object-contain rounded-full bg-mp-surface-muted ring-1 ring-mp-border" />
                )}
                {reverso_img && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={reverso_img} alt="Reverso" className="h-28 w-28 object-contain rounded-full bg-mp-surface-muted ring-1 ring-mp-border" />
                )}
              </div>
            )}
            {specs.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {specs.map((s, i) => (
                  <span key={i} className="text-[10px] bg-mp-surface-muted text-mp-ink-soft rounded-full px-2 py-0.5">{s}</span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-4">
          <span className={lbl}>Estado de posse</span>
          <div className="flex gap-2">
            {ESTADOS.map((e) => (
              <button
                key={e.v}
                onClick={() => setEstado(e.v)}
                className={
                  'flex-1 rounded-lg py-2.5 text-sm font-medium border ' +
                  (estado === e.v ? e.cor : 'border-mp-border text-mp-ink-soft')
                }
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block mb-2">
          <span className={lbl}>Foto da moeda (URL — copia da Numista e cola aqui)</span>
          <input value={foto} onChange={(e) => setFoto(e.target.value)} placeholder="https://…jpg" className={inp} />
        </label>
        <label className="flex items-center gap-2 text-xs text-mp-ink-soft mb-4">
          <input type="checkbox" checked={aplicarTodos} onChange={(e) => setAplicarTodos(e.target.checked)} />
          Aplicar foto e valor a todos os anos de {row.coin.pais_nome} · {short}
        </label>

        {tenho && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="block">
              <span className={lbl}>Estado de conservação</span>
              <select value={grau} onChange={(e) => setGrau(e.target.value)} className={inp}>
                {GRADES.map((g) => <option key={g.label} value={g.label}>{g.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={lbl}>Valor base (€) — por exemplar</span>
              <input type="number" step="0.01" min="0" value={valorBase} onChange={(e) => setValorBase(e.target.value)} className={inp} />
            </label>
            <label className="block col-span-2">
              <span className={lbl}>Quantidade — nº de exemplares que tens</span>
              <input type="number" min={1} value={quantidade} onChange={(e) => setQuantidade(parseInt(e.target.value, 10) || 1)} className={inp} />
            </label>
          </div>
        )}

        <div className="bg-mp-surface-muted border border-mp-border rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <span className="text-xs text-mp-ink-soft">Valor real estimado (quantidade × base × conservação)</span>
          <span className="font-serif text-xl font-semibold text-mp-gold-strong">{eur(estimado)}</span>
        </div>

        <label className="block mb-4">
          <span className={lbl}>Observações</span>
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} className={inp + ' resize-y'} />
        </label>

        <a
          href={numistaUrl(row.coin, row.issue)}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center border border-mp-border rounded-lg py-2.5 text-sm font-medium text-mp-ink-soft hover:bg-mp-surface-muted mb-2"
        >
          🔍 {row.coin.numista_id ? 'Abrir na Numista' : 'Procurar na Numista'}
        </a>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border border-mp-border rounded-lg py-2.5 text-sm font-medium text-mp-ink-soft hover:bg-mp-surface-muted">
            Fechar
          </button>
          <button onClick={guardar} disabled={saving} className="flex-1 bg-mp-gold text-white rounded-lg py-2.5 text-sm font-medium hover:bg-mp-gold-strong disabled:opacity-50">
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
