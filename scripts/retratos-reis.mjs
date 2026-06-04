/**
 * Descarrega os retratos dos reis de Portugal (domínio público) da API REST do
 * Wikipedia PT para o nosso Supabase Storage (reis/{slug}.jpg) e gera o mapa
 * lib/data/reis-retratos.json (serie → url) usado nos cartões de reinado.
 *
 *   node scripts/retratos-reis.mjs
 */
import { writeFileSync } from 'fs'
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
  'D. Sebastião': 'Sebastião de Portugal', 'Dinastia Filipina I': 'Filipe I de Portugal',
  'Filipe II': 'Filipe II de Portugal', 'Filipe III': 'Filipe III de Portugal',
  'D. João IV': 'João IV de Portugal', 'D. Afonso VI': 'Afonso VI de Portugal',
  'D. Pedro II': 'Pedro II de Portugal', 'D. João V': 'João V de Portugal',
  'D. José I': 'José I de Portugal', 'D. Maria I e D. Pedro III': 'Maria I de Portugal',
  'D. Maria I': 'Maria I de Portugal', 'D. João (Príncipe Regente)': 'João VI de Portugal',
  'D. João VI': 'João VI de Portugal', 'D. Pedro IV': 'Pedro IV de Portugal',
  'D. Miguel I': 'Miguel I de Portugal', 'D. Maria II': 'Maria II de Portugal',
  'D. Pedro V': 'Pedro V de Portugal', 'D. Luís I': 'Luís I de Portugal',
  'D. Carlos I': 'Carlos I de Portugal', 'D. Manuel II': 'Manuel II de Portugal',
}
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function main() {
  const mapa = {}
  for (const [serie, titulo] of Object.entries(REIS)) {
    try {
      const r = await fetch(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(titulo)}`,
        { headers: { 'User-Agent': UA, Accept: 'application/json' } })
      if (!r.ok) { console.warn(`⚠️ ${serie}: ${r.status}`); continue }
      const j = await r.json()
      const src = j.originalimage?.source || j.thumbnail?.source
      if (!src) { console.warn(`⚠️ ${serie}: sem imagem`); continue }
      const img = await fetch(src, { headers: { 'User-Agent': UA } })
      const buf = Buffer.from(await img.arrayBuffer())
      const ext = (src.split('.').pop() || 'jpg').split('?')[0].toLowerCase().replace(/[^a-z]/g, '') || 'jpg'
      const path = `reis/${slug(serie)}.${ext}`
      const ct = img.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
      const { error } = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: ct, upsert: true })
      if (error) { console.warn(`⚠️ ${serie} upload: ${error.message}`); continue }
      mapa[serie] = PUBLIC + path
      console.log(`✓ ${serie} → ${path} (${Math.round(buf.length / 1024)} KB)`)
      await sleep(400)
    } catch (e) { console.warn(`⚠️ ${serie}: ${e.message}`) }
  }
  writeFileSync(join(ROOT, 'lib/data/reis-retratos.json'), JSON.stringify(mapa, null, 2))
  console.log(`\n✅ ${Object.keys(mapa).length} retratos · lib/data/reis-retratos.json`)
}
main()
