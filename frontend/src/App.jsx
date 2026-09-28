import { useState } from 'react'
import AccessibilityPanel from './AccessibilityPanel'
import OfflineBanner from './OfflineBanner'
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
import MembershipsSection from './features/memberships/MembershipsSection'
import MatchdaySection from './features/home/MatchdaySection'
import NewsSection from './features/home/NewsSection'
import { useHomeData } from './features/home/useHomeData'
import { orderHomeSections, useHomeLayout } from './features/home/useHomeLayout'
import MatchCenterModal from './features/matches/MatchCenterModal'
import ArticleModal from './features/news/ArticleModal'
import CartDrawer from './features/shop/CartDrawer'
import { useCart } from './features/shop/useCart'
import SiteFooter from './features/site/SiteFooter'
import SiteHeader from './features/site/SiteHeader'
import { visibleSections } from './features/site/navigation'
import { useActiveSection } from './features/site/useActiveSection'
import { useNavigation } from './features/site/useNavigation'

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

  // Extra links configured by the admin (Homepage Builder). Additive: shown
  // alongside the built-in section navigation; empty (or failed) => nothing extra.
  const headerLinks = useNavigation('Header')
  const footerLinks = useNavigation('Footer')

  // Published homepage layout (Homepage Builder). When present it drives the
  // order/visibility of the mappable sections; empty or failed => the built-in
  // order below is used unchanged (total fallback, identical to today).
  const homeLayout = useHomeLayout()

  // Renderers for every home section, keyed by section id. Hero is always first
  // and is rendered outside the ordered list.
  const sectionRenderers = {
    matches: () => (
      <MatchdaySection key="matches" section={sectionById.matches} status={data.status} nextMatch={data.nextMatch} recentMatches={data.recentMatches} onOpenMatch={setSelectedMatch} />
    ),
    news: () => (
      <NewsSection key="news" section={sectionById.news} status={data.status} articles={data.news} content={data.content} onOpenArticle={setSelectedArticle} />
    ),
    team: () => <TeamSection key="team" section={sectionById.team} players={data.players} status={data.sectionStatus.players} />,
    club: () => <ClubSection key="club" section={sectionById.club} club={data.club} content={data.content} />,
    shop: () => <ShopSection key="shop" section={sectionById.shop} products={data.products} status={data.sectionStatus.products} cart={cart} onOpenCart={() => setCartOpen(true)} />,
    memberships: () => (
      <MembershipsSection
        key="memberships"
        section={sectionById.memberships}
        token={fan.token}
        onRequireLogin={() => openAuth('login')}
      />
    ),
    media: () => <MediaSection key="media" section={sectionById.media} media={data.media} status={data.sectionStatus.media} />,
    events: () => <AgendaSection key="events" section={sectionById.events} events={data.events} status={data.sectionStatus.events} />,
    community: () => (sectionById.community ? <CommunitySection key="community" section={sectionById.community} programs={data.community} /> : null),
    archive: () => (sectionById.archive ? <ArchiveSection key="archive" section={sectionById.archive} archive={data.archive} /> : null),
    mobile: () => <MobileSection key="mobile" section={sectionById.mobile} />,
    sponsors: () => (sectionById.sponsors ? <SponsorsSection key="sponsors" section={sectionById.sponsors} sponsors={data.sponsors} /> : null),
    infos: () => <InfoSection key="infos" section={sectionById.infos} club={data.club} documents={data.documents} faq={data.faq} documentsStatus={data.sectionStatus.documents} faqStatus={data.sectionStatus.faq} />,
  }

  // Default page order (matches the built-in layout). `orderHomeSections`
  // returns this unchanged when the layout is empty/failed, or reorders the
  // mappable sections (news/matches/media/sponsors) when the admin published one.
  const defaultSectionOrder = ['matches', 'news', 'team', 'club', 'shop', 'memberships', 'media', 'events', 'community', 'archive', 'mobile', 'sponsors', 'infos']
  const orderedSections = orderHomeSections(defaultSectionOrder, homeLayout)

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

      <main id="main-content" tabIndex={-1}>
        <HeroSection content={data.content} club={data.club} />
        {orderedSections.map((key) => sectionRenderers[key]?.())}
      </main>

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
          onClose={() => setSelectedArticle(null)}
          token={fan.token}
          onRequireLogin={() => {
            setSelectedArticle(null)
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
