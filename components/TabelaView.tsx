import { useEffect, useMemo, useState } from 'react'
import { estadoDe, formatosComMoeda, FORMATOS_COLECAO } from '@/lib/types'
import { valorReal, valorColecao, eur } from '@/lib/valor'
import { casaEmissor } from '@/lib/emissores'
import type { DisplayRow, FormatoColecao } from '@/lib/types'
import Flag from './Flag'

interface TabelaViewProps {
  rows: DisplayRow[]
  onSelect: (row: DisplayRow) => void
  onExportar: () => void
  onImprimir: () => void
  onQuantidade: (row: DisplayRow, qtd: number) => void
  onFormato: (row: DisplayRow, formato: FormatoColecao, ativo: boolean) => void
}

type Col = 'pais' | 'tipo' | 'moeda' | 'metal' | 'km' | 'face' | 'ano' | 'casa' | 'peso' | 'diam' | 'estado' | 'qtd' | 'valor'

// Metal em PT-PT, lido do título Maktun ("…; Gold") ou da composição.
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

// Ano sempre como número limpo (4 dígitos), nunca o texto cru do `ano`
// (que pode ter sufixos de variante: "2005 c", "2022 bebé" — esses vão à etiqueta).
function anoNum(r: DisplayRow): string {
  const n = r.issue.ano_gregoriano ?? parseInt(r.issue.ano, 10)
  return Number.isFinite(n) ? String(n) : ''
}

// Ordem por defeito (igual ao print e ao export): país › casa/emissor › tipo › ano › face.
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
    case 'estado': return estadoDe(r.item)
    case 'qtd':    return r.item?.quantidade ?? 0
    case 'valor':  return valorColecao(r.coin, r.itens)
  }
}

// S/C/B — uma moeda pode estar em vários formatos ao mesmo tempo (seleção múltipla).
const FORMATO_CLS: Record<FormatoColecao, string> = {
  set: 'border-mp-set bg-mp-set-bg text-mp-set',
  caderneta: 'border-mp-caderneta bg-mp-caderneta-bg text-mp-caderneta',
  caderneta_bebe: 'border-mp-gold bg-mp-falta-bg text-mp-gold-strong',
}
function EstadoSelector({ formatos, onChange }: {
  formatos: Set<FormatoColecao>
  onChange: (f: FormatoColecao, ativo: boolean) => void
}) {
  return (
    <div className="flex gap-1">
      {FORMATOS_COLECAO.map(({ v, curto, label }) => {
        const ativo = formatos.has(v)
        return (
          <button
            key={v}
            onClick={() => onChange(v, !ativo)}
            title={ativo ? `Retirar de ${label}` : `Marcar em ${label}`}
            className={
              'w-6 px-1 py-0.5 rounded text-[10px] font-semibold leading-none border transition-colors ' +
              (ativo ? FORMATO_CLS[v] : 'border-mp-border text-mp-ink-faint hover:border-mp-ink-soft hover:text-mp-ink-soft')
            }
          >
            {curto}
          </button>
        )
      })}
    </div>
  )
}

const selectCls = 'h-8 rounded-lg border border-mp-border bg-mp-surface px-2 text-sm text-mp-ink outline-none focus:border-mp-gold min-w-[130px]'
// Render por páginas: o catálogo tem ~6 mil linhas; pintar tudo de uma vez
// trava o browser. Filtros/ordenação/somas continuam sobre o conjunto completo.
const PAGINA_TAM = 200

// Stepper de quantidade com estado de texto local: permite digitar/apagar
// livremente (o input não "salta" de volta), só grava no blur ou Enter. Os
// botões −/+ gravam logo.
function StepperQtd({ qtd, onChange }: { qtd: number; onChange: (n: number) => void }) {
  const [txt, setTxt] = useState(String(qtd))
  useEffect(() => { setTxt(String(qtd)) }, [qtd])
  const commit = (v: string) => { const n = Math.max(0, parseInt(v, 10) || 0); if (n !== qtd) onChange(n) }
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={() => onChange(Math.max(0, qtd - 1))}
        disabled={qtd <= 0}
        className="h-6 w-6 rounded border border-mp-border leading-none text-mp-ink-soft hover:bg-mp-surface-muted disabled:opacity-30"
        aria-label="Menos um"
      >−</button>
      <input
        type="number"
        min={0}
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        className="w-12 rounded border border-mp-border bg-mp-surface px-1 py-0.5 text-center text-sm outline-none focus:border-mp-gold"
      />
      <button
        onClick={() => onChange(qtd + 1)}
        className="h-6 w-6 rounded border border-mp-border leading-none text-mp-ink-soft hover:bg-mp-surface-muted"
        aria-label="Mais um"
      >+</button>
    </div>
  )
}

export default function TabelaView({ rows, onSelect, onExportar, onImprimir, onQuantidade, onFormato }: TabelaViewProps) {
  // null = ordem natural por defeito (país›casa›tipo›ano›face); clicar numa coluna ordena por ela.
  const [sort, setSort] = useState<{ col: Col; dir: 1 | -1 } | null>(null)
  const [filtroPais, setFiltroPais] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'' | 'circulacao' | 'comemorativa'>('')
  const [filtroAno, setFiltroAno] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'' | 'set' | 'caderneta' | 'naotem'>('')
  const [pagina, setPagina] = useState(0)

  const { paises, anos } = useMemo(() => {
    const ps = new Map<string, string>()
    const as = new Set<string>()
    for (const r of rows) {
      ps.set(r.coin.pais_codigo, r.coin.pais_nome)
      const a = anoNum(r)
      if (a) as.add(a)
    }
    return {
      paises: [...ps.entries()].sort((a, b) => a[1].localeCompare(b[1])),
      anos: [...as].sort((a, b) => {
        const na = parseInt(a, 10), nb = parseInt(b, 10)
        return (isNaN(na) ? 0 : na) - (isNaN(nb) ? 0 : nb)
      }),
    }
  }, [rows])

  const filtradas = useMemo(() => {
    return rows.filter((r) => {
      if (filtroPais && r.coin.pais_codigo !== filtroPais) return false
      if (filtroTipo === 'circulacao' && r.coin.comemorativa) return false
      if (filtroTipo === 'comemorativa' && !r.coin.comemorativa) return false
      if (filtroAno && anoNum(r) !== filtroAno) return false
      if (filtroEstado && estadoDe(r.item) !== filtroEstado) return false
      return true
    })
  }, [rows, filtroPais, filtroTipo, filtroAno, filtroEstado])

  const ordenadas = useMemo(() => {
    if (!sort) return [...filtradas].sort(ordemNatural)
    return [...filtradas].sort((a, b) => {
      const va = valOf(a, sort.col), vb = valOf(b, sort.col)
      let cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'pt')
      if (cmp === 0) cmp = ordemNatural(a, b)
      return cmp * sort.dir
    })
  }, [filtradas, sort])

  // Voltar à 1.ª página sempre que o conjunto/ordem muda (filtro ou sort).
  useEffect(() => { setPagina(0) }, [filtroPais, filtroTipo, filtroAno, filtroEstado, sort])

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / PAGINA_TAM))
  const paginaSegura = Math.min(pagina, totalPaginas - 1)
  const visiveis = useMemo(
    () => ordenadas.slice(paginaSegura * PAGINA_TAM, (paginaSegura + 1) * PAGINA_TAM),
    [ordenadas, paginaSegura],
  )

  const totalValor = useMemo(
    () => filtradas.reduce((s, r) => s + valorColecao(r.coin, r.itens), 0),
    [filtradas],
  )
  const totalSet   = useMemo(() => filtradas.filter((r) => estadoDe(r.item) === 'set').length, [filtradas])
  const totalCad   = useMemo(() => filtradas.filter((r) => estadoDe(r.item) === 'caderneta').length, [filtradas])
  const totalFalta = useMemo(() => filtradas.filter((r) => estadoDe(r.item) === 'naotem').length, [filtradas])

  const temFiltro = filtroPais || filtroTipo || filtroAno || filtroEstado

  function th(col: Col, label: string, extra = '') {
    const ativo = sort?.col === col
    return (
      <th
        onClick={() => setSort((s) => ({ col, dir: s?.col === col && s.dir === 1 ? -1 : 1 }))}
        className={'px-3 py-2 font-semibold cursor-pointer select-none whitespace-nowrap hover:text-mp-ink ' + extra}
      >
        {label}{ativo && sort ? (sort.dir === 1 ? ' ▲' : ' ▼') : ' ⇅'}
      </th>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select value={filtroPais} onChange={(e) => setFiltroPais(e.target.value)} className={selectCls}>
          <option value="">Todos os países</option>
          {paises.map(([cod, nome]) => (
            <option key={cod} value={cod}>{nome}</option>
          ))}
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
          <button
            onClick={() => { setFiltroPais(''); setFiltroTipo(''); setFiltroAno(''); setFiltroEstado('') }}
            className="text-xs text-mp-ink-soft hover:text-mp-ink underline"
          >
            Limpar filtros
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-[11px] text-mp-ink-faint">
            <span className="inline-flex items-center gap-1 border border-mp-set rounded px-1.5 py-0.5 text-mp-set font-semibold">S</span>
            <span>Set</span>
            <span className="inline-flex items-center gap-1 border border-mp-caderneta rounded px-1.5 py-0.5 text-mp-caderneta font-semibold">C</span>
            <span>Caderneta</span>
          </div>
          <button
            onClick={onImprimir}
            className="border border-mp-border rounded-lg px-3 py-2 text-sm font-medium text-mp-ink-soft hover:bg-mp-surface-muted whitespace-nowrap"
          >
            🖨 Imprimir em falta
          </button>
          <button
            onClick={onExportar}
            className="border border-mp-gold rounded-lg px-3 py-2 text-sm font-semibold text-mp-gold-strong hover:bg-mp-falta-bg whitespace-nowrap"
          >
            ⤓ Exportar Excel
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-2 text-xs text-mp-ink-soft">
        <span>{filtradas.length} moedas{temFiltro ? ' (filtradas)' : ''}</span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-mp-set" /> set {totalSet}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-mp-caderneta" /> caderneta {totalCad}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-mp-falta" /> não tem {totalFalta}
        </span>
        <span className="ml-auto font-medium text-mp-ink-soft">
          Valor filtrado: <b className="font-serif text-mp-gold-strong">{eur(totalValor)}</b>
        </span>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3 mb-2 text-sm">
          <button
            onClick={() => setPagina((p) => Math.max(0, p - 1))}
            disabled={paginaSegura <= 0}
            className="border border-mp-border rounded-lg px-3 py-1 text-mp-ink-soft hover:bg-mp-surface-muted disabled:opacity-30"
          >
            ← Anterior
          </button>
          <span className="text-mp-ink-soft">
            Página <b className="text-mp-ink">{paginaSegura + 1}</b> de {totalPaginas}
            <span className="text-mp-ink-faint"> · {ordenadas.length} linhas</span>
          </span>
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
            disabled={paginaSegura >= totalPaginas - 1}
            className="border border-mp-border rounded-lg px-3 py-1 text-mp-ink-soft hover:bg-mp-surface-muted disabled:opacity-30"
          >
            Seguinte →
          </button>
        </div>
      )}

      <div className="border border-mp-border rounded-2xl overflow-auto max-h-[65vh] bg-mp-surface">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-mp-surface-muted text-mp-ink-soft text-left text-[11px] uppercase tracking-wide z-10">
            <tr>
              {th('pais',   'País')}
              {th('tipo',   'Tipo')}
              {th('moeda',  'Moeda / Comemoração')}
              {th('metal',  'Metal')}
              {th('km',     'KM#')}
              {th('face',   'Face',   'text-right')}
              {th('ano',    'Ano')}
              {th('casa',   'Casa / Emissor')}
              {th('peso',   'Peso',   'text-right')}
              {th('diam',   'Diâm.',  'text-right')}
              {th('estado', 'Estado')}
              {th('qtd',    'Qtd',    'text-right')}
              {th('valor',  'Valor',  'text-right')}
            </tr>
          </thead>
          <tbody>
            {ordenadas.length === 0 && (
              <tr>
                <td colSpan={13} className="px-4 py-10 text-center text-sm text-mp-ink-faint">
                  Nenhuma moeda encontrada com os filtros actuais.
                </td>
              </tr>
            )}
            {visiveis.map((r) => {
              const est = estadoDe(r.item)
              return (
                <tr
                  key={r.issue.id}
                  onClick={() => onSelect(r)}
                  className="border-t border-mp-border/60 hover:bg-mp-surface-muted cursor-pointer"
                >
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <Flag code={r.coin.pais_codigo} size={14} />
                      {r.coin.pais_nome}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-mp-ink-soft">
                    {r.coin.comemorativa ? 'Comemorativa' : (r.coin.tipo_emissao ?? 'Circulação')}
                  </td>
                  <td className="px-3 py-1.5 max-w-[260px]" title={String(valOf(r, 'moeda'))}>
                    <span className="flex items-center gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-mp-surface-muted ring-1 ring-mp-border">
                        {r.coin.anverso_img
                          ? <img src={r.coin.anverso_img} alt="" loading="lazy" className="h-full w-full object-cover" />
                          : <span className="text-[10px] text-mp-coin-empty">⊚</span>}
                      </span>
                      <span className="truncate">{valOf(r, 'moeda') || '—'}</span>
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-mp-ink-soft whitespace-nowrap">{metalPt(r) || '—'}</td>
                  <td className="px-3 py-1.5 text-mp-ink-faint text-[11px] whitespace-nowrap">{r.coin.km_ref || '—'}</td>
                  <td className="px-3 py-1.5 text-right">
                    {r.coin.valor_facial != null ? eur(r.coin.valor_facial) : '—'}
                  </td>
                  <td className="px-3 py-1.5">{anoNum(r) || r.issue.ano}</td>
                  <td className="px-3 py-1.5 text-mp-ink-soft text-[11px]">{casaEmissor(r)}</td>
                  <td className="px-3 py-1.5 text-right text-mp-ink-soft whitespace-nowrap">{r.coin.peso_g != null ? `${r.coin.peso_g} g` : '—'}</td>
                  <td className="px-3 py-1.5 text-right text-mp-ink-soft whitespace-nowrap">{r.coin.diametro_mm != null ? `${r.coin.diametro_mm} mm` : '—'}</td>
                  <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <EstadoSelector formatos={formatosComMoeda(r.itens)} onChange={(f, a) => onFormato(r, f, a)} />
                  </td>
                  <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <StepperQtd qtd={r.item?.quantidade ?? 0} onChange={(n) => onQuantidade(r, n)} />
                  </td>
                  <td className="px-3 py-1.5 text-right text-mp-gold-strong">
                    {r.itens.length === 0 ? '—' : eur(valorColecao(r.coin, r.itens))}
                  </td>
                </tr>
              )
            })}
          </tbody>
          {filtradas.length > 0 && (
            <tfoot className="sticky bottom-0 bg-mp-surface-muted border-t-2 border-mp-border">
              <tr>
                <td colSpan={12} className="px-3 py-2 text-xs text-mp-ink-soft font-medium">
                  {filtradas.length} moedas · {totalSet} set · {totalCad} caderneta · {totalFalta} em falta
                </td>
                <td className="px-3 py-2 text-right font-serif font-semibold text-mp-gold-strong">
                  {eur(totalValor)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
