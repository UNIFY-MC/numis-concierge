import type { CatalogCoin, CatalogIssue } from './types'

// URL de pesquisa Numista — fallback quando não há numista_id guardado.
export function numistaSearchUrl(coin: CatalogCoin, issue: CatalogIssue): string {
  const termo = `${coin.pais_nome} ${coin.denominacao ?? coin.titulo} ${issue.ano}`
  return 'https://pt.numista.com/catalogue/recherche.php?r=' + encodeURIComponent(termo)
}

// Link directo ao tipo na Numista quando já temos o id (via enriquecimento);
// senão cai na pesquisa.
export function numistaUrl(coin: CatalogCoin, issue: CatalogIssue): string {
  if (coin.numista_id) return `https://pt.numista.com/catalogue/pieces${coin.numista_id}.html`
  return numistaSearchUrl(coin, issue)
}
