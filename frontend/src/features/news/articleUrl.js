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
  if (window.location.pathname !== url) {
    const returnPath = window.location.pathname + window.location.search + window.location.hash
    window.history.pushState({ articleSlug: slug, returnPath }, '', url)
  }
}

// Restore the page the visitor came from; a direct article link returns to the
// news listing. Replacing the current entry avoids reopening the modal on Back.
export function restoreHomeUrl() {
  if (window.location.pathname.startsWith(ARTICLE_PATH_PREFIX)) {
    const returnPath = window.history.state?.returnPath
    const target = typeof returnPath === 'string' && returnPath.startsWith('/') && !returnPath.startsWith('//')
      ? returnPath : NEWS_LIST_PATH
    if (target.startsWith(NEWS_LIST_PATH)) window.location.replace(target)
    else window.history.replaceState({}, '', target)
  }
}
