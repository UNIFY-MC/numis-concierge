/**
 * Completa as comemorativas de 2€ a partir da Maktun (a Numista está 429-bloqueada).
 * Fonte permitida (CLAUDE.md). Traz só as que FALTAM, casando por KM# para não
 * duplicar as que já temos (Numista). A moeda de circulação 2€ (desenho nacional,
 * "Map Design") é excluída — já a temos.
 *
 *   node scripts/importar-comemorativas-maktun.mjs --probe          # mostra match, não escreve
 *   node scripts/importar-comemorativas-maktun.mjs --apply [--pais pt]
 */
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: join(ROOT, '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'numis' }, auth: { persistSession: false },
})
const tok = readFileSync(join(ROOT, 'scripts/.maktun-token'), 'utf8').match(/TOKEN=([0-9a-f]+)/i)[1]
const H = { Authorization: 'Token ' + tok, 'Content-Type': 'application/json', Accept: 'application/json' }
const BASE = 'https://web.maktun.com/api/catalog'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const paIdx = args.indexOf('--pais')
const SO_PAIS = paIdx >= 0 ? args[paIdx + 1] : null

// Países onde o 429 da Numista cortou (lu já tem 39, fica de fora por defeito).
const PAISES = {
  pt: { id: 417, nome: 'Portugal' }, mt: { id: 423, nome: 'Malta' },
  sm: { id: 418, nome: 'San Marino' }, va: { id: 410, nome: 'Vaticano' },
}

const temaDo = (titulo) => { const m = (titulo || '').match(/\(([^)]+)\)\s*$/); return m ? m[1].trim() : null }
const ehCirculacao = (t) => /map design|carte|standard|national (side|design)/i.test(t || '') || !temaDo(t)
// Variante de cunhagem (não é uma comemorativa nova): "Type II", "Tipo III", essai…
const ehVariante = (t) => { const x = temaDo(t); return !!x && /^type\s+[ivx0-9]+$|^tipo\s+[ivx0-9]+$|reeding|\bessai\b|pattern/i.test(x) }

// O km da Maktun é um código interno (não o Krause KM#), logo não serve para match.
// Em vez disso, comparamos o tema por palavras-chave + ano. Stopwords e números fora.
const STOP = new Set(['the', 'of', 'and', 'in', 'for', 'to', 'de', 'da', 'do', 'des', 'der', 'el',
  'anniversary', 'anniv', 'years', 'year', 'century', 'centenary', 'bicentenary', 'death', 'birth',
  'first', 'second', 'third', 'euro', 'euros', 'world', 'national', 'international', 'european', 'union'])
const keywords = (tema) => new Set((tema || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
  .filter((w) => w.length >= 4 && !STOP.has(w) && !/^\d+(st|nd|rd|th)?$/.test(w)))
// duplicado se há uma comemorativa nossa do MESMO ano que partilha ≥1 palavra-chave
const casaComNossa = (temaMk, anoMk, nossas) => {
  const kw = keywords(temaMk)
  return nossas.some((n) => n.ano === anoMk && [...keywords(n.tema)].some((w) => kw.has(w)))
}

async function maktun2euro(countryId) {
  const r = await fetch(`${BASE}/get_cointypes/`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ country_id: countryId, currency_id: 1713, nominal: '2' }),
  })
  const j = await r.json()
  return (j.cointypes || []).filter((c) => !c.is_token)
}

async function main() {
  const paises = SO_PAIS ? [SO_PAIS] : Object.keys(PAISES)
  let totalNovas = 0, totalIns = 0

  for (const pais of paises) {
    const p = PAISES[pais]; if (!p) continue
    // o que já temos (comemorativas desse país): tema + ano (via issues)
    const { data: nossasRaw } = await supabase.from('catalog_coins')
      .select('tema, maktun_id, catalog_issues(ano_gregoriano)')
      .eq('pais_codigo', pais).eq('comemorativa', true)
    const nossas = (nossasRaw || []).map((c) => ({
      tema: c.tema, ano: c.catalog_issues?.[0]?.ano_gregoriano ?? null,
    }))

    const lista = await maktun2euro(p.id)
    const comem = lista.filter((c) => !ehCirculacao(c.title) && !ehVariante(c.title))
    // dedup interno da própria Maktun (mesmo ano + keyword) antes de comparar com as nossas
    const vistos = []
    const novas = comem.filter((c) => {
      const tema = temaDo(c.title), ano = c.start_year
      if (casaComNossa(tema, ano, nossas)) return false       // já temos (Numista)
      if (casaComNossa(tema, ano, vistos)) return false        // repetida dentro da Maktun
      vistos.push({ tema, ano })
      return true
    })

    console.log(`\n${pais} #${p.id}: Maktun ${lista.length} de 2€ · ${comem.length} comemorativas · temos ${nossas.length} · ${novas.length} NOVAS`)
    for (const c of novas) console.log(`   + ${c.start_year} · "${temaDo(c.title)}"`)
    totalNovas += novas.length
    await sleep(400)

    if (APPLY) {
      for (const c of novas) {
        const { data: novo, error } = await supabase.from('catalog_coins').insert({
          titulo: c.combined_title || c.title, pais_codigo: pais, pais_nome: p.nome,
          denominacao: c.title, valor_facial: 2, comemorativa: true, tipo_emissao: 'Comemorativa',
          familia: 'euro_comemorativa', tema: temaDo(c.title),
          km_ref: null, peso_g: c.weight ?? null, diametro_mm: c.diameter ?? null,  // km Maktun é interno, não Krause
          maktun_id: c.id, maktun_comentario: c.comment || null, maktun_raw: c,
          ano_inicio: c.start_year || null, ano_fim: c.end_year || null,
          anverso_img: c.example2_url || null, reverso_img: c.example1_url || null,
          foto_fonte: 'Maktun (vlcoins)',
        }).select('id').single()
        if (error) { if (!/duplicate|unique/i.test(error.message)) console.error('  erro', c.id, error.message); continue }
        if (c.start_year) await supabase.from('catalog_issues').insert({
          catalog_coin_id: novo.id, ano: String(c.start_year), ano_gregoriano: c.start_year,
          html_est0: 0, html_qf: 0, html_verde: false,
        })
        totalIns++
      }
    }
  }
  console.log(`\n${APPLY ? `✅ ${totalIns} inseridas` : `🔎 ${totalNovas} novas (dry-run, corre --apply)`}`)
}
main()
