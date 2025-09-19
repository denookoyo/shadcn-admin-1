/* FleetOps basic service worker for offline POS + PWA install */
const CACHE_NAME = 'fleetops-pwa-v1'
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/marketplace/dashboard/pos',
]

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k)))))
  )
  self.clients.claim()
})

// Simple strategy:
// - Navigation requests: try network, fallback to cached index.html for offline SPA
// - Static same-origin GET: cache-first
// - API: network-first (no cache persist)
self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== 'GET') return

  // API passthrough with network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req).catch(() => new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } }))
    )
    return
  }

  // Navigations → network first, fallback to cached index
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(CACHE_NAME)
        return (await cache.match('/index.html')) || Response.error()
      })
    )
    return
  }

  // Static assets → cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((resp) => {
        const copy = resp.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {})
        return resp
      }).catch(() => cached))
    )
  }
})

