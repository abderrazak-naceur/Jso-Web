import { useEffect, useState } from 'react'
import { publicApi } from '../../lib/api'
import { pick } from '../../lib/format'

// Backend Type allow-list (Hero/News/Matches/Media/Sponsors/CustomHtml/Text).
// Only the types that map to an existing public section are usable to drive the
// layout. Hero is handled separately (it always stays on top) and CustomHtml /
// Text are intentionally ignored in this iteration: their PayloadJson is opaque
// and rendering arbitrary HTML/text is out of scope (anti-XSS). Unknown types
// are ignored safely.
const KNOWN_TYPES = new Set(['Hero', 'News', 'Matches', 'Media', 'Sponsors'])

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
 * Additive / low risk: the returned list only carries known, renderable section
 * types (Hero/News/Matches/Media/Sponsors) sorted by DisplayOrder. When the API
 * is empty or fails, an empty list is returned so the site falls back to its
 * current hard-coded section order and visibility (identical behaviour).
 */
// Maps a backend section Type to the key of an existing public home section.
// Hero is excluded here: it always renders first regardless of the layout.
const TYPE_TO_SECTION = {
  News: 'news',
  Matches: 'matches',
  Media: 'media',
  Sponsors: 'sponsors',
}

/**
 * Reorders the built-in home sections according to a published layout, without
 * ever introducing or removing non-layout sections.
 *
 * - `defaultKeys`: the section keys in their current hard-coded page order
 *   (e.g. ['matches', 'news', 'team', ...]). This is the source of truth for
 *   which sections exist and their default positions.
 * - `layout`: normalised list from `useHomeLayout` (already type-filtered and
 *   sorted by DisplayOrder).
 *
 * Behaviour:
 * - Empty layout => returns `defaultKeys` unchanged (identical to today).
 * - Non-empty layout => only the sections that map to a layout entry are
 *   reordered, among the slots they already occupy, following the layout order.
 *   Mappable sections absent from the layout are hidden; non-mappable sections
 *   (team, club, shop, events, community, archive, mobile, infos) keep their
 *   default relative position so anchors and navigation stay valid.
 */
export function orderHomeSections(defaultKeys, layout) {
  if (!Array.isArray(layout) || layout.length === 0) return defaultKeys

  // Keys the layout is allowed to control (present in the current page).
  const controllable = new Set(defaultKeys)
  // Desired order for the controllable sections, de-duplicated, keeping the
  // first occurrence and dropping anything not currently on the page.
  const desired = []
  const seen = new Set()
  for (const item of layout) {
    const key = TYPE_TO_SECTION[item.type]
    if (!key || seen.has(key) || !controllable.has(key)) continue
    seen.add(key)
    desired.push(key)
  }

  // If the layout carries no usable (mappable) section, fall back to default.
  if (desired.length === 0) return defaultKeys

  // Slots occupied by controllable sections get filled with the desired order;
  // sections not selected by the layout collapse out of those slots. All other
  // sections stay exactly where they are.
  const managed = new Set(Object.values(TYPE_TO_SECTION))
  let cursor = 0
  const result = []
  for (const key of defaultKeys) {
    if (managed.has(key)) {
      if (cursor < desired.length) result.push(desired[cursor++])
      // else: this managed slot is dropped (section hidden by the layout)
    } else {
      result.push(key)
    }
  }
  return result
}

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
