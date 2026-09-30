import { useEffect, useState } from 'react'
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
import ArticleModal from './features/news/ArticleModal'
import { pushArticleUrl, restoreHomeUrl, slugFromPath } from './features/news/articleUrl'
import CartDrawer from './features/shop/CartDrawer'
import { useCart } from './features/shop/useCart'
import SiteFooter from './features/site/SiteFooter'
import SiteHeader from './features/site/SiteHeader'
import { visibleSections } from './features/site/navigation'
import { useActiveSection } from './features/site/useActiveSection'
import { useNavigation } from './features/site/useNavigation'
import { useHomeLayout } from './features/home/useHomeLayout'

function App() {
  const data = useHomeData()
  const cart = useCart()
  const fan = useFanSession()

  const [selectedMatch, setSelectedMatch] = useState(null)
  // Seed the open article from a `/actualites/{slug}` deep-link so a shared
  // link (e.g. from Facebook) reopens the exact article. Only the slug is known
  // up front; ArticleModal fetches the full article by slug.
  const [selectedArticle, setSelectedArticle] = useState(() => {
    const slug = slugFromPath()
    return slug ? { slug } : null
  })

  // Open an article and mirror it into the URL; close and restore the home URL.
  function openArticle(article) {
    setSelectedArticle(article)
    if (article?.slug) pushArticleUrl(article.slug)
  }
  function closeArticle() {
    setSelectedArticle(null)
    restoreHomeUrl()
  }

  // Keep the modal in sync with browser Back/Forward: navigating away from a
  // `/actualites/{slug}` URL closes the article, navigating onto one opens it.
  useEffect(() => {
    function onPopState() {
      const slug = slugFromPath()
      setSelectedArticle(slug ? { slug } : null)
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

  function openAuth(mode) {
    setAuthMode(mode)
    setAuthOpen(true)
  }

  return (
    <div className="min-h-screen bg-jso-paper text-jso-ink">
      <a href="#main-content" className="jso-skip-link">Aller au contenu principal</a>

      <SiteHeader
        sections={sections}
        extraLinks={headerLinks}
        activeId={activeSection}
        cartCount={cart.count}
        onOpenCart={() => setCartOpen(true)}
        user={fan.user}
        onLogin={() => openAuth('login')}
        onRegister={() => openAuth('register')}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogout={fan.signOut}
      />

      <HomePage
        data={data}
        cart={cart}
        fan={fan}
        onOpenCart={() => setCartOpen(true)}
        onOpenAuth={openAuth}
        onOpenMatch={setSelectedMatch}
        onOpenArticle={openArticle}
        sections={sections}
        hiddenSections={hiddenSections}
        homeLayout={homeLayout}
      />

      <SiteFooter sections={sections} extraLinks={footerLinks} />

      {selectedMatch && (
        <MatchCenterModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          token={fan.token}
          onRequireLogin={() => {
            setSelectedMatch(null)
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
