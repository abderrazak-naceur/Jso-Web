import { ADMIN_NAVIGATION } from './navigation.js'

const knownSections = new Set(ADMIN_NAVIGATION.map(([id]) => id))

export function adminSectionFromPath(pathname = window.location.pathname) {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean)
  if (parts[0] !== 'admin') return null
  if (parts.length === 1) return 'dashboard'
  if (parts.length === 2 && knownSections.has(parts[1])) return parts[1]
  if (parts.length === 4 && ['news', 'shop', 'matches', 'club-events'].includes(parts[1]) && parts[2] && parts[3] === 'edit') return parts[1]
  return null
}

export function adminSectionUrl(section) {
  return section === 'dashboard' ? '/admin' : `/admin/${section}`
}

export function adminEditUrl(section, id) {
  return `${adminSectionUrl(section)}/${encodeURIComponent(id)}/edit`
}

export function adminEditIdFromPath(section, pathname = window.location.pathname) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'admin' || parts[1] !== section || parts.length !== 4 || parts[3] !== 'edit') return null
  try { return decodeURIComponent(parts[2]) } catch { return null }
}

export function navigateAdminEdit(section, id) {
  const url = id ? adminEditUrl(section, id) : adminSectionUrl(section)
  if (window.location.pathname !== url) window.history.pushState({}, '', url)
}
