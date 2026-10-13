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

function teamDisplayName(value) {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (!value || typeof value !== 'object') return ''
  const name = value.name || value.Name || value.displayName || value.DisplayName || value.shortName || value.ShortName
  return typeof name === 'string' ? name.trim() : ''
}

function teamShortName(value) {
  if (!value || typeof value !== 'object') return ''
  const name = value.shortName || value.ShortName || value.abbreviation || value.Abbreviation ||
    value.acronym || value.Acronym || value.code || value.Code
  return typeof name === 'string' ? name.trim() : ''
}

const KNOWN_OPPONENT_ABBREVIATIONS = new Map([
  ['stade sportif sidi makhlouf', 'SSSM'],
  ['stade sportif de sidi makhlouf', 'SSSM'],
  ['الملعب الرياضي بسيدي مخلوف', 'SSSM'],
])

function knownOpponentAbbreviation(name) {
  const key = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  return KNOWN_OPPONENT_ABBREVIATIONS.get(key) || ''
}

// Prefer the club's official short name/abbreviation for the URL slug, while
// keeping the full opponent name available for display in the match UI.
export function matchOpponentShortName(match) {
  if (!match || typeof match !== 'object') return ''
  const directFields = [
    match.opponentShortName, match.OpponentShortName,
    match.opponentAbbreviation, match.OpponentAbbreviation,
    match.opponentAcronym, match.OpponentAcronym,
  ]
  for (const value of directFields) {
    const name = teamDisplayName(value)
    if (name) return name
  }

  const isHome = match.isHome ?? match.IsHome ?? true
  const opponent = isHome
    ? (match.awayTeam ?? match.AwayTeam ?? match.awayTeamName ?? match.AwayTeamName)
    : (match.homeTeam ?? match.HomeTeam ?? match.homeTeamName ?? match.HomeTeamName)
  return teamShortName(opponent)
}

// Match payloads have existed in a few shapes across the public API and older
// cached responses. Always resolve the opponent from the explicit field first,
// then from the home/away team based on whether JSO is playing at home.
export function matchOpponentName(match) {
  if (!match || typeof match !== 'object') return ''
  const directFields = [
    match.opponentName, match.OpponentName,
    match.opponentTeamName, match.OpponentTeamName,
    match.opponent, match.Opponent,
    match.opponentTeam, match.OpponentTeam,
    match.opponentShortName, match.OpponentShortName,
  ]
  for (const value of directFields) {
    const name = teamDisplayName(value)
    if (name) return name
  }

  const isHome = match.isHome ?? match.IsHome ?? true
  const opponent = isHome
    ? (match.awayTeam ?? match.AwayTeam ?? match.awayTeamName ?? match.AwayTeamName)
    : (match.homeTeam ?? match.HomeTeam ?? match.homeTeamName ?? match.HomeTeamName)
  return teamDisplayName(opponent)
}

export function matchSlugFor(match) {
  const fullName = matchOpponentName(match)
  const opponent = slugifyMatchPart(matchOpponentShortName(match) || knownOpponentAbbreviation(fullName) || fullName)
  if (opponent) return 'jso-vs-' + opponent
  const id = String(match?.id || match?.Id || '').replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase()
  return 'jso-vs-' + (id ? 'match-' + id : 'adversaire')
}

export function matchSlugFromPath(pathname = window.location.pathname) {
  const match = /^\/matchs\/(jso-vs-[a-z0-9-]+)\/?$/i.exec(pathname)
  return match?.[1]?.toLowerCase() || null
}

export function eventSlugFromPath(pathname = window.location.pathname) {
  const match = /^\/agenda\/([^/]+)\/?$/.exec(pathname)
  try { return match ? decodeURIComponent(match[1]) : null } catch { return null }
}
