import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../../../lib/apiConfig'

const MEDIA_API_URL = (import.meta.env.VITE_MEDIA_API_URL || 'https://jso-media-api.onrender.com/api/media').replace(/\/$/, '')

export function validateImageFile(file) {
  if (!file) return 'Aucun fichier sélectionné.'
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return 'Utilisez une image PNG, JPG ou WebP.'
  if (file.size > 10 * 1024 * 1024) return 'L’image dépasse la limite de 10 Mo.'
  return null
}

export async function uploadMedia(file, title, caption) {
  const error = validateImageFile(file)
  if (error) throw new Error(error)
  const token = localStorage.getItem('jso_admin_token')
  if (!token) throw new Error('Session administrateur expirée. Reconnectez-vous.')
  const data = new FormData()
  data.append('file', file, file.name || title)
  data.append('title', title)
  data.append('caption', caption || '')
  let response
  try {
    response = await fetch(MEDIA_API_URL + '/upload', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      body: data,
    })
  } catch {
    throw new Error('Le service de stockage média est inaccessible. Réessayez dans un instant.')
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || payload.message || `Échec du téléversement (${response.status}).`)
  if (!payload.url || !/^https?:\/\//i.test(payload.url)) throw new Error('Le stockage média n’a pas retourné une URL publique valide.')
  return payload.url
}

function decode(source, cors = false) {
  return new Promise((resolve) => {
    const image = new Image()
    if (cors) image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = source
  })
}

async function fetchBlobImage(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    if (!blob.type.startsWith('image/')) return null
    const objectUrl = URL.createObjectURL(blob)
    const image = await decode(objectUrl)
    if (!image) { URL.revokeObjectURL(objectUrl); return null }
    image.__objectUrl = objectUrl
    return image
  } catch {
    return null
  }
}

// Returns an export-safe HTMLImageElement. Remote JSO assets are routed through
// the allowlisted backend proxy, avoiding canvas tainting.
export async function loadCanvasImage(src) {
  if (!src) return null
  if (/^(data:|blob:)/i.test(src) || src.startsWith('/')) return decode(src)
  if (typeof window !== 'undefined' && src.startsWith(window.location.origin)) return decode(src)

  const proxy = API_BASE_URL.replace(/\/$/, '') + '/media/proxy?url=' + encodeURIComponent(src)
  return await fetchBlobImage(proxy)
    || await fetchBlobImage(src)
    || await decode(src, true)
}

export function useCanvasImage(src) {
  const [image, setImage] = useState(null)
  useEffect(() => {
    let active = true
    let loaded = null
    setImage(null)
    loadCanvasImage(src).then((result) => {
      loaded = result
      if (active) setImage(result)
      else if (result?.__objectUrl) URL.revokeObjectURL(result.__objectUrl)
    })
    return () => {
      active = false
      if (loaded?.__objectUrl) URL.revokeObjectURL(loaded.__objectUrl)
    }
  }, [src])
  return image
}
