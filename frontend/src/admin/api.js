import { API_BASE_URL } from '../lib/apiConfig'

export async function adminApi(path, options = {}) {
  const token = localStorage.getItem('jso_admin_token')
  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    let message = 'Request failed: ' + response.status
    try {
      const payload = await response.json()
      message = payload.message || message
    } catch {}
    throw new Error(message)
  }

  if (response.status === 204) return null
  return response.json()
}
