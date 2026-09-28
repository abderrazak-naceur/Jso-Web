/*
 * JSO — Service worker "mode stade hors-ligne" (idée E19).
 *
 * Objectif : permettre l'ouverture de l'app et la consultation des dernières
 * données publiques (calendrier, matchs, actualités, médias) au stade avec une
 * connexion faible, sans jamais mettre en cache de données authentifiées.
 *
 * Aucune dépendance externe (pas de Workbox) : PWA légère écrite à la main.
 *
 * Stratégies :
 *  - App shell / assets statiques  -> cache-first (precache du shell + runtime).
 *  - API publiques GET (/api/...)  -> stale-while-revalidate (réseau en tâche
 *    de fond, réponse immédiate depuis le cache si disponible).
 *  - Navigations HTML              -> network-first, repli sur le shell puis
 *    sur /offline.html.
 *
 * Jamais mis en cache :
 *  - toute requête non-GET,
 *  - toute requête portant un en-tête Authorization,
 *  - les routes /api/admin/... et les endpoints de compte fan.
 */

const VERSION = 'v1'
const SHELL_CACHE = `jso-shell-${VERSION}`
const RUNTIME_CACHE = `jso-runtime-${VERSION}`
const API_CACHE = `jso-api-${VERSION}`

// Fichiers du shell précachés à l'installation. On reste minimal : la page
// racine, la page de repli hors-ligne, le manifeste et le favicon. Les bundles
// hashés (JS/CSS) sont mis en cache à la volée (runtime) car leurs noms
// changent à chaque build.
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
]

// Préfixes d'API publiques dont les réponses GET peuvent être mises en cache.
const PUBLIC_API_PREFIXES = [
  '/api/home',
  '/api/club',
  '/api/matches',
  '/api/news',
  '/api/media',
  '/api/teams',
  '/api/events',
  '/api/sponsors',
  '/api/shop/products',
  '/api/documents',
  '/api/faq',
  '/api/archive',
  '/api/community-programs',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  const keep = new Set([SHELL_CACHE, RUNTIME_CACHE, API_CACHE])
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith('jso-') && !keep.has(name))
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

// Permet à la page de déclencher l'activation immédiate d'un nouveau SW
// (bouton "mettre à jour") sans boucle : on n'appelle skipWaiting que sur
// demande explicite.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

function isPublicApiRequest(url) {
  if (!url.pathname.startsWith('/api/')) return false
  // Ne jamais toucher aux routes admin ni aux endpoints de compte fan.
  if (url.pathname.startsWith('/api/admin')) return false
  if (url.pathname.startsWith('/api/account')) return false
  if (url.pathname.startsWith('/api/auth')) return false
  return PUBLIC_API_PREFIXES.some(
    (prefix) => url.pathname === prefix || url.pathname.startsWith(prefix + '/') || url.pathname.startsWith(prefix + '?'),
  )
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/uploads/') ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|svg|webp|gif|ico)$/i.test(url.pathname)
  )
}

// stale-while-revalidate pour les données publiques : réponse immédiate depuis
// le cache, rafraîchissement réseau en arrière-plan.
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => null)
  return cached || network.then((r) => r || cachedOrError(cached))
}

function cachedOrError(cached) {
  return (
    cached ||
    new Response(JSON.stringify({ error: 'offline', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  )
}

// cache-first pour les assets statiques immuables (bundles hashés, images).
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response && response.ok) cache.put(request, response.clone())
  return response
}

// network-first pour la navigation : on tente le réseau, puis on retombe sur
// le shell mis en cache, et en dernier recours sur la page hors-ligne.
async function navigationFallback(request) {
  try {
    const response = await fetch(request)
    return response
  } catch {
    const cache = await caches.open(SHELL_CACHE)
    const cachedShell = (await cache.match('/index.html')) || (await cache.match('/'))
    return cachedShell || cache.match('/offline.html')
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event

  // On ne gère que le GET ; le reste passe directement au réseau.
  if (request.method !== 'GET') return

  // Ne jamais mettre en cache une requête authentifiée.
  if (request.headers.has('Authorization')) return

  const url = new URL(request.url)

  // Seule l'origine courante nous intéresse (même origine que /api).
  if (url.origin !== self.location.origin) return

  // Navigations (pages HTML).
  if (request.mode === 'navigate') {
    event.respondWith(navigationFallback(request))
    return
  }

  // Données API publiques.
  if (isPublicApiRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE))
    return
  }

  // Assets statiques.
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE))
  }
})
