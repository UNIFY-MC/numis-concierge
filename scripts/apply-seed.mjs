/**
 * Aplica scripts/seed-rows.json no Supabase via supabase-js (service role)
 * Requer SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL em .env.local
 * Uso: node scripts/apply-seed.mjs
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
config({ path: join(ROOT, '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('❌ Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em .env.local')
  process.exit(1)
}

const supabase = createClient(url, key, {
  db: { schema: 'numis' },
  auth: { persistSession: false },
})

const { coins, issues, collection } = JSON.parse(
  readFileSync(join(__dirname, 'seed-rows.json'), 'utf8')
)

async function insertBatched(table, rows, size = 500) {
  let done = 0
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size)
    const { error } = await supabase.from(table).insert(batch)
    if (error) {
      console.error(`❌ ${table} lote ${i}-${i + batch.length}:`, error.message)
      process.exit(1)
    }
    done += batch.length
    process.stdout.write(`\r   ${table}: ${done}/${rows.length}`)
  }
  process.stdout.write('\n')
}

async function main() {
  console.log('A limpar tabelas...')
  for (const t of ['collection', 'catalog_issues', 'catalog_coins']) {
    const { error } = await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) { console.error(`❌ delete ${t}:`, error.message); process.exit(1) }
  }

  console.log('A inserir...')
  await insertBatched('catalog_coins', coins)
  await insertBatched('catalog_issues', issues)
  await insertBatched('collection', collection)

  // Verificação
  const counts = {}
  for (const t of ['catalog_coins', 'catalog_issues', 'collection']) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true })
    counts[t] = count
  }
  console.log('\n✅ Seed concluído:')
  console.table(counts)
}

main()
