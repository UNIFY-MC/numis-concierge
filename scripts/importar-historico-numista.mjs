/**
 * Importa moedas HISTÓRICAS de um emissor da Numista (réis, escudos, dinheiros…)
 * que ainda NÃO temos no catálogo — família `historico`. Complementa
 * enrich-numista.mjs (que só trata euro). Oldest-first.
 *
 * Fonte de verdade: Numista é fonte permitida (ver CLAUDE.md). Cada moeda importada
 * guarda numista_id + referência Gomes/KM. Fotos ficam como URL Numista (migrar para
 * Storage depois com importar-fotos-storage.mjs — não hotlink permanente).
 *
 * Dedup: um tipo Numista conta como "já temos" se (a) o numista_id já está ligado, ou
 * (b) [só quando --ate-ano > 1223] casa com uma histórica nossa por denominação+ano.
 * Antes de 1223 a nossa BD não tem nada → import inequívoco, sem dedup.
 *
 * Uso:
 *   node scripts/importar-historico-numista.mjs                    # DRY-RUN, ate-ano 1223 (lote inequívoco)
 *   node scripts/importar-historico-numista.mjs --apply            # importa o lote < 1223
 *   node scripts/importar-historico-numista.mjs --ate-ano 1279 --apply --limit 50
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CACHE = join(__dirname, '.numista-cache')
config({ path: join(ROOT, '.env.local') })

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const NUMISTA_KEY = process.env.NUMISTA_API_KEY
if (!SUPA_URL || !SUPA_KEY || !NUMISTA_KEY) { console.error('❌ Falta env (.env.local)'); process.exit(1) }

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const paisIdx = args.indexOf('--pais'); const PAIS = paisIdx >= 0 ? args[paisIdx + 1] : 'pt'
const ateIdx = args.indexOf('--ate-ano'); const ATE_ANO = ateIdx >= 0 ? parseInt(args[ateIdx + 1], 10) : 1223
const limIdx = args.indexOf('--limit'); const LIMIT = limIdx >= 0 ? parseInt(args[limIdx + 1], 10) : Infinity
const ISSUER = { pt: 'portugal' }[PAIS]
if (!ISSUER) { console.error(`❌ sem issuer Numista para "${PAIS}"`); process.exit(1) }

const supabase = createClient(SUPA_URL, SUPA_KEY, { db: { schema: 'numis' }, auth: { persistSession: false } })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let reqCount = 0
async function api(path, ck) {
  if (ck) { const f = join(CACHE, ck + '.json'); if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8')) }
  let lastErr
  for (let tent = 1; tent <= 4; tent++) {
    await sleep(750 * tent); reqCount++
    try {
      const res = await fetch('https://api.numista.com/v3' + path, { headers: { 'Numista-API-Key': NUMISTA_KEY }, signal: AbortSignal.timeout(20000) })
      if (!res.ok) throw new Error(`${res.status} ${path} → ${(await res.text().catch(() => '')).slice(0, 160)}`)
      const json = await res.json()
      if (ck) { if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true }); writeFileSync(join(CACHE, ck + '.json'), JSON.stringify(json)) }
      return json
    } catch (e) { lastErr = e; if (/^4\d\d/.test(String(e.message))) throw e } // 4xx não repete
  }
  throw lastErr
}

// Euro (não é histórico): título menciona Euro/Cent e ano >= 1999 (inclui frações e
// decimais: "¼ Euro", "1½ Euro", "2.50 Euros"). Fica para enrich-numista.
const ehEuro = (t) => /\beuros?\b|\beuro\s+cents?\b/i.test(t.title || '') && (t.max_year || t.min_year || 0) >= 1999

// ─── helpers de extração (espelham enrich-numista.mjs) ───────────────────────
const pic = (side) => side?.picture || side?.thumbnail || null
const numFrom = (v) => (typeof v === 'number' ? v : v && typeof v.numeric_value === 'number' ? v.numeric_value : null)
const descLetra = (side) => { const p = [side?.description, side?.lettering].filter(Boolean); return p.length ? p.join(' — ') : null }
const refDe = (d, re) => { const r = (d.references || []).find((x) => re.test(x?.catalogue?.code || x?.catalogue?.name || '')); return r?.number ? String(r.number) : null }

function mapDetalhe(d) {
  const comp = d.composition?.text || d.composition?.english_name || (typeof d.composition === 'string' ? d.composition : null)
  const moedaHist = d.value?.currency?.name || null
  const km = refDe(d, /^km$|krause/i)
  const gomes = refDe(d, /gomes/i)
  return {
    pais_codigo: PAIS,
    pais_nome: d.issuer?.name || 'Portugal',
    categoria: 'coin',
    familia: 'historico',
    comemorativa: false,
    titulo: d.title || null,
    denominacao: d.value?.text || d.title || null,
    valor_facial: numFrom(d.value),
    unidade: moedaHist,
    moeda_hist: moedaHist,
    ano_inicio: d.min_year ?? null,
    ano_fim: d.max_year ?? null,
    numista_id: d.id ?? null,
    anverso_img: pic(d.obverse) || d.obverse_thumbnail || null,
    reverso_img: pic(d.reverse) || d.reverse_thumbnail || null,
    peso_g: numFrom(d.weight),
    diametro_mm: numFrom(d.size) ?? numFrom(d.diameter),
    espessura_mm: numFrom(d.thickness),
    composicao: comp,
    forma: d.shape || null,
    km_ref: km || (gomes ? `Gomes ${gomes}` : null),
    schon_ref: refDe(d, /sch(ö|o)n/i),
    anverso_desc: descLetra(d.obverse),
    reverso_desc: descLetra(d.reverse),
    orla_desc: descLetra(d.edge),
    orla_tipo: d.edge?.type || null,
    demonetizada: d.demonetization?.is_demonetized === true,
    foto_fonte: 'Numista',
  }
}

async function syncIssues(coinId, typeId, fallbackAno) {
  let criadas = 0
  try {
    const data = await api(`/types/${typeId}/issues?lang=en`, `issues-${typeId}`)
    const issues = data.issues || data || []
    for (const ni of issues) {
      const ano = ni.gregorian_year || ni.year
      if (!ano) continue
      await supabase.from('catalog_issues').insert({
        catalog_coin_id: coinId, ano: String(ano), ano_gregoriano: ano,
        casa_moeda: ni.mint_letter || ni.mintmark || ni.mint || null,
        numista_issue_id: ni.id ?? null, tiragem: numFrom(ni.mintage) ?? null,
        anverso_img: pic(ni.obverse) || null, reverso_img: pic(ni.reverse) || null,
        html_est0: 0, html_qf: 0, html_verde: false,
      })
      criadas++
    }
  } catch (e) { console.warn(`   ⚠️  issues ${typeId}: ${e.message}`) }
  // Medieval sem anos datados → cria 1 variante-âncora para a moeda aparecer na app.
  if (criadas === 0 && fallbackAno) {
    await supabase.from('catalog_issues').insert({
      catalog_coin_id: coinId, ano: String(fallbackAno), ano_gregoriano: fallbackAno,
      html_est0: 0, html_qf: 0, html_verde: false,
    })
    criadas = 1
  }
  return criadas
}

// dedup fuzzy (só usado quando ATE_ANO > 1223)
// Palavras significativas da DENOMINAÇÃO (genérico, não lista fixa): apanha também
// denominações medievais exóticas (tornês, forte, dobra, gentil, barbuda, pilarte…).
const STOP = new Set(['de','do','da','pe','terra','tipo','type','lisboa','porto','braga','evora','coimbra','com','sem','the','and','king','rei','variedade','atipico','pequeno','grande','novo','nova','sem-data'])
function denomWords(s) {
  let t = (s || '').split(/\s+-\s+/)[0] // antes do "- <rei>"
  t = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  t = t.replace(/\([^)]*\)/g, ' ').replace(/"[^"]*"/g, ' ') // tira parênteses e aspas (variantes)
  return new Set(t.split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !STOP.has(w)))
}

async function existentesHistorico() {
  const out = []; let from = 0
  for (;;) {
    const { data, error } = await supabase.from('catalog_coins')
      .select('denominacao, titulo, ano_inicio, ano_fim, numista_id').eq('pais_codigo', PAIS).eq('familia', 'historico').range(from, from + 999)
    if (error) throw error; if (!data?.length) break; out.push(...data); if (data.length < 1000) break; from += 1000
  }
  return out
}

async function run() {
  const listPath = join(__dirname, `.numista-${ISSUER}-todos.json`)
  if (!existsSync(listPath)) { console.error(`❌ Falta ${listPath}. Corre primeiro o probe (_probe-numista-pt).`); process.exit(1) }
  const list = JSON.parse(readFileSync(listPath, 'utf8'))

  const ourHist = await existentesHistorico()
  const ligados = new Set(ourHist.filter((c) => c.numista_id != null).map((c) => Number(c.numista_id)))
  const precisaDedup = ATE_ANO > 1223

  const candidatos = list
    .filter((t) => Number.isFinite(t.min_year) && t.min_year < ATE_ANO)
    .filter((t) => !ehEuro(t)) // euros são do enrich-numista, não do histórico
    .filter((t) => !ligados.has(t.id))
    .sort((a, b) => a.min_year - b.min_year)

  const paraImportar = []
  const ambiguos = []
  for (const t of candidatos) {
    if (precisaDedup) {
      const toks = denomWords(t.title)
      const overlap = ourHist.find((c) => {
        // sobreposição dos intervalos de anos (±15 de folga), não só do início
        const aI = c.ano_inicio, aF = c.ano_fim || c.ano_inicio
        if (!Number.isFinite(aI)) return false
        const anoOK = t.min_year <= (aF + 15) && (t.max_year || t.min_year) >= (aI - 15)
        if (!anoOK) return false
        const ct = denomWords(`${c.denominacao || ''} ${c.titulo || ''}`)
        return [...toks].some((x) => ct.has(x))
      })
      if (overlap) { ambiguos.push({ ...t, colide_com: overlap.denominacao || overlap.titulo, colide_ano: overlap.ano_inicio }); continue }
    }
    paraImportar.push(t)
  }

  console.log(`\n${APPLY ? '📥 IMPORTAR (apply)' : '🔎 DRY-RUN (não escreve)'} · ${PAIS} · min_year < ${ATE_ANO} · limite ${LIMIT === Infinity ? '∞' : LIMIT}`)
  console.log(`   candidatos: ${candidatos.length} · a importar: ${paraImportar.length} · ambíguos (revisão): ${ambiguos.length}\n`)
  for (const t of paraImportar.slice(0, 40)) console.log(`   ${t.min_year}${t.max_year && t.max_year !== t.min_year ? '-' + t.max_year : ''}  #${t.id}  ${t.title}`)
  if (ambiguos.length) {
    writeFileSync(join(__dirname, `.hist-ambiguos-${PAIS}.json`), JSON.stringify(ambiguos, null, 2))
    console.log(`\n   ⚠️  ${ambiguos.length} ambíguos guardados em .hist-ambiguos-${PAIS}.json (rever à mão).`)
  }

  if (!APPLY) {
    console.log(`\n🔎 DRY-RUN — 0 escritos. ${reqCount} pedidos. Aplicar: --apply${ATE_ANO !== 1223 ? ' --ate-ano ' + ATE_ANO : ''}`)
    return
  }

  let inseridos = 0, issuesTotal = 0
  for (const t of paraImportar) {
    if (inseridos >= LIMIT) break
    const d = await api(`/types/${t.id}?lang=en`, `type-${t.id}`)
    const row = mapDetalhe(d)
    if (row.moeda_hist === 'Euro') { continue } // salvaguarda: euro não é histórico
    const { data: novo, error } = await supabase.from('catalog_coins').insert(row).select('id').single()
    if (error) { console.error(`   ❌ #${t.id} ${t.title}: ${error.message}`); continue }
    const nIss = await syncIssues(novo.id, t.id, d.min_year)
    inseridos++; issuesTotal += nIss
    console.log(`   ✅ ${d.min_year}  ${row.denominacao}  (${nIss} variante(s))  #${t.id}`)
  }
  console.log(`\n✅ Inseridos ${inseridos} tipos + ${issuesTotal} variantes · ${reqCount} pedidos Numista.`)
}

run().catch((e) => { console.error(e); process.exit(1) })
