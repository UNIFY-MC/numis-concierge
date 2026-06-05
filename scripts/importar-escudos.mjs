/**
 * Importa a coleção de ESCUDOS do pai (scripts/.escudos.json, extraído do XLS por
 * scripts/_extrai_escudos.py) para numis.collection, casando com o catálogo
 * histórico PT por VALOR-EM-ESCUDOS + ANO (+ tema para comemorativas).
 * Guarda também o valor de mercado por grau (BC/MBC/Bela) na issue.
 *
 *   python scripts/_extrai_escudos.py        # gera o .escudos.json
 *   node scripts/importar-escudos.mjs        # --probe (não escreve): mostra match
 *   node scripts/importar-escudos.mjs --apply
 */
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: join(ROOT, '.env.local') })
const APPLY = process.argv.includes('--apply')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'numis' }, auth: { persistSession: false },
})

// valor em escudos a partir do texto da denominação do catálogo
function escudosDeDenom(s) {
  if (!s) return null
  let m = s.match(/([\d.,]+)\s*Escudos?/i)
  if (m) return parseFloat(m[1].replace(/,/g, ''))
  m = s.match(/([\d.,]+)\s*Centavos?/i)
  if (m) return parseFloat(m[1].replace(/,/g, '')) / 100
  m = s.match(/(\d+)\s*\$\s*00/)               // "100$00"
  if (m) return parseFloat(m[1])
  return null
}
// PT→EN para casar o tema do pai (PT) com a denominação Numista/Maktun (EN)
const ALIAS = {
  acores: 'azores', siao: 'siam', mocambique: 'mozambique', henrique: 'henry',
  navegador: 'navigator', morte: 'death', mar: 'sea', descobrimento: 'discovery',
  descobrimentos: 'discovery', ilhas: 'islands', ilha: 'island', canarias: 'canary',
  brasil: 'brazil', especiarias: 'spice', china: 'china', macau: 'macau', taiwan: 'taiwan',
  formosa: 'taiwan', lusiados: 'lusiads', lusiadas: 'lusiads', tordesilhas: 'tordesillas',
  abril: 'april', deficiente: 'disabled', deficientes: 'disabled', alimentacao: 'food',
  alimentos: 'food', alimentar: 'food', mundial: 'world', mundo: 'world', navegacao: 'navigation',
  astronomica: 'astronomical', ocidente: 'west', america: 'america', molucas: 'maluku',
  partilha: 'dividing', aljubarrota: 'aljubarrota', oceano: 'ocean', atlantico: 'atlantic',
}
function norm(s) {
  const toks = (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2)
  const out = new Set(toks)
  for (const t of toks) if (ALIAS[t]) out.add(ALIAS[t])
  return [...out]
}
const temaParens = (s) => { const m = (s || '').match(/\(([^)]+)\)/); return m ? m[1] : '' }
const ehVariante = (s) => /\b(gold|silver|platinum|palladium|piedfort|piéfort|proof)\b|edition/i.test(s || '')

async function carregarCatalogo() {
  // COINS PT historico (o tipo, com intervalo ano_inicio–ano_fim fidedigno do Maktun)
  const coins = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('catalog_coins')
      .select('id, denominacao, ano_inicio, ano_fim, composicao, metal')
      .eq('pais_codigo', 'pt').eq('familia', 'historico')
      .order('id').range(from, from + 999)
    if (error) throw error
    if (!data?.length) break
    coins.push(...data)
    if (data.length < 1000) break
  }
  return coins.map((c) => ({
    coinId: c.id, denom: c.denominacao, ai: c.ano_inicio, af: c.ano_fim,
    valor: escudosDeDenom(c.denominacao), metal: `${c.metal || ''} ${c.composicao || ''} ${c.denominacao}`,
  }))
}

// metais que o pai escreve na descrição → palavra-chave para desempatar variantes
const METAL_KW = [
  [/lat[ãa]o|brass/i, /brass|lat/i], [/cupro|c[uú]pr|nickel|n[ií]quel/i, /nickel|cupro|c[uú]pr/i],
  [/bronze/i, /bronze/i], [/a[çc]o|steel/i, /steel|a[çc]o/i], [/prata|silver/i, /silver|prata/i],
  [/alum[íi]nio|aluminium/i, /alumin/i],
]

function casar(c, cat) {
  // candidatos: mesmo valor + ano dentro do intervalo do tipo
  const cands = cat.filter((x) => x.valor != null && c.facial != null &&
    Math.abs(x.valor - c.facial) < 0.001 && x.ai != null && c.ano >= x.ai && c.ano <= (x.af ?? x.ai + 60))
  if (cands.length === 0) return { tipo: 'sem_match' }

  if (c.familia !== 'comemorativa') {
    let base = cands.filter((x) => !temaParens(x.denom) && !ehVariante(x.denom))
    if (base.length === 0) base = cands
    // desempate por metal da descrição do pai
    const metalCand = base.filter((x) => METAL_KW.some(([re1, re2]) => re1.test(c.desc) && re2.test(x.metal)))
    if (metalCand.length) base = metalCand
    // intervalo mais específico (mais estreito) que contém o ano
    const esc = base.sort((a, b) => ((a.af ?? a.ai) - a.ai) - ((b.af ?? b.ai) - b.ai))[0]
    return { tipo: (cands.length === 1 || base.length === 1) ? 'match' : 'match_fraco', alvo: esc }
  }
  // comemorativa: sobreposição de palavras desc↔tema; penaliza variantes de metal
  const palavras = new Set(norm(c.desc))
  let best = null, bestScore = -1
  for (const x of cands) {
    const alvo = norm(temaParens(x.denom) || x.denom)
    const inter = alvo.filter((w) => palavras.has(w)).length
    const score = (alvo.length ? inter / alvo.length : 0) - (ehVariante(x.denom) ? 0.3 : 0)
    if (score > bestScore) { bestScore = score; best = x }
  }
  return { tipo: bestScore >= 0.34 ? 'match' : 'match_fraco', alvo: best, score: bestScore }
}

// Encontra (ou cria) a issue do ano possuído sob o tipo fidedigno.
async function issueDoAno(coinId, ano) {
  const { data: ex } = await supabase.from('catalog_issues')
    .select('id').eq('catalog_coin_id', coinId).eq('ano_gregoriano', ano).limit(1).maybeSingle()
  if (ex) return ex.id
  const { data: nova, error } = await supabase.from('catalog_issues')
    .insert({ catalog_coin_id: coinId, ano: String(ano), ano_gregoriano: ano, html_est0: 0, html_qf: 0, html_verde: false })
    .select('id').single()
  if (error) throw error
  return nova.id
}

async function main() {
  const moedas = JSON.parse(readFileSync(join(ROOT, 'scripts/.escudos.json'), 'utf8'))
  const cat = await carregarCatalogo()
  console.log(`Catálogo histórico PT: ${cat.length} issues (${cat.filter((x) => x.valor != null).length} com valor)`)

  const r = { match: [], match_fraco: [], sem_match: [] }
  for (const c of moedas) { const res = casar(c, cat); res.c = c; r[res.tipo].push(res) }
  console.log(`\nDe ${moedas.length} moedas possuídas:`)
  console.log(`  ✓ match forte: ${r.match.length}`)
  console.log(`  ~ match fraco (rever): ${r.match_fraco.length}`)
  console.log(`  ✗ sem match: ${r.sem_match.length}`)
  console.log('\nAmostra SEM MATCH:')
  for (const x of r.sem_match.slice(0, 15)) console.log(`   ${x.c.ano} · ${x.c.facial} · ${x.c.desc.slice(0, 40)}`)
  console.log('\nAmostra MATCH FRACO:')
  for (const x of r.match_fraco.slice(0, 10)) console.log(`   ${x.c.ano} ${x.c.facial} "${x.c.desc.slice(0, 28)}" → ${x.alvo?.denom.slice(0, 40)}`)

  if (!APPLY) {
    // dump para revisão manual (fracos + sem-match), separando comemorativas (risco de tema)
    const linhas = []
    linhas.push('# REVISÃO — matches FRACOS (rever o alvo) e SEM-MATCH\n')
    linhas.push('## Comemorativas FRACAS (tema pode estar trocado):')
    for (const x of r.match_fraco.filter((y) => y.c.familia === 'comemorativa'))
      linhas.push(`  ${x.c.ano} ${x.c.facial}$  "${x.c.desc}"  →  ${x.alvo?.denom}`)
    linhas.push('\n## Circulação FRACA (normalmente ok — variante de metal):')
    for (const x of r.match_fraco.filter((y) => y.c.familia !== 'comemorativa'))
      linhas.push(`  ${x.c.ano} ${x.c.facial}$  "${x.c.desc}"  →  ${x.alvo?.denom}`)
    linhas.push('\n## SEM MATCH (não existe no catálogo / valor ou ano estranho):')
    for (const x of r.sem_match)
      linhas.push(`  ${x.c.ano} ${x.c.facial}  "${x.c.desc}"`)
    const { writeFileSync } = await import('fs')
    writeFileSync(join(ROOT, 'scripts/.escudos-revisao.txt'), linhas.join('\n'))
    // origens (folha+linha) dos duvidosos → para marcar a vermelho no Excel
    const uncertos = [...r.match_fraco, ...r.sem_match].map((x) => ({ sheet: x.c.sheet, row: x.c.row }))
    writeFileSync(join(ROOT, 'scripts/.escudos-uncertos.json'), JSON.stringify(uncertos))
    console.log(`\n📝 ${r.match_fraco.length} fracos + ${r.sem_match.length} sem-match → scripts/.escudos-revisao.txt + .escudos-uncertos.json`)
    console.log('(--probe) sem escrever. Usar --apply para importar os match fortes.')
    return
  }

  // Valor de mercado EM EUROS (já corrigido na extração: circulação BC/MBC/Bela em €;
  // comemorativas MBC em €). Guardado por moeda individual (na issue do ano).
  let ins = 0, val = 0
  for (const x of [...r.match]) {
    const c = x.c, a = x.alvo
    const issueId = await issueDoAno(a.coinId, c.ano)  // issue do ano possuído sob o tipo fidedigno
    const melhor = c.bela ?? c.mbc ?? c.bc ?? null
    if (melhor != null && melhor > 0) {
      const precos = {}
      if (c.bc) precos.bc = c.bc; if (c.mbc) precos.mbc = c.mbc; if (c.bela) precos.bela = c.bela
      await supabase.from('catalog_issues').update({
        valor_mercado: melhor, valor_mercado_grau: c.bela ? 'bela' : c.mbc ? 'mbc' : 'bc',
        precos_mercado: precos, valor_mercado_moeda: 'EUR', valor_mercado_fonte: 'Coleção do pai (escudos)',
        valor_mercado_data: new Date().toISOString(),
      }).eq('id', issueId)
      val++
    }
    const { data: ex } = await supabase.from('collection').select('id')
      .eq('catalog_issue_id', issueId).eq('formato_posse', 'bnc').limit(1).maybeSingle()
    const fields = {
      catalog_coin_id: a.coinId, catalog_issue_id: issueId, quantidade: Math.round(c.qua),
      formato_posse: 'bnc', valor_base: melhor, nota_privada: c.prov ? `Proveniência: ${c.prov}` : null,
    }
    if (ex) await supabase.from('collection').update(fields).eq('id', ex.id)
    else await supabase.from('collection').insert(fields)
    ins++
    if (ins % 100 === 0) console.log(`  …${ins}`)
  }
  console.log(`\n✅ ${ins} exemplares de escudo · ${val} com valor de mercado (€, da coleção do pai).`)
}
main()
