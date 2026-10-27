import { useEffect, useState } from 'react'
import { publicApi } from '../../lib/api'
import { visibleSections } from './navigation'

// Computes the public site sections exactly like the home shell (App.jsx) so a
// standalone page (e.g. /nos-projets) shows the identical header/footer menu.
//
// The home hides `community`, `archive` and `sponsors` when those lists are
// empty and drops anything listed in `home_hidden_sections`. We fetch only the
// four inputs that drive that decision instead of the whole home payload.
//
// Until the data lands we return `visibleSections({})` (everything visible) as
// a stable fallback, matching the previous behaviour of this page.
export function useSiteSections() {
  const [visibility, setVisibility] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    const hasItems = (value) => Array.isArray(value) && value.length > 0

    Promise.allSettled([
      publicApi.getHome(signal),
      publicApi.getCommunityPrograms(signal),
      publicApi.getArchive(signal),
      publicApi.getSponsors(undefined, signal),
    ]).then(([home, community, archive, sponsors]) => {
      if (signal.aborted) return
      const content = home.status === 'fulfilled' ? home.value?.content || {} : {}
      const next = {
        community: community.status === 'fulfilled' && hasItems(community.value),
        archive: archive.status === 'fulfilled' && hasItems(archive.value),
        sponsors: sponsors.status === 'fulfilled' && hasItems(sponsors.value),
      }
      const hidden = String(content.home_hidden_sections || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
      for (const id of hidden) next[id] = false
      setVisibility(next)
    })

    return () => controller.abort()
  }, [])

  return visibleSections(visibility || {})
}
