// Reescreve em PORTUGUÊS as descrições que tinham vindo da Numista em inglês.
// Para cada coin com numista_id, busca /types/{id}?lang=pt e actualiza SÓ:
//   anverso_desc, reverso_desc, orla_desc, orla_tipo, composicao.
// NÃO toca em imagens (são do BCE), peso, diâmetro, km, tema, etc.
//
//   node scripts/numista-descricoes-pt.mjs --probe   # 3 coins, não escreve
//   node scripts/numista-descricoes-pt.mjs --limit 50
//   node scripts/numista-descricoes-pt.mjs

import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: join(ROOT, '.env.local') })
const KEY = process.env.NUMISTA_API_KEY
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'numis' }, auth: { persistSession: false },
})
const API = 'https://api.numista.com/v3'
const PROBE = process.argv.includes('--probe')
const li = process.argv.indexOf('--limit')
const LIMIT = li >= 0 ? parseInt(process.argv[li + 1], 10) : Infinity
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// description + lettering juntos (lettering é o texto gravado, não traduzível).
function descLetra(side) {
  const parts = [side?.description, side?.lettering].filter(Boolean)
  return parts.length ? parts.join(' — ') : null
}

async function main() {
  const { data: coins, error } = await supabase
    .from('catalog_coins')
    .select('id, pais_nome, denominacao, numista_id')
    .not('numista_id', 'is', null)
    .order('pais_nome')
  if (error) { console.error(error.message); process.exit(1) }
  console.log(`🪙 ${coins.length} coins com numista_id. ${PROBE ? '(PROBE)' : ''}`)

  let req = 0, feitos = 0, erros = 0
  for (const c of coins) {
    if (feitos >= LIMIT) break
    let d
    try {
      const r = await fetch(`${API}/types/${c.numista_id}?lang=pt`, { headers: { 'Numista-API-Key': KEY } })
      req++
      if (!r.ok) { erros++; continue }
      d = await r.json()
    } catch { erros++; await sleep(1000); continue }

    const comp = d.composition?.text || d.composition?.english_name || (typeof d.composition === 'string' ? d.composition : null)
    const patch = {
      anverso_desc: descLetra(d.obverse),
      reverso_desc: descLetra(d.reverse),
      orla_desc: descLetra(d.edge),
      orla_tipo: d.edge?.type || null,
      composicao: comp,
    }
    if (PROBE) {
      console.log(`\n${c.pais_nome} ${c.denominacao}:`)
      console.log(`  anverso: ${patch.anverso_desc?.slice(0, 80)}`)
      console.log(`  orla: ${patch.orla_desc?.slice(0, 50)} · comp: ${patch.composicao}`)
      feitos++
      if (feitos >= 3) break
      await sleep(900); continue
    }
    const { error: e } = await supabase.from('catalog_coins').update(patch).eq('id', c.id)
    if (e) { console.error(c.id, e.message); erros++; continue }
    feitos++
    if (feitos % 25 === 0) console.log(`  …${feitos} (${req} pedidos)`)
    await sleep(900) // ~1 req/s, educado
  }
  console.log(`\n✓ ${feitos} coins com descrições PT · ${erros} erros · ${req} pedidos.`)
}

main()
