/**
 * Descarrega os retratos dos reis de Portugal (domínio público) da API REST do
 * Wikipedia PT para o nosso Supabase Storage (reis/{slug}.jpg) e gera o mapa
 * lib/data/reis-retratos.json (serie → url) usado nos cartões de reinado.
 *
 *   node scripts/retratos-reis.mjs
 */
import { writeFileSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: join(ROOT, '.env.local') })
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabase = createClient(SUPA_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { db: { schema: 'numis' }, auth: { persistSession: false } })
const BUCKET = 'moedas'
const PUBLIC = `${SUPA_URL}/storage/v1/object/public/${BUCKET}/`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const UA = 'MoedasDoPinto/1.0 (coleção numismática pessoal; contacto mariocarvalho.biz@gmail.com)'

// série (reinado) → título na Wikipédia PT
const REIS = {
  'D. Sancho II': 'Sancho II de Portugal', 'D. Afonso III': 'Afonso III de Portugal',
  'D. Dinis I': 'Dinis I de Portugal', 'D. Afonso IV': 'Afonso IV de Portugal',
  'D. Pedro I': 'Pedro I de Portugal', 'D. Fernando I': 'Fernando I de Portugal',
  'D. João I': 'João I de Portugal', 'D. Duarte I': 'Duarte I de Portugal',
  'D. Afonso V': 'Afonso V de Portugal', 'D. João II': 'João II de Portugal',
  'D. Manuel I': 'Manuel I de Portugal', 'D. João III': 'João III de Portugal',
  'D. Sebastião': 'Sebastião de Portugal', 'D. Filipe I': 'Filipe I de Portugal',
  'D. Filipe II': 'Filipe II de Portugal', 'D. Filipe III': 'Filipe III de Portugal',
  'D. João IV': 'João IV de Portugal', 'D. Afonso VI': 'Afonso VI de Portugal',
  'D. Pedro II': 'Pedro II de Portugal', 'D. João V': 'João V de Portugal',
  'D. José I': 'José I de Portugal', 'D. Maria I e D. Pedro III': 'Maria I de Portugal',
  'D. Maria I': 'Maria I de Portugal', 'D. João (Príncipe Regente)': 'João VI de Portugal',
  'D. João VI': 'João VI de Portugal', 'D. Pedro IV': 'Pedro IV de Portugal',
  'D. Miguel I': 'Miguel I de Portugal', 'D. Maria II': 'Maria II de Portugal',
  'D. Pedro V': 'Pedro V de Portugal', 'D. Luís I': 'Luís I de Portugal',
  'D. Carlos I': 'Carlos I de Portugal', 'D. Manuel II': 'Manuel II de Portugal',
}
// Outras figuras/símbolos (via página Wikipédia PT, mesmo método dos reis).
const EXTRA = {
  'Estado Novo': 'António de Oliveira Salazar',
  '1ª República': 'Manuel de Arriaga',
}
// Bandeiras regionais (PNG renderizado do SVG via Special:FilePath, domínio público).
const BANDEIRAS = {
  'Açores': 'Flag of the Azores.svg',
  'Madeira': 'Flag of Madeira.svg',
}
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function viaWiki(titulo) {
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titulo)}`,
        { headers: { 'User-Agent': UA, Accept: 'application/json' } })
      // thumbnail (≈300px) primeiro — a originalimage pode passar os 5MB do bucket
      if (r.ok) { const j = await r.json(); return j.thumbnail?.source || j.originalimage?.source || null }
    } catch { /* retry */ }
    await sleep(1500)
  }
  return null
}
async function guardar(serie, src) {
  const img = await fetch(src, { headers: { 'User-Agent': UA } })
  if (!img.ok) throw new Error(`img ${img.status}`)
  const buf = Buffer.from(await img.arrayBuffer())
  const ct = img.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
  const ext = ct.includes('png') ? 'png' : ct.includes('svg') ? 'png' : 'jpg'
  const path = `reis/${slug(serie)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: ct.includes('svg') ? 'image/png' : ct, upsert: true })
  if (error) throw new Error(error.message)
  return { url: PUBLIC + path, kb: Math.round(buf.length / 1024) }
}

async function main() {
  // parte dos retratos já guardados (merge — não perde os que já existem)
  let mapa = {}
  try { mapa = JSON.parse(readFileSync(join(ROOT, 'lib/data/reis-retratos.json'), 'utf8')) } catch { /* novo */ }
  delete mapa['Dinastia Filipina I'] // renomeado para D. Filipe I

  // reis + figuras (Wikipédia)
  for (const [serie, titulo] of [...Object.entries(REIS), ...Object.entries(EXTRA)]) {
    if (mapa[serie]) continue // já temos
    const src = await viaWiki(titulo)
    if (!src) { console.warn(`⚠️ ${serie}: sem imagem`); continue }
    try { const { url, kb } = await guardar(serie, src); mapa[serie] = url; console.log(`✓ ${serie} (${kb} KB)`) }
    catch (e) { console.warn(`⚠️ ${serie}: ${e.message}`) }
    await sleep(400)
  }
  // bandeiras regionais
  for (const [serie, ficheiro] of Object.entries(BANDEIRAS)) {
    const src = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(ficheiro)}?width=320`
    try { const { url, kb } = await guardar(serie, src); mapa[serie] = url; console.log(`✓ ${serie} bandeira (${kb} KB)`) }
    catch (e) { console.warn(`⚠️ ${serie} bandeira: ${e.message}`) }
    await sleep(400)
  }
  writeFileSync(join(ROOT, 'lib/data/reis-retratos.json'), JSON.stringify(mapa, null, 2))
  console.log(`\n✅ ${Object.keys(mapa).length} imagens · lib/data/reis-retratos.json`)
}
main()
