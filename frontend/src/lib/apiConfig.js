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
