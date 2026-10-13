const STORAGE_KEY = 'jso_api_base_url'
const BUILD_DEFAULT = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

function normalize(value) {
  return String(value || '').trim().replace(/\/$/, '')
}

function readOverride() {
  if (typeof window === 'undefined') return ''
  try {
    return normalize(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return ''
  }
}

// Runtime override (from the in-app settings) takes precedence over the
// build-time VITE_API_URL, which in turn falls back to the same-origin '/api'.
export let API_BASE_URL = readOverride() || BUILD_DEFAULT

export function getApiBaseUrl() {
  return API_BASE_URL
}

export function getConfiguredApiBaseUrl() {
  // The raw saved override, or '' when using the build default.
  return readOverride()
}

export function getDefaultApiBaseUrl() {
  return BUILD_DEFAULT
}

export function setApiBaseUrl(value) {
  const normalized = normalize(value)
  try {
    if (normalized) {
      window.localStorage.setItem(STORAGE_KEY, normalized)
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Ignore storage failures (e.g. private mode); fall back to in-memory value.
  }
  API_BASE_URL = normalized || BUILD_DEFAULT
  return API_BASE_URL
}

export function resetApiBaseUrl() {
  return setApiBaseUrl('')
}

/**
 * Resolve media paths emitted by the backend into browser-loadable URLs.
 *
 * Media assets may be stored as absolute URLs, root-relative paths such as
 * /uploads/media/2026/10/logo.png, or older paths relative to the API.
 */
export function resolveMediaUrl(value, { apiBaseUrl = API_BASE_URL, origin } = {}) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^(?:data:|blob:)/i.test(raw)) return raw

  const base = normalize(apiBaseUrl)
  const pageOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : '')
  const apiOrigin = (() => {
    try {
      return new URL(base || '/', pageOrigin || 'http://localhost').origin
    } catch {
      return pageOrigin
    }
  })()

  try {
    if (/^https?:\/\//i.test(raw)) return new URL(raw).href
    if (raw.startsWith('//')) return new URL(raw, pageOrigin || apiOrigin).href
    if (raw.startsWith('/uploads/')) return new URL(raw, apiOrigin || pageOrigin).href
    if (raw.startsWith('/api/uploads/')) return new URL(raw.replace(/^\/api/, ''), apiOrigin || pageOrigin).href
    if (raw.startsWith('/')) return new URL(raw, pageOrigin || apiOrigin).href
    return new URL(raw, base ? (base + '/') : (pageOrigin + '/')).href
  } catch {
    return raw
  }
}
