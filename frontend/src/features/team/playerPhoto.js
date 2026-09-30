// Local player portraits live in /public/players/<first-last>.webp (background removed).
export function playerSlug(player) {
  return [player?.firstName, player?.lastName]
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const DEMO_HOSTS = ['randomuser.me', 'dicebear.com']

// Photo uploaded from the admin wins; demo placeholders and empty values
// fall back to the local portrait matching the player's name.
export function resolvePlayerPhoto(player) {
  const url = String(player?.photoUrl || '').trim()
  const isDemo = DEMO_HOSTS.some((host) => url.includes(host))
  if (url && !isDemo) return url
  const slug = playerSlug(player)
  return slug ? `/players/${slug}.webp` : ''
}

export const isCutoutPhoto = (url) => String(url || '').startsWith('/players/')
