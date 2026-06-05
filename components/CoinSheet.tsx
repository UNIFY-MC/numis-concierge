import { useEffect, useState } from 'react'
import { denomCurta, FORMATOS_COLECAO, FORMATO_LABEL, formatosDe } from '@/lib/types'
import { GRADES, GRADE_DEFAULT, gradeMult, eur } from '@/lib/valor'
import type { DisplayRow, Estado, FormatoColecao, CollectionItem } from '@/lib/types'
import CoinDisc from './CoinDisc'
import Flag from './Flag'
import TagsEditor from './TagsEditor'

export interface CoinSheetSave {
  // Uma moeda pode existir em vários formatos ao mesmo tempo, cada um o seu exemplar.
  formatos: { formato: FormatoColecao; quantidade: number; grau: string; valorBase: number | null }[]
  removidos: FormatoColecao[]
  casaMoeda: string | null
  foto: string | null
  nota: string | null
  defeito: string | null
  aplicarTodos: boolean
}

// Casas da moeda alemãs. Só relevante para a Alemanha.
const CASAS_DE = ['A', 'D', 'F', 'G', 'J'] as const

interface CoinSheetProps {
  row: DisplayRow
  onClose: () => void
  onSave: (input: CoinSheetSave) => Promise<void>
}

interface EstadoFormato { ativo: boolean; qtd: number; grau: string; valor: string }

const FORMATO_COR: Record<FormatoColecao, string> = {
  carteira_fdc: 'border-mp-caderneta bg-mp-caderneta-bg text-mp-caderneta',
  carteira_bebe: 'border-mp-gold bg-mp-falta-bg text-mp-gold-strong',
  bnc: 'border-mp-set bg-mp-set-bg text-mp-set',
  proof: 'border-mp-gold bg-mp-surface-muted text-mp-gold-strong',
  normal: 'border-mp-set bg-mp-set-bg text-mp-set',
}

export default function CoinSheet({ row, onClose, onSave }: CoinSheetProps) {
  const facial = row.coin.valor_facial ?? 0
  const short = denomCurta(row.coin.valor_facial, row.coin.denominacao)

  // Estado por formato, inicializado a partir dos exemplares existentes.
  const exDe = (v: FormatoColecao): CollectionItem | undefined =>
    row.itens.find((i) => i.formato_posse === v && i.quantidade > 0)
  const [form, setForm] = useState<Record<FormatoColecao, EstadoFormato>>(() => {
    const o = {} as Record<FormatoColecao, EstadoFormato>
    for (const { v } of FORMATOS_COLECAO) {
      const ex = exDe(v)
      o[v] = { ativo: !!ex, qtd: ex?.quantidade ?? 1, grau: ex?.grau ?? GRADE_DEFAULT, valor: String(ex?.valor_base ?? facial) }
    }
    return o
  })
  const setF = (v: FormatoColecao, patch: Partial<EstadoFormato>) =>
    setForm((cur) => ({ ...cur, [v]: { ...cur[v], ...patch } }))

  const [casaMoeda, setCasaMoeda] = useState(row.item?.casa_moeda ?? row.issue.casa_moeda ?? '')
  const [foto, setFoto] = useState(row.item?.foto1 ?? '')
  const [nota, setNota] = useState(row.item?.nota_privada ?? row.issue.html_obs ?? '')
  const [defeito, setDefeito] = useState(row.item?.defecto ?? '')
  const [aplicarTodos, setAplicarTodos] = useState(false)
  const [saving, setSaving] = useState(false)
  const mostraCasa = row.coin.pais_codigo === 'de'

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Formatos relevantes conforme a moeda: conjunto anual (carteiras+BNC+Proof) vs
  // avulsa (Normal/BNC/Proof). É isto que se mostra e edita.
  const visiveis = formatosDe(row.coin.familia)
  const ativos = visiveis.filter((v) => form[v].ativo)
  const tenho = ativos.length > 0
  const estimado = ativos.reduce((s, v) => {
    const st = form[v]
    return s + Math.max(1, st.qtd) * (parseFloat(st.valor) || 0) * gradeMult(st.grau)
  }, 0)
  const estadoDisco: Estado = (form.bnc.ativo || form.proof.ativo || form.normal.ativo) ? 'set'
    : (form.carteira_fdc.ativo || form.carteira_bebe.ativo) ? 'caderneta' : 'naotem'

  const { peso_g, diametro_mm, composicao, km_ref, schon_ref, anverso_desc, reverso_desc, orla_desc } = row.coin
  const fotoUser = row.item?.foto1 || null
  const anverso_img = fotoUser || row.issue.anverso_img || row.coin.anverso_img
  const reverso_img = fotoUser ? null : (row.issue.reverso_img || row.coin.reverso_img)
  const fotoGenerica = !fotoUser && !row.issue.anverso_img && !!row.coin.anverso_img
  const temFotos = !!(anverso_img || reverso_img)
  const specs = [
    peso_g != null && `${peso_g} g`,
    diametro_mm != null && `⌀ ${diametro_mm} mm`,
    composicao,
    km_ref && `KM# ${km_ref}`,
    schon_ref && `Schön# ${schon_ref}`,
  ].filter(Boolean) as string[]
  const descricoes = [
    anverso_desc && { t: 'Anverso', d: anverso_desc },
    reverso_desc && { t: 'Reverso', d: reverso_desc },
    orla_desc && { t: 'Orla', d: orla_desc },
  ].filter(Boolean) as { t: string; d: string }[]

  async function guardar() {
    setSaving(true)
    try {
      const formatos = ativos.map((v) => ({
        formato: v,
        quantidade: Math.max(1, form[v].qtd),
        grau: form[v].grau,
        valorBase: parseFloat(form[v].valor) || null,
      }))
      const tinha = new Set(row.itens.filter((i) => i.quantidade > 0).map((i) => i.formato_posse))
      const removidos = visiveis.filter((v) => !form[v].ativo && tinha.has(v))
      await onSave({
        formatos, removidos,
        casaMoeda: casaMoeda || null,
        foto: foto.trim() || null,
        nota: nota.trim() || null,
        defeito: defeito.trim() || null,
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
          <CoinDisc short={short} ano={row.issue.ano} estado={estadoDisco} size={72} />
          <div className="flex-1">
            <h2 className="font-serif text-lg font-semibold leading-tight text-mp-ink flex items-center gap-2">
              <Flag code={row.coin.pais_codigo} size={20} /> {row.coin.pais_nome}
            </h2>
            <p className="text-sm text-mp-ink-soft">
              {row.coin.denominacao ?? row.coin.titulo} · <strong>{row.issue.ano}</strong>
            </p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {[row.coin.comemorativa && row.coin.tema, row.coin.tipo_emissao, `Face ${eur(facial)}`, row.issue.casa_moeda && `Casa ${row.issue.casa_moeda}`, row.issue.etiqueta, short]
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
              <div className="mb-3">
                <div className="flex justify-center gap-4 mb-1">
                  {anverso_img && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={anverso_img} alt="Anverso" className="h-28 w-28 object-contain rounded-full bg-mp-surface-muted ring-1 ring-mp-border" />
                  )}
                  {reverso_img && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={reverso_img} alt="Reverso" className="h-28 w-28 object-contain rounded-full bg-mp-surface-muted ring-1 ring-mp-border" />
                  )}
                </div>
                {fotoGenerica && (
                  <p className="text-center text-[9px] text-mp-ink-faint">Foto de referência do tipo (pode ser de outro ano ou casa da moeda)</p>
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

        {descricoes.length > 0 && (
          <div className="mb-5 space-y-1.5">
            {descricoes.map((x) => (
              <p key={x.t} className="text-[11px] text-mp-ink-soft leading-snug">
                <span className="uppercase tracking-wide text-mp-ink-faint">{x.t}</span> · {x.d}
              </p>
            ))}
          </div>
        )}

        {/* Formatos/acabamento — conjunto anual (carteiras/BNC/Proof) ou avulsa (Normal/BNC/Proof). */}
        <div className="mb-4">
          <span className={lbl}>
            {row.coin.familia === 'euro_circulacao' ? 'Formato do conjunto — marca em quais a tens' : 'Acabamento — marca em quais a tens'}
          </span>
          <div className="space-y-2">
            {visiveis.map((v) => {
              const label = FORMATO_LABEL[v]
              const st = form[v]
              return (
                <div key={v} className={'rounded-lg border ' + (st.ativo ? 'border-mp-border' : 'border-mp-border/60')}>
                  <button
                    onClick={() => setF(v, { ativo: !st.ativo })}
                    className={
                      'w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg ' +
                      (st.ativo ? FORMATO_COR[v] : 'text-mp-ink-soft')
                    }
                  >
                    <span>{label}</span>
                    <span className="text-xs">{st.ativo ? '✓ tenho' : 'marcar'}</span>
                  </button>
                  {st.ativo && (
                    <div className="grid grid-cols-3 gap-2 px-3 pb-3 pt-1">
                      <label className="block">
                        <span className="text-[10px] text-mp-ink-faint">Qtd</span>
                        <input type="number" min={1} value={st.qtd}
                          onChange={(e) => setF(v, { qtd: parseInt(e.target.value, 10) || 1 })} className={inp} />
                      </label>
                      <label className="block">
                        <span className="text-[10px] text-mp-ink-faint">Conservação</span>
                        <select value={st.grau} onChange={(e) => setF(v, { grau: e.target.value })} className={inp}>
                          {GRADES.map((g) => <option key={g.label} value={g.label}>{g.label}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-[10px] text-mp-ink-faint">Valor base €</span>
                        <input type="number" step="0.01" min="0" value={st.valor}
                          onChange={(e) => setF(v, { valor: e.target.value })} className={inp} />
                      </label>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {mostraCasa && tenho && (
          <div className="mb-4">
            <span className={lbl}>Casa da moeda (Alemanha) — agrupa nos cartões A/D/F/G/J</span>
            <div className="flex gap-2 flex-wrap">
              {CASAS_DE.map((c) => (
                <button
                  key={c}
                  onClick={() => setCasaMoeda((cur) => (cur === c ? '' : c))}
                  className={
                    'w-10 rounded-lg py-2 text-sm font-semibold border ' +
                    (casaMoeda === c ? 'border-mp-gold bg-mp-falta-bg text-mp-gold-strong' : 'border-mp-border text-mp-ink-soft hover:border-mp-ink-soft')
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="block mb-2">
          <span className={lbl}>Foto da moeda (URL)</span>
          <input value={foto} onChange={(e) => setFoto(e.target.value)} placeholder="https://…jpg" className={inp} />
        </label>
        <label className="flex items-center gap-2 text-xs text-mp-ink-soft mb-4">
          <input type="checkbox" checked={aplicarTodos} onChange={(e) => setAplicarTodos(e.target.checked)} />
          Aplicar foto e valor a todos os anos de {row.coin.pais_nome} · {short}
        </label>

        <div className="bg-mp-surface-muted border border-mp-border rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <span className="text-xs text-mp-ink-soft">Valor real estimado (soma dos formatos)</span>
          <span className="font-serif text-xl font-semibold text-mp-gold-strong">{eur(estimado)}</span>
        </div>

        <label className="block mb-4">
          <span className={lbl}>Erro / variante de cunhagem</span>
          <input value={defeito} onChange={(e) => setDefeito(e.target.value)} placeholder="ex.: eixo deslocado, off-center, cunho duplo, mula…" className={inp} />
        </label>

        <label className="block mb-4">
          <span className={lbl}>Observações</span>
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} className={inp + ' resize-y'} />
        </label>

        <div className="mb-4">
          <TagsEditor catalogCoinId={row.coin.id} />
        </div>

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
