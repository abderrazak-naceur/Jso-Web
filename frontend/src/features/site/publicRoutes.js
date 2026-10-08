export const SECTION_PATHS = Object.freeze({
  matches: '/matchs',
  news: '/actualites',
  team: '/equipe',
  club: '/club',
  shop: '/boutique',
  donation: '/soutenir',
  memberships: '/abonnements',
  media: '/medias',
  events: '/agenda',
  community: '/communaute',
  archive: '/musee',
  mobile: '/application',
  sponsors: '/partenaires',
  infos: '/infos',
})

const sectionByPath = Object.fromEntries(Object.entries(SECTION_PATHS).map(([id, path]) => [path, id]))

export function sectionFromPath(pathname = window.location.pathname) {
  if (productSlugFromPath(pathname)) return 'shop'
  if (matchIdFromPath(pathname)) return 'matches'
  if (eventSlugFromPath(pathname)) return 'events'
  return sectionByPath[pathname.replace(/\/+$/, '')] || null
}

export function sectionUrl(id) {
  return SECTION_PATHS[id] || '/'
}

export function productSlugFromPath(pathname = window.location.pathname) {
  const match = /^\/boutique\/([^/]+)\/?$/.exec(pathname)
  try { return match ? decodeURIComponent(match[1]) : null } catch { return null }
}

export function matchIdFromPath(pathname = window.location.pathname) {
  const match = /^\/matchs\/([0-9a-f]{8}-[0-9a-f-]{27,})\/?$/i.exec(pathname)
  return match?.[1] || null
}

export function eventSlugFromPath(pathname = window.location.pathname) {
  const match = /^\/agenda\/([^/]+)\/?$/.exec(pathname)
  try { return match ? decodeURIComponent(match[1]) : null } catch { return null }
}
