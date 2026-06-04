/**
 * Classifica as moedas de Portugal em SÉRIES (modelo Colnect), preenchendo
 * catalog_coins.serie + serie_ord. Organização: Era → Série/Reinado → ano.
 *
 * - Monarquia (<1911): por reinado, atribuído pelo ano, com ajuste das fronteiras
 *   conhecidas (regência de Pedro II 1668-83; Manuel II até 1910).
 * - Escudo (1911-2001): 1ª República · Estado Novo · República (Escudo).
 * - Euro: Circulação · Comemorativas 2€ · Coleção · ECU.
 * - Regiões (Açores/Madeira/Índia) e Fichas/Tokens: séries próprias.
 *
 *   node scripts/classificar-series-pt.mjs --probe   # mostra distribuição, não escreve
 *   node scripts/classificar-series-pt.mjs --apply
 */
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
config({ path: join(ROOT, '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'numis' }, auth: { persistSession: false },
})
const APPLY = process.argv.includes('--apply')

// Reinados (ord 1-33). `ate` é exclusivo (= início do próximo). Manuel II vai até
// 1910 inclusive (ate 1911) para apanhar as moedas do ano da implantação da República.
const REINADOS = [
  [1, 'D. Sancho II', 1223, 1248], [2, 'D. Afonso III', 1248, 1279], [3, 'D. Dinis I', 1279, 1325],
  [4, 'D. Afonso IV', 1325, 1357], [5, 'D. Pedro I', 1357, 1367], [6, 'D. Fernando I', 1367, 1385],
  [7, 'D. João I', 1385, 1433], [8, 'D. Duarte I', 1433, 1438], [9, 'D. Afonso V', 1438, 1481],
  [10, 'D. João II', 1481, 1495], [11, 'D. Manuel I', 1495, 1521], [12, 'D. João III', 1521, 1557],
  [13, 'D. Sebastião', 1557, 1581], [14, 'Dinastia Filipina I', 1581, 1598], [15, 'Filipe II', 1598, 1621],
  [16, 'Filipe III', 1621, 1640], [17, 'D. João IV', 1640, 1656], [18, 'D. Afonso VI', 1656, 1683],
  [19, 'D. Pedro II', 1683, 1706], [20, 'D. João V', 1706, 1750], [21, 'D. José I', 1750, 1777],
  [22, 'D. Maria I e D. Pedro III', 1777, 1786], [23, 'D. Maria I', 1786, 1799],
  [24, 'D. João (Príncipe Regente)', 1799, 1816], [25, 'D. João VI', 1816, 1826],
  [26, 'D. Pedro IV', 1826, 1828], [27, 'D. Miguel I', 1828, 1834], [28, 'D. Maria II', 1834, 1853],
  [29, 'D. Pedro V', 1853, 1861], [30, 'D. Luís I', 1861, 1889], [31, 'D. Carlos I', 1889, 1908],
  [32, 'D. Manuel II', 1908, 1911],
]

function reinadoPorAno(ano, t) {
  // Ajuste: as moedas da regência de D. Pedro (1668-1683, ainda sob Afonso VI) são
  // catalogadas como D. Pedro II.
  if (ano >= 1668 && ano <= 1683 && /(pedro|regent)/i.test(t)) return REINADOS[18] // D. Pedro II
  for (const r of REINADOS) if (ano >= r[2] && ano < r[3]) return r
  return null
}

function classificar(c) {
  const t = (c.titulo || '').toLowerCase()
  if (/\bazor/i.test(t)) return ['Açores', 50]
  if (/madeira/i.test(t)) return ['Madeira', 51]
  if (/indian/i.test(t)) return ['Índia Portuguesa', 52]
  if (c.moeda_hist === 'Token' || /\btoken\b/i.test(t)) return ['Fichas e Tokens', 60]

  if (c.familia === 'euro_circulacao') return ['Euro · Circulação', 41]
  if (c.familia === 'euro_comemorativa') return ['Euro · Comemorativas 2€', 42]
  if (c.familia === 'euro_colecao') {
    const cur = c.maktun_raw?.currency?.title || ''
    if (/ecu/i.test(cur)) return ['ECU (pré-euro)', 40]
    return ['Euro · Coleção', 43]
  }

  const ano = c.ano
  if (ano == null) return ['Por classificar', 98]
  if (ano < 1911) { const r = reinadoPorAno(ano, t); return r ? [r[1], r[0]] : ['Monarquia (s/ reinado)', 33] }
  if (ano < 1926) return ['1ª República', 34]
  if (ano < 1974) return ['Estado Novo', 35]
  // 2ª República (Escudo): separar circulação corrente da coleção, por metal.
  if (ano < 2002) {
    const m = (c.titulo || '').match(/\b(Gold|Silver|Palladium|Platinum)\b/i)
    const metal = m ? m[1].toLowerCase() : ''
    if (metal === 'gold') return ['Escudo · Coleção Ouro', 38]
    if (metal === 'palladium' || metal === 'platinum') return ['Escudo · Coleção Paládio/Platina', 39]
    if (metal === 'silver') return ['Escudo · Coleção Prata', 37]
    return ['Escudo · Circulação', 36]
  }
  return ['Euro · Coleção', 43]
}

async function main() {
  // carregar todas as PT (paginado) com o ano resolvido
  const coins = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from('catalog_coins')
      .select('id, titulo, moeda_hist, familia, ano_inicio, maktun_raw, catalog_issues(ano_gregoriano)')
      .eq('pais_codigo', 'pt').range(de, de + 999)
    if (error) { console.error('❌', error.message); process.exit(1) }
    coins.push(...data)
    if (data.length < 1000) break
  }
  for (const c of coins) c.ano = c.ano_inicio ?? c.catalog_issues?.[0]?.ano_gregoriano ?? null

  const dist = new Map()
  for (const c of coins) {
    const [serie, ord] = classificar(c)
    c._serie = serie; c._ord = ord
    const k = `${String(ord).padStart(2, '0')} · ${serie}`
    dist.set(k, (dist.get(k) || 0) + 1)
  }
  console.log(`\n${coins.length} moedas PT classificadas em ${dist.size} séries:\n`)
  for (const k of [...dist.keys()].sort()) console.log(`  ${k.padEnd(34)} ${dist.get(k)}`)

  if (!APPLY) { console.log('\n(dry-run — corre --apply para gravar)'); return }
  let n = 0
  for (const c of coins) {
    const { error } = await supabase.from('catalog_coins').update({ serie: c._serie, serie_ord: c._ord }).eq('id', c.id)
    if (error) { console.error('erro', c.id, error.message); continue }
    if (++n % 200 === 0) console.log(`  …${n}`)
  }
  console.log(`\n✅ ${n} moedas classificadas`)
}
main()
