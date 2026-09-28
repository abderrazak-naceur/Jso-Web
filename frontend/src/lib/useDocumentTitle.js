import { useEffect } from 'react'

const DEFAULT_TITLE = 'JSO — Jeunesse Sportive de Oudhref'

/// Sets `document.title` while a view is active (e.g. an open article or match
/// modal) and restores the site default when it unmounts or [title] clears.
///
/// The public site is a single page rendered client-side, so there is no
/// per-route <title>. This keeps the browser tab and shared-link title in sync
/// with what the visitor is actually looking at, without pulling in a head
/// manager dependency. A null/empty [title] leaves the default in place.
export function useDocumentTitle(title) {
  useEffect(() => {
    const trimmed = (title || '').trim()
    if (!trimmed) return undefined
    const previous = document.title
    document.title = `${trimmed} · JSO`
    return () => {
      document.title = previous || DEFAULT_TITLE
    }
  }, [title])
}
