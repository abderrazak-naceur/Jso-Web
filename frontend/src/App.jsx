import { useState } from 'react'
import AccessibilityPanel from './AccessibilityPanel'
import AccountSettingsModal from './features/account/AccountSettingsModal'
import AuthModal from './features/account/AuthModal'
import ChangePasswordModal from './features/account/ChangePasswordModal'
import ProfileModal from './features/account/ProfileModal'
import { useFanSession } from './features/account/useFanSession'
import {
  AgendaSection,
  ArchiveSection,
  ClubSection,
  CommunitySection,
  InfoSection,
  MediaSection,
  MobileSection,
  ShopSection,
  SponsorsSection,
  TeamSection,
} from './features/home/HomeContentSections'
import HeroSection from './features/home/HeroSection'
import MatchdaySection from './features/home/MatchdaySection'
import NewsSection from './features/home/NewsSection'
import { useHomeData } from './features/home/useHomeData'
import MatchCenterModal from './features/matches/MatchCenterModal'
import ArticleModal from './features/news/ArticleModal'
import CartDrawer from './features/shop/CartDrawer'
import { useCart } from './features/shop/useCart'
import SiteFooter from './features/site/SiteFooter'
import SiteHeader from './features/site/SiteHeader'
import { visibleSections } from './features/site/navigation'
import { useActiveSection } from './features/site/useActiveSection'

function App() {
  const data = useHomeData()
  const cart = useCart()
  const fan = useFanSession()

  const [selectedMatch, setSelectedMatch] = useState(null)
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  // Data-driven sections disappear from both the page and the navigation when
  // empty. Core sections remain visible with an explicit loading/empty state.
  const sections = visibleSections({
    community: data.community.length > 0,
    archive: data.archive.length > 0,
    sponsors: data.sponsors.length > 0,
  })
  const sectionById = Object.fromEntries(sections.map((section) => [section.id, section]))
  const activeSection = useActiveSection(['home', ...sections.map((section) => section.id)]) || 'home'

  function openAuth(mode) {
    setAuthMode(mode)
    setAuthOpen(true)
  }

  return (
    <div className="min-h-screen bg-jso-paper text-jso-ink">
      <a href="#main-content" className="jso-skip-link">Aller au contenu principal</a>

      <SiteHeader
        sections={sections}
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

      <main id="main-content" tabIndex={-1}>
        <HeroSection content={data.content} club={data.club} />
        <MatchdaySection section={sectionById.matches} status={data.status} nextMatch={data.nextMatch} recentMatches={data.recentMatches} onOpenMatch={setSelectedMatch} />
        <NewsSection section={sectionById.news} status={data.status} articles={data.news} content={data.content} onOpenArticle={setSelectedArticle} />
        <TeamSection section={sectionById.team} players={data.players} />
        <ClubSection section={sectionById.club} club={data.club} content={data.content} />
        <ShopSection section={sectionById.shop} products={data.products} cart={cart} onOpenCart={() => setCartOpen(true)} />
        <MediaSection section={sectionById.media} media={data.media} />
        <AgendaSection section={sectionById.events} events={data.events} />
        {sectionById.community && <CommunitySection section={sectionById.community} programs={data.community} />}
        {sectionById.archive && <ArchiveSection section={sectionById.archive} archive={data.archive} />}
        <MobileSection section={sectionById.mobile} />
        {sectionById.sponsors && <SponsorsSection section={sectionById.sponsors} sponsors={data.sponsors} />}
        <InfoSection section={sectionById.infos} club={data.club} documents={data.documents} faq={data.faq} />
      </main>

      <SiteFooter sections={sections} />

      {selectedMatch && <MatchCenterModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />}
      {selectedArticle && <ArticleModal initialArticle={selectedArticle} onClose={() => setSelectedArticle(null)} />}

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
    </div>
  )
}

export default App
