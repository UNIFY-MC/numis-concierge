import { useEffect, useMemo, useRef, useState, type ReactNode, type MouseEvent as RMouseEvent } from 'react'
import { estadoDe } from '@/lib/types'
import { eur, GRADES, valorMercadoGrau } from '@/lib/valor'
import { casaEmissor, casaEmissorCurto } from '@/lib/emissores'
import { denomLimpa, temaLimpo } from '@/lib/numis-texto'
import { getUiPrefs, setUiPrefs } from '@/lib/catalog'
import type { DisplayRow, FormatoColecao } from '@/lib/types'
import type { Tag } from '@/lib/tags'
import Flag from './Flag'

interface TagsInfo { tags: Tag[]; coinTags: Map<string, Set<string>> }

type Col =
  | 'pais' | 'tipo' | 'fotos' | 'moeda' | 'comemoracao' | 'denom' | 'serie' | 'metal' | 'composicao' | 'km' | 'schon'
  | 'numista' | 'face' | 'ano' | 'casa' | 'mintmark' | 'peso' | 'diam' | 'espessura'
  | 'anversodesc' | 'reversodesc' | 'orla' | 'tags' | 'grau' | 'tiragem'
  | 'set' | 'caderneta' | 'bebe' | 'proof' | 'normal' | 'qtd' | 'facial' | 'mercado'
type Dir = 1 | -1
interface SortRule { col: Col; dir: Dir }

// Todas as colunas possíveis (rótulo PT + alinhamento). A ordem aqui é só o
// catálogo; a ordem visível é configurável pelo utilizador.
interface ColMeta { key: Col; label: string; right?: boolean }
const COLUNAS: ColMeta[] = [
  { key: 'pais', label: 'País' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'fotos', label: 'Fotos' },
  { key: 'moeda', label: 'Moeda' },
  { key: 'comemoracao', label: 'Comemoração' },
  { key: 'denom', label: 'Denominação' },
  { key: 'serie', label: 'Série / Reinado' },
  { key: 'metal', label: 'Metal' },
  { key: 'composicao', label: 'Composição' },
  { key: 'km', label: 'KM#' },
  { key: 'schon', label: 'Schön#' },
  { key: 'numista', label: 'Numista ID' },
  { key: 'face', label: 'Face', right: true },
  { key: 'ano', label: 'Ano' },
  { key: 'casa', label: 'Casa / Emissor' },
  { key: 'mintmark', label: 'Mintmark' },
  { key: 'peso', label: 'Peso', right: true },
  { key: 'diam', label: 'Diâmetro', right: true },
  { key: 'espessura', label: 'Espessura', right: true },
  { key: 'anversodesc', label: 'Desc. anverso' },
  { key: 'reversodesc', label: 'Desc. reverso' },
  { key: 'orla', label: 'Orla' },
  { key: 'tags', label: 'Coleções' },
  { key: 'grau', label: 'Grau' },
  { key: 'tiragem', label: 'Tiragem', right: true },
  { key: 'caderneta', label: 'Carteira FDC', right: true },
  { key: 'bebe', label: 'Carteira Bébé', right: true },
  { key: 'set', label: 'BNC', right: true },
  { key: 'proof', label: 'Proof', right: true },
  { key: 'normal', label: 'Normal', right: true },
  { key: 'qtd', label: 'Qtd', right: true },
  { key: 'facial', label: 'Valor facial', right: true },
  { key: 'mercado', label: 'Valor mercado', right: true },
]
const LABEL = Object.fromEntries(COLUNAS.map((c) => [c.key, c.label])) as Record<Col, string>
const COL_DEFAULT: Col[] = ['pais', 'tipo', 'moeda', 'comemoracao', 'metal', 'km', 'face', 'ano', 'casa', 'peso', 'diam', 'grau', 'caderneta', 'bebe', 'set', 'proof', 'normal', 'qtd', 'facial', 'mercado']
// Chaves de coluna mantidas (preservam prefs); o rótulo/valor é o acabamento INCM.
const FORMATO_DE_COL: Partial<Record<Col, FormatoColecao>> = { caderneta: 'carteira_fdc', bebe: 'carteira_bebe', set: 'bnc', proof: 'proof', normal: 'normal' }
const qtdFormato = (r: DisplayRow, f: FormatoColecao) => r.itens.find((i) => i.formato_posse === f)?.quantidade ?? 0
const qtdTotal = (r: DisplayRow) => r.itens.reduce((s, i) => s + (i.quantidade || 0), 0)
// valor de mercado unitário no grau do exemplar principal, e total (× qtd)
const vmUnit = (r: DisplayRow) => valorMercadoGrau(r.issue.valor_mercado, r.issue.precos_mercado, r.issue.valor_mercado_grau, r.item?.grau ?? null)
const vmTotal = (r: DisplayRow) => qtdTotal(r) * (vmUnit(r) ?? 0)

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
    case 'fotos':  return ''
    case 'moeda':  return denomLimpa(r.coin)
    case 'comemoracao': return temaLimpo(r.coin)
    case 'denom':  return denomLimpa(r.coin)
    case 'serie':  return r.coin.serie ?? ''
    case 'metal':  return metalPt(r)
    case 'composicao': return r.coin.composicao ?? ''
    case 'km':     return r.coin.km_ref ?? ''
    case 'schon':  return r.coin.schon_ref ?? ''
    case 'numista': return r.coin.numista_id ?? 0
    case 'face':   return r.coin.valor_facial ?? 0
    case 'ano':    return r.issue.ano_gregoriano ?? parseInt(r.issue.ano, 10) ?? 0
    case 'casa':   return casaEmissor(r)
    case 'mintmark': return r.coin.mintmark ?? r.issue.mintmark_variante ?? ''
    case 'peso':   return r.coin.peso_g ?? 0
    case 'diam':   return r.coin.diametro_mm ?? 0
    case 'espessura': return r.coin.espessura_mm ?? 0
    case 'anversodesc': return r.coin.anverso_desc ?? ''
    case 'reversodesc': return r.coin.reverso_desc ?? ''
    case 'orla':   return r.coin.orla_desc ?? r.coin.orla_tipo ?? ''
    case 'tags':   return ''  // ordenação por tags não se aplica (chips)
    case 'grau':   return r.item?.grau ?? ''
    case 'tiragem': return r.issue.tiragem ?? 0
    case 'set':    return qtdFormato(r, 'bnc')
    case 'caderneta': return qtdFormato(r, 'carteira_fdc')
    case 'bebe':   return qtdFormato(r, 'carteira_bebe')
    case 'proof':  return qtdFormato(r, 'proof')
    case 'normal': return qtdFormato(r, 'normal')
    case 'qtd':    return qtdTotal(r)
    case 'facial': return qtdTotal(r) * (r.coin.valor_facial ?? 0)
    case 'mercado': return vmTotal(r)
  }
}

// Disco pequeno de uma face (anverso/reverso) na tabela.
function Disco({ url }: { url: string | null }) {
  return (
    <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-mp-surface-muted ring-1 ring-mp-border">
      {url ? <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="text-[9px] text-mp-coin-empty">⊚</span>}
    </span>
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
  onFormatoQtd?: (row: DisplayRow, formato: FormatoColecao, qtd: number) => void  // qtd por formato (S/C/B)
  onGrau?: (row: DisplayRow, grau: string) => void  // grau/qualidade do exemplar principal, inline
  prefsKey?: string  // se definido, guarda colunas/ordenação na BD por esta chave
  tagsInfo?: TagsInfo  // coleções temáticas, para a coluna "Coleções"
  titulo?: string      // mostrado na barra de ações (alinhado com os botões)
  subtitulo?: string
  onVoltar?: () => void
  acaoExtra?: ReactNode  // ex. toggle Lista/Tabela, na mesma linha dos botões
}

export default function TabelaView({ rows, onSelect, onExportar, onImprimir, onQuantidade, onFormato, onFormatoQtd, onGrau, prefsKey, tagsInfo, titulo, subtitulo, onVoltar, acaoExtra }: TabelaViewProps) {
  // fallback: se o pai não passa onFormatoQtd, usa onFormato (liga/desliga) + onQuantidade
  const mudarFormatoQtd = onFormatoQtd ?? ((row: DisplayRow, f: FormatoColecao, q: number) => { onFormato(row, f, q > 0); if (q > 0) onQuantidade(row, q) })
  const [colVis, setColVis] = useState<Col[]>(COL_DEFAULT)
  const [sorts, setSorts] = useState<SortRule[]>([])
  const [painel, setPainel] = useState<'cols' | 'sort' | null>(null)
  // filtros genéricos por coluna: valor seleccionado (texto) para cada coluna.
  const [filtros, setFiltros] = useState<Partial<Record<Col, string>>>({})
  const [filtroAberto, setFiltroAberto] = useState<Col | null>(null)
  const [larguras, setLarguras] = useState<Partial<Record<Col, number>>>({})
  const resize = useRef<{ col: Col; x0: number; w0: number } | null>(null)
  const [pagina, setPagina] = useState(0)
  const carregou = useRef(false)

  function iniciarResize(col: Col, e: RMouseEvent) {
    e.preventDefault(); e.stopPropagation()
    const th = (e.currentTarget as HTMLElement).closest('th')
    resize.current = { col, x0: e.clientX, w0: th?.offsetWidth ?? 100 }
    function mover(ev: MouseEvent) {
      if (!resize.current) return
      const w = Math.max(36, resize.current.w0 + (ev.clientX - resize.current.x0))
      setLarguras((l) => ({ ...l, [resize.current!.col]: w }))
    }
    function fim() { resize.current = null; document.removeEventListener('mousemove', mover); document.removeEventListener('mouseup', fim) }
    document.addEventListener('mousemove', mover)
    document.addEventListener('mouseup', fim)
  }

  // carregar prefs guardadas
  useEffect(() => {
    if (!prefsKey) { carregou.current = true; return }
    getUiPrefs<{ colVis?: Col[]; sorts?: SortRule[]; larguras?: Partial<Record<Col, number>> }>(`tabela:${prefsKey}`).then((p) => {
      if (p?.colVis?.length) setColVis(p.colVis.filter((c) => LABEL[c]))
      if (p?.sorts) setSorts(p.sorts.filter((s) => LABEL[s.col]))
      if (p?.larguras) setLarguras(p.larguras)
    }).finally(() => { carregou.current = true })
  }, [prefsKey])
  // guardar prefs quando mudam (após o carregamento inicial)
  useEffect(() => {
    if (!prefsKey || !carregou.current) return
    setUiPrefs(`tabela:${prefsKey}`, { colVis, sorts, larguras })
  }, [colVis, sorts, larguras, prefsKey])

  // Colunas com filtro (todas excepto as contínuas de edição).
  const SEM_FILTRO = new Set<Col>(['fotos', 'moeda', 'comemoracao', 'set', 'caderneta', 'bebe', 'proof', 'normal', 'qtd', 'facial', 'mercado'])
  // valores distintos por coluna (para as opções do dropdown de filtro)
  const valoresPorCol = useMemo(() => {
    const m = new Map<Col, string[]>()
    const sets = new Map<Col, Set<string>>()
    for (const r of rows) {
      for (const c of COLUNAS) {
        if (SEM_FILTRO.has(c.key)) continue
        const v = String(valOf(r, c.key) ?? '').trim()
        if (!v) continue
        const s = sets.get(c.key) ?? new Set<string>(); s.add(v); sets.set(c.key, s)
      }
    }
    for (const [k, s] of sets) m.set(k, [...s].sort((a, b) => a.localeCompare(b, 'pt', { numeric: true })))
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  const filtradas = useMemo(() => rows.filter((r) => {
    for (const [col, val] of Object.entries(filtros)) {
      if (!val) continue
      if (String(valOf(r, col as Col) ?? '') !== val) return false
    }
    return true
  }), [rows, filtros])

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

  useEffect(() => { setPagina(0) }, [filtros, sorts])
  useEffect(() => {
    if (!filtroAberto) return
    function fora(e: MouseEvent) {
      const el = e.target as HTMLElement
      if (!el.closest('[data-filtro]')) setFiltroAberto(null)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [filtroAberto])

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / PAGINA_TAM))
  const paginaSegura = Math.min(pagina, totalPaginas - 1)
  const visiveis = useMemo(() => ordenadas.slice(paginaSegura * PAGINA_TAM, (paginaSegura + 1) * PAGINA_TAM), [ordenadas, paginaSegura])

  const totalValor = useMemo(() => filtradas.reduce((s, r) => s + qtdTotal(r) * (r.coin.valor_facial ?? 0), 0), [filtradas])
  // total por VALOR DE MERCADO (ajustado ao grau) — é o total relevante da coleção
  const totalMercado = useMemo(() => filtradas.reduce((s, r) => s + vmTotal(r), 0), [filtradas])
  const totalSet   = useMemo(() => filtradas.filter((r) => estadoDe(r.item) === 'set').length, [filtradas])
  const totalCad   = useMemo(() => filtradas.filter((r) => estadoDe(r.item) === 'caderneta').length, [filtradas])
  const totalFalta = useMemo(() => filtradas.filter((r) => estadoDe(r.item) === 'naotem').length, [filtradas])
  const temFiltro = Object.values(filtros).some(Boolean)

  // clique no cabeçalho: ordena por essa coluna (1 nível; alterna asc/desc)
  function ordenarPor(col: Col) {
    setSorts((s) => {
      const atual = s[0]
      if (atual?.col === col) return [{ col, dir: (atual.dir === 1 ? -1 : 1) as Dir }]
      return [{ col, dir: 1 }]
    })
  }
  const sortDe = (col: Col): SortRule | undefined => sorts.find((s) => s.col === col)

  // filtro embutido no cabeçalho — genérico, qualquer coluna com valores
  interface FiltroCol { valor: string; set: (v: string) => void; opcoes: { v: string; label: string }[] }
  function filtroDaCol(key: Col): FiltroCol | null {
    const valores = valoresPorCol.get(key)
    if (!valores || valores.length < 2) return null
    return {
      valor: filtros[key] ?? '',
      set: (v) => setFiltros((f) => ({ ...f, [key]: v })),
      opcoes: [{ v: '', label: 'Todos' }, ...valores.map((v) => ({ v, label: v }))],
    }
  }

  // célula por coluna
  function celula(r: DisplayRow, key: Col) {
    switch (key) {
      case 'pais': return <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Flag code={r.coin.pais_codigo} size={14} />{r.coin.pais_nome}</span>
      case 'tipo': return <span className="text-mp-ink-soft">{r.coin.comemorativa ? 'Comemorativa' : (r.coin.tipo_emissao ?? 'Circulação')}</span>
      case 'fotos': return (
        <span className="flex shrink-0 gap-0.5">
          <Disco url={r.coin.anverso_img} />
          <Disco url={r.coin.reverso_img} />
        </span>
      )
      case 'moeda': {
        const d = denomLimpa(r.coin); const t = temaLimpo(r.coin)
        return (
          <span className="flex items-center gap-2">
            <span className="flex shrink-0 gap-0.5">
              <Disco url={r.coin.anverso_img} />
              <Disco url={r.coin.reverso_img} />
            </span>
            <span className="truncate">{d}{t && !d.includes(t) ? <span className="text-mp-ink-soft"> · {t}</span> : null}</span>
          </span>
        )
      }
      case 'comemoracao': { const t = temaLimpo(r.coin); return <span className="truncate text-mp-ink-soft" title={t}>{t || '—'}</span> }
      case 'denom': return <span className="truncate">{denomLimpa(r.coin) || '—'}</span>
      case 'serie': return <span className="whitespace-nowrap text-[11px] text-mp-ink-soft">{r.coin.serie || '—'}</span>
      case 'metal': return <span className="whitespace-nowrap text-mp-ink-soft">{metalPt(r) || '—'}</span>
      case 'composicao': return <span className="text-[11px] text-mp-ink-soft">{r.coin.composicao || '—'}</span>
      case 'km': return <span className="whitespace-nowrap text-[11px] text-mp-ink-faint">{r.coin.km_ref || '—'}</span>
      case 'schon': return <span className="whitespace-nowrap text-[11px] text-mp-ink-faint">{r.coin.schon_ref || '—'}</span>
      case 'numista': return <span className="whitespace-nowrap text-[11px] text-mp-ink-faint">{r.coin.numista_id || '—'}</span>
      case 'face': return <span className="whitespace-nowrap">{r.coin.valor_facial != null ? eur(r.coin.valor_facial) : '—'}</span>
      case 'ano': return anoNum(r) || r.issue.ano
      case 'casa': return <span className="whitespace-nowrap text-[11px] text-mp-ink-soft">{casaEmissorCurto(r)}</span>
      case 'mintmark': return <span className="text-mp-ink-soft">{r.coin.mintmark || r.issue.mintmark_variante || '—'}</span>
      case 'peso': return <span className="whitespace-nowrap text-mp-ink-soft">{r.coin.peso_g != null ? `${r.coin.peso_g} g` : '—'}</span>
      case 'diam': return <span className="whitespace-nowrap text-mp-ink-soft">{r.coin.diametro_mm != null ? `${r.coin.diametro_mm} mm` : '—'}</span>
      case 'espessura': return <span className="whitespace-nowrap text-mp-ink-soft">{r.coin.espessura_mm != null ? `${r.coin.espessura_mm} mm` : '—'}</span>
      case 'anversodesc': return <span className="text-[11px] text-mp-ink-soft" title={r.coin.anverso_desc ?? ''}>{r.coin.anverso_desc || '—'}</span>
      case 'reversodesc': return <span className="text-[11px] text-mp-ink-soft" title={r.coin.reverso_desc ?? ''}>{r.coin.reverso_desc || '—'}</span>
      case 'orla': return <span className="text-[11px] text-mp-ink-soft">{r.coin.orla_desc || r.coin.orla_tipo || '—'}</span>
      case 'tags': {
        const ids = tagsInfo?.coinTags.get(r.coin.id)
        if (!ids || !ids.size || !tagsInfo) return <span className="text-mp-ink-faint">—</span>
        const nomes = tagsInfo.tags.filter((t) => ids.has(t.id))
        return (
          <span className="flex flex-wrap gap-1">
            {nomes.map((t) => (
              <span key={t.id} className="whitespace-nowrap rounded-full bg-mp-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-mp-primary-strong">{t.nome}</span>
            ))}
          </span>
        )
      }
      case 'grau': {
        if (!r.item || !onGrau) return <span className="text-mp-ink-soft">{r.item?.grau || '—'}</span>
        return (
          <select
            value={r.item.grau ?? ''}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onGrau(r, e.target.value)}
            className="max-w-[11rem] rounded-md border border-mp-border bg-mp-surface px-1.5 py-0.5 text-xs text-mp-ink focus:border-mp-gold focus:outline-none"
          >
            <option value="">—</option>
            {GRADES.map((g) => <option key={g.label} value={g.label}>{g.label}</option>)}
          </select>
        )
      }
      case 'tiragem': return <span className="whitespace-nowrap tabular-nums text-mp-ink-soft">{r.issue.tiragem != null ? r.issue.tiragem.toLocaleString('pt-PT') : '—'}</span>
      case 'set':
      case 'caderneta':
      case 'bebe':
      case 'proof':
      case 'normal': {
        const f = FORMATO_DE_COL[key]!
        return <div onClick={(e) => e.stopPropagation()}><StepperQtd qtd={qtdFormato(r, f)} onChange={(n) => mudarFormatoQtd(r, f, n)} /></div>
      }
      case 'qtd': { const t = qtdTotal(r); return <span className="font-semibold tabular-nums">{t || '—'}</span> }
      case 'facial': { const v = qtdTotal(r) * (r.coin.valor_facial ?? 0); return <span className="tabular-nums text-mp-ink-soft">{v > 0 ? eur(v) : '—'}</span> }
      case 'mercado': {
        const u = vmUnit(r)  // valor unitário JÁ ajustado ao grau do exemplar
        if (u == null) return <span className="tabular-nums text-mp-ink-faint">—</span>
        const t = qtdTotal(r) * u
        const ref = r.issue.valor_mercado_grau ? r.issue.valor_mercado_grau.toUpperCase() : ''
        const tit = `${eur(u)}/un. no grau${ref ? ` · base ${ref}` : ''}`
        return <span className="tabular-nums text-mp-gold-strong" title={tit}>{t > 0 ? eur(t) : <span className="text-mp-ink-faint">{eur(u)}</span>}</span>
      }
    }
  }

  return (
    <div>
      {/* Barra de ações numa só linha: voltar + título + contagem + botões */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        {onVoltar && (
          <button onClick={onVoltar} className="text-sm font-semibold text-mp-gold-strong hover:underline whitespace-nowrap">← voltar</button>
        )}
        {titulo && (
          <h2 className="font-serif text-xl font-semibold">{titulo}
            {subtitulo && <span className="ml-1 text-sm font-normal text-mp-ink-faint">· {subtitulo}</span>}
          </h2>
        )}
        <div className="relative ml-auto flex items-center gap-2">
          {acaoExtra}
          <span className="mr-1 hidden text-xs text-mp-ink-soft sm:inline">
            {filtradas.length}{temFiltro ? ' filtr.' : ''} · <span className="font-semibold text-mp-set">{totalSet}</span>/<span className="font-semibold text-mp-caderneta">{totalCad}</span>/{totalFalta} ·{' '}
            <b className="font-serif text-mp-gold-strong" title="Valor de mercado (ajustado ao grau)">{eur(totalMercado)}</b>
          </span>
          {temFiltro && (
            <button onClick={() => setFiltros({})}
              className="text-xs text-mp-ink-soft underline hover:text-mp-ink whitespace-nowrap">limpar</button>
          )}
          <button onClick={() => setPainel(painel === 'cols' ? null : 'cols')}
            className="rounded-lg border border-mp-border px-3 py-2 text-sm font-medium text-mp-ink-soft hover:bg-mp-surface-muted whitespace-nowrap">▦ Colunas</button>
          <button onClick={() => setPainel(painel === 'sort' ? null : 'sort')}
            className="rounded-lg border border-mp-border px-3 py-2 text-sm font-medium text-mp-ink-soft hover:bg-mp-surface-muted whitespace-nowrap">↕ Ordenar{sorts.length ? ` (${sorts.length})` : ''}</button>
          <button onClick={onImprimir}
            className="rounded-lg border border-mp-border px-3 py-2 text-sm font-medium text-mp-ink-soft hover:bg-mp-surface-muted whitespace-nowrap">🖨 Em falta</button>
          <button onClick={onExportar}
            className="rounded-lg border border-mp-gold px-3 py-2 text-sm font-semibold text-mp-gold-strong hover:bg-mp-falta-bg whitespace-nowrap">⤓ Excel</button>
          {painel === 'cols' && <PainelColunas colVis={colVis} setColVis={setColVis} onClose={() => setPainel(null)} />}
          {painel === 'sort' && <PainelOrdenar sorts={sorts} setSorts={setSorts} onClose={() => setPainel(null)} />}
        </div>
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

      <div className="max-h-[82vh] overflow-auto rounded-2xl border border-mp-border bg-mp-surface">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-mp-surface-muted text-left text-[11px] uppercase tracking-wide text-mp-ink-soft">
            <tr>
              {colVis.map((key) => {
                const meta = COLUNAS.find((c) => c.key === key)!
                const s = sortDe(key)
                const filtro = filtroDaCol(key)
                const w = larguras[key]
                return (
                  <th key={key} style={w ? { width: w, minWidth: w, maxWidth: w } : undefined}
                    className={'relative whitespace-nowrap px-2.5 py-1.5 font-semibold ' + (meta.right ? 'text-right' : '')}>
                    <span className={'inline-flex items-center gap-1 ' + (w ? 'max-w-full overflow-hidden align-middle' : '')}>
                      <button onClick={() => ordenarPor(key)} className="cursor-pointer select-none truncate hover:text-mp-ink">
                        {meta.label}{s ? (s.dir === 1 ? ' ▲' : ' ▼') : ' ⇅'}
                      </button>
                      {filtro && (
                        <span className="relative" data-filtro>
                          <button onClick={() => setFiltroAberto(filtroAberto === key ? null : key)}
                            className={'rounded px-0.5 ' + (filtro.valor ? 'text-mp-gold-strong' : 'text-mp-ink-faint hover:text-mp-ink-soft')} aria-label="Filtrar">▾</button>
                          {filtroAberto === key && (
                            <div className="absolute left-0 top-full z-20 mt-1 max-h-60 w-40 overflow-auto rounded-xl border border-mp-border bg-mp-surface p-1 normal-case shadow-lg">
                              {filtro.opcoes.map((o) => (
                                <button key={o.v} onClick={() => { filtro.set(o.v); setFiltroAberto(null) }}
                                  className={'block w-full rounded-lg px-2 py-1 text-left text-xs font-normal hover:bg-mp-surface-muted ' + (filtro.valor === o.v ? 'font-semibold text-mp-gold-strong' : 'text-mp-ink')}>
                                  {o.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </span>
                      )}
                    </span>
                    {/* puxador para redimensionar a coluna */}
                    <span onMouseDown={(e) => iniciarResize(key, e)} title="Arrastar para redimensionar"
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-mp-gold/50" />
                  </th>
                )
              })}
              <th className="w-full" />
            </tr>
          </thead>
          <tbody>
            {ordenadas.length === 0 && (
              <tr><td colSpan={colVis.length + 1} className="px-4 py-10 text-center text-sm text-mp-ink-faint">Nenhuma moeda encontrada com os filtros actuais.</td></tr>
            )}
            {visiveis.map((r) => (
              <tr key={r.issue.id} onClick={() => onSelect(r)} className="cursor-pointer border-t border-mp-border/60 hover:bg-mp-surface-muted">
                {colVis.map((key) => {
                  const meta = COLUNAS.find((c) => c.key === key)!
                  const w = larguras[key]
                  return (
                    <td key={key} style={w ? { width: w, maxWidth: w } : undefined}
                      className={'px-2.5 py-1 ' + (meta.right ? 'text-right ' : '') + (w || key === 'moeda' || key === 'comemoracao' ? 'overflow-hidden' : '')}>
                      <div className={w || ['moeda', 'comemoracao', 'denom', 'composicao', 'anversodesc', 'reversodesc'].includes(key) ? 'truncate' : ''}>
                        {celula(r, key)}
                      </div>
                    </td>
                  )
                })}
                <td />
              </tr>
            ))}
          </tbody>
          {filtradas.length > 0 && (
            <tfoot className="sticky bottom-0 border-t-2 border-mp-border bg-mp-surface-muted">
              <tr>
                <td colSpan={colVis.length} className="px-3 py-2 text-xs font-medium text-mp-ink-soft">
                  {filtradas.length} moedas · {totalSet} set · {totalCad} caderneta · {totalFalta} em falta · <b className="font-serif text-mp-gold-strong">{eur(totalMercado)}</b> mercado · <span className="text-mp-ink-faint">{eur(totalValor)} facial</span>
                </td>
                <td />
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
  const disponiveis = COLUNAS.filter((c) => !(['set', 'caderneta', 'bebe', 'proof', 'normal', 'mercado'] as Col[]).includes(c.key))
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
