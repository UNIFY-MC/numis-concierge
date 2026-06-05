/**
 * Importa para a coleção a POSSE de euros de circulação que o pai tem (ficheiro
 * Excel) e que faltava registar — lista em scripts/.euro-faltam.json
 * (pais|facial|ano|qua|formato). Casa com a issue de circulação JÁ existente no
 * catálogo (não cria moedas). O que não tiver issue no catálogo fica de fora.
 *
 *   python scripts/_marcar_euros_vermelho.py     # gera .euro-faltam.json
 *   node scripts/importar-posse-euros.mjs         # --probe (não escreve)
 *   node scripts/importar-posse-euros.mjs --apply
 */
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: join(ROOT, '.env.local') })
const APPLY = process.argv.includes('--apply')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'numis' }, auth: { persistSession: false },
})

// índice das issues de circulação euro: pais|facial|ano → {coinId, issueId}
async function indiceCirculacao() {
  const idx = new Map()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('catalog_issues')
      .select('id, catalog_coin_id, ano_gregoriano, catalog_coins!inner(pais_codigo, valor_facial, familia)')
      .eq('catalog_coins.familia', 'euro_circulacao')
      .order('id').range(from, from + 999)
    if (error) throw error
    if (!data?.length) break
    for (const i of data) {
      const c = i.catalog_coins
      if (c.valor_facial == null || i.ano_gregoriano == null) continue
      const k = `${c.pais_codigo}|${Number(c.valor_facial)}|${i.ano_gregoriano}`
      if (!idx.has(k)) idx.set(k, { coinId: i.catalog_coin_id, issueId: i.id })
    }
    if (data.length < 1000) break
  }
  return idx
}

async function main() {
  const faltam = JSON.parse(readFileSync(join(ROOT, 'scripts/.euro-faltam.json'), 'utf8'))
  const idx = await indiceCirculacao()
  console.log(`${faltam.length} a importar · ${idx.size} issues de circulação no catálogo`)

  let achadas = 0
  const semIssue = []
  for (const f of faltam) {
    const k = `${f.pais}|${f.facial}|${f.ano}`
    if (idx.has(k)) achadas++
    else semIssue.push(k)
  }
  console.log(`  ✓ com issue no catálogo: ${achadas}  ·  ✗ sem issue (catálogo não tem esse ano): ${semIssue.length}`)
  if (semIssue.length) console.log('   amostra sem issue:', [...new Set(semIssue)].slice(0, 12).join('  '))
  if (!APPLY) { console.log('\n(--probe) sem escrever. --apply para registar a posse.'); return }

  let ins = 0, upd = 0
  for (const f of faltam) {
    const hit = idx.get(`${f.pais}|${f.facial}|${f.ano}`)
    if (!hit) continue
    const fmt = f.formato || 'bnc'
    const { data: ex } = await supabase.from('collection').select('id, quantidade')
      .eq('catalog_issue_id', hit.issueId).eq('formato_posse', fmt).limit(1).maybeSingle()
    const fields = { catalog_coin_id: hit.coinId, catalog_issue_id: hit.issueId, quantidade: Math.max(1, Math.round(f.qua)), formato_posse: fmt }
    if (ex) { await supabase.from('collection').update(fields).eq('id', ex.id); upd++ }
    else { await supabase.from('collection').insert(fields); ins++ }
    if ((ins + upd) % 100 === 0) console.log(`  …${ins + upd}`)
  }
  console.log(`\n✅ posse registada: ${ins} novos · ${upd} atualizados.`)
}
main()
