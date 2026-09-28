// Public, shareable URL scheme for a single news article.
//
// News articles open in a modal over the home page, but a modal has no URL of
// its own. To let editors share a link on Facebook (and for the link to reopen
// the exact article), we mirror the open article into the address bar as
// `/actualites/{slug}` using the History API — no router dependency, no reload.
//
// The public site is a SPA served for any path (see the SPA fallback in
// nginx/dev), so `/actualites/{slug}` loads App.jsx which then opens the modal.

export const ARTICLE_PATH_PREFIX = '/actualites/'

// The "all articles" listing page (no slug).
export const NEWS_LIST_PATH = '/actualites'

// Extract the slug from the current location, or null when we're not on an
// article deep-link. Kept tolerant of a trailing slash.
export function slugFromPath(pathname = window.location.pathname) {
  if (!pathname.startsWith(ARTICLE_PATH_PREFIX)) return null
  const rest = pathname.slice(ARTICLE_PATH_PREFIX.length).replace(/\/+$/, '')
  return rest ? decodeURIComponent(rest) : null
}

// Absolute, shareable URL for an article slug (what we copy / post to socials).
export function articleShareUrl(slug) {
  return window.location.origin + ARTICLE_PATH_PREFIX + encodeURIComponent(slug)
}

// Reflect the opened article in the URL without navigating/reloading. Uses
// pushState so the browser Back button closes the article naturally.
export function pushArticleUrl(slug) {
  const url = ARTICLE_PATH_PREFIX + encodeURIComponent(slug)
  if (window.location.pathname !== url) window.history.pushState({ articleSlug: slug }, '', url)
}

// Restore the home URL when the article closes, without adding a history entry
// on top of the user's own navigation.
export function restoreHomeUrl() {
  if (window.location.pathname.startsWith(ARTICLE_PATH_PREFIX)) {
    window.history.pushState({}, '', '/')
  }
}
