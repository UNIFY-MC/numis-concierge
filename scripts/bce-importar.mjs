// Importa comemorativas €2 a partir de bce-comemorativas.json (fonte oficial BCE).
//   1) Preenche o tema das que temos 1↔1 sem nome (numista_id null, tema null).
//   2) Insere as que faltam (país+ano sem nenhuma comemorativa 2€ nossa).
// Não toca em ambíguos (vários no mesmo país+ano) — ficam para revisão manual.
// Idempotente: re-correr não duplica (insere só onde país+ano não tem nenhuma).
//
//   node scripts/bce-importar.mjs --probe   # mostra o que faria, NÃO escreve
//   node scripts/bce-importar.mjs           # aplica

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: join(ROOT, '.env.local') })
const PROBE = process.argv.includes('--probe')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'numis' }, auth: { persistSession: false },
})

// pais_codigo → pais_nome como aparece no nosso catálogo.
const NOME = {
  de: 'Alemanha', ad: 'Andorra', at: 'Austria', be: 'Belgica', bg: 'Bulgaria', cy: 'Chipre',
  hr: 'Croacia', sk: 'Eslovaquia', si: 'Eslovenia', es: 'Espanha', ee: 'Estónia', fi: 'Finlandia',
  fr: 'França', gr: 'Grécia', nl: 'Holanda', ie: 'Irlanda', it: 'Italia', lv: 'Letónia',
  lt: 'Lituania', lu: 'Luxemburgo', mt: 'Malta', mc: 'Mónaco', pt: 'Portugal',
  sm: 'San Marino', va: 'Vaticano',
}

const bce = JSON.parse(readFileSync(join(ROOT, 'bce-comemorativas.json'), 'utf8'))
const chave = (cc, ano) => `${cc}|${ano}`
const bceMap = new Map()
for (const m of bce.moedas) {
  if (m.pais_codigo === 'comum' || !m.tema || !NOME[m.pais_codigo]) continue
  const k = chave(m.pais_codigo, String(m.ano))
  if (!bceMap.has(k)) bceMap.set(k, [])
  bceMap.get(k).push(m)
}

const { data: coins, error } = await supabase
  .from('catalog_coins')
  .select('id, pais_codigo, valor_facial, comemorativa, numista_id, tema, catalog_issues(id, ano_gregoriano, ano)')
  .eq('comemorativa', true)
if (error) { console.error(error.message); process.exit(1) }

const bdMap = new Map()
for (const c of coins) {
  if (Number(c.valor_facial) !== 2) continue
  for (const i of (c.catalog_issues || [])) {
    const ano = i.ano_gregoriano || parseInt(i.ano, 10)
    if (!ano) continue
    const k = chave(c.pais_codigo, String(ano))
    if (!bdMap.has(k)) bdMap.set(k, [])
    bdMap.get(k).push(c)
  }
}

const aPreencher = [], aInserir = [], ambiguos = []
for (const [k, b] of bceMap) {
  const [cc, ano] = k.split('|')
  const d = bdMap.get(k) || []
  if (d.length === 0) {
    for (const m of b) aInserir.push({ cc, ano, tema: m.tema, descricao: m.descricao })
  } else if (b.length === 1 && d.length === 1 && !d[0].tema) {
    aPreencher.push({ coinId: d[0].id, cc, ano, tema: b[0].tema, descricao: b[0].descricao })
  } else if (b.length !== d.length) {
    ambiguos.push(`${cc} ${ano}: BCE ${b.length} vs nós ${d.length}`)
  }
}

console.log(`Preencher tema: ${aPreencher.length} · Inserir novas: ${aInserir.length} · Ambíguos (saltados): ${ambiguos.length}`)
console.log('\nAMOSTRA preencher:')
for (const x of aPreencher.slice(0, 8)) console.log(`  ${x.cc} ${x.ano} ← "${x.tema}"`)
console.log('\nAMOSTRA inserir:')
for (const x of aInserir.slice(0, 12)) console.log(`  + ${NOME[x.cc]} ${x.ano}: "${x.tema}"`)

if (PROBE) { console.log('\n(PROBE — nada escrito)'); process.exit(0) }

let preenchidas = 0, inseridas = 0
for (const x of aPreencher) {
  const patch = { tema: x.tema }
  const { error: e } = await supabase.from('catalog_coins').update(patch).eq('id', x.coinId)
  if (e) { console.error('preencher', x.cc, x.ano, e.message); continue }
  preenchidas++
}
for (const x of aInserir) {
  const { data: novo, error: e1 } = await supabase.from('catalog_coins').insert({
    titulo: x.tema, pais_codigo: x.cc, pais_nome: NOME[x.cc], valor_facial: 2,
    denominacao: '2 Euros', tipo_emissao: 'Comemorativa', comemorativa: true,
    tema: x.tema, anverso_desc: x.descricao || null,
  }).select('id').single()
  if (e1) { console.error('inserir coin', x.cc, x.ano, e1.message); continue }
  const { error: e2 } = await supabase.from('catalog_issues').insert({
    catalog_coin_id: novo.id, ano: String(x.ano), ano_gregoriano: parseInt(x.ano, 10),
    html_est0: 0, html_qf: 0, html_verde: false,
  })
  if (e2) { console.error('inserir issue', x.cc, x.ano, e2.message); continue }
  inseridas++
}
console.log(`\n✓ ${preenchidas} temas preenchidos · ${inseridas} comemorativas inseridas.`)
