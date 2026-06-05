/**
 * Sonda a Maktun (Portugal, id 417) à procura dos ouros de coleção que faltam na
 * BD (série Portugal Universal e variantes ouro). Não escreve nada — só lista o
 * que existe lá e ainda não temos. Confirma se a lacuna é preenchível via Maktun.
 *
 *   node scripts/probe-pt-ouro.mjs
 */
import { readFileSync } from 'fs'
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
const H = { Authorization: 'Token ' + tok[1], 'Content-Type': 'application/json', Accept: 'application/json' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function pedir(page) {
  for (let t = 0; t < 5; t++) {
    const r = await fetch('https://web.maktun.com/api/catalog/get_cointypes/', {
      method: 'POST', headers: H, body: JSON.stringify({ country_id: 417, page }),
    })
    if (r.ok) return (await r.json()).cointypes || []
    if (r.status >= 500 || r.status === 429) { await sleep(7000 * (t + 1)); continue }
    throw new Error('status ' + r.status)
  }
  return []
}

async function main() {
  const { data: ex } = await supabase.from('catalog_coins').select('maktun_id').not('maktun_id', 'is', null)
  const temos = new Set((ex || []).map((c) => c.maktun_id))

  const byId = new Map()
  for (let p = 1; p <= 80; p++) {
    const list = await pedir(p)
    if (!list.length) break
    const antes = byId.size
    for (const ct of list) byId.set(ct.id, ct)
    if (byId.size === antes) break
    await sleep(350)
  }
  const todas = [...byId.values()]
  const ouro = (ct) => /gold|ouro|\bAu\b|916|999.*gold/i.test(JSON.stringify(ct.composition || ct.metal || '') + ' ' + (ct.title || ''))
  const universal = (ct) => /universal|afonso henriques|santo ant[óo]nio|vasco da gama|fernando pessoa|d\.?\s*dinis|nuno [ÁaA]lvares|d\.?\s*jo[ãa]o|nun['o]?\s/i.test(ct.title || '')
  const euro = (ct) => /euro/i.test(ct.currency?.title || '')

  // já existem na BD por outra via (não recriar duplicados): 25 Ecu Vasco, 2€ Direitos
  // Humanos 2008, Camilo Ouro 2025, e os 2½ Ecu Vasco (já lá estão 2)
  const SKIP = new Set([185578, 1096, 665992, 215877, 588472])
  const faltam = todas.filter((ct) => !temos.has(ct.id) && !SKIP.has(ct.id) && euro(ct) && (ouro(ct) || universal(ct)))
  console.log(`Total PT cointypes Maktun: ${todas.length} · já temos: ${todas.filter(c=>temos.has(c.id)).length}`)
  console.log(`Candidatos ouro/Universal a importar: ${faltam.length}\n`)
  for (const ct of faltam) {
    console.log(`  #${ct.id} · ${ct.formatted_nominal}€ · ${ct.title} (${ct.start_year || '?'})`)
  }

  if (!process.argv.includes('--apply')) { console.log('\n(dry-run — usar --apply para inserir)'); return }

  const facialSeguro = (ct) => { const v = Number(ct.formatted_nominal); return Number.isFinite(v) && v > 0 && v <= 1e7 ? v : null }
  let ins = 0
  for (const ct of faltam) {
    const coin = {
      titulo: ct.combined_title || ct.title, pais_codigo: 'pt', pais_nome: 'Portugal',
      denominacao: ct.title, valor_facial: facialSeguro(ct), comemorativa: false, familia: 'euro_colecao',
      km_ref: ct.km_code || null, peso_g: ct.weight ?? null, diametro_mm: ct.diameter ?? null,
      maktun_id: ct.id, maktun_comentario: ct.comment || null, maktun_raw: ct,
      ano_inicio: ct.start_year || null, ano_fim: ct.end_year || null,
      anverso_img: ct.example2_url || null, reverso_img: ct.example1_url || null, foto_fonte: 'Maktun (vlcoins)',
      metal: 'Ouro',
    }
    const { data: novo, error } = await supabase.from('catalog_coins').insert(coin).select('id').single()
    if (error) { if (!/duplicate|unique/i.test(error.message)) console.error('  ✗', ct.id, error.message); continue }
    if (coin.ano_inicio) await supabase.from('catalog_issues').insert({ catalog_coin_id: novo.id, ano: String(coin.ano_inicio), ano_gregoriano: coin.ano_inicio, html_est0: 0, html_qf: 0, html_verde: false })
    ins++
    console.log(`  ✓ ${ct.title}`)
  }
  console.log(`\n✅ ${ins} moedas de ouro inseridas (fotos migram a seguir; metal=Ouro)`)
}
main()
