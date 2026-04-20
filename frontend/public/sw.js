// AURA — minimal offline-first service worker.
// Strategy: network-first for /api/*, cache-first with network-fallback for everything else.
// Keep it simple; no precaching list since Next.js hashes asset URLs.
const CACHE_NAME = 'aura-shell-v1'
const SHELL_URLS = ['/', '/dashboard', '/checklist', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(SHELL_URLS).catch(() => undefined),
    ),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // API: network-first, no cache (avoid stale data).
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(req).catch(() => new Response('{"offline":true}', {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })))
    return
  }

  // Assets + pages: cache-first with background update.
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => undefined)
          }
          return res
        })
        .catch(() => cached)
      return cached || networkFetch
    }),
  )
})
