/**
 * Valor de mercado (Numista) para as issues HISTÓRICAS do catálogo (não só coleção).
 * Preenche catalog_issues.valor_mercado + precos_mercado (jsonb por grau) + fonte/data.
 * Só issues com numista_issue_id (as medievais sem data não são precificáveis por issue).
 *
 * Resumível: salta as que já têm valor_mercado. --limit N por lote. Respeita quota.
 *   node scripts/precos-historico-numista.mjs --probe
 *   node scripts/precos-historico-numista.mjs --limit 100
 */
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: join(ROOT, '.env.local') })
const API = 'https://api.numista.com/v3'
function resolveKey() {
  try { const raw = readFileSync(join(ROOT, '.env.local'), 'utf8')
    const ms = [...raw.matchAll(/^\s*NUMISTA_API_KEY\s*=\s*["']?([0-9a-zA-Z]+)/gm)].map((m) => m[1])
    if (ms.length) return ms[0] } catch { /* */ }
  return process.env.NUMISTA_API_KEY
}
const KEY = resolveKey()
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { db: { schema: 'numis' }, auth: { persistSession: false } })
const args = process.argv.slice(2)
const PROBE = args.includes('--probe')
const li = args.indexOf('--limit'); const LIMIT = li >= 0 ? parseInt(args[li + 1], 10) : Infinity
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function precos(typeId, issueId) {
  for (let t = 1; t <= 3; t++) {
    await sleep(800 * t)
    try {
      const r = await fetch(`${API}/types/${typeId}/issues/${issueId}/prices?currency=EUR&lang=en`, { headers: { 'Numista-API-Key': KEY }, signal: AbortSignal.timeout(20000) })
      if (r.status === 429) throw new Error('429 quota')
      if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 100)}`)
      return r.json()
    } catch (e) { if (/429/.test(e.message) || t === 3) throw e }
  }
}
function representativo(j) {
  const arr = j.prices || j.grades || (Array.isArray(j) ? j : [])
  const mapa = {}; let melhor = null, grau = null
  for (const p of arr) {
    const g = p.grade || p.condition || p.name || '?'
    const v = Number(p.price?.value ?? p.value ?? p.price ?? p.estimate)
    if (Number.isFinite(v)) { mapa[g] = v; if (melhor == null || /unc|ms|fdc|sup/i.test(g)) { melhor = v; grau = g } }
  }
  if (melhor == null) { const e = Object.entries(mapa).sort((a, b) => b[1] - a[1])[0]; if (e) { melhor = e[1]; grau = e[0] } }
  return { mapa, melhor, grau }
}

async function main() {
  if (!KEY) { console.error('❌ falta NUMISTA_API_KEY'); process.exit(1) }
  const alvos = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await s.from('catalog_issues')
      .select('id, numista_issue_id, catalog_coins!inner(numista_id, familia, pais_codigo)')
      .eq('catalog_coins.pais_codigo', 'pt').eq('catalog_coins.familia', 'historico')
      .not('numista_issue_id', 'is', null).not('catalog_coins.numista_id', 'is', null)
      .is('valor_mercado_data', null).order('id').range(from, from + 999)
    if (error) { console.error('❌', error.message); process.exit(1) }
    if (!data?.length) break
    alvos.push(...data.map((it) => ({ issueRow: it.id, typeId: it.catalog_coins.numista_id, issueId: it.numista_issue_id })))
    if (data.length < 1000) break
  }
  console.log(`${alvos.length} issues históricas por precificar (limite ${LIMIT === Infinity ? 'todas' : LIMIT}).`)
  if (PROBE) { const a = alvos[0]; if (!a) return; const j = await precos(a.typeId, a.issueId); console.log(JSON.stringify(j).slice(0, 600), '\n→', JSON.stringify(representativo(j))); return }

  let feitos = 0, comValor = 0, semDados = 0
  for (const a of alvos) {
    if (feitos >= LIMIT) break
    try {
      const j = await precos(a.typeId, a.issueId)
      const { mapa, melhor, grau } = representativo(j)
      await s.from('catalog_issues').update({
        valor_mercado: melhor, precos_mercado: mapa, valor_mercado_grau: grau,
        valor_mercado_moeda: 'EUR', valor_mercado_fonte: 'Numista', valor_mercado_data: new Date().toISOString(),
      }).eq('id', a.issueRow)
      if (melhor != null) { comValor++; await s.from('precos_mercado_hist').insert({ catalog_issue_id: a.issueRow, grau, valor: melhor, moeda: 'EUR', fonte: 'Numista' }).then(() => {}, () => {}) }
      else semDados++
      feitos++
      if (feitos % 50 === 0) console.log(`  …${feitos} (com valor: ${comValor})`)
    } catch (e) { if (/429|quota/i.test(e.message)) { console.error('⛔ quota esgotada — parar.'); break } console.error('  ✗', e.message) }
  }
  console.log(`\n✅ ${feitos} processadas · ${comValor} com valor · ${semDados} sem dados de preço.`)
}
main()
