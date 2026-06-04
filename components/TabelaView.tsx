import { useEffect, useMemo, useRef, useState } from 'react'
import { estadoDe, formatosComMoeda, FORMATOS_COLECAO } from '@/lib/types'
import { valorColecao, eur } from '@/lib/valor'
import { casaEmissor } from '@/lib/emissores'
import { getUiPrefs, setUiPrefs } from '@/lib/catalog'
import type { DisplayRow, FormatoColecao } from '@/lib/types'
import Flag from './Flag'

type Col =
  | 'pais' | 'tipo' | 'moeda' | 'metal' | 'km' | 'face' | 'ano' | 'casa'
  | 'peso' | 'diam' | 'grau' | 'tiragem' | 'estado' | 'qtd' | 'valor'
type Dir = 1 | -1
interface SortRule { col: Col; dir: Dir }

// Todas as colunas possíveis (rótulo PT + alinhamento). A ordem aqui é só o
// catálogo; a ordem visível é configurável pelo utilizador.
interface ColMeta { key: Col; label: string; right?: boolean }
const COLUNAS: ColMeta[] = [
  { key: 'pais', label: 'País' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'moeda', label: 'Moeda / Comemoração' },
  { key: 'metal', label: 'Metal' },
  { key: 'km', label: 'KM#' },
  { key: 'face', label: 'Face', right: true },
  { key: 'ano', label: 'Ano' },
  { key: 'casa', label: 'Casa / Emissor' },
  { key: 'peso', label: 'Peso', right: true },
  { key: 'diam', label: 'Diâmetro', right: true },
  { key: 'grau', label: 'Grau' },
  { key: 'tiragem', label: 'Tiragem', right: true },
  { key: 'estado', label: 'Estado' },
  { key: 'qtd', label: 'Qtd', right: true },
  { key: 'valor', label: 'Valor', right: true },
]
const LABEL = Object.fromEntries(COLUNAS.map((c) => [c.key, c.label])) as Record<Col, string>
const COL_DEFAULT: Col[] = ['pais', 'tipo', 'moeda', 'metal', 'km', 'face', 'ano', 'casa', 'peso', 'diam', 'estado', 'qtd', 'valor']

const METAIS_PT: Record<string, string> = {
  gold: 'Ouro', silver: 'Prata', copper: 'Cobre', bronze: 'Bronze', brass: 'Latão',
  nickel: 'Níquel', bimetallic: 'Bimetálica', cupronickel: 'Cuproníquel', steel: 'Aço',
  'copper-nickel': 'Cuproníquel', billon: 'Bolhão', tin: 'Estanho', zinc: 'Zinco',
  platinum: 'Platina', palladium: 'Paládio', 'gold-plated': 'Dourado',
}
function metalPt(r: DisplayRow): string {
  const t = r.coin.composicao || r.coin.titulo || ''
  const m = t.match(/\b(Gold-plated|Copper-Nickel|Cupronickel|Gold|Silver|Copper|Bronze|Brass|Nickel|Bi-?Metallic|Billon|Steel|Tin|Zinc|Platinum|Palladium)\b/i)
  if (!m) return ''
  return METAIS_PT[m[1].toLowerCase().replace('bi-metallic', 'bimetallic')] ?? m[1]
}
function anoNum(r: DisplayRow): string {
  const n = r.issue.ano_gregoriano ?? parseInt(r.issue.ano, 10)
  return Number.isFinite(n) ? String(n) : ''
}
function ordemNatural(a: DisplayRow, b: DisplayRow): number {
  return a.coin.pais_nome.localeCompare(b.coin.pais_nome, 'pt')
    || casaEmissor(a).localeCompare(casaEmissor(b), 'pt')
    || (Number(a.coin.comemorativa) - Number(b.coin.comemorativa))
    || ((a.issue.ano_gregoriano ?? 0) - (b.issue.ano_gregoriano ?? 0))
    || ((a.coin.valor_facial ?? 0) - (b.coin.valor_facial ?? 0))
}
function valOf(r: DisplayRow, col: Col): string | number {
  switch (col) {
    case 'pais':   return r.coin.pais_nome
    case 'tipo':   return r.coin.comemorativa ? 'Comemorativa' : (r.coin.tipo_emissao ?? 'Circulação')
    case 'moeda':  return r.coin.comemorativa ? (r.coin.tema || r.coin.titulo || '') : (r.coin.denominacao ?? '')
    case 'metal':  return metalPt(r)
    case 'km':     return r.coin.km_ref ?? ''
    case 'face':   return r.coin.valor_facial ?? 0
    case 'ano':    return r.issue.ano_gregoriano ?? parseInt(r.issue.ano, 10) ?? 0
    case 'casa':   return casaEmissor(r)
    case 'peso':   return r.coin.peso_g ?? 0
    case 'diam':   return r.coin.diametro_mm ?? 0
    case 'grau':   return r.item?.grau ?? ''
    case 'tiragem': return r.issue.tiragem ?? 0
    case 'estado': return estadoDe(r.item)
    case 'qtd':    return r.item?.quantidade ?? 0
    case 'valor':  return valorColecao(r.coin, r.itens)
  }
}

const FORMATO_CLS: Record<FormatoColecao, string> = {
  set: 'border-mp-set bg-mp-set-bg text-mp-set',
  caderneta: 'border-mp-caderneta bg-mp-caderneta-bg text-mp-caderneta',
  caderneta_bebe: 'border-mp-gold bg-mp-falta-bg text-mp-gold-strong',
}
function EstadoSelector({ formatos, onChange }: { formatos: Set<FormatoColecao>; onChange: (f: FormatoColecao, ativo: boolean) => void }) {
  return (
    <div className="flex gap-1">
      {FORMATOS_COLECAO.map(({ v, curto, label }) => {
        const ativo = formatos.has(v)
        return (
          <button key={v} onClick={() => onChange(v, !ativo)} title={ativo ? `Retirar de ${label}` : `Marcar em ${label}`}
            className={'w-6 rounded border px-1 py-0.5 text-[10px] font-semibold leading-none transition-colors ' +
              (ativo ? FORMATO_CLS[v] : 'border-mp-border text-mp-ink-faint hover:border-mp-ink-soft hover:text-mp-ink-soft')}>
            {curto}
          </button>
        )
      })}
    </div>
  )
}
function StepperQtd({ qtd, onChange }: { qtd: number; onChange: (n: number) => void }) {
  const [txt, setTxt] = useState(String(qtd))
  useEffect(() => { setTxt(String(qtd)) }, [qtd])
  const commit = (v: string) => { const n = Math.max(0, parseInt(v, 10) || 0); if (n !== qtd) onChange(n) }
  return (
    <div className="flex items-center justify-end gap-1">
      <button onClick={() => onChange(Math.max(0, qtd - 1))} disabled={qtd <= 0} aria-label="Menos um"
        className="h-6 w-6 rounded border border-mp-border leading-none text-mp-ink-soft hover:bg-mp-surface-muted disabled:opacity-30">−</button>
      <input type="number" min={0} value={txt}
        onChange={(e) => setTxt(e.target.value)} onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        className="w-12 rounded border border-mp-border bg-mp-surface px-1 py-0.5 text-center text-sm outline-none focus:border-mp-gold" />
      <button onClick={() => onChange(qtd + 1)} aria-label="Mais um"
        className="h-6 w-6 rounded border border-mp-border leading-none text-mp-ink-soft hover:bg-mp-surface-muted">+</button>
    </div>
  )
}

const selectCls = 'h-8 rounded-lg border border-mp-border bg-mp-surface px-2 text-sm text-mp-ink outline-none focus:border-mp-gold min-w-[130px]'
const PAGINA_TAM = 200

interface TabelaViewProps {
  rows: DisplayRow[]
  onSelect: (row: DisplayRow) => void
  onExportar: () => void
  onImprimir: () => void
  onQuantidade: (row: DisplayRow, qtd: number) => void
  onFormato: (row: DisplayRow, formato: FormatoColecao, ativo: boolean) => void
  prefsKey?: string  // se definido, guarda colunas/ordenação na BD por esta chave
}

export default function TabelaView({ rows, onSelect, onExportar, onImprimir, onQuantidade, onFormato, prefsKey }: TabelaViewProps) {
  const [colVis, setColVis] = useState<Col[]>(COL_DEFAULT)
  const [sorts, setSorts] = useState<SortRule[]>([])
  const [painel, setPainel] = useState<'cols' | 'sort' | null>(null)
  const [filtroPais, setFiltroPais] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'' | 'circulacao' | 'comemorativa'>('')
  const [filtroAno, setFiltroAno] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'' | 'set' | 'caderneta' | 'naotem'>('')
  const [pagina, setPagina] = useState(0)
  const carregou = useRef(false)

  // carregar prefs guardadas
  useEffect(() => {
    if (!prefsKey) { carregou.current = true; return }
    getUiPrefs<{ colVis?: Col[]; sorts?: SortRule[] }>(`tabela:${prefsKey}`).then((p) => {
      if (p?.colVis?.length) setColVis(p.colVis.filter((c) => LABEL[c]))
      if (p?.sorts) setSorts(p.sorts.filter((s) => LABEL[s.col]))
    }).finally(() => { carregou.current = true })
  }, [prefsKey])
  // guardar prefs quando mudam (após o carregamento inicial)
  useEffect(() => {
    if (!prefsKey || !carregou.current) return
    setUiPrefs(`tabela:${prefsKey}`, { colVis, sorts })
  }, [colVis, sorts, prefsKey])

  const { paises, anos } = useMemo(() => {
    const ps = new Map<string, string>(); const as = new Set<string>()
    for (const r of rows) { ps.set(r.coin.pais_codigo, r.coin.pais_nome); const a = anoNum(r); if (a) as.add(a) }
    return {
      paises: [...ps.entries()].sort((a, b) => a[1].localeCompare(b[1])),
      anos: [...as].sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0)),
    }
  }, [rows])

  const filtradas = useMemo(() => rows.filter((r) => {
    if (filtroPais && r.coin.pais_codigo !== filtroPais) return false
    if (filtroTipo === 'circulacao' && r.coin.comemorativa) return false
    if (filtroTipo === 'comemorativa' && !r.coin.comemorativa) return false
    if (filtroAno && anoNum(r) !== filtroAno) return false
    if (filtroEstado && estadoDe(r.item) !== filtroEstado) return false
    return true
  }), [rows, filtroPais, filtroTipo, filtroAno, filtroEstado])

  const ordenadas = useMemo(() => {
    if (sorts.length === 0) return [...filtradas].sort(ordemNatural)
    return [...filtradas].sort((a, b) => {
      for (const s of sorts) {
        const va = valOf(a, s.col), vb = valOf(b, s.col)
        let cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'pt')
        if (cmp !== 0) return cmp * s.dir
      }
      return ordemNatural(a, b)
    })
  }, [filtradas, sorts])

  useEffect(() => { setPagina(0) }, [filtroPais, filtroTipo, filtroAno, filtroEstado, sorts])

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / PAGINA_TAM))
  const paginaSegura = Math.min(pagina, totalPaginas - 1)
  const visiveis = useMemo(() => ordenadas.slice(paginaSegura * PAGINA_TAM, (paginaSegura + 1) * PAGINA_TAM), [ordenadas, paginaSegura])

  const totalValor = useMemo(() => filtradas.reduce((s, r) => s + valorColecao(r.coin, r.itens), 0), [filtradas])
  const totalSet   = useMemo(() => filtradas.filter((r) => estadoDe(r.item) === 'set').length, [filtradas])
  const totalCad   = useMemo(() => filtradas.filter((r) => estadoDe(r.item) === 'caderneta').length, [filtradas])
  const totalFalta = useMemo(() => filtradas.filter((r) => estadoDe(r.item) === 'naotem').length, [filtradas])
  const temFiltro = filtroPais || filtroTipo || filtroAno || filtroEstado

  // clique no cabeçalho: ordena por essa coluna (1 nível; alterna asc/desc)
  function ordenarPor(col: Col) {
    setSorts((s) => {
      const atual = s[0]
      if (atual?.col === col) return [{ col, dir: (atual.dir === 1 ? -1 : 1) as Dir }]
      return [{ col, dir: 1 }]
    })
  }
  const sortDe = (col: Col): SortRule | undefined => sorts.find((s) => s.col === col)

  // célula por coluna
  function celula(r: DisplayRow, key: Col) {
    switch (key) {
      case 'pais': return <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Flag code={r.coin.pais_codigo} size={14} />{r.coin.pais_nome}</span>
      case 'tipo': return <span className="text-mp-ink-soft">{r.coin.comemorativa ? 'Comemorativa' : (r.coin.tipo_emissao ?? 'Circulação')}</span>
      case 'moeda': return (
        <span className="flex items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-mp-surface-muted ring-1 ring-mp-border">
            {r.coin.anverso_img ? <img src={r.coin.anverso_img} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="text-[10px] text-mp-coin-empty">⊚</span>}
          </span>
          <span className="truncate">{String(valOf(r, 'moeda')) || '—'}</span>
        </span>
      )
      case 'metal': return <span className="whitespace-nowrap text-mp-ink-soft">{metalPt(r) || '—'}</span>
      case 'km': return <span className="whitespace-nowrap text-[11px] text-mp-ink-faint">{r.coin.km_ref || '—'}</span>
      case 'face': return r.coin.valor_facial != null ? eur(r.coin.valor_facial) : '—'
      case 'ano': return anoNum(r) || r.issue.ano
      case 'casa': return <span className="text-[11px] text-mp-ink-soft">{casaEmissor(r)}</span>
      case 'peso': return <span className="whitespace-nowrap text-mp-ink-soft">{r.coin.peso_g != null ? `${r.coin.peso_g} g` : '—'}</span>
      case 'diam': return <span className="whitespace-nowrap text-mp-ink-soft">{r.coin.diametro_mm != null ? `${r.coin.diametro_mm} mm` : '—'}</span>
      case 'grau': return <span className="text-mp-ink-soft">{r.item?.grau || '—'}</span>
      case 'tiragem': return <span className="whitespace-nowrap tabular-nums text-mp-ink-soft">{r.issue.tiragem != null ? r.issue.tiragem.toLocaleString('pt-PT') : '—'}</span>
      case 'estado': return <div onClick={(e) => e.stopPropagation()}><EstadoSelector formatos={formatosComMoeda(r.itens)} onChange={(f, a) => onFormato(r, f, a)} /></div>
      case 'qtd': return <div onClick={(e) => e.stopPropagation()}><StepperQtd qtd={r.item?.quantidade ?? 0} onChange={(n) => onQuantidade(r, n)} /></div>
      case 'valor': return <span className="text-mp-gold-strong">{r.itens.length === 0 ? '—' : eur(valorColecao(r.coin, r.itens))}</span>
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select value={filtroPais} onChange={(e) => setFiltroPais(e.target.value)} className={selectCls}>
          <option value="">Todos os países</option>
          {paises.map(([cod, nome]) => <option key={cod} value={cod}>{nome}</option>)}
        </select>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as typeof filtroTipo)} className={selectCls}>
          <option value="">Circulação + Comemorativas</option>
          <option value="circulacao">Só Circulação</option>
          <option value="comemorativa">Só Comemorativas</option>
        </select>
        <select value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)} className={selectCls} style={{ minWidth: 100 }}>
          <option value="">Todos os anos</option>
          {anos.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)} className={selectCls} style={{ minWidth: 140 }}>
          <option value="">Todos os estados</option>
          <option value="set">Set</option>
          <option value="caderneta">Caderneta</option>
          <option value="naotem">Não tem</option>
        </select>
        {temFiltro && (
          <button onClick={() => { setFiltroPais(''); setFiltroTipo(''); setFiltroAno(''); setFiltroEstado('') }}
            className="text-xs text-mp-ink-soft underline hover:text-mp-ink">Limpar filtros</button>
        )}

        <div className="relative ml-auto flex items-center gap-2">
          <button onClick={() => setPainel(painel === 'cols' ? null : 'cols')}
            className="rounded-lg border border-mp-border px-3 py-2 text-sm font-medium text-mp-ink-soft hover:bg-mp-surface-muted whitespace-nowrap">
            ▦ Colunas
          </button>
          <button onClick={() => setPainel(painel === 'sort' ? null : 'sort')}
            className="rounded-lg border border-mp-border px-3 py-2 text-sm font-medium text-mp-ink-soft hover:bg-mp-surface-muted whitespace-nowrap">
            ↕ Ordenar{sorts.length ? ` (${sorts.length})` : ''}
          </button>
          <button onClick={onImprimir}
            className="rounded-lg border border-mp-border px-3 py-2 text-sm font-medium text-mp-ink-soft hover:bg-mp-surface-muted whitespace-nowrap">🖨 Em falta</button>
          <button onClick={onExportar}
            className="rounded-lg border border-mp-gold px-3 py-2 text-sm font-semibold text-mp-gold-strong hover:bg-mp-falta-bg whitespace-nowrap">⤓ Excel</button>
          {painel === 'cols' && <PainelColunas colVis={colVis} setColVis={setColVis} onClose={() => setPainel(null)} />}
          {painel === 'sort' && <PainelOrdenar sorts={sorts} setSorts={setSorts} onClose={() => setPainel(null)} />}
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-mp-ink-soft">
        <span>{filtradas.length} moedas{temFiltro ? ' (filtradas)' : ''}</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-mp-set" /> set {totalSet}</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-mp-caderneta" /> caderneta {totalCad}</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-mp-falta" /> não tem {totalFalta}</span>
        <span className="ml-auto font-medium">Valor: <b className="font-serif text-mp-gold-strong">{eur(totalValor)}</b></span>
      </div>

      {totalPaginas > 1 && (
        <div className="mb-2 flex items-center justify-center gap-3 text-sm">
          <button onClick={() => setPagina((p) => Math.max(0, p - 1))} disabled={paginaSegura <= 0}
            className="rounded-lg border border-mp-border px-3 py-1 text-mp-ink-soft hover:bg-mp-surface-muted disabled:opacity-30">← Anterior</button>
          <span className="text-mp-ink-soft">Página <b className="text-mp-ink">{paginaSegura + 1}</b> de {totalPaginas}<span className="text-mp-ink-faint"> · {ordenadas.length} linhas</span></span>
          <button onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))} disabled={paginaSegura >= totalPaginas - 1}
            className="rounded-lg border border-mp-border px-3 py-1 text-mp-ink-soft hover:bg-mp-surface-muted disabled:opacity-30">Seguinte →</button>
        </div>
      )}

      <div className="max-h-[65vh] overflow-auto rounded-2xl border border-mp-border bg-mp-surface">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-mp-surface-muted text-left text-[11px] uppercase tracking-wide text-mp-ink-soft">
            <tr>
              {colVis.map((key) => {
                const meta = COLUNAS.find((c) => c.key === key)!
                const s = sortDe(key)
                return (
                  <th key={key} onClick={() => ordenarPor(key)}
                    className={'cursor-pointer select-none whitespace-nowrap px-3 py-2 font-semibold hover:text-mp-ink ' + (meta.right ? 'text-right' : '')}>
                    {meta.label}{s ? (s.dir === 1 ? ' ▲' : ' ▼') : ' ⇅'}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {ordenadas.length === 0 && (
              <tr><td colSpan={colVis.length} className="px-4 py-10 text-center text-sm text-mp-ink-faint">Nenhuma moeda encontrada com os filtros actuais.</td></tr>
            )}
            {visiveis.map((r) => (
              <tr key={r.issue.id} onClick={() => onSelect(r)} className="cursor-pointer border-t border-mp-border/60 hover:bg-mp-surface-muted">
                {colVis.map((key) => {
                  const meta = COLUNAS.find((c) => c.key === key)!
                  return (
                    <td key={key} className={'px-3 py-1.5 ' + (meta.right ? 'text-right ' : '') + (key === 'moeda' ? 'max-w-[260px]' : '')}>
                      {celula(r, key)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          {filtradas.length > 0 && (
            <tfoot className="sticky bottom-0 border-t-2 border-mp-border bg-mp-surface-muted">
              <tr>
                <td colSpan={Math.max(1, colVis.length - 1)} className="px-3 py-2 text-xs font-medium text-mp-ink-soft">
                  {filtradas.length} moedas · {totalSet} set · {totalCad} caderneta · {totalFalta} em falta
                </td>
                <td className="px-3 py-2 text-right font-serif font-semibold text-mp-gold-strong">{eur(totalValor)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

// ─── Painel de colunas: mostrar/ocultar + arrastar para reordenar ───
function PainelColunas({ colVis, setColVis, onClose }: { colVis: Col[]; setColVis: (c: Col[]) => void; onClose: () => void }) {
  const [arrasto, setArrasto] = useState<number | null>(null)
  // ordem mostrada: primeiro as visíveis (na sua ordem), depois as ocultas
  const ocultas = COLUNAS.map((c) => c.key).filter((k) => !colVis.includes(k))
  const lista = [...colVis, ...ocultas]

  function toggle(key: Col) {
    if (colVis.includes(key)) setColVis(colVis.filter((c) => c !== key))
    else setColVis([...colVis, key])
  }
  function reordenar(de: number, para: number) {
    // só reordena dentro das visíveis
    if (de >= colVis.length || para >= colVis.length) return
    const novo = [...colVis]
    const [item] = novo.splice(de, 1)
    novo.splice(para, 0, item)
    setColVis(novo)
  }

  return (
    <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-mp-border bg-mp-surface p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-mp-ink">Colunas</span>
        <button onClick={onClose} className="text-mp-ink-faint hover:text-mp-ink">✕</button>
      </div>
      <p className="mb-2 text-[11px] text-mp-ink-faint">Marca as visíveis · arrasta para reordenar</p>
      <div className="max-h-[50vh] space-y-1 overflow-auto">
        {lista.map((key, i) => {
          const visivel = i < colVis.length
          return (
            <div
              key={key}
              draggable={visivel}
              onDragStart={() => setArrasto(i)}
              onDragOver={(e) => { if (visivel) e.preventDefault() }}
              onDrop={() => { if (arrasto != null) reordenar(arrasto, i); setArrasto(null) }}
              className={'flex items-center gap-2 rounded-lg border px-2 py-1.5 ' +
                (visivel ? 'border-mp-border bg-mp-surface cursor-grab' : 'border-transparent opacity-60')}
            >
              {visivel && <span className="text-mp-ink-faint">⠿</span>}
              <label className="flex flex-1 items-center gap-2 text-sm">
                <input type="checkbox" checked={visivel} onChange={() => toggle(key)} className="accent-mp-gold" />
                <span className={visivel ? 'text-mp-ink' : 'text-mp-ink-faint'}>{LABEL[key]}</span>
              </label>
            </div>
          )
        })}
      </div>
      <button onClick={() => setColVis(COL_DEFAULT)} className="mt-2 text-xs text-mp-gold-strong hover:underline">Repor predefinição</button>
    </div>
  )
}

// ─── Painel de ordenação: até 5 níveis ───
function PainelOrdenar({ sorts, setSorts, onClose }: { sorts: SortRule[]; setSorts: (s: SortRule[]) => void; onClose: () => void }) {
  const usadas = new Set(sorts.map((s) => s.col))
  const disponiveis = COLUNAS.filter((c) => c.key !== 'estado' && c.key !== 'qtd')
  function setNivel(i: number, patch: Partial<SortRule>) {
    setSorts(sorts.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  }
  function adicionar() {
    const livre = disponiveis.find((c) => !usadas.has(c.key))
    if (livre && sorts.length < 5) setSorts([...sorts, { col: livre.key, dir: 1 }])
  }
  return (
    <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-2xl border border-mp-border bg-mp-surface p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-mp-ink">Ordenação (até 5 níveis)</span>
        <button onClick={onClose} className="text-mp-ink-faint hover:text-mp-ink">✕</button>
      </div>
      {sorts.length === 0 && <p className="mb-2 text-[11px] text-mp-ink-faint">Sem ordenação — usa a ordem natural (país › casa › tipo › ano).</p>}
      <div className="space-y-2">
        {sorts.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-4 text-xs text-mp-ink-faint">{i + 1}</span>
            <select value={s.col} onChange={(e) => setNivel(i, { col: e.target.value as Col })}
              className="h-8 flex-1 rounded-lg border border-mp-border bg-mp-surface px-2 text-sm outline-none focus:border-mp-gold">
              {disponiveis.map((c) => <option key={c.key} value={c.key} disabled={usadas.has(c.key) && c.key !== s.col}>{c.label}</option>)}
            </select>
            <button onClick={() => setNivel(i, { dir: (s.dir === 1 ? -1 : 1) as Dir })}
              className="h-8 w-16 rounded-lg border border-mp-border text-sm text-mp-ink-soft hover:bg-mp-surface-muted">
              {s.dir === 1 ? '↑ asc' : '↓ desc'}
            </button>
            <button onClick={() => setSorts(sorts.filter((_, j) => j !== i))} className="text-mp-ink-faint hover:text-mp-falta">✕</button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button onClick={adicionar} disabled={sorts.length >= 5}
          className="text-xs font-semibold text-mp-gold-strong hover:underline disabled:opacity-40">+ adicionar nível</button>
        {sorts.length > 0 && <button onClick={() => setSorts([])} className="text-xs text-mp-ink-faint hover:text-mp-ink">limpar</button>}
      </div>
    </div>
  )
}
