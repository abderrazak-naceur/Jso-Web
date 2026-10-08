import { API_BASE_URL } from './apiConfig'

export function sharePreviewUrl(kind, key) {
  return new URL(`${API_BASE_URL}/share/${encodeURIComponent(kind)}/${encodeURIComponent(key)}`, window.location.origin).href
}
