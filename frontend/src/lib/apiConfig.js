const STORAGE_KEY = 'jso_api_base_url'
const BUILD_DEFAULT = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '')
const API_ORIGIN_FALLBACK = 'https://jso-api.onrender.com'

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
 * Uploaded files live on the API service, not the static frontend host. Paths
 * returned by the API are therefore rooted at that API's origin, even when the
 * configured API base URL is the relative same-origin "/api" path.
 */
export function resolveMediaUrl(value, { apiBaseUrl = API_BASE_URL, origin, mediaOrigin } = {}) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^(?:data:|blob:)/i.test(raw)) return raw

  const base = normalize(apiBaseUrl)
  const pageOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : '')
  const explicitApiOrigin = (() => {
    try {
      if (/^https?:\/\//i.test(base)) return new URL(base).origin
      return ''
    } catch {
      return ''
    }
  })()
  const storageOrigin = mediaOrigin || explicitApiOrigin || API_ORIGIN_FALLBACK

  try {
    if (/^https?:\/\//i.test(raw)) return new URL(raw).href
    if (raw.startsWith('//')) return new URL(raw, pageOrigin || storageOrigin).href
    if (raw.startsWith('/uploads/')) return new URL(raw, storageOrigin).href
    if (raw.startsWith('/api/uploads/')) return new URL(raw.replace(/^\/api/, ''), storageOrigin).href
    if (raw.startsWith('/')) return new URL(raw, pageOrigin || storageOrigin).href
    return new URL(raw, base ? (base + '/') : (pageOrigin || storageOrigin) + '/').href
  } catch {
    return raw
  }
}
