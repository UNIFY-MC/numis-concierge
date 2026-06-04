/**
 * Importa moedas da Maktun (web.maktun.com) para catalog_coins/catalog_issues.
 * Fonte permitida pelo CLAUDE.md: guarda a origem (maktun_id + maktun_raw),
 * fotos migram-se depois para o nosso storage, respeita rate limits.
 *
 * Token em scripts/.maktun-token (TOKEN=...). Auth: "Authorization: Token <t>".
 *
 *   --pais 417,771,781        importa TUDO desses ids (histórico + euro coleção)
 *   --euro                    importa só a COLEÇÃO euro/ECU (nominal>2 ou ECU) de
 *                             todos os países euro (salta circulação e 2€ que já temos)
 *   --probe                   conta e mostra amostra
 *   --apply                   insere (idempotente por maktun_id); sem isto = dry-run JSON
 */
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: join(ROOT, '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'numis' }, auth: { persistSession: false },
})
const tok = readFileSync(join(ROOT, 'scripts/.maktun-token'), 'utf8').match(/TOKEN=([0-9a-f]+)/i)
if (!tok) { console.error('❌ scripts/.maktun-token sem TOKEN=...'); process.exit(1) }
const H = { Authorization: 'Token ' + tok[1], 'Content-Type': 'application/json', Accept: 'application/json' }
const BASE = 'https://web.maktun.com/api/catalog'

const args = process.argv.slice(2)
const PROBE = args.includes('--probe')
const APPLY = args.includes('--apply')
const SO_EURO = args.includes('--euro')
// --nominal: para países cujo catálogo é enorme demais para get_cointypes inteiro
// (França: ~28k → 504). A Maktun filtra por denominação: get_cointypes aceita
// {country_id, currency_id, nominal:"<texto>"}. Pedimos só a COLEÇÃO euro
// (currency Euro 1713, nominais > 2 e frações de coleção), só Coins (is_token=false).
// A circulação (1c–2€) e as comemorativas 2€ NÃO se pedem — já as temos da Numista/BCE.
const POR_NOMINAL = args.includes('--nominal')
const CURRENCY_EURO = 1713
const NOMINAIS_COLECAO_EURO = [
  '1/4', '1 1/2', '3', '3.33', '3.88', '4', '5', '6', '7', '7.5', '7.50', '8',
  '10', '11', '12', '12.5', '12 1/2', '14', '15', '19.18', '20', '25', '30', '35',
  '40', '50', '75', '100', '150', '200', '250', '300', '400', '500', '1000',
  '2.000', '2500', '5000', '5.000', '10000',
]
const pa = args.indexOf('--pais')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Entidade nacional (id Maktun do país moderno, onde vivem o euro e a história nacional).
const PAISES = {
  de: { id: 407, nome: 'Alemanha' }, ad: { id: 547, nome: 'Andorra' }, at: { id: 406, nome: 'Austria' },
  be: { id: 408, nome: 'Belgica' }, cy: { id: 422, nome: 'Chipre' }, hr: { id: 435, nome: 'Croacia' },
  sk: { id: 427, nome: 'Eslovaquia' }, si: { id: 419, nome: 'Eslovenia' }, es: { id: 412, nome: 'Espanha' },
  ee: { id: 448, nome: 'Estónia' }, fi: { id: 420, nome: 'Finlandia' }, fr: { id: 421, nome: 'França' },
  gr: { id: 409, nome: 'Grécia' }, nl: { id: 416, nome: 'Holanda' }, ie: { id: 411, nome: 'Irlanda' },
  it: { id: 413, nome: 'Italia' }, lv: { id: 444, nome: 'Letónia' }, lt: { id: 438, nome: 'Lituania' },
  lu: { id: 414, nome: 'Luxemburgo' }, mt: { id: 423, nome: 'Malta' }, mc: { id: 415, nome: 'Mónaco' },
  pt: { id: 417, nome: 'Portugal' }, sm: { id: 418, nome: 'San Marino' }, va: { id: 410, nome: 'Vaticano' },
}
const idToCodigo = Object.fromEntries(Object.entries(PAISES).map(([c, v]) => [v.id, c]))

async function pedir(countryId, page) {
  // retry em 5xx (504 timeout em catálogos enormes) e 429 (rate limit)
  for (let t = 0; t < 5; t++) {
    const r = await fetch(`${BASE}/get_cointypes/`, { method: 'POST', headers: H, body: JSON.stringify({ country_id: countryId, page }) })
    if (r.ok) return (await r.json()).cointypes || []
    if (r.status >= 500 || r.status === 429) { await sleep(8000 * (t + 1)); continue }
    throw new Error(`get_cointypes ${countryId} p${page}: ${r.status}`)
  }
  throw new Error(`get_cointypes ${countryId}: 5xx persistente`)
}
async function cointypes(countryId) {
  const byId = new Map()
  for (let page = 1; page <= 80; page++) {
    const list = await pedir(countryId, page)
    if (list.length === 0) break
    const antes = byId.size
    for (const ct of list) byId.set(ct.id, ct)
    if (byId.size === antes) break
    await sleep(350)
  }
  return [...byId.values()]
}

// Pede a coleção euro por denominação (contorna o 504 dos catálogos gigantes).
async function pedirNominal(countryId, nominal) {
  for (let t = 0; t < 4; t++) {
    const r = await fetch(`${BASE}/get_cointypes/`, {
      method: 'POST', headers: H,
      body: JSON.stringify({ country_id: countryId, currency_id: CURRENCY_EURO, nominal }),
    })
    if (r.ok) { const j = await r.json(); return j.cointypes || [] }
    if (r.status >= 500 || r.status === 429) { await sleep(6000 * (t + 1)); continue }
    throw new Error(`get_cointypes ${countryId} nominal ${nominal}: ${r.status}`)
  }
  return []
}
async function cointypesPorNominal(countryId) {
  const byId = new Map()
  for (const n of NOMINAIS_COLECAO_EURO) {
    const list = await pedirNominal(countryId, n)
    for (const ct of list) if (!ct.is_token) byId.set(ct.id, ct)  // só Coins, não Tokens
    await sleep(450)
  }
  return [...byId.values()]
}

const moedaDe = (ct) => ct.currency?.title || ''
const ehEuro = (ct) => /euro/i.test(moedaDe(ct))
const ehEcu = (ct) => /ecu/i.test(moedaDe(ct))
const ehEuroCorrente = (ct) => ehEuro(ct) && Number(ct.formatted_nominal) <= 2   // circulação + 2€ comem (já temos)
const ehColecaoEuro = (ct) => ehEcu(ct) || (ehEuro(ct) && Number(ct.formatted_nominal) > 2)

function mapear(ct, codigo, nome) {
  const euro = ehEuro(ct)
  return {
    titulo: ct.combined_title || ct.title, pais_codigo: codigo, pais_nome: nome,
    denominacao: ct.title, valor_facial: euro ? Number(ct.formatted_nominal) : null,
    moeda_hist: euro ? null : (moedaDe(ct) || null), comemorativa: false,
    familia: euro ? 'euro_colecao' : 'historico',
    km_ref: ct.km_code || null, peso_g: ct.weight ?? null, diametro_mm: ct.diameter ?? null,
    maktun_id: ct.id, maktun_comentario: ct.comment || null, maktun_raw: ct,
    ano_inicio: ct.start_year || null, ano_fim: ct.end_year || null,
    anverso_img: ct.example2_url || null, reverso_img: ct.example1_url || null,
    foto_fonte: 'Maktun (vlcoins)',
  }
}

async function main() {
  const { data: ex } = await supabase.from('catalog_coins').select('maktun_id').not('maktun_id', 'is', null)
  const temMaktun = new Set((ex || []).map((c) => c.maktun_id))

  // alvos: --pais ids (com país pelo mapa) ou --euro (todos os países euro, menos PT já feito)
  let alvos
  if (pa >= 0) alvos = args[pa + 1].split(',').map((s) => ({ id: parseInt(s, 10), codigo: idToCodigo[parseInt(s, 10)] || 'pt', nome: (PAISES[idToCodigo[parseInt(s, 10)]] || {}).nome || 'Portugal' }))
  else alvos = Object.entries(PAISES).filter(([c]) => c !== 'pt').map(([c, v]) => ({ id: v.id, codigo: c, nome: v.nome }))

  const candidatas = []
  const falhados = []
  for (const a of alvos) {
    let list
    try { list = POR_NOMINAL ? await cointypesPorNominal(a.id) : await cointypes(a.id) }
    catch (e) { console.warn(`⚠️ ${a.codigo} #${a.id}: ${e.message} — saltado`); falhados.push(a.codigo); continue }
    const filtradas = list.filter((ct) => {
      if (temMaktun.has(ct.id)) return false
      if (POR_NOMINAL) return !ct.is_token   // já vem só coleção euro (currency 1713) sem tokens
      if (SO_EURO) return ehColecaoEuro(ct)
      return !ehEuroCorrente(ct)
    })
    console.log(`${a.codigo} #${a.id}: ${list.length} cointypes → ${filtradas.length} a importar`)
    for (const ct of filtradas) candidatas.push(mapear(ct, a.codigo, a.nome))
    await sleep(300)
  }
  if (falhados.length) console.log(`\n⚠️ países saltados (5xx): ${falhados.join(', ')}`)
  console.log(`\n🪙 ${candidatas.length} moedas a importar (${SO_EURO ? 'só coleção euro/ECU' : 'tudo'})`)
  if (PROBE) { for (const c of candidatas.slice(0, 8)) console.log(`  ${c.pais_codigo} · ${c.denominacao} (${c.ano_inicio}) · ${c.moeda_hist || c.valor_facial + '€'}`); return }
  if (!APPLY) { writeFileSync(join(ROOT, 'maktun-cand.json'), JSON.stringify(candidatas, null, 2)); console.log('Dry-run: maktun-cand.json'); return }

  let ins = 0, erros = 0
  for (const coin of candidatas) {
    const { data: novo, error } = await supabase.from('catalog_coins').insert(coin).select('id').single()
    if (error) { if (!/duplicate|unique/i.test(error.message)) { console.error('coin', coin.maktun_id, error.message); erros++ } continue }
    if (coin.ano_inicio) await supabase.from('catalog_issues').insert({ catalog_coin_id: novo.id, ano: String(coin.ano_inicio), ano_gregoriano: coin.ano_inicio, html_est0: 0, html_qf: 0, html_verde: false })
    ins++
    if (ins % 100 === 0) console.log(`  …${ins}`)
  }
  console.log(`\n✅ ${ins} moedas inseridas · ${erros} erros`)
}

main()
