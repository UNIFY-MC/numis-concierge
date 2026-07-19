// Service worker mínimo do numis.coins.
// Existe por dois motivos: (1) o Chrome/Android só oferece "Instalar" a apps com um
// SW que trate de `fetch`; (2) fallback quando não há rede. Deliberadamente NÃO faz
// cache de HTML/API — a coleção é dinâmica. Só assets estáticos imutáveis.

const VERSAO = 'numis-v1'
const OFFLINE = '/offline.html'
const ESSENCIAIS = [OFFLINE, '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(VERSAO).then((cache) => cache.addAll(ESSENCIAIS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== VERSAO).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (evento) => {
  const { request } = evento
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    evento.respondWith(fetch(request).catch(() => caches.match(OFFLINE)))
    return
  }

  if (url.pathname.startsWith('/_next/static/')) {
    evento.respondWith(
      caches.match(request).then(
        (emCache) =>
          emCache ||
          fetch(request).then((resposta) => {
            const copia = resposta.clone()
            caches.open(VERSAO).then((cache) => cache.put(request, copia))
            return resposta
          })
      )
    )
  }
})
