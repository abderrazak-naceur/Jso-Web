import { useEffect, useState } from 'react'
import { publicApi } from '../../lib/api'
import { pick } from '../../lib/format'
import { HOME_LAYOUT_TYPE_TO_SECTION } from './homeTemplates'

export { orderHomeSections } from './homeLayoutOrder'

// Only section types with an existing renderer are accepted. Unknown types are
// ignored safely so server configuration cannot cause arbitrary HTML rendering.
const KNOWN_TYPES = new Set(Object.keys(HOME_LAYOUT_TYPE_TO_SECTION))

// Normalise one section coming from GET /api/home-layout. Only entries with a
// known Type are kept; everything else is dropped so callers never have to
// guess how to render an unknown payload.
function normalizeSection(raw) {
  const type = String(pick(raw, 'Type', 'type') || '').trim()
  if (!KNOWN_TYPES.has(type)) return null
  return {
    id: pick(raw, 'Id', 'id'),
    type,
    title: pick(raw, 'Title', 'title') ?? null,
    displayOrder: pick(raw, 'DisplayOrder', 'displayOrder') ?? 0,
  }
}

/**
 * Fetches the published homepage layout from GET /api/home-layout.
 *
 * The returned list only carries known, renderable section types sorted by
 * DisplayOrder. When the API
 * is empty or fails, an empty list is returned so the site falls back to its
 * current hard-coded section order and visibility (identical behaviour).
 */
export function useHomeLayout() {
  const [sections, setSections] = useState([])

  useEffect(() => {
    const controller = new AbortController()
    publicApi.getHomeLayout(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        const list = (Array.isArray(result) ? result : [])
          .map(normalizeSection)
          .filter(Boolean)
          .sort((a, b) => a.displayOrder - b.displayOrder)
        setSections(list)
      })
      .catch(() => {
        if (!controller.signal.aborted) setSections([])
      })
    return () => controller.abort()
  }, [])

  return sections
}
