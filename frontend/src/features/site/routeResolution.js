import { SECTION_PATHS, eventSlugFromPath, matchIdFromPath, matchSlugFromPath, productSlugFromPath, sectionFromPath } from './publicRoutes.js'

const standalonePaths = new Set([
  '/', '/actualites', '/billetterie', '/nos-projets', '/soutenir', '/support-campaign-preview',
  '/account', '/mon-espace', '/account/tickets', '/account/memberships', '/account/orders',
  '/account/supports', '/account/payments', '/profil', '/profile', '/password-reset',
])

export function isKnownSitePath(pathname) {
  const path = String(pathname || '/').replace(/\/+$/, '') || '/'
  if (standalonePaths.has(path) || Object.values(SECTION_PATHS).includes(path)) return true
  if (path.startsWith('/admin/') || path === '/admin') return true
  if (/^\/payment\/[^/]+\/?$/.test(path)) return true
  return Boolean(sectionFromPath(path) || productSlugFromPath(path) || matchIdFromPath(path) || matchSlugFromPath(path) || eventSlugFromPath(path))
}
