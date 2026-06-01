import type { CatalogCoin, CatalogIssue } from './types'

// URL de pesquisa Numista — como o HTML original (não há ID guardado).
export function numistaSearchUrl(coin: CatalogCoin, issue: CatalogIssue): string {
  const termo = `${coin.pais_nome} ${coin.denominacao ?? coin.titulo} ${issue.ano}`
  return 'https://pt.numista.com/catalogue/recherche.php?r=' + encodeURIComponent(termo)
}
