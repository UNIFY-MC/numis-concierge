/**
 * Exporta para scripts/.euro-coverage.json o conjunto de (pais_codigo|facial|ano)
 * que JÁ temos na coleção (circulação euro, quantidade>0). Serve para o
 * marcador a vermelho do ficheiro dos euros saber o que NÃO foi importado.
 */
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync } from 'fs'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: join(ROOT, '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'numis' }, auth: { persistSession: false },
})

const cov = new Set()
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from('collection')
    .select('quantidade, catalog_coins!inner(pais_codigo, valor_facial, familia), catalog_issues!inner(ano_gregoriano)')
    .gt('quantidade', 0)
    .order('id').range(from, from + 999)
  if (error) throw error
  if (!data?.length) break
  for (const r of data) {
    const c = r.catalog_coins, i = r.catalog_issues
    if (!c || !i || c.valor_facial == null || i.ano_gregoriano == null) continue
    if (!String(c.familia || '').startsWith('euro')) continue
    cov.add(`${c.pais_codigo}|${Number(c.valor_facial)}|${i.ano_gregoriano}`)
  }
  if (data.length < 1000) break
}
writeFileSync(join(ROOT, 'scripts/.euro-coverage.json'), JSON.stringify([...cov]))
console.log(`${cov.size} combinações (pais|facial|ano) na coleção euro → scripts/.euro-coverage.json`)
