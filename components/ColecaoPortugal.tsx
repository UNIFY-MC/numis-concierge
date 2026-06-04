'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  getCatalogPais, getCollection, getIssuesPais,
  upsertCollectionItem, applyToAllYears,
} from '@/lib/catalog'
import { ERAS, eraDe } from '@/lib/series'
import { itemPrincipal } from '@/lib/types'
import type { CatalogCoin, CatalogIssue, CollectionItem, DisplayRow, FormatoColecao } from '@/lib/types'
import CoinSheet, { type CoinSheetSave } from './CoinSheet'
import TabelaView from './TabelaView'
import retratos from '@/lib/data/reis-retratos.json'

const RETRATOS = retratos as Record<string, string>
type Vista = 'lista' | 'tabela'

// Coleção de Portugal organizada como a Colnect: Era → Série/Reinado → moedas.
// Vista de catálogo (por tipo de moeda), com indicação do que se tem.
export default function ColecaoPortugal() {
  const [coins, setCoins] = useState<CatalogCoin[]>([])
  const [issues, setIssues] = useState<CatalogIssue[]>([])
  const [col, setCol] = useState<CollectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [eraSel, setEraSel] = useState('monarquia')
  const [serieSel, setSerieSel] = useState<string | null>(null)
  const [vista, setVista] = useState<Vista>('lista')
  const [ficha, setFicha] = useState<DisplayRow | null>(null)

  const tenho = useMemo(() => {
    const t = new Set<string>()
    for (const it of col) if (it.quantidade > 0 && it.catalog_coin_id) t.add(it.catalog_coin_id)
    return t
  }, [col])

  useEffect(() => {
    Promise.all([getCatalogPais('pt'), getIssuesPais('pt'), getCollection()])
      .then(([cs, is, c]) => { setCoins(cs); setIssues(is); setCol(c) })
      .finally(() => setLoading(false))
  }, [])

  // Issue principal (1ª) de cada coin, e exemplares por issue.
  const issueDeCoin = useMemo(() => {
    const m = new Map<string, CatalogIssue>()
    for (const i of issues) if (!m.has(i.catalog_coin_id)) m.set(i.catalog_coin_id, i)
    return m
  }, [issues])
  const itensDeIssue = useMemo(() => {
    const m = new Map<string, CollectionItem[]>()
    for (const it of col) if (it.catalog_issue_id) {
      const a = m.get(it.catalog_issue_id) ?? []; a.push(it); m.set(it.catalog_issue_id, a)
    }
    return m
  }, [col])

  // DisplayRow de uma coin (issue principal + exemplares).
  function rowDe(coin: CatalogCoin): DisplayRow | null {
    const issue = issueDeCoin.get(coin.id)
    if (!issue) return null
    const itens = itensDeIssue.get(issue.id) ?? []
    return { coin, issue, itens, item: itemPrincipal(itens) }
  }

  function abrirFicha(coin: CatalogCoin) {
    const row = rowDe(coin)
    if (row) setFicha(row)
  }

  // Substitui (otimista) o exemplar de um (issue, formato) na coleção local.
  function aplicaCol(saved: CollectionItem) {
    setCol((prev) => [
      ...prev.filter((i) => !(i.catalog_issue_id === saved.catalog_issue_id && i.formato_posse === saved.formato_posse)),
      saved,
    ])
  }

  // Tabela: alterna formato S/C/B (preserva grau/valor).
  async function alterarFormato(row: DisplayRow, formato: FormatoColecao, ativo: boolean) {
    const ex = row.itens.find((i) => i.formato_posse === formato)
    const saved = await upsertCollectionItem({
      catalogCoinId: row.coin.id, catalogIssueId: row.issue.id,
      quantidade: ativo ? Math.max(1, ex?.quantidade ?? 1) : 0, formatoPosse: formato,
      casaMoeda: row.item?.casa_moeda ?? null, grau: ex?.grau ?? row.item?.grau ?? null,
      valorBase: ex?.valor_base ?? row.item?.valor_base ?? null, foto: ex?.foto1 ?? row.item?.foto1 ?? null,
    })
    aplicaCol(saved)
  }
  async function alterarQuantidade(row: DisplayRow, novaQtd: number) {
    const alvo = row.item
    const formato = (alvo?.formato_posse as FormatoColecao | undefined) ?? 'set'
    const saved = await upsertCollectionItem({
      catalogCoinId: row.coin.id, catalogIssueId: row.issue.id,
      quantidade: Math.max(0, novaQtd), formatoPosse: formato,
      casaMoeda: alvo?.casa_moeda ?? null, grau: alvo?.grau ?? null,
      valorBase: alvo?.valor_base ?? null, foto: alvo?.foto1 ?? null,
    })
    aplicaCol(saved)
  }

  async function guardar(input: CoinSheetSave) {
    if (!ficha) return
    const { coin, issue } = ficha
    const comuns = { casaMoeda: input.casaMoeda, foto: input.foto, notaPrivada: input.nota }
    for (const f of input.formatos) {
      await upsertCollectionItem({
        catalogCoinId: coin.id, catalogIssueId: issue.id,
        quantidade: Math.max(1, f.quantidade), formatoPosse: f.formato,
        grau: f.grau, valorBase: f.valorBase, ...comuns,
      })
    }
    for (const fr of input.removidos) {
      await upsertCollectionItem({
        catalogCoinId: coin.id, catalogIssueId: issue.id,
        quantidade: 0, formatoPosse: fr, grau: null, valorBase: null, ...comuns,
      })
    }
    if (input.aplicarTodos) await applyToAllYears(coin.id, input.formatos[0]?.valorBase ?? null, input.foto)
    const atual = await getCollection()
    setCol(atual)
    const itens = atual.filter((i) => i.catalog_issue_id === issue.id)
    setFicha({ coin, issue, itens, item: itemPrincipal(itens) })
  }

  // série → { ord, coins }
  const series = useMemo(() => {
    const m = new Map<string, { ord: number; coins: CatalogCoin[] }>()
    for (const c of coins) {
      const s = c.serie ?? 'Por classificar'
      if (!m.has(s)) m.set(s, { ord: c.serie_ord ?? 98, coins: [] })
      m.get(s)!.coins.push(c)
    }
    return m
  }, [coins])

  const contEra = useMemo(() => {
    const tot = new Map<string, number>()
    const meus = new Map<string, number>()
    const anoMin = new Map<string, number>()
    const anoMax = new Map<string, number>()
    for (const c of coins) {
      const e = eraDe(c.serie_ord)
      if (!e) continue
      tot.set(e.chave, (tot.get(e.chave) ?? 0) + 1)
      if (tenho.has(c.id)) meus.set(e.chave, (meus.get(e.chave) ?? 0) + 1)
      if (c.ano_inicio != null) {
        anoMin.set(e.chave, Math.min(anoMin.get(e.chave) ?? Infinity, c.ano_inicio))
        anoMax.set(e.chave, Math.max(anoMax.get(e.chave) ?? -Infinity, c.ano_inicio))
      }
    }
    return { tot, meus, anoMin, anoMax }
  }, [coins, tenho])

  const seriesDaEra = useMemo(() => {
    const era = ERAS.find((e) => e.chave === eraSel)
    if (!era) return []
    return [...series.entries()]
      .filter(([, v]) => v.ord >= era.min && v.ord <= era.max)
      .sort((a, b) => a[1].ord - b[1].ord)
  }, [series, eraSel])

  const coinsDaSerie = serieSel ? (series.get(serieSel)?.coins ?? []) : []
  // A tabela mostra uma linha por ISSUE (cada ano emitido), não só a 1.ª — assim
  // vês/geres todos os anos de cada tipo (ex. 1 Cêntimo 2002…2026).
  const rowsDaSerie = useMemo(() => {
    const coinById = new Map(coinsDaSerie.map((c) => [c.id, c]))
    return issues
      .filter((i) => coinById.has(i.catalog_coin_id))
      .map((i) => {
        const coin = coinById.get(i.catalog_coin_id)!
        const itens = itensDeIssue.get(i.id) ?? []
        return { coin, issue: i, itens, item: itemPrincipal(itens) } as DisplayRow
      })
  }, [coinsDaSerie, issues, itensDeIssue])

  if (loading) return <div className="p-8 text-mp-ink-faint">A carregar a coleção…</div>

  return (
    <div className="mx-auto max-w-[92rem] px-6 py-6 lg:px-10">
      <header className="mb-6">
        <h1 className="font-serif text-2xl font-semibold">
          Coleção de <span className="text-mp-gold">Portugal</span>
        </h1>
        <p className="mt-1 text-xs text-mp-ink-soft">
          Organizada por era e reinado — {coins.length} tipos no catálogo, {tenho.size} na coleção
        </p>
      </header>

      {/* Eras */}
      <div className="mb-6 flex flex-wrap gap-2">
        {ERAS.filter((e) => (contEra.tot.get(e.chave) ?? 0) > 0).map((e) => {
          const ativo = e.chave === eraSel
          const min = contEra.anoMin.get(e.chave), max = contEra.anoMax.get(e.chave)
          const anos = min != null ? (min === max ? `${min}` : `${min}–${max}`) : null
          return (
            <button
              key={e.chave}
              onClick={() => { setEraSel(e.chave); setSerieSel(null) }}
              className={
                'flex flex-col items-start rounded-xl border px-3.5 py-2 transition-colors ' +
                (ativo
                  ? 'border-mp-gold bg-mp-gold text-white shadow-sm'
                  : 'border-mp-border bg-mp-surface text-mp-ink-soft hover:text-mp-ink')
              }
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span>{e.icone}</span>
                <span>{e.label}</span>
                <span className={'text-xs font-normal ' + (ativo ? 'text-white/80' : 'text-mp-ink-faint')}>
                  {contEra.meus.get(e.chave) ?? 0}/{contEra.tot.get(e.chave) ?? 0}
                </span>
              </span>
              {anos && (
                <span className={'text-[10px] tabular-nums ' + (ativo ? 'text-white/70' : 'text-mp-ink-faint')}>
                  {anos}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {serieSel ? (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button onClick={() => setSerieSel(null)} className="text-sm font-semibold text-mp-gold-strong hover:underline">
              ← voltar às séries
            </button>
            <div className="inline-flex gap-1 rounded-xl border border-mp-border bg-mp-surface-muted p-1">
              {(['lista', 'tabela'] as Vista[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setVista(v)}
                  className={'rounded-lg px-3 py-1 text-sm font-semibold capitalize transition-colors ' +
                    (vista === v ? 'bg-mp-gold text-white' : 'text-mp-ink-soft hover:text-mp-ink')}
                >
                  {v === 'lista' ? '▦ Lista' : '☰ Tabela'}
                </button>
              ))}
            </div>
          </div>
          <h2 className="mb-4 font-serif text-xl font-semibold">
            {serieSel} <span className="text-sm font-normal text-mp-ink-faint">· {coinsDaSerie.length} tipos</span>
          </h2>
          {vista === 'tabela' ? (
            <TabelaView
              rows={rowsDaSerie}
              onSelect={setFicha}
              onExportar={() => {}}
              onImprimir={() => {}}
              onQuantidade={alterarQuantidade}
              onFormato={alterarFormato}
              prefsKey="colecoes-pt"
            />
          ) : (
            <ListaMoedas coins={coinsDaSerie} tenho={tenho} onAbrir={abrirFicha} />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {seriesDaEra.map(([nome, v]) => (
            <CartaoSerie
              key={nome}
              nome={nome}
              coins={v.coins}
              tenho={tenho}
              onAbrir={() => setSerieSel(nome)}
            />
          ))}
        </div>
      )}

      {ficha && <CoinSheet row={ficha} onClose={() => setFicha(null)} onSave={guardar} />}
    </div>
  )
}

function periodo(coins: CatalogCoin[]): string {
  const anos = coins.map((c) => c.ano_inicio).filter((a): a is number => a != null)
  if (!anos.length) return '—'
  const min = Math.min(...anos), max = Math.max(...anos)
  return min === max ? `${min}` : `${min}–${max}`
}

function CartaoSerie({ nome, coins, tenho, onAbrir }: {
  nome: string; coins: CatalogCoin[]; tenho: Set<string>; onAbrir: () => void
}) {
  const meus = coins.filter((c) => tenho.has(c.id)).length
  const pct = coins.length ? Math.round((meus / coins.length) * 100) : 0
  const retrato = RETRATOS[nome]
  return (
    <button
      onClick={onAbrir}
      className="group flex flex-col items-center rounded-2xl border border-mp-border bg-mp-surface p-4 text-center transition-shadow hover:shadow-md"
    >
      {/* Retrato do rei (domínio público, Wikipédia) em estilo personagem */}
      <div className="mb-3 grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-mp-surface-muted ring-2 ring-mp-gold-soft">
        {retrato
          ? <img src={retrato} alt={nome} loading="lazy" className="h-full w-full object-cover object-top transition-transform group-hover:scale-105" />
          : <span className="text-3xl text-mp-coin">⊚</span>}
      </div>
      <span className="font-serif text-sm font-semibold leading-tight text-mp-ink">{nome}</span>
      <span className="mt-0.5 text-[11px] text-mp-ink-faint">{periodo(coins)}</span>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-serif text-2xl font-semibold text-mp-gold-strong">{meus}</span>
        <span className="text-sm text-mp-ink-faint">/ {coins.length}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-mp-surface-muted">
        <div className="h-full rounded-full bg-mp-set" style={{ width: `${pct}%` }} />
      </div>
    </button>
  )
}

// Traduções para PT-PT dos termos ingleses que vêm da Maktun.
const METAIS_PT: Record<string, string> = {
  gold: 'Ouro', silver: 'Prata', copper: 'Cobre', bronze: 'Bronze', brass: 'Latão',
  nickel: 'Níquel', bimetallic: 'Bimetálica', cupronickel: 'Cuproníquel', steel: 'Aço',
  'copper-nickel': 'Cuproníquel', billon: 'Bolhão', tin: 'Estanho', zinc: 'Zinco',
}
function traduzTermos(s: string): string {
  return s
    .replace(/\bNo Date\b\.?/gi, 'Sem data')
    .replace(/\bPrince Regent\b/gi, 'Príncipe Regente')
    .replace(/\bMule\b/gi, 'Híbrida')
    .replace(/\bPattern\b/gi, 'Prova')
    .replace(/\bEssai\b/gi, 'Ensaio')
    .replace(/\bCountermark(ed)?\b/gi, 'Com contramarca')
    .replace(/\bOverstrike\b/gi, 'Resselagem')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
// Nome curto a partir do título Maktun ("Portugal; km…; 8 Escudos; (1726); Gold").
function nomeCurto(c: CatalogCoin): string {
  const base = c.tema || c.denominacao || (c.titulo || '').split(';').map((s) => s.trim())[2] || c.titulo || '—'
  return traduzTermos(base)
}
function metalDe(c: CatalogCoin): string | null {
  const m = (c.titulo || '').match(/\b(Gold|Silver|Copper-Nickel|Copper|Bronze|Brass|Nickel|Bi-?Metallic|Cupronickel|Billon|Steel|Tin|Zinc)\b/i)
  if (!m) return null
  const k = m[1].toLowerCase().replace('bi-metallic', 'bimetallic')
  return METAIS_PT[k] ?? m[1]
}

// Disco de uma face da moeda (anverso/reverso).
function Face({ url }: { url: string | null }) {
  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-mp-surface-muted ring-1 ring-mp-border">
      {url ? <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
        : <span className="text-mp-coin-empty">⊚</span>}
    </div>
  )
}

function ListaMoedas({ coins, tenho, onAbrir }: {
  coins: CatalogCoin[]; tenho: Set<string>; onAbrir: (c: CatalogCoin) => void
}) {
  const ordenados = [...coins].sort((a, b) => (a.ano_inicio ?? 0) - (b.ano_inicio ?? 0))
  return (
    <div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ordenados.map((c) => {
          const meu = tenho.has(c.id)
          const metal = metalDe(c)
          return (
            <button
              key={c.id}
              onClick={() => onAbrir(c)}
              className={
                'flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-shadow hover:shadow-md ' +
                (meu ? 'border-mp-set bg-mp-set-bg' : 'border-mp-border bg-mp-surface')
              }
            >
              {/* frente e verso */}
              <div className="flex shrink-0 gap-1">
                <Face url={c.anverso_img} />
                <Face url={c.reverso_img} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-mp-ink">{nomeCurto(c)}</p>
                <p className="text-[11px] text-mp-ink-faint">
                  {c.ano_inicio ?? '—'}{metal ? ` · ${metal}` : ''}
                </p>
              </div>
              <span
                className={
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ' +
                  (meu ? 'bg-mp-set text-white' : 'bg-mp-surface-muted text-mp-ink-faint')
                }
              >
                {meu ? 'tenho' : 'falta'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
