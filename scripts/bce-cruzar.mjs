// Cruza bce-comemorativas.json (fonte oficial) com o catálogo na BD.
// NÃO escreve — só relatório: por país+ano, quantas o BCE tem vs quantas temos,
// onde dá para preencher o tema (1↔1) e onde faltam emissões (BCE > nós).
// Correr: node scripts/bce-cruzar.mjs

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

const bce = JSON.parse(readFileSync(join(ROOT, 'bce-comemorativas.json'), 'utf8'))
const chave = (cc, ano) => `${cc}|${ano}`

// BCE: agrupar por país+ano (ignora emissão comum, que aparece por país no nosso catálogo).
const bceMap = new Map()
for (const m of bce.moedas) {
  if (m.pais_codigo === 'comum' || !m.tema) continue
  const k = chave(m.pais_codigo, String(m.ano))
  if (!bceMap.has(k)) bceMap.set(k, [])
  bceMap.get(k).push(m)
}

// BD: comemorativas 2€ com o seu ano (via catalog_issues).
const { data: coins, error } = await supabase
  .from('catalog_coins')
  .select('id, pais_codigo, valor_facial, comemorativa, numista_id, tema, catalog_issues(ano_gregoriano, ano)')
  .eq('comemorativa', true)
if (error) { console.error(error.message); process.exit(1) }

const bdMap = new Map()
for (const c of coins) {
  if (Number(c.valor_facial) !== 2) continue
  const anos = (c.catalog_issues || []).map((i) => i.ano_gregoriano || parseInt(i.ano, 10)).filter(Boolean)
  for (const ano of anos.length ? anos : [null]) {
    if (!ano) continue
    const k = chave(c.pais_codigo, String(ano))
    if (!bdMap.has(k)) bdMap.set(k, [])
    bdMap.get(k).push(c)
  }
}

let preencher = 0, faltam = 0, ambiguos = 0, jaOk = 0
const detalheFaltam = [], detalheAmbiguos = []
const chaves = new Set([...bceMap.keys(), ...bdMap.keys()])
for (const k of chaves) {
  const [cc, ano] = k.split('|')
  const b = bceMap.get(k) || []
  const d = bdMap.get(k) || []
  if (b.length === 0) continue // só temos, BCE não lista (ex. variante) — ignorar
  if (d.length === 0) {
    faltam += b.length
    for (const m of b) detalheFaltam.push(`${cc} ${ano}: ${m.tema}`)
  } else if (b.length === 1 && d.length === 1) {
    if (d[0].tema) jaOk++; else preencher++
  } else {
    ambiguos += Math.max(b.length, d.length)
    detalheAmbiguos.push(`${cc} ${ano}: BCE ${b.length} (${b.map((x) => x.tema).join(' / ')}) vs nós ${d.length}`)
  }
}

console.log(`Cruzamento BCE ↔ catálogo (2€ comemorativas):`)
console.log(`  BCE: ${bce.moedas.filter((m) => m.pais_codigo !== 'comum').length} emissões (${bceMap.size} país+ano)`)
console.log(`  ✅ 1↔1 já com tema: ${jaOk}`)
console.log(`  ✍️  1↔1 para preencher tema: ${preencher}`)
console.log(`  ➕ faltam no nosso catálogo (BCE tem, nós não): ${faltam}`)
console.log(`  ⚠️  ambíguos (vários no mesmo país+ano): ${ambiguos}`)
writeFileSync(join(ROOT, 'bce-cruzamento.json'), JSON.stringify({ preencher, faltam, ambiguos, jaOk, detalheFaltam, detalheAmbiguos }, null, 2))
console.log(`\nAmostra FALTAM (${detalheFaltam.length}):`)
for (const l of detalheFaltam.slice(0, 20)) console.log('   ', l)
console.log(`\nAmostra AMBÍGUOS (${detalheAmbiguos.length}):`)
for (const l of detalheAmbiguos.slice(0, 12)) console.log('   ', l)
