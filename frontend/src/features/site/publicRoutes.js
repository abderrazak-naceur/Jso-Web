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
  if (matchIdFromPath(pathname) || matchSlugFromPath(pathname)) return 'matches'
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
  // Accept both legacy /matchs/{uuid} links and readable SEO slugs ending in the UUID.
  const match = /^\/matchs\/(?:.*-)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i.exec(pathname)
  return match?.[1] || null
}
export function slugifyMatchPart(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function matchOpponentName(match) {
  const candidates = [
    match?.opponentName, match?.OpponentName,
    match?.opponent, match?.Opponent,
    match?.opponent?.name, match?.Opponent?.Name,
    match?.opponentTeamName, match?.OpponentTeamName,
    match?.awayTeamName, match?.AwayTeamName,
    match?.homeTeamName, match?.HomeTeamName,
    match?.opponentTeam?.name, match?.OpponentTeam?.Name,
    match?.awayTeam?.name, match?.AwayTeam?.Name,
    match?.homeTeam?.name, match?.HomeTeam?.Name,
  ]
  const value = candidates.find((item) => typeof item === 'string' && item.trim())
  return value?.trim() || ''
}

export function matchSlugFor(match) {
  const opponentSlug = slugifyMatchPart(matchOpponentName(match)) || 'adversaire'
  return 'jso-vs-' + opponentSlug
}

export function matchSlugFromPath(pathname = window.location.pathname) {
  const match = /^\/matchs\/(jso-vs(?:-[a-z0-9-]*)?)\/?$/i.exec(pathname)
  return match?.[1]?.toLowerCase() || null
}

export function eventSlugFromPath(pathname = window.location.pathname) {
  const match = /^\/agenda\/([^/]+)\/?$/.exec(pathname)
  try { return match ? decodeURIComponent(match[1]) : null } catch { return null }
}
