import { useEffect, useState } from 'react'
import PasswordResetPage from './features/account/PasswordResetPage'
import AccessibilityPanel from './AccessibilityPanel'
import OfflineBanner from './OfflineBanner'
import AccountSettingsModal from './features/account/AccountSettingsModal'
import AuthModal from './features/account/AuthModal'
import ChangePasswordModal from './features/account/ChangePasswordModal'
import ProfileModal from './features/account/ProfileModal'
import { useFanSession } from './features/account/useFanSession'
import HomePage from './features/home/HomePage'
import { useHomeData } from './features/home/useHomeData'
import MatchCenterModal from './features/matches/MatchCenterModal'
import { normalizeMatch } from './features/matches/matchUtils'
import { publicApi } from './lib/api'
import ArticleModal from './features/news/ArticleModal'
import { pushArticleUrl, restoreHomeUrl, slugFromPath } from './features/news/articleUrl'
import CartDrawer from './features/shop/CartDrawer'
import { useCart } from './features/shop/useCart'
import SiteFooter from './features/site/SiteFooter'
import SiteHeader from './features/site/SiteHeader'
import { visibleSections } from './features/site/navigation'
import { eventSlugFromPath, matchIdFromPath, matchSlugFromPath, matchSlugFor, productSlugFromPath, sectionFromPath } from './features/site/publicRoutes'
import { useDocumentTitle } from './lib/useDocumentTitle'
import { useActiveSection } from './features/site/useActiveSection'
import { useNavigation } from './features/site/useNavigation'
import { useHomeLayout } from './features/home/useHomeLayout'
import { HOME_TEMPLATE_IDS } from './features/home/homeTemplates'
import { useI18n } from './i18n/index.jsx'

function App() {
  const { t } = useI18n()
  const data = useHomeData()
  const cart = useCart()
  const fan = useFanSession()
  const requestedTemplatePreview = new URLSearchParams(window.location.search).get('templatePreview')
  const templatePreview = HOME_TEMPLATE_IDS.has(requestedTemplatePreview) ? requestedTemplatePreview : null

  const [selectedMatch, setSelectedMatch] = useState(() => {
    const id = matchIdFromPath()
    return id ? { id } : null
  })

  // Resolve readable `/matchs/jso-vs-opponent` links against the public matches API.
  useEffect(() => {
    const slug = matchSlugFromPath()
    if (!slug || matchIdFromPath()) return
    const controller = new AbortController()
    publicApi.getMatches(controller.signal)
      .then((items) => {
        if (controller.signal.aborted || !Array.isArray(items)) return
        const matches = items.map(normalizeMatch)
        const matchesForSlug = matches.filter((item) => matchSlugFor(item) === slug)
        if (matchesForSlug.length === 1) setSelectedMatch(matchesForSlug[0])
        else if (matchesForSlug.length > 1 || (slug === 'jso-vs-' && matches.length > 0)) {
          // Recover legacy malformed links while preserving the normalized match payload.
          const candidates = matchesForSlug.length ? matchesForSlug : matches;
          const now = Date.now()
          const ordered = [...candidates].sort((x, y) => {
            const xd = new Date(x.kickoffAt || 0).getTime()
            const yd = new Date(y.kickoffAt || 0).getTime()
            const xf = xd >= now ? 0 : 1
            const yf = yd >= now ? 0 : 1
            return xf - yf || (xf === 0 ? xd - yd : yd - xd)
          })
          const match = ordered[0]
          setSelectedMatch(match)
          if (slug === 'jso-vs-' && match?.id) {
            window.history.replaceState({ matchId: match.id }, '', '/matchs/' + encodeURIComponent(matchSlugFor(match)))
          }
        }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])
  // Seed the open article from a `/actualites/{slug}` deep-link so a shared
  // link (e.g. from Facebook) reopens the exact article. Only the slug is known
  // up front; ArticleModal fetches the full article by slug.
  const [selectedArticle, setSelectedArticle] = useState(() => {
    const slug = slugFromPath()
    return slug ? { slug } : null
  })

  // Open an article and mirror it into the URL; close and restore its source page.
  function openArticle(article) {
    setSelectedArticle(article)
    if (article?.slug) pushArticleUrl(article.slug)
  }
  function closeArticle() {
    setSelectedArticle(null)
    restoreHomeUrl()
  }

  function openMatch(match) {
    const normalizedMatch = normalizeMatch(match)
    if (!normalizedMatch?.id) return
    setSelectedMatch(normalizedMatch)
    const url = '/matchs/' + encodeURIComponent(matchSlugFor(normalizedMatch))
    if (window.location.pathname !== url) window.history.pushState({ matchId: normalizedMatch.id }, '', url)
  }
  function closeMatch() {
    setSelectedMatch(null)
    if (matchIdFromPath() || matchSlugFromPath()) window.history.replaceState({}, '', '/matchs')
  }

  // Keep the modal in sync with browser Back/Forward: navigating away from a
  // `/actualites/{slug}` URL closes the article, navigating onto one opens it.
  useEffect(() => {
    function onPopState() {
      const slug = slugFromPath()
      setSelectedArticle(slug ? { slug } : null)
      const matchId = matchIdFromPath()
      const matchSlug = matchSlugFromPath()
      setSelectedMatch(matchId ? { id: matchId } : null)
      if (matchSlug && !matchId) {
        const controller = new AbortController()
        publicApi.getMatches(controller.signal).then((items) => {
          if (controller.signal.aborted || !Array.isArray(items)) return
          const matches = items.map(normalizeMatch).filter((item) => matchSlugFor(item) === matchSlug)
          if (matches.length) setSelectedMatch(matches[0])
        }).catch(() => {})
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const [cartOpen, setCartOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  // Data-driven navigation is kept in the shell so header/footer and the
  // homepage composition share exactly the same visibility rules.
  const hiddenSections = String(data.content?.home_hidden_sections || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  const visibility = {
    community: data.community.length > 0,
    archive: data.archive.length > 0,
    sponsors: data.sponsors.length > 0,
  }
  for (const id of hiddenSections) visibility[id] = false

  const sections = visibleSections(visibility)
  const activeSection = useActiveSection(['home', ...sections.map((section) => section.id)]) || 'home'
  const headerLinks = useNavigation('Header')
  const footerLinks = useNavigation('Footer')
  const homeLayout = useHomeLayout()
  const focusSection = sectionFromPath()
  const isAdminStreamsRoute = window.location.pathname === '/admin/live-streams'
  const isPasswordResetRoute = window.location.pathname === '/password-reset'
  const productSlug = productSlugFromPath()
  const eventSlug = eventSlugFromPath()
  useDocumentTitle(focusSection ? sections.find((item) => item.id === focusSection)?.label : null)

  function openAuth(mode) {
    setAuthMode(mode)
    setAuthOpen(true)
  }

  if (isPasswordResetRoute) return <PasswordResetPage />

  return (
    <div className="min-h-screen bg-jso-paper text-jso-ink">
      <a href="#main-content" className="jso-skip-link">{t('common.skipToContent')}</a>

      <SiteHeader
        sections={sections}
        extraLinks={headerLinks}
        activeId={focusSection || activeSection}
        cartCount={cart.count}
        onOpenCart={() => setCartOpen(true)}
        user={fan.user}
        onLogin={() => openAuth('login')}
        onRegister={() => openAuth('register')}
        onOpenProfile={() => { window.location.href = '/profil' }}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogout={fan.signOut}
      />

      {isAdminStreamsRoute ? (
        <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-start justify-center px-6 py-16">
          <p className="text-xs font-extrabold tracking-[0.2em] text-jso-blue">JSO ADMIN</p>
          <h1 className="mt-3 text-3xl font-black">Gestione delle dirette</h1>
          <p className="mt-3 text-slate-600">Per salvare il link della diretta serve l’accesso amministratore. La pagina pubblica usava l’accesso utente e non aveva i permessi necessari.</p>
          <a href="/admin/match-streams" className="mt-6 inline-flex rounded-xl bg-jso-navy px-5 py-3 font-bold text-white">Apri gestione dirette admin</a>
          <a href="/admin" className="mt-3 font-bold text-jso-blue underline">Accedi al pannello amministratore</a>
        </main>
      ) : (
        <>
          <HomePage
            data={data}
            cart={cart}
            fan={fan}
            onOpenCart={() => setCartOpen(true)}
            onOpenAuth={openAuth}
            onOpenMatch={openMatch}
            onOpenArticle={openArticle}
            sections={sections}
            hiddenSections={hiddenSections}
            homeLayout={homeLayout}
            focusSection={focusSection}
            productSlug={productSlug}
            eventSlug={eventSlug}
            templatePreview={templatePreview}
          />
          <SiteFooter sections={sections} extraLinks={footerLinks} />
        </>
      )}

      {selectedMatch && (
        <MatchCenterModal
          match={selectedMatch}
          onClose={closeMatch}
          token={fan.token}
          onRequireLogin={() => {
            closeMatch()
            openAuth('login')
          }}
        />
      )}
      {selectedArticle && (
        <ArticleModal
          initialArticle={selectedArticle}
          onClose={closeArticle}
          token={fan.token}
          onRequireLogin={() => {
            closeArticle()
            openAuth('login')
          }}
        />
      )}

      <CartDrawer
        open={cartOpen}
        cart={cart}
        token={fan.token}
        onClose={() => setCartOpen(false)}
        onRequireLogin={() => {
          setCartOpen(false)
          openAuth('login')
        }}
      />

      <AuthModal
        key={`${authMode}-${authOpen}`}
        open={authOpen}
        initialMode={authMode}
        onClose={() => setAuthOpen(false)}
        onAuthenticated={(result) => {
          fan.signIn(result)
          setAuthOpen(false)
        }}
      />
      <ProfileModal
        open={profileOpen}
        token={fan.token}
        user={fan.user}
        onClose={() => setProfileOpen(false)}
        onUpdated={(updated) => {
          fan.updateUser(updated)
          setProfileOpen(false)
        }}
      />
      <AccountSettingsModal
        open={settingsOpen}
        user={fan.user}
        token={fan.token}
        onClose={() => setSettingsOpen(false)}
        onOpenProfile={() => {
          setSettingsOpen(false)
          setProfileOpen(true)
        }}
        onOpenChangePassword={() => {
          setSettingsOpen(false)
          setPasswordOpen(true)
        }}
      />
      <ChangePasswordModal open={passwordOpen} token={fan.token} onClose={() => setPasswordOpen(false)} />
      <AccessibilityPanel />
      <OfflineBanner />
    </div>
  )
}

export default App
