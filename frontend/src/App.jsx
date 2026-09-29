import { useEffect, useState } from 'react'
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
import { pushArticleUrl, restoreHomeUrl, slugFromPath } from './features/news/articleUrl'
import HighlightsCarousel from './features/home/HighlightsCarousel'
import SellingBand from './features/home/SellingBand'
import CartDrawer from './features/shop/CartDrawer'
import { useCart } from './features/shop/useCart'
import Reveal from './features/site/Reveal'
import SiteFooter from './features/site/SiteFooter'
import SiteHeader from './features/site/SiteHeader'
import { visibleSections } from './features/site/navigation'
import { useActiveSection } from './features/site/useActiveSection'
import { useNavigation } from './features/site/useNavigation'
import { formatDate } from './lib/format'

// Builds the "À la une" carousel cards from real home data. Every card links to
// an existing destination; cards without data are omitted (1–4 cards shown).
function buildHighlights({ data, onOpenMatch, onOpenArticle }) {
  const items = []
  const nextMatch = data.nextMatch
  if (nextMatch) {
    items.push({
      key: 'match',
      badge: 'Prochain match',
      title: `JSO — ${nextMatch.opponentName || nextMatch.OpponentName || 'À venir'}`,
      subtitle: formatDate(nextMatch.kickoffAt || nextMatch.KickoffAt) || 'Bientôt',
      cta: 'Voir le match',
      onSelect: () => onOpenMatch(nextMatch),
    })
  }
  const lead = data.news?.[0]
  if (lead) {
    items.push({
      key: 'news',
      badge: 'Actualité',
      title: lead.title,
      subtitle: lead.publishedAt ? formatDate(lead.publishedAt) : 'Dernière actualité',
      cta: 'Lire l’article',
      imageUrl: lead.coverImageUrl || undefined,
      onSelect: () => onOpenArticle(lead),
    })
  }
  items.push({
    key: 'shop',
    badge: 'Boutique',
    title: 'Maillots & articles officiels',
    subtitle: 'La boutique du club',
    cta: 'Découvrir',
    onSelect: () => { window.location.hash = '#shop' },
  })
  items.push({
    key: 'memberships',
    badge: 'Abonnements',
    title: 'Rejoignez les abonnés',
    subtitle: 'Soutenez la JSO toute la saison',
    cta: 'S’abonner',
    onSelect: () => { window.location.hash = '#memberships' },
  })
  return items
}

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

  // Data-driven sections disappear from both the page and the navigation when
  // empty. Core sections remain visible with an explicit loading/empty state.
  // Admin can also switch off any section via the Homepage Builder: the hidden
  // ids arrive in the home content bag under `home_hidden_sections` (CSV).
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
      <NewsSection key="news" section={sectionById.news} status={data.status} articles={data.news} content={data.content} onOpenArticle={openArticle} />
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
  // Editorial/live content first (matches, news, team, media, club, agenda);
  // the paid offers (shop, memberships) sit lower since the hero selling band
  // and the "À la une" carousel already surface them at the top; community,
  // heritage and secondary blocks close the page.
  const defaultSectionOrder = ['matches', 'news', 'team', 'media', 'club', 'events', 'shop', 'memberships', 'community', 'sponsors', 'archive', 'mobile', 'infos']
  // Drop admin-disabled sections from the rendered page too (not just the menu).
  const orderedSections = orderHomeSections(defaultSectionOrder, homeLayout)
    .filter((key) => !hiddenSections.includes(key))

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
        <Reveal><SellingBand nextMatch={data.nextMatch} /></Reveal>
        <Reveal><HighlightsCarousel items={buildHighlights({ data, onOpenMatch: setSelectedMatch, onOpenArticle: openArticle })} /></Reveal>
        {orderedSections.map((key) => {
          const rendered = sectionRenderers[key]?.()
          return rendered ? <Reveal key={key}>{rendered}</Reveal> : null
        })}
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
