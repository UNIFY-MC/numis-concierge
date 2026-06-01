/**
 * Extrai RAW + META do HTML da caderneta e gera lib/data/catalog.ts
 * Uso: node scripts/parse-html-catalog.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const HTML_PATH = 'C:\\Users\\mario\\Downloads\\caderneta-euros (3).html'

const html = readFileSync(HTML_PATH, 'utf8')

// ─── Extracção por busca de delimitadores ────────────────────────────────────
function extractBetween(src, startMarker, openChar, closeChar) {
  const markerIdx = src.indexOf(startMarker)
  if (markerIdx === -1) throw new Error(`Marcador '${startMarker}' não encontrado`)
  const startIdx = src.indexOf(openChar, markerIdx)
  if (startIdx === -1) throw new Error(`'${openChar}' não encontrado após marcador`)

  let depth = 0, i = startIdx
  while (i < src.length) {
    if (src[i] === openChar) depth++
    else if (src[i] === closeChar) {
      depth--
      if (depth === 0) return src.slice(startIdx, i + 1)
    }
    i++
  }
  throw new Error(`Delimitador de fecho '${closeChar}' não encontrado`)
}

console.log('A extrair RAW...')
const rawStr = extractBetween(html, 'const RAW=', '[', ']')
console.log(`  RAW extraído: ${Math.round(rawStr.length / 1024)}KB`)

console.log('A extrair META...')
const metaStr = extractBetween(html, ', META={', '{', '}')
console.log(`  META extraído: ${Math.round(metaStr.length / 1024)}KB`)

const RAW  = JSON.parse(rawStr)
const META = JSON.parse(metaStr)

// ─── ESTATÍSTICAS ────────────────────────────────────────────────────────────
console.log(`\n✅ RAW: ${RAW.length} entradas`)
console.log(`✅ META: ${Object.keys(META).length} emissores\n`)

const standard = RAW.filter(r => r[3] === 0)
const comem    = RAW.filter(r => r[3] === 1)
const owned    = RAW.filter(r => r[7] > 0)

console.log(`   Standard (cat=0):      ${standard.length}`)
console.log(`   Comemorativas (cat=1): ${comem.length}`)
console.log(`   Com posse (est0>0):    ${owned.length}`)
console.log(`   Sem posse (est0=0):    ${RAW.length - owned.length}`)

// Países únicos
const paises = [...new Set(RAW.map(r => r[0]))]
console.log(`\n   Emissores: ${paises.length}`)
paises.forEach(p => {
  const entries = RAW.filter(r => r[0] === p)
  const own     = entries.filter(r => r[7] > 0).length
  console.log(`     ${p.padEnd(35)} ${entries.length} entradas  ${own} com posse`)
})

// Denominações únicas
const denoms = [...new Set(RAW.map(r => r[2]))]
console.log(`\n   Denominações únicas: ${denoms.length}`)
denoms.forEach(d => console.log(`     ${d}`))

// ─── GERAR lib/data/catalog.ts ───────────────────────────────────────────────
const PAIS_CODIGO = {
  'Alemanha': 'de', 'Andorra': 'ad', 'Austria': 'at', 'Belgica': 'be',
  'Bulgaria': 'bg', 'Chipre': 'cy', 'Croacia': 'hr', 'Eslovaquia': 'sk',
  'Eslovenia': 'si', 'Espanha': 'es', 'Estónia': 'ee', 'Finlandia': 'fi',
  'França': 'fr', 'Grécia': 'gr', 'Holanda': 'nl', 'Irlanda': 'ie',
  'Italia': 'it', 'Letónia': 'lv', 'Lituania': 'lt', 'Luxemburgo': 'lu',
  'Malta': 'mt', 'Portugal': 'pt', 'San Marino': 'sm', 'Vaticano': 'va',
}

function cleanPais(pais) {
  return pais.replace(/\s*\(carteira\)/i, '').replace(/\s*BebÉ/i, '').replace(/\s*Bebé/i, '').trim()
}

function getPaisCodigo(paisLimpo) {
  return PAIS_CODIGO[paisLimpo] ?? paisLimpo.toLowerCase().slice(0, 2)
}

const entries = RAW.map((r, i) => {
  const pais      = String(r[0])
  const paisLimpo = cleanPais(pais)
  const anoStr    = String(r[1])
  const anoNum    = parseInt(anoStr.replace(/\D.*/, ''), 10)
  const meta      = META[pais] ?? META[paisLimpo] ?? { flag: '🪙', ring: '#888', years: [] }
  return {
    id:            i,
    pais,
    paisLimpo,
    paisCodigo:    getPaisCodigo(paisLimpo),
    ano:           anoStr,
    anoGregoriano: isNaN(anoNum) ? null : anoNum,
    denom:         String(r[2]),
    cat:           r[3] === 0 ? 0 : 1,
    face:          Number(r[4]) || 0,
    etiq:          String(r[5] ?? ''),
    verde:         Boolean(r[6]),
    est0:          [0,1,2].includes(r[7]) ? r[7] : 0,
    obs:           String(r[8] ?? ''),
    rank:          Number(r[9]) || 0,
    qf:            Number(r[10] ?? 1) || 1,
    flag:          meta.flag,
    ring:          meta.ring,
  }
})

const ts = `// AUTO-GERADO por scripts/parse-html-catalog.mjs — não editar à mão
// Fonte: caderneta-euros (3).html  |  ${new Date().toISOString().slice(0,10)}
// Total: ${RAW.length} entradas  |  ${Object.keys(META).length} emissores

export interface CatalogRawEntry {
  id: number           // índice original no array RAW
  pais: string         // país original (ex: "Portugal Bebé (carteira)")
  paisLimpo: string    // país limpo (ex: "Portugal")
  paisCodigo: string   // código ISO 2 letras (ex: "pt")
  ano: string          // ano como string (ex: "2022 bebé", "2023 r")
  anoGregoriano: number | null
  denom: string        // denominação (ex: "01 Cêntimos", "Moed.2 Euros")
  cat: 0 | 1           // 0 = circulação, 1 = comemorativa
  face: number         // valor facial em € (ex: 0.01, 2.0)
  etiq: string         // etiqueta/descrição breve
  verde: boolean
  est0: 0 | 1 | 2      // estado default: 0=não tem, 1=set, 2=caderneta
  obs: string          // observações (proveniência, tipo de set…)
  rank: number         // posição na linha (0-7 standard, 20 comems)
  qf: number           // quantidade default
  flag: string         // emoji de bandeira
  ring: string         // cor do anel da moeda (CSS)
}

export interface CountryMeta {
  flag: string
  ring: string
  years: string[]
}

export const COUNTRY_META: Record<string, CountryMeta> = ${JSON.stringify(META, null, 2)}

export const RAW_CATALOG: CatalogRawEntry[] = ${JSON.stringify(entries, null, 2)}
`

const outPath = join(ROOT, 'lib', 'data', 'catalog.ts')
mkdirSync(join(ROOT, 'lib', 'data'), { recursive: true })
writeFileSync(outPath, ts, 'utf8')
console.log(`\n✅ Gerado: lib/data/catalog.ts (${Math.round(ts.length / 1024)} KB)`)

// JSON para uso no seed script (sem tipos TypeScript)
const jsonPath = join(ROOT, 'scripts', 'catalog-data.json')
writeFileSync(jsonPath, JSON.stringify({ entries, meta: META }, null, 0), 'utf8')
console.log(`✅ Gerado: scripts/catalog-data.json (${Math.round(JSON.stringify(entries).length / 1024)} KB)`)
console.log(`   ${entries.length} entradas prontas para seed`)
