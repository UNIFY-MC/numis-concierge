/**
 * Extrai o catálogo Gomes a partir das IMAGENS das páginas do livro, com visão
 * (Claude), e cruza com o nosso catálogo pelo CÓDIGO GOMES completo (= gomes_ref).
 *
 * Porquê visão e não a OCR existente: a OCR em texto é ruidosa (medidas em prosa,
 * "Ø"→"ó", códigos sem prefixo de reinado). A visão lê a página estruturada e
 * devolve, por moeda, o código completo ("A1 08"), medidas e variedades — que
 * casam directamente com o nosso gomes_ref. Só se preenchem campos VAZIOS e só
 * se criam variedades reais; o ambíguo vai para revisão. Nunca sobrepõe dados.
 *
 * Requer em .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 *
 * Preparação (uma vez): converter o PDF do livro em imagens de página, ex.:
 *   pdftoppm -png -r 200 assets/books/gomes.pdf assets/books/gomes-paginas/pag
 *   (fica pag-067.png, pag-068.png, …; o número tem de ser a PÁGINA DO LIVRO)
 *
 * Uso (por fases, resumível — a cache evita repetir páginas):
 *   node scripts/gomes-extrair.mjs --probe --pages 67-68   # extrai 2 págs, imprime JSON, NÃO escreve
 *   node scripts/gomes-extrair.mjs --extract --pages 67-200 # extrai e faz cache das páginas
 *   node scripts/gomes-extrair.mjs --match                  # cruza cache↔BD → _plan.json + _revisao.json
 *   node scripts/gomes-extrair.mjs --apply                  # aplica o plano (só campos vazios + variedades)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
config({ path: join(ROOT, '.env.local') })

const PAGES_DIR = process.env.GOMES_PAGES_DIR || join(ROOT, 'assets', 'books', 'gomes-paginas')
const CACHE = join(__dirname, '.gomes-cache')
const MODEL = process.env.GOMES_MODEL || 'claude-opus-4-8'
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

const args = process.argv.slice(2)
const has = (f) => args.includes(f)
const PROBE = has('--probe')
const EXTRACT = has('--extract') || PROBE
const MATCH = has('--match')
const APPLY = has('--apply')
const pagesArg = (() => {
  const i = args.indexOf('--pages')
  if (i < 0) return null
  const [a, b] = args[i + 1].split('-').map(Number)
  return { from: a, to: b ?? a }
})()

if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true })

const supa = () => {
  if (!SUPA_URL || !SUPA_KEY) { console.error('❌ Falta SUPABASE em .env.local'); process.exit(1) }
  return createClient(SUPA_URL, SUPA_KEY, { db: { schema: 'numis' } })
}

// Normaliza o código Gomes para casar ("A1 08", "A1  08", "a1 08" → "a1 08").
const normCode = (s) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ')

// ─── Fase 1: extração por visão ──────────────────────────────────────────────
const EXTRACT_PROMPT = `És um numismata a catalogar o livro de Alberto Gomes "Moedas Portuguesas".
Lê ESTA página do livro e devolve SÓ JSON (sem texto à volta): um array "moedas".
Cada moeda tem o código Gomes com o PREFIXO DO REINADO (ex.: "A1 08", "Fe 12.01", "J3 45").
Para cada moeda inclui, quando visível na página (senão null):
{
  "gomes_code": "A1 08",            // prefixo de reinado + número(.variante)
  "reinado": "D. Afonso I",
  "denominacao": "Dinheiro",
  "metal": "Bolhão|Prata|Ouro|Cobre|Bronze|…",
  "diametro_mm": 25,               // se for intervalo (23-25), usa o valor médio
  "peso_g": 1.79,
  "composicao": "Ag 916,6",        // como aparece
  "anos": ["1920","1921"],         // anos emitidos listados
  "variantes": [ {"ano":"1920","label":"P aberto"} ]  // variedades (P aberto, Eixo vertical, Módulo maior/menor, Prova…)
}
Regras: não inventes; se um campo não estiver na página, mete null. Devolve {"moedas": [...] }.`

async function extractPage(anthropic, pageFile) {
  const b64 = readFileSync(join(PAGES_DIR, pageFile)).toString('base64')
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64 } },
        { type: 'text', text: EXTRACT_PROMPT },
      ],
    }],
  })
  const txt = msg.content.map((c) => (c.type === 'text' ? c.text : '')).join('')
  const m = txt.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('sem JSON na resposta')
  return JSON.parse(m[0]).moedas || []
}

function pageNumOf(file) { const m = file.match(/(\d+)/); return m ? Number(m[1]) : null }

async function runExtract() {
  if (!ANTHROPIC_KEY) { console.error('❌ Falta ANTHROPIC_API_KEY'); process.exit(1) }
  if (!existsSync(PAGES_DIR)) { console.error(`❌ Sem imagens em ${PAGES_DIR} (converte o PDF primeiro)`); process.exit(1) }
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })
  const files = readdirSync(PAGES_DIR).filter((f) => /\.png$/i.test(f)).sort()
  let feitas = 0
  for (const f of files) {
    const pg = pageNumOf(f)
    if (pagesArg && (pg < pagesArg.from || pg > pagesArg.to)) continue
    const out = join(CACHE, `pag-${String(pg).padStart(3, '0')}.json`)
    if (existsSync(out) && !PROBE) continue
    try {
      const moedas = await extractPage(anthropic, f)
      if (PROBE) { console.log(`— pág ${pg}:`, JSON.stringify(moedas, null, 2)); continue }
      writeFileSync(out, JSON.stringify({ page: pg, moedas }, null, 2))
      feitas++
      console.log(`✓ pág ${pg}: ${moedas.length} moedas`)
    } catch (e) {
      console.warn(`⚠ pág ${pg}: ${e.message}`)
    }
  }
  if (!PROBE) console.log(`Extração feita: ${feitas} páginas novas em ${CACHE}`)
}

// ─── Fase 2: cruzamento com a BD ─────────────────────────────────────────────
async function runMatch() {
  const sb = supa()
  const cacheFiles = readdirSync(CACHE).filter((f) => /^pag-\d+\.json$/.test(f))
  const entradas = []
  for (const f of cacheFiles) {
    const { moedas } = JSON.parse(readFileSync(join(CACHE, f)))
    for (const m of moedas || []) if (m.gomes_code) entradas.push(m)
  }
  // Carrega as nossas moedas PT com gomes_ref e os campos-alvo
  const { data: coins, error } = await sb
    .from('catalog_coins')
    .select('id, gomes_ref, diametro_mm, peso_g, composicao, metal, pureza')
    .eq('pais_codigo', 'pt').not('gomes_ref', 'is', null)
  if (error) throw error
  const byCode = new Map()
  for (const c of coins) byCode.set(normCode(c.gomes_ref), c)

  const plano = []       // {id, patch:{...}}  campos a preencher (só vazios)
  const variedades = []  // {gomes_ref, ano, label}
  const revisao = []     // sem match ou ambíguo
  for (const e of entradas) {
    const c = byCode.get(normCode(e.gomes_code))
    if (!c) { revisao.push({ motivo: 'sem_match', ...e }); continue }
    const patch = {}
    if (c.diametro_mm == null && e.diametro_mm != null) patch.diametro_mm = e.diametro_mm
    if (c.peso_g == null && e.peso_g != null) patch.peso_g = e.peso_g
    if (c.composicao == null && e.composicao) patch.composicao = e.composicao
    if (c.metal == null && e.metal) patch.metal = e.metal
    if (Object.keys(patch).length) plano.push({ id: c.id, gomes_ref: c.gomes_ref, patch })
    for (const v of e.variantes || []) if (v.label && v.ano) variedades.push({ coinId: c.id, ano: String(v.ano), label: v.label })
  }
  writeFileSync(join(CACHE, '_plan.json'), JSON.stringify({ plano, variedades }, null, 2))
  writeFileSync(join(CACHE, '_revisao.json'), JSON.stringify(revisao, null, 2))
  console.log(`Cruzamento: ${plano.length} moedas a preencher · ${variedades.length} variedades · ${revisao.length} p/ revisão`)
  console.log(`→ ${join(CACHE, '_plan.json')} e _revisao.json`)
}

// ─── Fase 3: aplicar (só campos vazios + variedades em falta) ────────────────
async function runApply() {
  const sb = supa()
  const { plano, variedades } = JSON.parse(readFileSync(join(CACHE, '_plan.json')))
  let campos = 0
  for (const p of plano) {
    const { error } = await sb.from('catalog_coins').update(p.patch).eq('id', p.id)
    if (error) console.warn(`⚠ ${p.gomes_ref}: ${error.message}`); else campos++
  }
  // variedades: cria uma emissão com etiqueta se ainda não existir para (coin, ano, label)
  let vars = 0
  for (const v of variedades) {
    const { data: existe } = await sb.from('catalog_issues').select('id')
      .eq('catalog_coin_id', v.coinId).eq('ano', v.ano).eq('etiqueta', v.label).limit(1).maybeSingle()
    if (existe) continue
    const { error } = await sb.from('catalog_issues').insert({
      catalog_coin_id: v.coinId, ano: v.ano, ano_gregoriano: parseInt(v.ano, 10) || null, etiqueta: v.label,
    })
    if (error) console.warn(`⚠ variedade ${v.ano}/${v.label}: ${error.message}`); else vars++
  }
  console.log(`Aplicado: ${campos} moedas preenchidas · ${vars} variedades criadas`)
}

// ─── Orquestração ────────────────────────────────────────────────────────────
;(async () => {
  if (EXTRACT) await runExtract()
  if (MATCH) await runMatch()
  if (APPLY) await runApply()
  if (!EXTRACT && !MATCH && !APPLY) {
    console.log('Fases: --extract [--pages a-b] | --match | --apply  (--probe para testar sem escrever)')
  }
})().catch((e) => { console.error(e); process.exit(1) })
