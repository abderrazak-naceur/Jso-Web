import { API_BASE_URL } from '../lib/apiConfig'

export async function adminApi(path, options = {}) {
  const token = localStorage.getItem('jso_admin_token')
  let response
  try {
    response = await fetch(API_BASE_URL + path, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`API inaccessible (${API_BASE_URL}). Vérifiez l'URL dans Configuration > Backend / API et la connexion réseau.`)
    }
    throw error
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      localStorage.removeItem('jso_admin_token')
      localStorage.removeItem('jso_admin_user')
      window.dispatchEvent(new Event('jso:admin-session-expired'))
    }
    let message = 'Request failed: ' + response.status
    try {
      const payload = await response.json()
      message = payload.message || message
    } catch {}
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  if (response.status === 204) return null
  return response.json()
}
