// Preenche numis.pais_enquadramento com o texto oficial do BCE por país.
// Fonte: /euro/coins/html/{cc}.pt.html — descreve o autor e os símbolos das
// faces nacionais. Junta os primeiros parágrafos longos (deduplicados).
// Corre uma vez (com rede): node scripts/bce-enquadramento.mjs

import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: join(ROOT, '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'numis' }, auth: { persistSession: false },
})

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const BASE = 'https://www.ecb.europa.eu'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const txt = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim()

// Os nossos códigos → código BCE (override para si/ee, como no enrich-bce).
const BCE_CC = { si: 'sl', ee: 'et' }
const PAISES = ['de','ad','at','be','bg','cy','hr','sk','si','es','ee','fi','fr','gr','nl','ie','it','lv','lt','lu','mt','pt','sm','va']

async function get(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt' } })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.text()
}

function enquadramento(html) {
  const mi = html.indexOf('<main'); const me = html.indexOf('</main>')
  const main = mi >= 0 ? html.slice(mi, me > mi ? me : undefined) : html
  const titulo = txt((main.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '')
  const vistos = new Set()
  const paras = []
  for (const m of main.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = txt(m[1])
    if (t.length < 60) continue
    const chave = t.slice(0, 80)
    if (vistos.has(chave)) continue // dedup (a página repete mobile/desktop)
    vistos.add(chave)
    paras.push(t)
    if (paras.length >= 4) break
  }
  return { titulo, introducao: paras.join('\n\n') }
}

async function main() {
  const linhas = []
  for (const cc of PAISES) {
    const bc = BCE_CC[cc] || cc
    try {
      const { titulo, introducao } = enquadramento(await get(`${BASE}/euro/coins/html/${bc}.pt.html`))
      if (introducao) { linhas.push({ pais_codigo: cc, titulo, introducao, fonte: 'BCE' }); console.log(`✓ ${cc} (${introducao.length} chars)`) }
      else console.log(`— ${cc}: sem texto`)
    } catch (e) { console.log(`✗ ${cc}: ${e.message}`) }
    await sleep(600)
  }
  if (linhas.length) {
    const { error } = await supabase.from('pais_enquadramento')
      .upsert(linhas.map((l) => ({ ...l, updated_at: new Date().toISOString() })), { onConflict: 'pais_codigo' })
    if (error) { console.error('upsert:', error.message); process.exit(1) }
  }
  console.log(`\n✓ ${linhas.length} países com enquadramento gravado.`)
}

main()
