import { useEffect, useState } from 'react'
import { publicApi } from '../../lib/api'
import { pick } from '../../lib/format'

// Normalise one navigation item coming from the Homepage Builder API. Only
// entries with both a label and a url are usable as a link.
function normalizeItem(raw) {
  const label = String(pick(raw, 'Label', 'label') || '').trim()
  const url = String(pick(raw, 'Url', 'url') || '').trim()
  if (!label || !url) return null
  return {
    id: pick(raw, 'Id', 'id') || `${label}-${url}`,
    label,
    url,
    displayOrder: pick(raw, 'DisplayOrder', 'displayOrder') ?? 0,
    opensInNewTab: Boolean(pick(raw, 'OpensInNewTab', 'opensInNewTab')),
  }
}

/**
 * Fetches the admin-configured extra links for a menu position
 * ('Header' | 'Footer') from GET /api/navigation.
 *
 * Low risk / additive: these links are shown IN ADDITION to the built-in
 * section navigation. When the API is empty or fails, an empty list is returned
 * so the site falls back to its current behaviour (nothing extra rendered).
 */
export function useNavigation(position) {
  const [items, setItems] = useState([])

  useEffect(() => {
    const controller = new AbortController()
    publicApi.getNavigation(position, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        const list = (Array.isArray(result) ? result : []).map(normalizeItem).filter(Boolean)
        setItems(list)
      })
      .catch(() => {
        if (!controller.signal.aborted) setItems([])
      })
    return () => controller.abort()
  }, [position])

  return items
}
