/**
 * Importa VALOR DE MERCADO da Numista para as issues que temos na coleção.
 * A Numista dá preços estimados por grau, por issue (ano). Guardamos em
 * catalog_issues: valor_mercado (representativo), precos_mercado (jsonb por grau),
 * valor_mercado_data/fonte. A coluna "Valor mercado" da tabela passa a ler isto.
 *
 * ATENÇÃO: confirmar SEMPRE o shape com --probe antes de correr a sério — o
 * endpoint de preços não estava testável (quota 429) quando foi escrito.
 *
 * Resumível: só re-pede issues sem valor_mercado ou desatualizadas (>90 dias).
 * Respeita a quota (2000/mês): usar --limit N por lote.
 *
 *   node scripts/precos-numista.mjs --probe        # 1-2 pedidos, mostra JSON cru
 *   node scripts/precos-numista.mjs --limit 50     # importa 50 e pára
 *   node scripts/precos-numista.mjs --so-colecao   # só issues que tens (default)
 */
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: join(ROOT, '.env.local') })
const API = 'https://api.numista.com/v3'
// .env.local pode ter mais que uma NUMISTA_API_KEY (o dotenv fica com a última);
// usamos a PRIMEIRA do ficheiro — é onde o dono põe a key com quota.
function resolveKey() {
  try {
    const raw = readFileSync(join(ROOT, '.env.local'), 'utf8')
    const ms = [...raw.matchAll(/^\s*NUMISTA_API_KEY\s*=\s*["']?([0-9a-zA-Z]+)/gm)].map((m) => m[1])
    if (ms.length) return ms[0]
  } catch { /* fallback abaixo */ }
  return process.env.NUMISTA_API_KEY
}
const KEY = resolveKey()
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'numis' }, auth: { persistSession: false },
})
const args = process.argv.slice(2)
const PROBE = args.includes('--probe')
const li = args.indexOf('--limit'); const LIMIT = li >= 0 ? parseInt(args[li + 1], 10) : Infinity
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function precos(typeId, issueId) {
  await sleep(800)
  const r = await fetch(`${API}/types/${typeId}/issues/${issueId}/prices?currency=EUR&lang=en`, {
    headers: { 'Numista-API-Key': KEY },
  })
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`)
  return r.json()
}

// Extrai um valor representativo do payload (defensivo — shape a confirmar no probe).
function representativo(j) {
  const arr = j.prices || j.grades || (Array.isArray(j) ? j : [])
  const mapa = {}
  let melhor = null, grau = null
  for (const p of arr) {
    const g = p.grade || p.condition || p.name || '?'
    const v = Number(p.price?.value ?? p.value ?? p.price ?? p.estimate)
    if (Number.isFinite(v)) { mapa[g] = v; if (melhor == null || /unc|ms|fdc|sup/i.test(g)) { melhor = v; grau = g } }
  }
  if (melhor == null) {
    const ent = Object.entries(mapa).sort((a, b) => b[1] - a[1])[0]
    if (ent) { melhor = ent[1]; grau = ent[0] }
  }
  return { mapa, melhor, grau }
}

async function main() {
  if (!KEY) { console.error('❌ falta NUMISTA_API_KEY'); process.exit(1) }

  // issues da coleção (quantidade>0) por precificar (valor_mercado null) com
  // numista_issue_id + numista_id do coin — PAGINADO (PostgREST corta nos 1000).
  const data = []
  for (let from = 0; ; from += 1000) {
    const { data: pg, error } = await supabase
      .from('catalog_issues')
      .select('id, numista_issue_id, valor_mercado_data, catalog_coins!inner(numista_id, familia, valor_facial), collection!inner(quantidade)')
      .not('numista_issue_id', 'is', null)
      .not('catalog_coins.numista_id', 'is', null)
      .gt('collection.quantidade', 0)
      .is('valor_mercado', null)
      .order('id').range(from, from + 999)
    if (error) { console.error('❌', error.message); process.exit(1) }
    if (!pg?.length) break
    data.push(...pg)
    if (pg.length < 1000) break
  }

  // dedupe + filtra desatualizados
  const corte = Date.now() - 90 * 864e5
  const alvos = []
  const vistos = new Set()
  for (const it of data || []) {
    if (vistos.has(it.id)) continue; vistos.add(it.id)
    const recente = it.valor_mercado_data && Date.parse(it.valor_mercado_data) > corte
    if (!recente) alvos.push({
      issueRow: it.id, typeId: it.catalog_coins.numista_id, issueId: it.numista_issue_id,
      fam: it.catalog_coins.familia, facial: Number(it.catalog_coins.valor_facial) || 0,
    })
  }
  // prioriza as mais valiosas: coleção → comemorativas → circulação; maior facial primeiro.
  const ordemFam = { euro_colecao: 0, euro_comemorativa: 1, euro_circulacao: 2 }
  alvos.sort((a, b) => (ordemFam[a.fam] ?? 3) - (ordemFam[b.fam] ?? 3) || b.facial - a.facial)
  console.log(`${alvos.length} issues da coleção a precificar (limite ${LIMIT === Infinity ? 'todos' : LIMIT}).`)

  if (PROBE) {
    const a = alvos[0]; if (!a) return console.log('nada a sondar')
    console.log(`PROBE /types/${a.typeId}/issues/${a.issueId}/prices`)
    const j = await precos(a.typeId, a.issueId)
    console.log(JSON.stringify(j, null, 2).slice(0, 1500))
    console.log('\nrepresentativo →', JSON.stringify(representativo(j)))
    return
  }

  let feitos = 0, erros = 0
  for (const a of alvos) {
    if (feitos >= LIMIT) break
    try {
      const j = await precos(a.typeId, a.issueId)
      const { mapa, melhor, grau } = representativo(j)
      await supabase.from('catalog_issues').update({
        valor_mercado: melhor, precos_mercado: mapa, valor_mercado_grau: grau,
        valor_mercado_moeda: 'EUR', valor_mercado_fonte: 'Numista',
        valor_mercado_data: new Date().toISOString(),
      }).eq('id', a.issueRow)
      // Histórico append-only (migration 017): permite "evolução de preço" ao longo do tempo.
      if (melhor != null) {
        await supabase.from('precos_mercado_hist').insert({
          catalog_issue_id: a.issueRow, grau, valor: melhor, moeda: 'EUR', fonte: 'Numista',
        })
      }
      feitos++
      if (feitos % 25 === 0) console.log(`  …${feitos}`)
    } catch (e) {
      erros++
      if (/429|quota/i.test(e.message)) { console.error('⛔ quota esgotada — parar.'); break }
      if (erros <= 5) console.error('  ✗', e.message)
    }
  }
  console.log(`\n✅ ${feitos} issues precificadas · ${erros} erros.`)
}
main()
