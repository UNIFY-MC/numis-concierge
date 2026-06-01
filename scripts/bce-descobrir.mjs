// Descoberta da estrutura de imagens do BCE (entidade emissora dos euros).
// NÃO escreve na base de dados — só faz fetch das páginas oficiais e despeja
// todas as imagens com o seu contexto (país, descrição) para bce-estrutura.json,
// para verificarmos a estrutura REAL antes de construir o enriquecimento.
//
// Correr no ambiente local (com rede): node scripts/bce-descobrir.mjs
// Requer Node 18+ (fetch global).

import { writeFile } from 'node:fs/promises'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const BASE = 'https://www.ecb.europa.eu'

// Páginas das faces nacionais por denominação + comemorativas por ano.
const ANO_ATUAL = new Date().getFullYear()
const anosComem = []
for (let a = 2004; a <= ANO_ATUAL; a++) anosComem.push(a)

const PAGINAS = [
  { tipo: 'nacional', denom: '1cent', url: `${BASE}/euro/coins/1cent/html/index.en.html` },
  { tipo: 'nacional', denom: '2cent', url: `${BASE}/euro/coins/2cent/html/index.en.html` },
  { tipo: 'nacional', denom: '5cent', url: `${BASE}/euro/coins/5cent/html/index.en.html` },
  { tipo: 'nacional', denom: '10cent', url: `${BASE}/euro/coins/10cent/html/index.en.html` },
  { tipo: 'nacional', denom: '20cent', url: `${BASE}/euro/coins/20cent/html/index.en.html` },
  { tipo: 'nacional', denom: '50cent', url: `${BASE}/euro/coins/50cent/html/index.en.html` },
  { tipo: 'nacional', denom: '1euro', url: `${BASE}/euro/coins/1euro/html/index.en.html` },
  { tipo: 'nacional', denom: '2euro', url: `${BASE}/euro/coins/2euro/html/index.en.html` },
  { tipo: 'comum', denom: 'common', url: `${BASE}/euro/coins/common/html/index.en.html` },
  ...anosComem.map((a) => ({ tipo: 'comemorativa', ano: a, url: `${BASE}/euro/coins/comm/html/comm_${a}.en.html` })),
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function absoluto(src) {
  if (!src) return null
  if (src.startsWith('http')) return src
  if (src.startsWith('//')) return 'https:' + src
  if (src.startsWith('/')) return BASE + src
  return BASE + '/' + src
}

// Tira tags HTML e normaliza espaços, para dar contexto legível.
function texto(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

// Extrai cada <img>, o seu src/alt e o texto visível imediatamente antes (contexto).
function extrairImagens(html) {
  const out = []
  const re = /<img\b[^>]*>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const tag = m[0]
    const src = (tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i) || [])[1] || null
    const alt = (tag.match(/\balt\s*=\s*["']([^"']*)["']/i) || [])[1] || ''
    const title = (tag.match(/\btitle\s*=\s*["']([^"']*)["']/i) || [])[1] || ''
    const antes = texto(html.slice(Math.max(0, m.index - 400), m.index)).slice(-160)
    out.push({ src: absoluto(src), alt, title, contextoAntes: antes })
  }
  return out
}

// Capta também os títulos de secção (país) para vermos como estão organizados.
function extrairTitulos(html) {
  const out = []
  const re = /<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi
  let m
  while ((m = re.exec(html)) !== null) out.push({ nivel: +m[1], texto: texto(m[2]) })
  return out.filter((t) => t.texto)
}

async function fetchPagina(p) {
  try {
    const res = await fetch(p.url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en',
      },
      redirect: 'follow',
    })
    if (!res.ok) return { ...p, status: res.status, erro: `HTTP ${res.status}` }
    const html = await res.text()
    const imagens = extrairImagens(html)
    // Só interessam imagens que parecem moedas (filtra logótipos/ícones óbvios).
    const moedas = imagens.filter((i) => i.src && /\.(jpg|jpeg|png|gif)(\?|$)/i.test(i.src))
    return {
      ...p,
      status: res.status,
      finalUrl: res.url,
      bytes: html.length,
      titulos: extrairTitulos(html).slice(0, 60),
      totalImagens: imagens.length,
      imagens: moedas.slice(0, 80),
    }
  } catch (e) {
    return { ...p, erro: String(e?.message ?? e) }
  }
}

async function main() {
  const resultados = []
  for (const p of PAGINAS) {
    process.stdout.write(`→ ${p.url} … `)
    const r = await fetchPagina(p)
    console.log(r.erro ? `ERRO ${r.erro}` : `${r.status} · ${r.imagens?.length ?? 0} imgs de moeda`)
    resultados.push(r)
    await sleep(800) // educado com o servidor
  }
  await writeFile('bce-estrutura.json', JSON.stringify(resultados, null, 2))
  const ok = resultados.filter((r) => !r.erro)
  const totalMoedas = ok.reduce((s, r) => s + (r.imagens?.length ?? 0), 0)
  console.log(`\n✓ ${ok.length}/${resultados.length} páginas OK · ${totalMoedas} imagens de moeda`)
  console.log('Escrito: bce-estrutura.json (revê e partilha para construirmos o parser exato)')
}

main()
