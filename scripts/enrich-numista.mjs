/**
 * Enriquece o catálogo (catalog_coins + catalog_issues) com dados da Numista API:
 * fotos (anverso/reverso), peso, diâmetro, espessura, composição, km_ref, numista_id,
 * e tiragem por ano. Corre UMA vez — depois a app vive só do Supabase, sem voltar à API.
 *
 * Resumível: só processa catalog_coins sem numista_id. Podes correr em lotes (--limit)
 * para respeitar a quota de 2000 req/mês.
 *
 * Requer em .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NUMISTA_API_KEY
 *
 * Uso:
 *   node scripts/enrich-numista.mjs --probe        # 3-4 pedidos, mostra JSON cru, NÃO escreve
 *   node scripts/enrich-numista.mjs --limit 50     # enriquece 50 coins e pára
 *   node scripts/enrich-numista.mjs                # enriquece tudo o que falta
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

const API = 'https://api.numista.com/v3'
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const NUMISTA_KEY = process.env.NUMISTA_API_KEY

if (!SUPA_URL || !SUPA_KEY || !NUMISTA_KEY) {
  console.error('❌ Falta NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou NUMISTA_API_KEY em .env.local')
  process.exit(1)
}

const args = process.argv.slice(2)
const PROBE = args.includes('--probe')
const limitArg = args.indexOf('--limit')
const LIMIT = limitArg >= 0 ? parseInt(args[limitArg + 1], 10) : Infinity

const supabase = createClient(SUPA_URL, SUPA_KEY, {
  db: { schema: 'numis' },
  auth: { persistSession: false },
})

// ─── HTTP com rate limit (~1 req/s) e cache em disco ─────────────────────────
let reqCount = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(path, { cacheKey } = {}) {
  if (cacheKey) {
    const f = join(CACHE, cacheKey + '.json')
    if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'))
  }
  await sleep(750)
  reqCount++
  const res = await fetch(API + path, { headers: { 'Numista-API-Key': NUMISTA_KEY } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${res.status} ${path} → ${body.slice(0, 200)}`)
  }
  const json = await res.json()
  if (cacheKey) {
    if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true })
    writeFileSync(join(CACHE, cacheKey + '.json'), JSON.stringify(json))
  }
  return json
}

// ─── Extração defensiva de campos (a API pode variar nomes) ──────────────────
const pic = (side) => side?.picture || side?.thumbnail || null
const numFrom = (v) => (typeof v === 'number' ? v : (v && typeof v.numeric_value === 'number' ? v.numeric_value : null))

function mapCoinDetail(d) {
  const comp = d.composition?.text || d.composition?.english_name || (typeof d.composition === 'string' ? d.composition : null)
  const km = (d.references || []).find((r) => /km/i.test(r?.catalogue?.code || r?.catalogue?.name || ''))
  return {
    numista_id: d.id ?? null,
    anverso_img: pic(d.obverse) || d.obverse_thumbnail || null,
    reverso_img: pic(d.reverse) || d.reverse_thumbnail || null,
    peso_g: numFrom(d.weight),
    diametro_mm: numFrom(d.size) ?? numFrom(d.diameter),
    espessura_mm: numFrom(d.thickness),
    composicao: comp,
    forma: d.shape || null,
    km_ref: km?.number ? String(km.number) : null,
  }
}

// ─── Mapa FIXO de emissores Numista (ISO2 nosso → código nível-1 verificado) ──
// Extraído de /issuers (level===1) e confirmado. O mapa por nome era não-fiável
// (nomes repetidos em vários níveis; last-wins dava emissores históricos).
// Se algum país devolver 0 moedas euro no run, o código está errado → corrigir aqui.
// Nós do emissor moderno (euro), verificados via /issuers (nível 2 "república
// moderna" onde existe; senão nível 1). Todos confirmados a conter moedas euro.
const ISSUER_CODES = {
  de: 'allemagne',    // "Germany, Federal Republic of"
  ad: 'andorre',
  at: 'autriche',
  be: 'belgique',
  bg: 'bulgarie',
  cy: 'chypre',
  hr: 'croatie',
  sk: 'slovaquie',
  si: 'slovenie',
  es: 'espagne',
  ee: 'estonie',
  fi: 'finlande',
  fr: 'france',
  gr: 'grece',
  nl: 'pays-bas',
  ie: 'irlande',
  it: 'italie',
  lv: 'lettonie',
  lt: 'lituanie',
  lu: 'luxembourg',
  mt: 'malte',
  pt: 'portugal',
  sm: 'saint-marin',
  va: 'vatican',
}

// O endpoint /types (lista) NÃO devolve `value` — só o /types/{id} (detalhe).
// Por isso o valor facial é extraído do TÍTULO ("1 Euro Cent", "2 Euros (1st map)").
// Ancorado no início para não apanhar "1 Franc (... Euro 2000)" (futebol).
function facialFromTitle(title) {
  const c = (title || '').match(/^(\d+)\s+Euro\s+Cents?\b/i)
  if (c) return parseInt(c[1], 10) / 100
  const e = (title || '').match(/^(\d+)\s+Euros?\b/i)
  if (e) return parseInt(e[1], 10)
  return null
}

// Euro = título parseável a valor facial euro + ano >= 1999.
function isEuro(t) {
  return facialFromTitle(t.title) != null && (t.max_year || t.min_year || 0) >= 1999
}

// ─── Tipos EURO de um emissor, via pesquisa q (cacheado) ─────────────────────
// Pagina por valor "cego" não chega aos euros em catálogos grandes (França tem
// 3000+ tipos históricos). A pesquisa q="Euro Cent" e q="Euro" alcança-os
// directamente; isEuro() filtra ruído (ex: "1 Franc ... Euro 2000").
async function typesForIssuer(issuerCode) {
  const byId = new Map()
  for (const q of ['Euro Cent', 'Euro']) {
    let page = 1
    for (;;) {
      const data = await api(
        `/types?category=coin&issuer=${encodeURIComponent(issuerCode)}&q=${encodeURIComponent(q)}&count=50&page=${page}&lang=en`,
        { cacheKey: `q-${issuerCode}-${q.replace(/\s+/g, '_')}-p${page}` },
      )
      const types = data.types || []
      for (const t of types) if (isEuro(t)) byId.set(t.id, t)
      if (types.length < 50) break
      page++
      if (page > 12) break // salvaguarda
    }
  }
  return [...byId.values()]
}

// ─── PROBE: confirma o shape da API + foco no Portugal EURO ──────────────────
async function probe() {
  console.log('🔎 PROBE — confirmar shape e o euro de Portugal (não escreve nada)\n')
  const codePT = ISSUER_CODES.pt
  console.log('Código emissor Portugal:', codePT)
  const euros = await typesForIssuer(codePT)
  console.log(`Tipos euro encontrados (via q): ${euros.length}`)
  const um = euros.find((t) => facialFromTitle(t.title) === 1) || euros[0]
  console.log('\nTYPE euro escolhido:', JSON.stringify(um, null, 2))
  if (um?.id) {
    const detail = await api(`/types/${um.id}?lang=en`)
    const issues = await api(`/types/${um.id}/issues?lang=en`)
    console.log('\n➡️  Mapeado para a nossa BD:', JSON.stringify(mapCoinDetail(detail), null, 2))
    console.log('\nISSUES (1º):', JSON.stringify((issues.issues || issues || [])[0], null, 2))
  }
  console.log(`\n✅ Probe feito em ${reqCount} pedidos. Confirma 1€/2€ moderno com numista_id, foto e tiragem.`)
}

// ─── Match de um catalog_coin a um type da Numista ───────────────────────────
function matchType(coin, types) {
  const facial = coin.valor_facial != null ? Number(coin.valor_facial) : null
  // types já são só euro; casar pelo valor facial parseado do título.
  const cands = types.filter((t) => {
    const val = facialFromTitle(t.title)
    return facial != null && val != null && Math.abs(val - facial) < 0.001
  })
  if (cands.length === 1) return cands[0]
  if (coin.comemorativa) return null // comemorativas: match por tema/ano numa 2ª passagem
  // circulação: preferir a de gama de anos mais larga (base / "2nd map" corrente)
  return cands.sort((a, b) =>
    ((b.max_year || 0) - (b.min_year || 0)) - ((a.max_year || 0) - (a.min_year || 0)))[0] || null
}

// ─── Enriquecimento principal ────────────────────────────────────────────────
async function run() {
  const { data: coins, error } = await supabase
    .from('catalog_coins')
    .select('id, pais_codigo, pais_nome, valor_facial, denominacao, comemorativa, numista_id')
    .is('numista_id', null)
  if (error) { console.error('❌', error.message); process.exit(1) }

  console.log(`📋 ${coins.length} coins sem numista_id. Limite desta execução: ${LIMIT === Infinity ? 'todos' : LIMIT}`)

  const typesCache = new Map()
  const issuersAvisados = new Set()
  let feitos = 0, semMatch = 0, semCodigo = 0

  for (const coin of coins) {
    if (feitos >= LIMIT) break

    const issuerCode = ISSUER_CODES[coin.pais_codigo]
    if (!issuerCode) {
      if (!issuersAvisados.has(coin.pais_codigo)) {
        console.warn(`⚠️  Sem código de emissor para "${coin.pais_codigo}" (${coin.pais_nome}) — adicionar em ISSUER_CODES.`)
        issuersAvisados.add(coin.pais_codigo)
      }
      semCodigo++
      continue
    }

    let types = typesCache.get(issuerCode)
    if (!types) {
      types = await typesForIssuer(issuerCode)
      typesCache.set(issuerCode, types)
      const nEuro = types.filter(isEuro).length
      if (nEuro === 0 && !issuersAvisados.has(issuerCode)) {
        console.warn(`⚠️  Emissor "${issuerCode}" (${coin.pais_nome}) devolveu 0 moedas euro — código provavelmente errado. A saltar.`)
        issuersAvisados.add(issuerCode)
      }
    }

    const t = matchType(coin, types)
    if (!t) { semMatch++; continue }

    const detail = await api(`/types/${t.id}?lang=en`, { cacheKey: `type-${t.id}` })
    const patch = mapCoinDetail(detail)
    const { error: upErr } = await supabase.from('catalog_coins').update(patch).eq('id', coin.id)
    if (upErr) { console.error(`❌ update coin ${coin.id}:`, upErr.message); continue }

    // issues: tiragem + numista_issue_id por ano
    try {
      const issuesData = await api(`/types/${t.id}/issues?lang=en`, { cacheKey: `issues-${t.id}` })
      const issues = issuesData.issues || issuesData || []
      const { data: ourIssues } = await supabase
        .from('catalog_issues').select('id, ano, ano_gregoriano').eq('catalog_coin_id', coin.id)
      for (const oi of ourIssues || []) {
        const ano = oi.ano_gregoriano || parseInt(oi.ano, 10)
        const ni = issues.find((x) => (x.gregorian_year || x.year) === ano)
        if (ni) {
          await supabase.from('catalog_issues')
            .update({ numista_issue_id: ni.id ?? null, tiragem: numFrom(ni.mintage) ?? null })
            .eq('id', oi.id)
        }
      }
    } catch (e) { console.warn(`⚠️  issues ${t.id}: ${e.message}`) }

    feitos++
    if (feitos % 10 === 0) console.log(`  …${feitos} coins enriquecidos (${reqCount} pedidos)`)
  }

  console.log(`\n✅ Enriquecidos ${feitos} coins · ${semMatch} sem match · ${semCodigo} sem código de emissor · ${reqCount} pedidos usados.`)
  if (semMatch > 0) console.log('   (sem match = comemorativas/casos a tratar numa 2ª passagem por ano)')
}

await (PROBE ? probe() : run())
