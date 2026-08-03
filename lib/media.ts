import type { CatalogCoin, CatalogIssue, CollectionItem } from './types'

const SUPABASE_MOEDAS_PREFIX =
  'https://eozklslwfaqujaijvdnl.supabase.co/storage/v1/object/public/moedas/'
const R2_NUMIS_ASSETS_PREFIX =
  process.env.NEXT_PUBLIC_NUMIS_ASSETS_URL ??
  'https://mazzo-media-pilot.mariocarvalho-biz.workers.dev/assets/'

export function normalizarUrlImagem(url: string | null | undefined): string | null {
  if (!url) return null
  if (!url.startsWith(SUPABASE_MOEDAS_PREFIX)) return url
  return `${R2_NUMIS_ASSETS_PREFIX}${url.slice(SUPABASE_MOEDAS_PREFIX.length)}`
}

export function normalizarCoin(coin: CatalogCoin): CatalogCoin {
  return {
    ...coin,
    anverso_img: normalizarUrlImagem(coin.anverso_img),
    reverso_img: normalizarUrlImagem(coin.reverso_img),
  }
}

export function normalizarIssue(issue: CatalogIssue): CatalogIssue {
  return {
    ...issue,
    anverso_img: normalizarUrlImagem(issue.anverso_img),
    reverso_img: normalizarUrlImagem(issue.reverso_img),
  }
}

export function normalizarExemplar(exemplar: CollectionItem): CollectionItem {
  return {
    ...exemplar,
    foto1: normalizarUrlImagem(exemplar.foto1),
    foto2: normalizarUrlImagem(exemplar.foto2),
    foto3: normalizarUrlImagem(exemplar.foto3),
  }
}
