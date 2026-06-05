/**
 * Limpa nomes e preenche campos das moedas de coleção/comemorativas de Portugal
 * 2023-2026 importadas da Maktun (vinham com a denominação em inglês, tema=null e
 * metal/composição vazios). As designações PT vêm do PLANO NUMISMÁTICO da INCM
 * (assets/books/PN2023..2026) e da loja oficial (loja.incm.pt) — fontes de verdade
 * permitidas. Não inventa: só escreve metal/composição quando é inequívoco
 * (sufixo "- Silver"/"- Gold" no nome, ou peso/valor que o Plano fixa por metal).
 *
 *   node scripts/limpar-nomes-pt.mjs            (mostra o que faria)
 *   node scripts/limpar-nomes-pt.mjs --apply    (escreve na BD)
 */
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

// tema oficial PT (Plano Numismático INCM) ← palavra-chave do nome inglês da Maktun
const TEMAS = [
  // 2023
  [/4000 Reis|Peter II/i, 'Tesouros Numismáticos — 4000 Réis de D. Pedro, Príncipe Regente'],
  [/Dinosaurs|Miragaia/i, 'Dinossauros de Portugal — Miragaia longicollum'],
  [/Indo-Portuguese [Ff]urniture|Mobiliário Indo/i, 'Mobiliário Indo-Português (Portugal e o Oriente)'],
  [/José Afonso|ZECA AFONSO/i, 'Músicos Portugueses — José Afonso (Zeca Afonso)'],
  [/Unicorn/i, 'Heróis e Criaturas da Mitologia — Unicórnio'],
  [/Longleaf spearmint/i, 'Espécies de Plantas Ameaçadas — Hortelã-brava-de-folha-longa'],
  [/Sea Literacy/i, 'Literacia dos Mares (125 Anos do Aquário Vasco da Gama)'],
  [/Digital World/i, 'O Mundo Digital'],
  [/Bordalo II|Contemporary Urban Art/i, 'Arte Contemporânea Urbana — Bordalo II'],
  // 2024
  [/Camões/i, '500.º Aniversário de Luís Vaz de Camões'],
  [/Skating Federation/i, '100 Anos da Federação de Patinagem de Portugal'],
  [/Draw a coin: Knowledge|Knowledge/i, 'Desenhar a Moeda — O Conhecimento'],
  [/Odysseus/i, 'Heróis e Criaturas da Mitologia — Ulisses'],
  [/UEFA Euro 2024/i, 'UEFA Euro 2024'],
  [/Xutos/i, 'Músicos Portugueses — Xutos & Pontapés'],
  [/Dobra of 24 escudos/i, 'Tesouros Numismáticos — «Dobra» de 24 Escudos'],
  [/Ibero-American Capitals/i, 'Capitais Ibero-Americanas: Lisboa (Série Ibero-Americana)'],
  [/Carnation Revolution/i, 'Liberdade, Liberdade! (50 Anos do 25 de Abril)'],
  // 2025
  [/Camilo Castelo Branco/i, '200.º Aniversário do Nascimento de Camilo Castelo Branco'],
  [/Cabo de São Vicente/i, 'Cabo de São Vicente (Faróis de Portugal)'],
  [/Phoenix/i, 'Fénix (Heróis e Criaturas da Mitologia)'],
  [/tiles 16th/i, 'Azulejaria Portuguesa — Século XVI'],
  [/tiles 17th/i, 'Azulejaria Portuguesa — Século XVII'],
  [/tiles 18th/i, 'Azulejaria Portuguesa — Século XVIII'],
  [/tiles 19th/i, 'Azulejaria Portuguesa — Século XIX'],
  [/tiles 20th/i, 'Azulejaria Portuguesa — Século XX'],
  [/Simone de Oliveira/i, 'Músicos Portugueses — Simone de Oliveira'],
  [/Ponte de Lima/i, '900 Anos do Foral de Ponte de Lima'],
  [/Free Elections/i, '50 Anos de Eleições em Liberdade (1975-2025)'],
  [/Pa[ou]la Rego/i, 'Paula Rego — Deixa-me Pintar-te uma História'],
  // 2026
  [/1976 Constitution/i, '50 Anos da Constituição de 1976'],
  [/Freedom and Democracy/i, 'Liberdade e Democracia'],
  [/FIFA World Cup/i, 'Mundial de Futebol FIFA'],
  [/Flagship Coin/i, 'Moeda Emblemática de Portugal'],
]

function temaDe(den) {
  for (const [re, pt] of TEMAS) if (re.test(den)) return pt
  return null
}

// metal/composição só quando é inequívoco (nunca inventar)
function metalDe(den, tema, facial, peso) {
  const p = Number(peso), f = Number(facial)
  if (/-\s*Gold\b/i.test(den)) return ['Ouro', 'Ouro 999‰ (proof)']
  if (/-\s*Silver\b(?!\s*Color)/i.test(den)) return ['Prata', 'Prata 925‰ (proof)']
  // Azulejaria 2025: o Plano emite-a só em prata 999 (5 × 5 €)
  if (/Azulejaria/i.test(tema || '')) return ['Prata', 'Prata 999‰ (proof)']
  if (f === 7.5) {
    if (Math.abs(p - 13.5) < 0.3) return ['Prata', 'Prata 925‰ (proof)']
    if (Math.abs(p - 18.5) < 0.3) return ['Cuproníquel', 'Cuproníquel CuNi 75/25']
    if (Math.abs(p - 23.33) < 0.3) return ['Ouro', 'Ouro 999‰ (proof)']
  }
  if (f === 30) return ['Ouro', 'Ouro 999‰ (proof, 1 oz)']
  if (f === 8) return ['Ouro', 'Ouro 999‰ (proof, 1/4 oz)']
  if (f === 2.5 && /Tesouros|Dobra|4000 Réis/i.test(tema || '')) return ['Ouro', 'Ouro 999‰ (proof)']
  if (f === 10 && Math.abs(p - 27) < 0.6) return ['Prata', 'Prata 925‰ (proof)']
  return [null, null]
}

function denomEuro(f) {
  const n = Number(f)
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')
  return `${s} Euro`
}

async function main() {
  const { data, error } = await supabase
    .from('catalog_coins')
    .select('id, familia, valor_facial, denominacao, tema, metal, composicao, peso_g')
    .eq('pais_codigo', 'pt')
    .in('familia', ['euro_colecao', 'euro_comemorativa'])
  if (error) throw error

  // Só moedas com emissão 2023-2026 — as designações curadas são desses anos; sem
  // este filtro a regex apanhava FIFA 2010/2014/2018, Ibero-Americanas antigas, etc.
  const ids = new Set()
  const todosIds = data.map((c) => c.id)
  for (let i = 0; i < todosIds.length; i += 200) {
    const { data: is, error: e } = await supabase
      .from('catalog_issues').select('catalog_coin_id, ano_gregoriano')
      .in('catalog_coin_id', todosIds.slice(i, i + 200))
      .gte('ano_gregoriano', 2023).lte('ano_gregoriano', 2026)
    if (e) throw e
    is.forEach((r) => ids.add(r.catalog_coin_id))
  }
  const moedas = data.filter((c) => ids.has(c.id))

  let tocadas = 0, semTema = []
  for (const c of moedas) {
    const tema = temaDe(c.denominacao)
    if (!tema) {
      // comemorativas (2€) já têm tema PT; só sinalizar coleção sem mapeamento
      if (c.familia === 'euro_colecao' && /[A-Za-z]{4}/.test(c.denominacao) &&
          !/^\d[\d.,]*\s*Euro$/i.test(c.denominacao)) semTema.push(c.denominacao)
      continue
    }
    const [metal, comp] = metalDe(c.denominacao, tema, c.valor_facial, c.peso_g)
    const patch = { tema, denominacao: denomEuro(c.valor_facial) }
    if (metal && !c.metal) patch.metal = metal
    if (comp && !c.composicao) patch.composicao = comp
    tocadas++
    console.log(`${c.valor_facial}€  ${tema}${metal ? `  [${metal}]` : '  [metal?]'}`)
    if (APPLY) {
      const { error: e } = await supabase.from('catalog_coins')
        .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', c.id)
      if (e) console.error('  ✗', e.message)
    }
  }

  console.log(`\n${APPLY ? '✅ Escritas' : '🔎 (dry-run) seriam'} ${tocadas} moedas.`)
  if (semTema.length) {
    console.log(`\n⚠️ ${semTema.length} coleção sem mapeamento de tema (rever):`)
    ;[...new Set(semTema)].slice(0, 40).forEach((d) => console.log('  ·', d))
  }
  if (!APPLY) console.log('\nCorrer com --apply para escrever.')
}
main()
