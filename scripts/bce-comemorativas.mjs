// Scrape das moedas comemorativas de 2€ do BCE, página oficial por ano (PT).
// Fonte autoritativa: /euro/coins/comm/html/comm_{ano}.pt.html
// Estrutura: cada país é um heading (h2/h3), seguido de
//   "Desenho: {tema oficial}  Descrição: {texto}  Volume de emissão: {n}  Data de emissão: {data}"
// Países repetem-se quando há mais de uma emissão nesse ano → cada bloco = 1 emissão.
//
// NÃO escreve na BD — grava bce-comemorativas.json para cruzar com o catálogo.
// Correr localmente (com rede): node scripts/bce-comemorativas.mjs

import { writeFile } from 'node:fs/promises'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const BASE = 'https://www.ecb.europa.eu'
const ANO_MIN = 2004
const ANO_MAX = 2026
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const txt = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim()

// Nome do país (PT, como aparece no BCE) → pais_codigo (minúsculo, como no catálogo).
const PAIS = {
  'Alemanha': 'de', 'Andorra': 'ad', 'Áustria': 'at', 'Bélgica': 'be', 'Bulgária': 'bg',
  'Chipre': 'cy', 'Croácia': 'hr', 'Eslováquia': 'sk', 'Eslovénia': 'si', 'Espanha': 'es',
  'Estónia': 'ee', 'Finlândia': 'fi', 'França': 'fr', 'Grécia': 'gr', 'Irlanda': 'ie',
  'Itália': 'it', 'Letónia': 'lv', 'Lituânia': 'lt', 'Luxemburgo': 'lu', 'Malta': 'mt',
  'Mónaco': 'mc', 'Países Baixos': 'nl', 'Holanda': 'nl', 'Portugal': 'pt',
  'São Marino': 'sm', 'Cidade do Vaticano': 'va', 'Países da área do euro': 'comum',
}

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt' }, redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

// Devolve o pedaço entre o início e a 1ª ocorrência de qualquer rótulo seguinte.
function ate(s, rotulos) {
  let fim = s.length
  for (const r of rotulos) {
    const i = s.search(r)
    if (i >= 0 && i < fim) fim = i
  }
  return s.slice(0, fim).trim()
}

function extrairAno(html, ano) {
  const mi = html.indexOf('<main')
  const me = html.indexOf('</main>')
  const main = mi >= 0 ? html.slice(mi, me > mi ? me : undefined) : html

  // Captura cada heading de país + a imagem que o precede no mesmo bloco anterior.
  const re = /<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/gi
  const heads = []
  let m
  while ((m = re.exec(main)) !== null) {
    const nome = txt(m[2])
    if (PAIS[nome]) heads.push({ nome, codigo: PAIS[nome], hIni: m.index, hFim: re.lastIndex })
  }

  const moedas = []
  for (let i = 0; i < heads.length; i++) {
    const h = heads[i]
    const corpoHtml = main.slice(h.hFim, i + 1 < heads.length ? heads[i + 1].hIni : undefined)
    const t = txt(corpoHtml)
    // imagem dentro do corpo deste país
    const img = (corpoHtml.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i) || [])[1] || null
    const tema = (t.match(/Desenho:\s*([\s\S]*?)(?:\s+Descri[çc][ãa]o:|\s+Volume|\s+Data de emiss|$)/i) || [])[1]?.trim() || null
    const descricao = (t.match(/Descri[çc][ãa]o:\s*([\s\S]*?)(?:\s+Volume de emiss|\s+Data de emiss|$)/i) || [])[1]?.trim() || null
    const volume = (t.match(/Volume de emiss[ãa]o:\s*([\s\S]*?)(?:\s+Data de emiss|$)/i) || [])[1]?.trim() || null
    const data = (t.match(/Data de emiss[ãa]o:\s*([\s\S]*?)$/i) || [])[1]?.trim() || null
    moedas.push({
      ano, pais_codigo: h.codigo, pais_nome_pt: h.nome,
      tema, descricao, volume, data,
      imagem: img && img.startsWith('/') ? BASE + img : img,
    })
  }
  return moedas
}

async function main() {
  const anos = []
  for (let a = ANO_MIN; a <= ANO_MAX; a++) anos.push(a)
  const todas = []
  const porAno = {}
  for (const ano of anos) {
    process.stdout.write(`→ ${ano} … `)
    try {
      const html = await get(`${BASE}/euro/coins/comm/html/comm_${ano}.pt.html`)
      const moedas = extrairAno(html, ano)
      porAno[ano] = moedas.length
      todas.push(...moedas)
      const semTema = moedas.filter((x) => !x.tema).length
      console.log(`${moedas.length} emissões${semTema ? ` (${semTema} sem tema!)` : ''}`)
    } catch (e) {
      console.log(`— ${e.message}`)
    }
    await sleep(700)
  }
  await writeFile('bce-comemorativas.json', JSON.stringify({ fonte: 'ECB comm_*.pt.html', total: todas.length, porAno, moedas: todas }, null, 2))
  const semCodigo = todas.filter((x) => x.pais_codigo === 'comum').length
  console.log(`\n✓ ${todas.length} emissões em ${Object.keys(porAno).length} anos · ${semCodigo} de emissão comum`)
  console.log('Escrito: bce-comemorativas.json')
}

main()
