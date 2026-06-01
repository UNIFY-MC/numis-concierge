/**
 * Enriquece as faces nacionais das moedas de CIRCULAÇÃO (catalog_coins) com as
 * imagens OFICIAIS do BCE. Anverso = face nacional do país; reverso = face comum
 * (mapa europeu, versão nova 2007+). Corre UMA vez — a app vive só do Supabase.
 *
 * Só toca em coins de circulação (comemorativa = false). Não inventa URLs: lê a
 * página oficial por país (/euro/coins/html/{cc}.en.html) e usa os src reais —
 * a caixa e a posição do token de denominação variam por país, por isso parse-se
 * o ficheiro em vez de o construir. Variantes de desenho: escolhe o ano mais alto
 * (efígie/desenho actual); se nenhuma tiver ano, usa a única (desenho corrente).
 *
 * Requer em .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Uso:
 *   node scripts/enrich-bce.mjs --probe   # mostra o que escreveria, NÃO escreve
 *   node scripts/enrich-bce.mjs           # escreve anverso_img/reverso_img
 */
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
config({ path: join(ROOT, '.env.local') })

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPA_URL || !SUPA_KEY) {
  console.error('❌ Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em .env.local')
  process.exit(1)
}

const PROBE = process.argv.includes('--probe')
const BASE = 'https://www.ecb.europa.eu'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const supabase = createClient(SUPA_URL, SUPA_KEY, {
  db: { schema: 'numis' },
  auth: { persistSession: false },
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// valor_facial → token de denominação usado nos ficheiros do BCE.
const DENOM = new Map([
  [0.01, '1cent'], [0.02, '2cent'], [0.05, '5cent'], [0.1, '10cent'],
  [0.2, '20cent'], [0.5, '50cent'], [1, '1euro'], [2, '2euro'],
])
const TOKENS = [...DENOM.values()]

// O BCE usa códigos não-ISO para alguns países (na página e na subpasta de imagens).
const BCE_CC = { si: 'sl', ee: 'et' }
const bceCc = (cc) => BCE_CC[cc] || cc

function absoluto(src) {
  if (!src) return null
  if (src.startsWith('http')) return src
  if (src.startsWith('//')) return 'https:' + src
  if (src.startsWith('/')) return BASE + src
  return BASE + '/' + src
}

function imagensDe(html, filtro) {
  const re = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi
  const out = []
  let m
  while ((m = re.exec(html)) !== null) {
    const src = absoluto(m[1])
    if (src && filtro.test(src)) out.push(src)
  }
  return out
}

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' }, redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

// Qual o token de denominação presente no nome do ficheiro (case-insensitive).
// Testa 1euro/2euro antes de 1cent/2cent e 10/20/50 antes de 1/2/5 para não
// confundir "10cent" com "1...". Como os tokens são distintos, basta procurar.
function tokenDoFicheiro(src) {
  const f = src.toLowerCase()
  // ordenar por comprimento desc evita que "1euro" case dentro de nada ambíguo
  for (const t of [...TOKENS].sort((a, b) => b.length - a.length)) {
    if (f.includes(t)) return t
  }
  return null
}

// Ano (4 dígitos) no nome, se houver — para escolher a variante de desenho mais recente.
function anoDoFicheiro(src) {
  const m = src.match(/(19|20)\d{2}/)
  return m ? parseInt(m[0], 10) : null
}

// Escolhe o melhor src para uma denominação: variante de ano mais alto; se
// nenhuma tiver ano, a primeira (desenho corrente único).
function melhorVariante(srcs) {
  if (srcs.length === 0) return null
  const comAno = srcs.filter((s) => anoDoFicheiro(s) != null)
  if (comAno.length) return comAno.sort((a, b) => anoDoFicheiro(b) - anoDoFicheiro(a))[0]
  return srcs[0]
}

// ─── Face comum (reverso), por denominação. Prefere o mapa novo (2007+). ─────
async function mapaComum() {
  const html = await get(`${BASE}/euro/coins/common/html/index.en.html`)
  const imgs = imagensDe(html, /\/euro\/coins\/common\/shared\/img\/[^/]+$/) // sem subpasta de país
  // O 10cent comum foge ao padrão: chama-se "10common.jpg"/"new10common.png".
  const ALT = { '10cent': /(^|\/)(new)?10common\.(jpg|png|gif)/i }
  const porDenom = new Map()
  for (const t of TOKENS) {
    const cands = imgs.filter((s) => tokenDoFicheiro(s) === t || (ALT[t] && ALT[t].test(s)))
    // preferir "new" (mapa actual); senão o disponível
    const novo = cands.find((s) => /new/i.test(s))
    const escolhido = novo || cands[0] || null
    if (escolhido) porDenom.set(t, escolhido)
  }
  return porDenom
}

// ─── Faces nacionais de um país. Devolve Map<token, src>. ────────────────────
async function facesNacionais(cc) {
  const bc = bceCc(cc)
  const html = await get(`${BASE}/euro/coins/html/${bc}.en.html`)
  const imgs = imagensDe(html, new RegExp(`/euro/coins/common/shared/img/${bc}/`, 'i'))
  const porDenom = new Map()
  for (const t of TOKENS) {
    const cands = imgs.filter((s) => tokenDoFicheiro(s) === t)
    const escolhido = melhorVariante(cands)
    if (escolhido) porDenom.set(t, escolhido)
  }
  return porDenom
}

async function main() {
  const { data: coins, error } = await supabase
    .from('catalog_coins')
    .select('id, pais_codigo, pais_nome, valor_facial, denominacao')
    .eq('comemorativa', false)
  if (error) { console.error('❌', error.message); process.exit(1) }
  console.log(`🪙 ${coins.length} moedas de circulação. ${PROBE ? '(PROBE — não escreve)' : ''}`)

  const comum = await mapaComum()
  console.log(`Face comum (reverso): ${comum.size}/8 denominações mapeadas.`)
  await sleep(500)

  // Agrupar por país e buscar a página uma vez por país.
  const porPais = new Map()
  for (const c of coins) {
    if (!porPais.has(c.pais_codigo)) porPais.set(c.pais_codigo, [])
    porPais.get(c.pais_codigo).push(c)
  }

  let escritos = 0, semFace = 0, paisesFalhados = []
  for (const [cc, lista] of porPais) {
    let faces
    try { faces = await facesNacionais(cc) }
    catch (e) { paisesFalhados.push(`${cc} (${e.message})`); continue }
    await sleep(700) // educado com o servidor

    for (const c of lista) {
      const t = DENOM.get(Number(c.valor_facial))
      const anverso = t ? faces.get(t) : null
      const reverso = t ? comum.get(t) : null
      if (!anverso) { semFace++; continue }
      if (PROBE) {
        console.log(`  ${c.pais_nome} ${t}: ${anverso.split('/img/')[1]}  | rev ${reverso ? reverso.split('/img/')[1] : '—'}`)
        escritos++
        continue
      }
      const { error: upErr } = await supabase.from('catalog_coins')
        .update({ anverso_img: anverso, reverso_img: reverso })
        .eq('id', c.id)
      if (upErr) { console.error(`❌ ${c.pais_nome} ${t}:`, upErr.message); continue }
      escritos++
    }
    console.log(`  ✓ ${cc}: ${lista.length} denominações`)
  }

  console.log(`\n${PROBE ? '(PROBE) ' : ''}✓ ${escritos} faces ${PROBE ? 'a escrever' : 'escritas'} · ${semFace} sem face nacional encontrada`)
  if (paisesFalhados.length) console.log(`⚠️  Países sem página BCE: ${paisesFalhados.join(', ')}`)
}

main()
