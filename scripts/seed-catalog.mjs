/**
 * Transforma catalog-data.json → SQL INSERT para Supabase
 * Gera ficheiros em scripts/sql/ e aplica via MCP (ou manualmente)
 * Uso: node scripts/seed-catalog.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

const { entries } = JSON.parse(
  readFileSync(join(__dirname, 'catalog-data.json'), 'utf8')
)

// ─── MAPEAMENTOS ─────────────────────────────────────────────────────────────
const FACE_TO_METAL = {
  0.01: 'Aço revestido a cobre', 0.02: 'Aço revestido a cobre',
  0.05: 'Aço revestido a cobre', 0.10: 'Nordic Gold',
  0.20: 'Nordic Gold',           0.50: 'Nordic Gold',
  1.00: 'Bimetálica',            2.00: 'Bimetálica',
}

const FACE_TO_DENOM = {
  0.01: '1 Cêntimo',   0.02: '2 Cêntimos',  0.05: '5 Cêntimos',
  0.10: '10 Cêntimos', 0.20: '20 Cêntimos', 0.50: '50 Cêntimos',
  1.00: '1 Euro',      2.00: '2 Euros',
}

function formatPosse(est0, pais) {
  if (est0 === 2 && (pais.includes('carteira') || pais.toLowerCase().includes('bebé') || pais.toLowerCase().includes('bebe'))) {
    return 'caderneta'
  }
  return est0 === 1 ? 'set' : 'set'
}

// ─── CONSTRUÇÃO DO CATÁLOGO ───────────────────────────────────────────────────
// catalog_coins: chave única → uuid gerado
const coinMap = new Map() // chave → { uuid, record }

for (const e of entries) {
  let key
  if (e.cat === 0) {
    key = `${e.paisLimpo}||${e.denom}`
  } else {
    // cada comemorativa é única por (paisLimpo, denom, ano, etiq)
    key = `${e.paisLimpo}||${e.denom}||${e.ano}||${e.etiq}`
  }

  if (!coinMap.has(key)) {
    const titulo = e.cat === 0
      ? `${e.paisLimpo} — ${FACE_TO_DENOM[e.face] ?? e.denom}`
      : `${e.paisLimpo} — ${e.denom} ${e.ano}${e.etiq ? ' (' + e.etiq + ')' : ''}`.trim()

    coinMap.set(key, {
      uuid: randomUUID(),
      titulo,
      paisCodigo:  e.paisCodigo,
      paisNome:    e.paisLimpo,
      valorFacial: e.face,
      denominacao: FACE_TO_DENOM[e.face] ?? e.denom,
      metal:       e.cat === 0 ? (FACE_TO_METAL[e.face] ?? null) : null,
      comemorativa: e.cat === 1,
      tipoEmissao: e.cat === 0 ? 'Circulação' : 'Comemorativa',
      serie:       null,
      tema:        e.cat === 1 ? e.etiq || null : null,
      htmlRank:    e.rank,
    })
  }
}

console.log(`\n📦 catalog_coins únicos: ${coinMap.size}`)
console.log(`   Standard:      ${[...coinMap.values()].filter(c => !c.comemorativa).length}`)
console.log(`   Comemorativas: ${[...coinMap.values()].filter(c => c.comemorativa).length}`)

// catalog_issues: um por entrada RAW
const issues = entries.map(e => {
  let key
  if (e.cat === 0) {
    key = `${e.paisLimpo}||${e.denom}`
  } else {
    key = `${e.paisLimpo}||${e.denom}||${e.ano}||${e.etiq}`
  }
  const coin = coinMap.get(key)
  return {
    uuid:          randomUUID(),
    catalogCoinId: coin.uuid,
    htmlId:        e.id,
    ano:           e.ano,
    anoGregoriano: e.anoGregoriano,
    etiqueta:      e.etiq || null,
    htmlEst0:      e.est0,
    htmlObs:       e.obs || null,
    htmlQf:        e.qf,
    htmlVerde:     e.verde,
  }
})

// collection: só entradas com est0 > 0
const collection = issues
  .filter(iss => {
    const e = entries[iss.htmlId]
    return e.est0 > 0
  })
  .map(iss => {
    const e = entries[iss.htmlId]
    return {
      uuid:           randomUUID(),
      catalogCoinId:  iss.catalogCoinId,
      catalogIssueId: iss.uuid,
      quantidade:     e.qf > 0 ? e.qf : 1,
      formatoPosse:   formatPosse(e.est0, e.pais),
      notaPrivada:    e.obs || null,
      htmlIndex:      e.id,
    }
  })

console.log(`📦 catalog_issues:  ${issues.length}`)
console.log(`📦 collection:      ${collection.length}`)

// ─── EMITIR LINHAS EM JSON (para apply-seed.mjs via supabase-js) ──────────────
const coinRows = [...coinMap.values()].map(c => ({
  id:           c.uuid,
  titulo:       c.titulo,
  pais_codigo:  c.paisCodigo,
  pais_nome:    c.paisNome,
  valor_facial: c.valorFacial,
  denominacao:  c.denominacao,
  metal:        c.metal,
  comemorativa: c.comemorativa,
  tipo_emissao: c.tipoEmissao,
  serie:        c.serie,
  tema:         c.tema,
  html_rank:    c.htmlRank,
}))

const issueRows = issues.map(iss => ({
  id:              iss.uuid,
  catalog_coin_id: iss.catalogCoinId,
  ano:             iss.ano,
  ano_gregoriano:  iss.anoGregoriano,
  etiqueta:        iss.etiqueta,
  html_est0:       iss.htmlEst0,
  html_obs:        iss.htmlObs,
  html_qf:         iss.htmlQf,
  html_verde:      iss.htmlVerde,
}))

const collectionRows = collection.map(c => ({
  id:                 c.uuid,
  catalog_coin_id:    c.catalogCoinId,
  catalog_issue_id:   c.catalogIssueId,
  quantidade:         c.quantidade,
  formato_posse:      c.formatoPosse,
  nota_privada:       c.notaPrivada,
  html_catalog_index: c.htmlIndex,
}))

const rowsPath = join(__dirname, 'seed-rows.json')
writeFileSync(rowsPath, JSON.stringify({
  coins: coinRows,
  issues: issueRows,
  collection: collectionRows,
}), 'utf8')

console.log(`\n✅ Gerado: scripts/seed-rows.json`)
console.log(`   coins:      ${coinRows.length}`)
console.log(`   issues:     ${issueRows.length}`)
console.log(`   collection: ${collectionRows.length}`)
console.log('\nPróximo passo: node scripts/apply-seed.mjs')
