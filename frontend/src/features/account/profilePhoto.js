const PHOTO_KEY = 'jso_fan_profile_photo'
const PHOTO_EVENT = 'jso:profile-photo-updated'

export function getProfilePhoto() {
  try { return localStorage.getItem(PHOTO_KEY) || '' } catch { return '' }
}

export function saveProfilePhoto(value) {
  try {
    if (value) localStorage.setItem(PHOTO_KEY, value)
    else localStorage.removeItem(PHOTO_KEY)
    window.dispatchEvent(new CustomEvent(PHOTO_EVENT, { detail: value || '' }))
  } catch {
    throw new Error('Impossible d’enregistrer la photo sur cet appareil. Choisissez une image plus légère.')
  }
}

export function subscribeProfilePhoto(callback) {
  const onPhoto = (event) => callback(event.detail || '')
  const onStorage = (event) => { if (event.key === PHOTO_KEY) callback(event.newValue || '') }
  window.addEventListener(PHOTO_EVENT, onPhoto)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(PHOTO_EVENT, onPhoto)
    window.removeEventListener('storage', onStorage)
  }
}

export async function prepareProfilePhoto(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('Choisissez un fichier image.')
  if (file.size > 10 * 1024 * 1024) throw new Error('La photo doit faire moins de 10 Mo.')
  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Lecture de la photo impossible.'))
    reader.readAsDataURL(file)
  })
  const image = await new Promise((resolve, reject) => {
    const element = new Image()
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error('Image illisible.'))
    element.src = source
  })
  const scale = Math.min(1, 512 / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.82)
}
