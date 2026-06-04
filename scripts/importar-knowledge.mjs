/**
 * Importa para numis.knowledge_base os textos das publicações da INCM (Casa da
 * Moeda) que estão em assets/books (extraídos para .txt com pdftotext). Servem
 * de base de conhecimento para o agente «Numis» responder a perguntas e para
 * contextualizar/temas da app. Idempotente por slug.
 *
 *   node scripts/importar-knowledge.mjs
 */
import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: join(ROOT, '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'numis' }, auth: { persistSession: false },
})

// ficheiro .txt → metadados do documento
const DOCS = [
  { ficheiro: 'INCM 11 - moedas D Luis.txt', slug: 'incm-d-luis', categoria: 'reinado',
    titulo: 'Moedas de D. Luís I', tags: ['INCM', 'D. Luís I', 'monarquia', 'ouro', 'reforma monetária'] },
  { ficheiro: 'INCM 17 - moedas comemorativas portuguesas.txt', slug: 'incm-comemorativas', categoria: 'tematica',
    titulo: 'Moedas Comemorativas Portuguesas', tags: ['INCM', 'comemorativas', 'república', 'escudo'] },
  { ficheiro: 'INCM 23 - descobrimentos.txt', slug: 'incm-descobrimentos', categoria: 'tematica',
    titulo: 'Descobrimentos Portugueses (coleção numismática)', tags: ['INCM', 'descobrimentos', 'coleção', 'navegações'] },
  { ficheiro: 'INCM 24 - lisboa a goa.txt', slug: 'incm-lisboa-goa', categoria: 'tematica',
    titulo: 'De Lisboa a Goa — Moedas do Império Português na Ásia (séc. XVI-XVIII)', tags: ['INCM', 'Índia Portuguesa', 'Macau', 'Goa', 'Ásia', 'descobrimentos'] },
  { ficheiro: 'INCM 25 - paines exposicao2.txt', slug: 'incm-paineis-exposicao', categoria: 'exposicao',
    titulo: 'Painéis de exposição — Museu Casa da Moeda', tags: ['INCM', 'museu', 'exposição'] },
]

// limpeza ligeira do texto bruto do pdftotext (linhas vazias repetidas, números de página soltos)
function limpar(t) {
  return t.replace(/\r/g, '')
    .split('\n')
    .filter((l, i, a) => !(/^\s*\d{1,3}\s*$/.test(l) && (a[i - 1] === '' || a[i - 1] === undefined))) // nº de página solto
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function main() {
  const dir = join(ROOT, 'assets/books')
  let n = 0
  for (const d of DOCS) {
    const fp = join(dir, d.ficheiro)
    if (!existsSync(fp)) { console.warn(`⚠️ falta ${d.ficheiro}`); continue }
    const corpo = limpar(readFileSync(fp, 'utf8'))
    const row = { slug: d.slug, categoria: d.categoria, titulo: d.titulo, corpo, tags: d.tags, nivel: 'referencia', publicado: true, ordem: n }
    // upsert por slug
    const { data: ex } = await supabase.from('knowledge_base').select('id').eq('slug', d.slug).maybeSingle()
    if (ex) await supabase.from('knowledge_base').update({ ...row, updated_at: new Date().toISOString() }).eq('id', ex.id)
    else await supabase.from('knowledge_base').insert(row)
    console.log(`✓ ${d.titulo} (${Math.round(corpo.length / 1000)}k chars)`) ; n++
  }
  console.log(`\n✅ ${n} documentos na knowledge_base`)
}
main()
