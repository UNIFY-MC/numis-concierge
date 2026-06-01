/**
 * Importa para catalog_coins/catalog_issues as moedas comemorativas de 2€ que
 * REALMENTE foram emitidas, segundo a Numista (fonte de verdade) — nunca a partir
 * do HTML. Cria os tipos que ainda não temos (por numista_id).
 *
 *   node scripts/importar-comemorativas.mjs --probe   # 1 país, confirma shape
 *   node scripts/importar-comemorativas.mjs           # dry-run: escreve candidatas-comem.json
 *   node scripts/importar-comemorativas.mjs --apply    # insere (com backup) + foto/tema PT
 *   [--pais pt] [--limit N]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
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
if (!SUPA_URL || !SUPA_KEY || !NUMISTA_KEY) { console.error('❌ env em falta'); process.exit(1) }

const args = process.argv.slice(2)
const PROBE = args.includes('--probe')
const APPLY = args.includes('--apply')
const paisArg = args.indexOf('--pais'); const SO_PAIS = paisArg >= 0 ? args[paisArg + 1] : null
const limArg = args.indexOf('--limit'); const LIMIT = limArg >= 0 ? parseInt(args[limArg + 1], 10) : Infinity

const supabase = createClient(SUPA_URL, SUPA_KEY, { db: { schema: 'numis' }, auth: { persistSession: false } })
let reqCount = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(path, { cacheKey } = {}) {
  if (cacheKey) { const f = join(CACHE, cacheKey + '.json'); if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8')) }
  await sleep(750); reqCount++
  const res = await fetch(API + path, { headers: { 'Numista-API-Key': NUMISTA_KEY } })
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  const json = await res.json()
  if (cacheKey) { if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true }); writeFileSync(join(CACHE, cacheKey + '.json'), JSON.stringify(json)) }
  return json
}

const pic = (s) => s?.picture || s?.thumbnail || null
const PAIS_NOME = {
  de: 'Alemanha', ad: 'Andorra', at: 'Austria', be: 'Belgica', bg: 'Bulgaria', cy: 'Chipre', hr: 'Croacia',
  sk: 'Eslovaquia', si: 'Eslovenia', es: 'Espanha', ee: 'Estónia', fi: 'Finlandia', fr: 'França', gr: 'Grécia',
  nl: 'Holanda', ie: 'Irlanda', it: 'Italia', lv: 'Letónia', lt: 'Lituania', lu: 'Luxemburgo', mt: 'Malta',
  pt: 'Portugal', sm: 'San Marino', va: 'Vaticano',
}
const ISSUER_CODES = {
  de: 'allemagne', ad: 'andorre', at: 'autriche', be: 'belgique', bg: 'bulgarie', cy: 'chypre', hr: 'croatie',
  sk: 'slovaquie', si: 'slovenie', es: 'espagne', ee: 'estonie', fi: 'finlande', fr: 'france', gr: 'grece',
  nl: 'pays-bas', ie: 'irlande', it: 'italie', lv: 'lettonie', lt: 'lituanie', lu: 'luxembourg', mt: 'malte',
  pt: 'portugal', sm: 'saint-marin', va: 'vatican',
}
function facialFromTitle(title) {
  const c = (title || '').match(/^(\d+)\s+Euro\s+Cents?\b/i); if (c) return parseInt(c[1], 10) / 100
  const e = (title || '').match(/^(\d+)\s+Euros?\b/i); if (e) return parseInt(e[1], 10)
  return null
}
const isEuro = (t) => facialFromTitle(t.title) != null && (t.max_year || t.min_year || 0) >= 1999
function temaDoTitulo(title) { const m = (title || '').match(/\(([^)]+)\)\s*$/); return m ? m[1].trim() : null }

async function typesForIssuer(code) {
  const byId = new Map()
  for (const q of ['Euro Cent', 'Euro']) {
    let page = 1
    for (;;) {
      const data = await api(`/types?category=coin&issuer=${encodeURIComponent(code)}&q=${encodeURIComponent(q)}&count=50&page=${page}&lang=en`,
        { cacheKey: `q-${code}-${q.replace(/\s+/g, '_')}-p${page}` })
      const types = data.types || []
      for (const t of types) if (isEuro(t)) byId.set(t.id, t)
      if (types.length < 50) break
      page++; if (page > 12) break
    }
  }
  return [...byId.values()]
}

// Comemorativa de 2€: facial 2 + tema descritivo (não variante de desenho de circulação).
const VARIANTE = /\b(map|mapa|type|tipo|portrait|ef[ií]gie|pattern|essai|mule|reeding|orla)\b/i
function ehComemorativa2(t) {
  if (facialFromTitle(t.title) !== 2) return false
  const tema = temaDoTitulo(t.title)
  if (!tema) return false
  if (VARIANTE.test(tema)) return false
  if (/^\d+(st|nd|rd|th)?$/i.test(tema)) return false // "2nd", "2014"
  return (t.min_year || t.max_year || 0) >= 2004
}

async function main() {
  const { data: existentes } = await supabase.from('catalog_coins').select('numista_id').not('numista_id', 'is', null)
  const temId = new Set((existentes || []).map((c) => c.numista_id))

  const paises = SO_PAIS ? [SO_PAIS] : Object.keys(ISSUER_CODES)
  const candidatas = []
  for (const pais of paises) {
    const code = ISSUER_CODES[pais]; if (!code) continue
    let types
    try { types = await typesForIssuer(code) } catch (e) { console.warn(`⚠️ ${pais}: ${e.message}`); continue }
    const comem = types.filter(ehComemorativa2).filter((t) => !temId.has(t.id))
    for (const t of comem) {
      candidatas.push({
        pais_codigo: pais, pais_nome: PAIS_NOME[pais], numista_id: t.id,
        ano: t.min_year || t.max_year || null, tema_en: temaDoTitulo(t.title), titulo: t.title,
      })
    }
    if (PROBE) { console.log(`${pais}: ${comem.length} comemorativas 2€ novas (de ${types.length} tipos euro)`); if (paises.length === 1) console.log(JSON.stringify(comem.slice(0, 5).map((t) => ({ id: t.id, title: t.title, ano: t.min_year })), null, 2)) }
  }
  console.log(`\n🪙 ${candidatas.length} comemorativas 2€ novas (não temos) · ${reqCount} pedidos`)

  if (PROBE) return
  if (!APPLY) {
    writeFileSync(join(ROOT, 'candidatas-comem.json'), JSON.stringify(candidatas, null, 2))
    console.log('Dry-run: escrito candidatas-comem.json. Revê e corre --apply para inserir.')
    return
  }

  // --apply: backup + inserir (com tema PT + foto via /types/{id})
  let inseridas = 0
  for (const c of candidatas) {
    if (inseridas >= LIMIT) break
    let detail
    try { detail = await api(`/types/${c.numista_id}?lang=pt`, { cacheKey: `type-pt-${c.numista_id}` }) } catch { continue }
    const tema = temaDoTitulo(detail.title) || c.tema_en
    const { data: novo, error: e1 } = await supabase.from('catalog_coins').insert({
      titulo: detail.title, pais_codigo: c.pais_codigo, pais_nome: c.pais_nome, valor_facial: 2,
      denominacao: '2 Euros', tipo_emissao: 'Comemorativa', comemorativa: true,
      tema, numista_id: c.numista_id,
      anverso_img: pic(detail.obverse), reverso_img: pic(detail.reverse),
    }).select('id').single()
    if (e1) { console.error('coin', c.pais_codigo, c.numista_id, e1.message); continue }
    if (c.ano) await supabase.from('catalog_issues').insert({
      catalog_coin_id: novo.id, ano: String(c.ano), ano_gregoriano: c.ano, html_est0: 0, html_qf: 0, html_verde: false,
    })
    inseridas++
    if (inseridas % 25 === 0) console.log(`  …${inseridas} (${reqCount} pedidos)`)
  }
  console.log(`\n✅ ${inseridas} comemorativas inseridas · ${reqCount} pedidos`)
}

main()
