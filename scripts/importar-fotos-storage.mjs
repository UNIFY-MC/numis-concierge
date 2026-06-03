/**
 * Descarrega as imagens das moedas (hoje em links externos BCE/Numista) para o
 * NOSSO Supabase Storage (bucket "moedas") e aponta catalog_coins.anverso_img/
 * reverso_img para lá. Deixa de depender de URLs externos e cria o dataset de
 * imagens próprio (base para o futuro "match por foto").
 *
 *   node scripts/importar-fotos-storage.mjs --probe   # 1 moeda, mostra URL, NÃO escreve
 *   node scripts/importar-fotos-storage.mjs --limit 50
 *   node scripts/importar-fotos-storage.mjs            # todas as que ainda têm URL externo
 */
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: join(ROOT, '.env.local') })
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPA_URL || !SUPA_KEY) { console.error('❌ env em falta'); process.exit(1) }
const supabase = createClient(SUPA_URL, SUPA_KEY, { db: { schema: 'numis' }, auth: { persistSession: false } })

const PROBE = process.argv.includes('--probe')
const li = process.argv.indexOf('--limit')
const LIMIT = li >= 0 ? parseInt(process.argv[li + 1], 10) : Infinity
// --familia euro (defeito: as 4 famílias euro) | historico | all
const fi = process.argv.indexOf('--familia')
const FAM_ARG = fi >= 0 ? process.argv[fi + 1] : 'euro'
const FAMILIAS =
  FAM_ARG === 'all' ? null
  : FAM_ARG === 'historico' ? ['historico']
  : ['euro_circulacao', 'euro_comemorativa', 'euro_colecao']
const BUCKET = 'moedas'
const PUBLIC_BASE = `${SUPA_URL}/storage/v1/object/public/${BUCKET}/`
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const jaNosso = (u) => !!u && u.startsWith(PUBLIC_BASE)

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

async function baixar(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const ct = (r.headers.get('content-type') || 'image/jpeg').split(';')[0].trim()
  const buf = Buffer.from(await r.arrayBuffer())
  return { buf, ext: EXT[ct] || 'jpg', contentType: EXT[ct] ? ct : 'image/jpeg' }
}

// Descarrega `url`, faz upload para coins/{coinId}_{lado}.{ext}, devolve URL público.
async function paraStorage(coinId, lado, url) {
  const { buf, ext, contentType } = await baixar(url)
  const path = `coins/${coinId}_${lado}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, buf, { contentType, upsert: true })
  if (error) throw new Error(error.message)
  return PUBLIC_BASE + path
}

async function main() {
  let q = supabase
    .from('catalog_coins')
    .select('id, pais_nome, denominacao, anverso_img, reverso_img')
    .or('anverso_img.not.is.null,reverso_img.not.is.null')
    .order('pais_nome')
  if (FAMILIAS) q = q.in('familia', FAMILIAS)
  // Supabase devolve no máximo 1000 por pedido — pagina-se a leitura
  const coins = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await q.range(de, de + 999)
    if (error) { console.error('❌', error.message); process.exit(1) }
    coins.push(...data)
    if (data.length < 1000) break
  }
  console.log(`(família: ${FAM_ARG} · ${coins.length} moedas no catálogo)`)

  // só as que ainda têm pelo menos um URL externo
  const pendentes = coins.filter((c) => (c.anverso_img && !jaNosso(c.anverso_img)) || (c.reverso_img && !jaNosso(c.reverso_img)))
  console.log(`📷 ${pendentes.length} moedas com imagem externa por migrar. ${PROBE ? '(PROBE)' : ''}`)

  let feitas = 0, erros = 0
  for (const c of pendentes) {
    if (feitas >= LIMIT) break
    try {
      const patch = {}
      if (c.anverso_img && !jaNosso(c.anverso_img)) patch.anverso_img = await paraStorage(c.id, 'anverso', c.anverso_img)
      if (c.reverso_img && !jaNosso(c.reverso_img)) patch.reverso_img = await paraStorage(c.id, 'reverso', c.reverso_img)
      if (PROBE) {
        console.log(`  ${c.pais_nome} ${c.denominacao}:`)
        console.log(`   anverso → ${patch.anverso_img || '(mantém)'}`)
        console.log(`   reverso → ${patch.reverso_img || '(mantém)'}`)
        feitas++
        if (feitas >= 1) break
        continue
      }
      if (Object.keys(patch).length) {
        const { error: up } = await supabase.from('catalog_coins').update(patch).eq('id', c.id)
        if (up) { console.error(`❌ update ${c.id}: ${up.message}`); erros++; continue }
      }
      feitas++
      if (feitas % 50 === 0) console.log(`  …${feitas}`)
      await sleep(120)
    } catch (e) { console.warn(`⚠️ ${c.pais_nome} ${c.denominacao}: ${e.message}`); erros++ }
  }
  console.log(`\n✓ ${feitas} moedas migradas para o storage · ${erros} erros`)
}

main()
