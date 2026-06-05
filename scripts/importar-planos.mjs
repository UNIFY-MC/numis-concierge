/**
 * Importa para numis.knowledge_base os Planos Numismáticos anuais da INCM
 * (assets/books/INCM Plano numismatico/*.txt, extraídos com pdftotext). Fonte de
 * verdade das emissões portuguesas de cada ano — serve o agente «Numis» e a
 * verificação de cobertura do catálogo. Idempotente por slug (pn-AAAA).
 *
 *   node scripts/importar-planos.mjs
 */
import { readdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: join(ROOT, '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'numis' }, auth: { persistSession: false },
})

const DIR = join(ROOT, 'assets/books/INCM Plano numismatico')

function anoDe(nome) {
  const m = nome.match(/(20\d{2})/)
  return m ? m[1] : null
}
function limpar(t) {
  return t.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim()
}

async function main() {
  const ficheiros = readdirSync(DIR).filter((f) => f.endsWith('.txt') && /20\d{2}/.test(f))
  // 1 doc por ano (evita o duplicado "2011 (1)"); fica o ficheiro maior
  const porAno = new Map()
  for (const f of ficheiros) {
    const ano = anoDe(f)
    if (!ano) continue
    const corpo = limpar(readFileSync(join(DIR, f), 'utf8'))
    if (corpo.length < 200) continue // 2021 é só imagem → texto vazio
    const prev = porAno.get(ano)
    if (!prev || corpo.length > prev.corpo.length) porAno.set(ano, { f, corpo })
  }

  let n = 0
  for (const ano of [...porAno.keys()].sort()) {
    const { corpo } = porAno.get(ano)
    const row = {
      slug: `pn-${ano}`, categoria: 'plano_numismatico',
      titulo: `Plano Numismático ${ano} (INCM)`, corpo,
      tags: ['INCM', 'plano numismático', ano, 'emissões'],
      nivel: 'referencia', publicado: true, ordem: Number(ano),
    }
    const { data: ex } = await supabase.from('knowledge_base').select('id').eq('slug', row.slug).maybeSingle()
    if (ex) await supabase.from('knowledge_base').update({ ...row, updated_at: new Date().toISOString() }).eq('id', ex.id)
    else await supabase.from('knowledge_base').insert(row)
    console.log(`✓ PN ${ano} (${Math.round(corpo.length / 1000)}k)`) ; n++
  }
  console.log(`\n✅ ${n} planos na knowledge_base (2021 saltado: PDF sem texto)`)
}
main()
