/**
 * Importa o catálogo de Moedas da loja oficial INCM (loja.incm.pt) para
 * numis.incm_produtos. Fonte LIVRE (Shopify products.json — sem chave nem quota).
 * Idempotente por sku; delta opcional por updated_at (--desde AAAA-MM-DD).
 *
 * Requer em .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Uso:
 *   node scripts/importar-incm.mjs --probe                 # amostra, não escreve
 *   node scripts/importar-incm.mjs --apply                 # upsert de todas as Moedas
 *   node scripts/importar-incm.mjs --apply --desde 2026-06-01
 */
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '..', '.env.local') })

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPA_URL || !SUPA_KEY) {
  console.error('❌ Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em .env.local')
  process.exit(1)
}

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const desdeIdx = args.indexOf('--desde')
const DESDE = desdeIdx >= 0 ? new Date(args[desdeIdx + 1]) : null

const supabase = createClient(SUPA_URL, SUPA_KEY, { db: { schema: 'numis' }, auth: { persistSession: false } })

const LOJA = 'https://loja.incm.pt'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Tags INCM no formato "CHAVE valor" (ex.: "MATERIAL Prata").
const tag = (tags, prefixo) => {
  const t = (tags || []).find((x) => x.toUpperCase().startsWith(prefixo))
  return t ? t.slice(prefixo.length).trim() : null
}
const anoDe = (p) => {
  const m = (tag(p.tags, 'ANO') || p.title || '').match(/\b(19|20)\d{2}\b/)
  return m ? parseInt(m[0], 10) : null
}
const facialDe = (p) => {
  const ft = tag(p.tags, 'VALOR FACIAL') || tag(p.tags, 'FACIAL') || p.title || ''
  const m = ft.match(/(\d+(?:[.,]\d+)?)\s*(?:€|euros?)/i)
  return m ? parseFloat(m[1].replace(',', '.')) : null
}
const materialDe = (p) =>
  tag(p.tags, 'MATERIAL') || tag(p.tags, 'METAL') ||
  (/prata|silver/i.test(p.title) ? 'Prata' : /ouro|gold/i.test(p.title) ? 'Ouro' : null)

function row(p) {
  const v = (p.variants || [])[0] || {}
  return {
    sku: v.sku || String(p.id),
    titulo: p.title,
    preco_emissao: v.price != null ? Number(v.price) : null,
    moeda: 'EUR',
    ano: anoDe(p),
    valor_facial: facialDe(p),
    material: materialDe(p),
    product_type: p.product_type,
    imagem_url: (p.images || [])[0]?.src || null,
    produto_url: `${LOJA}/products/${p.handle}`,
    tags: p.tags || [],
    ativo: true,
    incm_id: p.id,
    incm_updated_at: p.updated_at || null,
  }
}

async function fetchMoedas() {
  const moedas = []
  for (let page = 1; page <= 40; page++) {
    const res = await fetch(`${LOJA}/products.json?limit=250&page=${page}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) { console.warn(`⚠️  página ${page}: HTTP ${res.status}`); break }
    const prods = (await res.json()).products || []
    if (prods.length === 0) break
    moedas.push(...prods.filter((p) => p.product_type === 'Moedas'))
    if (prods.length < 250) break
    await sleep(300)
  }
  return moedas
}

const all = await fetchMoedas()
const lista = DESDE ? all.filter((p) => p.updated_at && new Date(p.updated_at) >= DESDE) : all
console.log(`📦 INCM: ${all.length} Moedas no catálogo${DESDE ? ` · ${lista.length} atualizadas desde ${DESDE.toISOString().slice(0, 10)}` : ''}.`)

if (!APPLY) {
  console.log('\nAmostra (até 8):')
  for (const p of lista.slice(0, 8)) {
    const r = row(p)
    console.log(`  ${r.sku}  ${r.valor_facial ?? '?'}€ · ${r.ano ?? '?'} · ${r.material ?? '—'} — ${r.titulo} — emissão ${r.preco_emissao ?? '?'}€`)
  }
  console.log('\n🔎 DRY-RUN — nada escrito. Usa --apply para gravar.')
  process.exit(0)
}

let ok = 0
for (const p of lista) {
  const { error } = await supabase.from('incm_produtos').upsert(row(p), { onConflict: 'sku' })
  if (error) { console.error(`❌ ${p.title}: ${error.message}`); continue }
  ok++
  if (ok % 25 === 0) console.log(`  …${ok}`)
}
console.log(`\n✅ ${ok}/${lista.length} moedas INCM gravadas em numis.incm_produtos.`)
