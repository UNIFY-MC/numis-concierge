import type { MetadataRoute } from 'next'

// PWA: instalável no telemóvel ("Adicionar ao ecrã principal") — abre em fullscreen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'numis.coins',
    short_name: 'numis',
    description: 'Catálogo e coleção de moedas de euro — Numis Concierge.',
    start_url: '/inicio',
    display: 'standalone',
    background_color: '#f7f3ec',
    theme_color: '#7651e8',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
