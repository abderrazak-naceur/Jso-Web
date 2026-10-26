// Local player portraits live in /public/players/<first-last>.<format>.
export function playerSlug(player) {
  return [player?.firstName, player?.lastName]
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const DEMO_HOSTS = ['randomuser.me', 'dicebear.com']

// Keep remote/admin-uploaded photos as primary. If the API stores a local
// /players path, preserve its extension instead of forcing a .png URL.
export function resolvePlayerPhoto(player) {
  const url = String(player?.photoUrl || '').trim()
  const isDemo = DEMO_HOSTS.some((host) => url.includes(host))
  if (url && !isDemo) {
    const localMatch = url.match(/^(?:\/|https?:\/\/[^/]+\/)(?:.*\/)?players\/([^/?#]+)\.(webp|svg|png|jpe?g)$/i)
    if (localMatch) return `/players/${localMatch[1]}.${localMatch[2].toLowerCase()}`
    return url
  }
  const slug = playerSlug(player)
  // Uploaded player cut-outs are maintained in WebP, SVG and PNG formats.
  // Return WebP first for mobile bandwidth, then the portrait component can
  // fall back to the local PNG if an older file is not present.
  return slug ? `/players/${slug}.webp` : ''
}

export const isCutoutPhoto = (url) => String(url || '').startsWith('/players/')
