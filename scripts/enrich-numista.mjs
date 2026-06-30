/**
 * Enriquece o catálogo (catalog_coins + catalog_issues) com dados da Numista API:
 * fotos (anverso/reverso), peso, diâmetro, espessura, composição, km_ref, numista_id,
 * e tiragem por ano. Corre UMA vez — depois a app vive só do Supabase, sem voltar à API.
 *
 * Resumível: só processa catalog_coins sem numista_id. Podes correr em lotes (--limit)
 * para respeitar a quota de 2000 req/mês.
 *
 * Requer em .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NUMISTA_API_KEY
 *
 * Uso:
 *   node scripts/enrich-numista.mjs --probe        # 3-4 pedidos, mostra JSON cru, NÃO escreve
 *   node scripts/enrich-numista.mjs --limit 50     # enriquece 50 coins e pára
 *   node scripts/enrich-numista.mjs                # enriquece tudo o que falta
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CACHE = join(__dirname, '.numista-cache')
config({ path: join(ROOT, '.env.local') })

const API = 'https://api.numista.com/v3'
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const NUMISTA_KEY = process.env.NUMISTA_API_KEY

if (!SUPA_URL || !SUPA_KEY || !NUMISTA_KEY) {
  console.error('❌ Falta NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou NUMISTA_API_KEY em .env.local')
  process.exit(1)
}

const args = process.argv.slice(2)
const PROBE = args.includes('--probe')
const COMEMORATIVAS = args.includes('--comemorativas')
const SYNC_ISSUES = args.includes('--sync-issues')
const limitArg = args.indexOf('--limit')
const LIMIT = limitArg >= 0 ? parseInt(args[limitArg + 1], 10) : Infinity
const IMPORTAR_NOVOS = args.includes('--importar-novos')
const APPLY = args.includes('--apply')
const paisFilterIdx = args.indexOf('--pais')
const PAIS_FILTER = paisFilterIdx >= 0 ? args[paisFilterIdx + 1] : null

const supabase = createClient(SUPA_URL, SUPA_KEY, {
  db: { schema: 'numis' },
  auth: { persistSession: false },
})

// ─── HTTP com rate limit (~1 req/s) e cache em disco ─────────────────────────
let reqCount = 0
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(path, { cacheKey } = {}) {
  if (cacheKey) {
    const f = join(CACHE, cacheKey + '.json')
    if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'))
  }
  await sleep(750)
  reqCount++
  const res = await fetch(API + path, { headers: { 'Numista-API-Key': NUMISTA_KEY } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${res.status} ${path} → ${body.slice(0, 200)}`)
  }
  const json = await res.json()
  if (cacheKey) {
    if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true })
    writeFileSync(join(CACHE, cacheKey + '.json'), JSON.stringify(json))
  }
  return json
}

// ─── Extração defensiva de campos (a API pode variar nomes) ──────────────────
const pic = (side) => side?.picture || side?.thumbnail || null
const numFrom = (v) => (typeof v === 'number' ? v : (v && typeof v.numeric_value === 'number' ? v.numeric_value : null))

// Nome da comemoração do título Numista: "2 Euros (Programa Erasmus)" → "Programa Erasmus".
// Para circulação ("2 Euros (2nd map)") o parêntese é variante de desenho, não
// comemoração — por isso só extraímos tema quando o tipo é comemorativo.
function temaDoTitulo(title) {
  const m = (title || '').match(/\(([^)]+)\)\s*$/)
  return m ? m[1].trim() : null
}

// É um tipo COMEMORATIVO real? (tem tema e o tema não é variante de circulação:
// "2nd map", "1st type", pattern, reeding, coin card…). Exclui o 2€ de circulação,
// que está activo todos os anos e contaminava o match por ano.
function ehComemType(t) {
  const tema = temaDoTitulo(t.title)
  if (!tema) return false
  return !/\bmap\b|\d\s*(st|nd|rd|th)?\s*type|pattern|reeding|coin\s*card/i.test(tema)
}

// Descrição + legenda (lettering) de um lado/orla, juntos num texto único.
function descLetra(side) {
  const parts = [side?.description, side?.lettering].filter(Boolean)
  return parts.length ? parts.join(' — ') : null
}

// Referência de um catálogo específico (KM, Schön) a partir de references[].
function refDe(d, re) {
  const r = (d.references || []).find((x) => re.test(x?.catalogue?.code || x?.catalogue?.name || ''))
  return r?.number ? String(r.number) : null
}

function mapCoinDetail(d, { comemorativa = false } = {}) {
  const comp = d.composition?.text || d.composition?.english_name || (typeof d.composition === 'string' ? d.composition : null)
  const tema = comemorativa ? temaDoTitulo(d.title) : null
  return {
    numista_id: d.id ?? null,
    anverso_img: pic(d.obverse) || d.obverse_thumbnail || null,
    reverso_img: pic(d.reverse) || d.reverse_thumbnail || null,
    peso_g: numFrom(d.weight),
    diametro_mm: numFrom(d.size) ?? numFrom(d.diameter),
    espessura_mm: numFrom(d.thickness),
    composicao: comp,
    forma: d.shape || null,
    km_ref: refDe(d, /km/i),
    schon_ref: refDe(d, /sch(ö|o)n/i),
    anverso_desc: descLetra(d.obverse),
    reverso_desc: descLetra(d.reverse),
    orla_desc: descLetra(d.edge),
    orla_tipo: d.edge?.type || null,
    serie: d.series || null,
    demonetizada: d.demonetization?.is_demonetized === true,
    ...(tema ? { tema, titulo: d.title } : {}),
  }
}

// ─── Mapa FIXO de emissores Numista (ISO2 nosso → código nível-1 verificado) ──
// Extraído de /issuers (level===1) e confirmado. O mapa por nome era não-fiável
// (nomes repetidos em vários níveis; last-wins dava emissores históricos).
// Se algum país devolver 0 moedas euro no run, o código está errado → corrigir aqui.
// Nós do emissor moderno (euro), verificados via /issuers (nível 2 "república
// moderna" onde existe; senão nível 1). Todos confirmados a conter moedas euro.
const ISSUER_CODES = {
  de: 'allemagne',    // "Germany, Federal Republic of"
  ad: 'andorre',
  at: 'autriche',
  be: 'belgique',
  bg: 'bulgarie',
  cy: 'chypre',
  hr: 'croatie',
  sk: 'slovaquie',
  si: 'slovenie',
  es: 'espagne',
  ee: 'estonie',
  fi: 'finlande',
  fr: 'france',
  gr: 'grece',
  nl: 'pays-bas',
  ie: 'irlande',
  it: 'italie',
  lv: 'lettonie',
  lt: 'lituanie',
  lu: 'luxembourg',
  mt: 'malte',
  pt: 'portugal',
  sm: 'saint-marin',
  va: 'vatican',
}

// O endpoint /types (lista) NÃO devolve `value` — só o /types/{id} (detalhe).
// Por isso o valor facial é extraído do TÍTULO ("1 Euro Cent", "2 Euros (1st map)").
// Ancorado no início para não apanhar "1 Franc (... Euro 2000)" (futebol).
function facialFromTitle(title) {
  const c = (title || '').match(/^(\d+)\s+Euro\s+Cents?\b/i)
  if (c) return parseInt(c[1], 10) / 100
  const e = (title || '').match(/^(\d+)\s+Euros?\b/i)
  if (e) return parseInt(e[1], 10)
  return null
}

// Euro = título parseável a valor facial euro + ano >= 1999.
function isEuro(t) {
  return facialFromTitle(t.title) != null && (t.max_year || t.min_year || 0) >= 1999
}

// ─── Tipos EURO de um emissor, via pesquisa q (cacheado) ─────────────────────
// Pagina por valor "cego" não chega aos euros em catálogos grandes (França tem
// 3000+ tipos históricos). A pesquisa q="Euro Cent" e q="Euro" alcança-os
// directamente; isEuro() filtra ruído (ex: "1 Franc ... Euro 2000").
async function typesForIssuer(issuerCode) {
  const byId = new Map()
  for (const q of ['Euro Cent', 'Euro']) {
    let page = 1
    for (;;) {
      const data = await api(
        `/types?category=coin&issuer=${encodeURIComponent(issuerCode)}&q=${encodeURIComponent(q)}&count=50&page=${page}&lang=en`,
        { cacheKey: `q-${issuerCode}-${q.replace(/\s+/g, '_')}-p${page}` },
      )
      const types = data.types || []
      for (const t of types) if (isEuro(t)) byId.set(t.id, t)
      if (types.length < 50) break
      page++
      if (page > 12) break // salvaguarda
    }
  }
  return [...byId.values()]
}

// ─── PROBE: confirma o shape da API + foco no Portugal EURO ──────────────────
async function probe() {
  console.log('🔎 PROBE — confirmar shape e o euro de Portugal (não escreve nada)\n')
  const codePT = ISSUER_CODES.pt
  console.log('Código emissor Portugal:', codePT)
  const euros = await typesForIssuer(codePT)
  console.log(`Tipos euro encontrados (via q): ${euros.length}`)
  const um = euros.find((t) => facialFromTitle(t.title) === 1) || euros[0]
  console.log('\nTYPE euro escolhido:', JSON.stringify(um, null, 2))
  if (um?.id) {
    const detail = await api(`/types/${um.id}?lang=en`)
    const issuesData = await api(`/types/${um.id}/issues?lang=en`)
    const issues = issuesData.issues || issuesData || []
    console.log('\n➡️  Mapeado para a nossa BD:', JSON.stringify(mapCoinDetail(detail), null, 2))
    console.log(`\nISSUES: ${issues.length} variantes (ano × casa da moeda)`)
    console.log('\nISSUE COMPLETO (1º) — confirmar se há foto/casa da moeda por ano:')
    console.log(JSON.stringify(issues[0], null, 2))
    const comFoto = issues.filter((i) => pic(i.obverse) || pic(i.reverse) || i.picture || i.obverse_picture)
    const comMint = issues.filter((i) => i.mint_letter || i.mintmark || i.mint)
    console.log(`\n🔬 Issues com foto própria (por ano): ${comFoto.length}/${issues.length}`)
    console.log(`🔬 Issues com casa da moeda (mint_letter): ${comMint.length}/${issues.length}`)
    if (comFoto.length === 0) {
      console.log('   → A API NÃO dá foto por ano. A única foto fiável é a do tipo (genérica) ou a tua própria.')
    } else {
      console.log('   → A API DÁ foto por ano! Vale guardar anverso_img/reverso_img por issue.')
    }
  }
  console.log(`\n✅ Probe feito em ${reqCount} pedidos.`)
}

// ─── Match de um catalog_coin a um type da Numista ───────────────────────────
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2)

function matchType(coin, types) {
  const facial = coin.valor_facial != null ? Number(coin.valor_facial) : null
  const cands = types.filter((t) => {
    const val = facialFromTitle(t.title)
    return facial != null && val != null && Math.abs(val - facial) < 0.001
  })
  if (coin.comemorativa) {
    // Comemorativas: casar por sobreposição de palavras do nosso tema/título com o
    // parêntese do título Numista ("2 Euros (Tratado de Roma)" → "Tratado de Roma").
    const nosso = new Set([...norm(coin.tema), ...norm(coin.denominacao), ...norm(coin.titulo)])
    if (nosso.size === 0) return null
    let best = null, bestScore = 0
    for (const t of cands) {
      const alvo = norm(temaDoTitulo(t.title))
      if (alvo.length === 0) continue
      const score = alvo.filter((w) => nosso.has(w)).length / alvo.length
      if (score > bestScore) { bestScore = score; best = t }
    }
    return bestScore >= 0.5 ? best : null
  }
  if (cands.length === 1) return cands[0]
  // circulação: preferir a de gama de anos mais larga (base / "2nd map" corrente)
  return cands.sort((a, b) =>
    ((b.max_year || 0) - (b.min_year || 0)) - ((a.max_year || 0) - (a.min_year || 0)))[0] || null
}

// ─── Enriquecimento principal ────────────────────────────────────────────────
async function run() {
  const { data: coins, error } = await supabase
    .from('catalog_coins')
    .select('id, pais_codigo, pais_nome, valor_facial, denominacao, comemorativa, numista_id, tema, titulo')
    .is('numista_id', null)
  if (error) { console.error('❌', error.message); process.exit(1) }

  console.log(`📋 ${coins.length} coins sem numista_id. Limite desta execução: ${LIMIT === Infinity ? 'todos' : LIMIT}`)

  const typesCache = new Map()
  const issuersAvisados = new Set()
  let feitos = 0, semMatch = 0, semCodigo = 0, comemFeitas = 0
  const comemSemMatch = []

  for (const coin of coins) {
    if (feitos >= LIMIT) break

    const issuerCode = ISSUER_CODES[coin.pais_codigo]
    if (!issuerCode) {
      if (!issuersAvisados.has(coin.pais_codigo)) {
        console.warn(`⚠️  Sem código de emissor para "${coin.pais_codigo}" (${coin.pais_nome}) — adicionar em ISSUER_CODES.`)
        issuersAvisados.add(coin.pais_codigo)
      }
      semCodigo++
      continue
    }

    let types = typesCache.get(issuerCode)
    if (!types) {
      types = await typesForIssuer(issuerCode)
      typesCache.set(issuerCode, types)
      const nEuro = types.filter(isEuro).length
      if (nEuro === 0 && !issuersAvisados.has(issuerCode)) {
        console.warn(`⚠️  Emissor "${issuerCode}" (${coin.pais_nome}) devolveu 0 moedas euro — código provavelmente errado. A saltar.`)
        issuersAvisados.add(issuerCode)
      }
    }

    const t = matchType(coin, types)
    if (!t) {
      semMatch++
      if (coin.comemorativa) comemSemMatch.push(`${coin.pais_nome}: ${coin.tema || coin.denominacao || coin.titulo || coin.id}`)
      continue
    }
    if (coin.comemorativa) comemFeitas++

    const detail = await api(`/types/${t.id}?lang=en`, { cacheKey: `type-${t.id}` })
    const patch = mapCoinDetail(detail, { comemorativa: coin.comemorativa })
    const { error: upErr } = await supabase.from('catalog_coins').update(patch).eq('id', coin.id)
    if (upErr) { console.error(`❌ update coin ${coin.id}:`, upErr.message); continue }

    // issues: actualiza tiragem/casa/foto por ano que JÁ temos (match por ano).
    // NOTA: não inserimos novas variantes (ano×casa) para não inflar o catálogo
    // nem distorcer a matriz/percentagens — só enriquecemos as issues existentes.
    try {
      const issuesData = await api(`/types/${t.id}/issues?lang=en`, { cacheKey: `issues-${t.id}` })
      const issues = issuesData.issues || issuesData || []
      const { data: ourIssues } = await supabase
        .from('catalog_issues').select('id, ano, ano_gregoriano').eq('catalog_coin_id', coin.id)
      for (const oi of ourIssues || []) {
        const ano = oi.ano_gregoriano || parseInt(oi.ano, 10)
        const ni = issues.find((x) => (x.gregorian_year || x.year) === ano)
        if (!ni) continue
        const dados = {
          numista_issue_id: ni.id ?? null,
          tiragem: numFrom(ni.mintage) ?? null,
          casa_moeda: ni.mint_letter || ni.mintmark || ni.mint || null,
        }
        const fa = pic(ni.obverse) || ni.obverse_picture || null
        const fr = pic(ni.reverse) || ni.reverse_picture || null
        if (fa) dados.anverso_img = fa
        if (fr) dados.reverso_img = fr
        await supabase.from('catalog_issues').update(dados).eq('id', oi.id)
      }
    } catch (e) { console.warn(`⚠️  issues ${t.id}: ${e.message}`) }

    feitos++
    if (feitos % 10 === 0) console.log(`  …${feitos} coins enriquecidos (${reqCount} pedidos)`)
  }

  console.log(`\n✅ Enriquecidos ${feitos} coins (${comemFeitas} comemorativas) · ${semMatch} sem match · ${semCodigo} sem código de emissor · ${reqCount} pedidos usados.`)
  if (comemSemMatch.length > 0) {
    console.log(`\n⚠️  ${comemSemMatch.length} comemorativas sem match (rever tema/título ou baixar limiar):`)
    for (const c of comemSemMatch.slice(0, 40)) console.log(`   · ${c}`)
    if (comemSemMatch.length > 40) console.log(`   … e mais ${comemSemMatch.length - 40}`)
  }
}

// ─── Modo --comemorativas: match por ano + país (sem depender do nosso tema) ──
// Cada comemorativa 2€ tem um único ano de emissão. O match ano + face 2€ + país
// é unívoco na maioria dos casos; onde há duas no mesmo ano usa word-overlap como
// desempate e regista as ambíguas para revisão.
async function runComemorativas() {
  const { data: coins, error } = await supabase
    .from('catalog_coins')
    .select('id, pais_codigo, pais_nome, valor_facial, denominacao, comemorativa, numista_id, tema, titulo')
    .eq('comemorativa', true)
    .is('numista_id', null)
  if (error) { console.error('❌', error.message); process.exit(1) }
  console.log(`🎖️  ${coins.length} comemorativas por enriquecer. Limite: ${LIMIT === Infinity ? 'todas' : LIMIT}`)

  const typesCache = new Map()
  let feitos = 0, semMatch = 0, semCodigo = 0, ambiguas = 0
  const log = { semMatch: [], ambigua: [] }

  for (const coin of coins) {
    if (feitos >= LIMIT) break

    const issuerCode = ISSUER_CODES[coin.pais_codigo]
    if (!issuerCode) { semCodigo++; continue }

    let types = typesCache.get(issuerCode)
    if (!types) { types = await typesForIssuer(issuerCode); typesCache.set(issuerCode, types) }

    const { data: ourIssues } = await supabase
      .from('catalog_issues').select('id, ano_gregoriano').eq('catalog_coin_id', coin.id)
    if (!ourIssues?.length) { semMatch++; log.semMatch.push(`${coin.pais_nome}: ${coin.titulo} (sem issues)`); continue }

    for (const issue of ourIssues) {
      const ano = issue.ano_gregoriano
      if (!ano) continue

      // Só tipos comemorativos reais de 2€ activos nesse ano (exclui circulação).
      const candidatos = types.filter((t) => {
        const val = facialFromTitle(t.title)
        if (!val || Math.abs(val - 2.0) > 0.001) return false
        if (!ehComemType(t)) return false
        const minY = t.min_year || 0, maxY = t.max_year || 9999
        return ano >= minY && ano <= maxY
      })

      // Alta precisão: só casamos quando há EXACTAMENTE 1 comemorativa nesse ano.
      // Anos com várias ficam por rever manualmente (o nosso tema não as distingue).
      if (candidatos.length === 0) {
        semMatch++
        log.semMatch.push(`${coin.pais_nome} ${ano}: ${coin.titulo || coin.tema || coin.id}`)
        continue
      }
      if (candidatos.length > 1) {
        ambiguas++
        log.ambigua.push(`${coin.pais_nome} ${ano}: ${candidatos.map((t) => temaDoTitulo(t.title)).join(' | ')}`)
        continue
      }
      const escolhido = candidatos[0]

      const detail = await api(`/types/${escolhido.id}?lang=en`, { cacheKey: `type-${escolhido.id}` })
      const patch = mapCoinDetail(detail, { comemorativa: true })
      const temaNumista = temaDoTitulo(detail.title) || detail.title
      const { error: upErr } = await supabase.from('catalog_coins')
        .update({ ...patch, tema: temaNumista, titulo: detail.title })
        .eq('id', coin.id)
      if (upErr) { console.error(`❌ update coin ${coin.id}:`, upErr.message); continue }

      try {
        const issuesData = await api(`/types/${escolhido.id}/issues?lang=en`, { cacheKey: `issues-${escolhido.id}` })
        const niIssues = issuesData.issues || issuesData || []
        const ni = niIssues.find((x) => (x.gregorian_year || x.year) === ano)
        if (ni) {
          await supabase.from('catalog_issues')
            .update({ numista_issue_id: ni.id ?? null, tiragem: numFrom(ni.mintage) ?? null, casa_moeda: ni.mint_letter || ni.mintmark || ni.mint || null })
            .eq('id', issue.id)
        }
      } catch (e) { console.warn(`⚠️  issues ${escolhido.id}: ${e.message}`) }

      feitos++
      if (feitos % 20 === 0) console.log(`  …${feitos} comemorativas enriquecidas (${reqCount} pedidos)`)
    }
  }

  console.log(`\n✅ ${feitos} comemorativas enriquecidas · ${semMatch} sem match · ${ambiguas} ambíguas (saltadas, rever manualmente) · ${semCodigo} sem código · ${reqCount} pedidos usados.`)
  if (log.ambigua.length) {
    console.log(`\n⚠️  Ambíguas (mais de 1 comemorativa 2€ no mesmo ano — match manual):`)
    for (const l of log.ambigua) console.log(`   · ${l}`)
  }
  if (log.semMatch.length) {
    console.log(`\n❌ Sem match (${log.semMatch.length}) — a Numista não tem tipo 2€ activo nesse ano:`)
    for (const l of log.semMatch.slice(0, 30)) console.log(`   · ${l}`)
    if (log.semMatch.length > 30) console.log(`   … e mais ${log.semMatch.length - 30}`)
  }
}

// ─── Sincroniza catalog_issues de um coin com os issues da Numista ───────────
// Cria uma linha por ano × casa da moeda (séries DE: A/D/F/G/J). Para não perder
// marcações da coleção, reaproveita uma issue existente do ano sem casa da moeda
// antes de inserir novas. Usa cache → 0 quota se os issues já lá estiverem.
async function syncIssuesForCoin(coinId, typeId) {
  try {
    const issuesData = await api(`/types/${typeId}/issues?lang=en`, { cacheKey: `issues-${typeId}` })
    const issues = issuesData.issues || issuesData || []
    const { data: ourIssues } = await supabase
      .from('catalog_issues').select('id, ano, ano_gregoriano, casa_moeda').eq('catalog_coin_id', coinId)
    const existentes = ourIssues || []
    const usados = new Set()
    const anoDe = (oi) => oi.ano_gregoriano || parseInt(oi.ano, 10)

    for (const ni of issues) {
      const ano = ni.gregorian_year || ni.year
      if (!ano) continue
      const mint = ni.mint_letter || ni.mintmark || ni.mint || null
      const fotoA = pic(ni.obverse) || ni.obverse_picture || null
      const fotoR = pic(ni.reverse) || ni.reverse_picture || null
      const dados = {
        numista_issue_id: ni.id ?? null,
        tiragem: numFrom(ni.mintage) ?? null,
        casa_moeda: mint,
        ...(fotoA ? { anverso_img: fotoA } : {}),
        ...(fotoR ? { reverso_img: fotoR } : {}),
      }
      // 1) match exacto ano+casa; 2) reaproveitar issue do ano ainda sem casa (preserva coleção)
      let alvo = existentes.find((oi) => !usados.has(oi.id) && anoDe(oi) === ano && (oi.casa_moeda || null) === mint)
      if (!alvo) alvo = existentes.find((oi) => !usados.has(oi.id) && anoDe(oi) === ano && !oi.casa_moeda)
      if (alvo) {
        usados.add(alvo.id)
        await supabase.from('catalog_issues').update(dados).eq('id', alvo.id)
      } else {
        await supabase.from('catalog_issues').insert({
          catalog_coin_id: coinId, ano: String(ano), ano_gregoriano: ano,
          html_est0: 0, html_qf: 0, html_verde: false, ...dados,
        })
      }
    }
  } catch (e) { console.warn(`⚠️  issues ${typeId}: ${e.message}`) }
}

// ─── Modo --sync-issues: repovoa issues por casa da moeda (séries) ───────────
// Para coins já enriquecidos, sem voltar a casar tipos. Filtra por --pais XX.
async function runSyncIssues() {
  let q = supabase.from('catalog_coins')
    .select('id, pais_codigo, pais_nome, numista_id')
    .not('numista_id', 'is', null)
  const paisArg = args.indexOf('--pais')
  if (paisArg >= 0) q = q.eq('pais_codigo', args[paisArg + 1])
  const { data: coins, error } = await q
  if (error) { console.error('❌', error.message); process.exit(1) }
  console.log(`🔁 ${coins.length} coins com numista_id para re-sincronizar issues. Limite: ${LIMIT === Infinity ? 'todos' : LIMIT}`)
  let feitos = 0
  for (const coin of coins) {
    if (feitos >= LIMIT) break
    await syncIssuesForCoin(coin.id, coin.numista_id)
    feitos++
    if (feitos % 20 === 0) console.log(`  …${feitos} coins re-sincronizados (${reqCount} pedidos)`)
  }
  console.log(`\n✅ ${feitos} coins re-sincronizados · ${reqCount} pedidos usados.`)
}

// ─── Modo --importar-novos: traz tipos euro da Numista que NÃO temos ─────────
// Ao contrário do enrich (que só LIGA coins existentes), este INSERE tipos euro
// que faltam no catálogo. Conservador para não duplicar: um type conta como "já
// temos" se (a) o numista_id já está ligado, ou (b) casa com a assinatura de um
// coin nosso — circulação: pais+facial; comemorativa: pais+tema-normalizado.
// Os restantes são candidatos NOVOS. Dry-run por defeito (grava JSON); --apply insere.
// Coins de um país, paginado (PostgREST corta nos 1000).
async function coinsDoPais(pc) {
  const out = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('catalog_coins')
      .select('numista_id, valor_facial, comemorativa, ano_inicio, pais_nome')
      .eq('pais_codigo', pc)
      .range(from, from + 999)
    if (error) throw error
    if (!data?.length) break
    out.push(...data)
    if (data.length < 1000) break
    from += 1000
  }
  return out
}

async function runImportarNovos() {
  const paises = PAIS_FILTER ? [PAIS_FILTER] : Object.keys(ISSUER_CODES)
  const candidatos = []
  let inseridos = 0
  console.log(`${APPLY ? '📥 IMPORTAR (apply)' : '🔎 DRY-RUN (não escreve)'} · países: ${paises.join(', ')}\n`)
  console.log(`  ${'País'.padEnd(14)} ${'temos'.padStart(6)} ${'Numista'.padStart(8)} ${'NOVOS'.padStart(6)}`)

  for (const pc of paises) {
    const issuerCode = ISSUER_CODES[pc]
    if (!issuerCode) { console.warn(`⚠️  sem código de emissor para "${pc}"`); continue }
    const types = await typesForIssuer(issuerCode)
    const our = await coinsDoPais(pc)
    const paisNome = our.find((c) => c.pais_nome)?.pais_nome || pc.toUpperCase()
    const ligados = new Set(our.filter((c) => c.numista_id != null).map((c) => Number(c.numista_id)))
    // Circulação: já temos esse facial. Comemorativa: já temos esse facial NESSE ano
    // (ano_inicio) — chave fiável e cross-língua (não depende do tema PT vs EN).
    const facialCirc = new Set(our.filter((c) => !c.comemorativa).map((c) => Number(c.valor_facial)))
    const comemFacialAno = new Set(
      our.filter((c) => c.comemorativa && c.ano_inicio).map((c) => `${Number(c.valor_facial)}|${c.ano_inicio}`),
    )

    const novosPais = []
    for (const t of types) {
      if (ligados.has(t.id)) continue
      const facial = facialFromTitle(t.title)
      const comem = ehComemType(t)
      if (!comem && facialCirc.has(facial)) continue
      if (comem && t.min_year && comemFacialAno.has(`${facial}|${t.min_year}`)) continue
      novosPais.push({ pais: pc, paisNome, numista_id: t.id, titulo: t.title, facial, comemorativa: comem, tema: comem ? temaDoTitulo(t.title) : null, min_year: t.min_year, max_year: t.max_year })
    }
    candidatos.push(...novosPais)
    console.log(`  ${paisNome.padEnd(14)} ${String(our.length).padStart(6)} ${String(types.length).padStart(8)} ${String(novosPais.length).padStart(6)}`)

    if (APPLY) {
      for (const n of novosPais) {
        if (inseridos >= LIMIT) break
        const detail = await api(`/types/${n.numista_id}?lang=en`, { cacheKey: `type-${n.numista_id}` })
        const patch = mapCoinDetail(detail, { comemorativa: n.comemorativa })
        const row = {
          pais_codigo: pc,
          pais_nome: n.paisNome,
          titulo: detail.title || n.titulo,
          denominacao: n.titulo,
          valor_facial: n.facial,
          comemorativa: n.comemorativa,
          categoria: 'euro',
          familia: n.comemorativa ? 'euro_comemorativa' : 'euro_circulacao',
          ano_inicio: n.min_year || null,
          ano_fim: n.max_year || null,
          foto_fonte: 'Numista',
          ...patch,
        }
        const { data: novo, error } = await supabase.from('catalog_coins').insert(row).select('id').single()
        if (error) { if (!/duplicate|unique/.test(error.message)) console.error(`❌ ${n.titulo}: ${error.message}`); continue }
        await syncIssuesForCoin(novo.id, n.numista_id)
        inseridos++
        if (inseridos % 10 === 0) console.log(`    …${inseridos} inseridos (${reqCount} pedidos)`)
      }
    }
  }

  writeFileSync(join(__dirname, 'numista-novos.json'), JSON.stringify(candidatos, null, 2))
  console.log(`\n${APPLY ? '✅ Inseridos ' + inseridos : '🔎 DRY-RUN — 0 escritos'} · ${candidatos.length} candidatos novos no total · ${reqCount} pedidos.`)
  console.log(`📝 Candidatos em scripts/numista-novos.json`)
  if (!APPLY) console.log(`   Inserir: node scripts/enrich-numista.mjs --importar-novos --apply [--pais pt] [--limit 50]`)
}

await (PROBE ? probe() : IMPORTAR_NOVOS ? runImportarNovos() : SYNC_ISSUES ? runSyncIssues() : COMEMORATIVAS ? runComemorativas() : run())
