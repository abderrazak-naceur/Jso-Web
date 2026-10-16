import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../../lib/apiConfig'

const CONSENT_KEY = 'jso_analytics_consent'
const VISITOR_KEY = 'jso_analytics_visitor_id'
const LAST_PAGE_KEY = 'jso_analytics_last_page'

function readStorage(key) {
  try { return window.localStorage.getItem(key) } catch { return null }
}

function deviceClass() {
  const ua = navigator.userAgent || ''
  if (/ipad|tablet|kindle|silk/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android/i.test(ua)) return 'mobile'
  return 'desktop'
}

function safePublicPath() {
  const path = window.location.pathname || '/'
  if (/^\/(admin|password-reset|payment|account|profil)(\/|$)/i.test(path)) return null
  if (path.includes('@') || path.length > 300) return null
  return path
}

export default function VisitorAnalyticsConsent() {
  const [consent, setConsent] = useState(() => readStorage(CONSENT_KEY))

  useEffect(() => {
    if (consent !== 'accepted') return undefined
    let visitorId = readStorage(VISITOR_KEY)
    if (!visitorId) {
      visitorId = window.crypto?.randomUUID?.() || ''
      if (!visitorId) return undefined
      try { window.localStorage.setItem(VISITOR_KEY, visitorId) } catch { return undefined }
    }

    let lastTracked = ''
    const track = () => {
      const path = safePublicPath()
      if (!path) return
      const fingerprint = path + '|' + Math.floor(Date.now() / 30000)
      if (fingerprint === lastTracked) return
      lastTracked = fingerprint
      try {
        if (readStorage(LAST_PAGE_KEY) === path && document.visibilityState === 'hidden') return
        window.localStorage.setItem(LAST_PAGE_KEY, path)
      } catch { /* analytics is optional */ }
      const payload = {
        path,
        referrer: document.referrer || '',
        deviceClass: deviceClass(),
        visitorId,
      }
      fetch(API_BASE_URL + '/analytics/page-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
        credentials: 'omit',
      }).catch(() => {})
    }

    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState
    window.history.pushState = function (...args) {
      const result = originalPushState.apply(this, args)
      window.dispatchEvent(new Event('jso:routechange'))
      return result
    }
    window.history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args)
      window.dispatchEvent(new Event('jso:routechange'))
      return result
    }
    window.addEventListener('popstate', track)
    window.addEventListener('jso:routechange', track)
    track()
    return () => {
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
      window.removeEventListener('popstate', track)
      window.removeEventListener('jso:routechange', track)
    }
  }, [consent])

  function choose(value) {
    try {
      window.localStorage.setItem(CONSENT_KEY, value)
      if (value !== 'accepted') window.localStorage.removeItem(VISITOR_KEY)
    } catch { /* consent choice remains in component state */ }
    setConsent(value)
  }

  if (consent) return null
  return (
    <aside aria-label="Choix de confidentialité" className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:inset-x-6">
      <h2 className="text-base font-extrabold text-slate-900">Votre confidentialité compte</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Les statistiques facultatives nous aident à comprendre les pages consultées et à améliorer le site.
        Aucun suivi analytique n’est envoyé sans votre accord. Vous pouvez refuser sans perdre l’accès au site.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => choose('accepted')} className="rounded-xl bg-jso-navy px-4 py-2.5 text-sm font-bold text-white">Accepter les statistiques</button>
        <button type="button" onClick={() => choose('rejected')} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">Refuser</button>
      </div>
    </aside>
  )
}
