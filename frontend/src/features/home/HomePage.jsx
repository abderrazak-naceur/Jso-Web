import {
  AgendaSection,
  ArchiveSection,
  CommunitySection,
  InfoSection,
  MobileSection,
  ShopSection,
  SponsorsSection,
  TeamSection,
} from './HomeContentSections'
import HeroSection from './HeroSection'
import MembershipsSection from '../memberships/MembershipsSection'
import ClubSection from '../club/ClubSection'
import MediaSection from '../media/MediaSection'
import MatchdaySection from './MatchdaySection'
import NewsSection from './NewsSection'
import HighlightsCarousel from './HighlightsCarousel'
import SellingBand from './SellingBand'
import { HeartHandshake } from 'lucide-react'
import Reveal from '../site/Reveal'
import { formatDate } from '../../lib/format'
import { orderHomeSections } from './useHomeLayout'

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
    key: 'donation',
    badge: 'Soutenir',
    title: 'Chaque geste compte pour la JSO',
    subtitle: 'Aidez le club à avancer',
    cta: 'Faire un don',
    onSelect: () => { window.location.assign('/soutenir') },
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

export default function HomePage({
  data,
  cart,
  fan,
  onOpenCart,
  onOpenAuth,
  onOpenMatch,
  onOpenArticle,
  sections,
  hiddenSections,
  homeLayout,
}) {
  const sectionById = Object.fromEntries(sections.map((section) => [section.id, section]))

  const sectionRenderers = {
    matches: () => (
      <MatchdaySection
        key="matches"
        section={sectionById.matches}
        status={data.status}
        nextMatch={data.nextMatch}
        recentMatches={data.recentMatches}
        onOpenMatch={onOpenMatch}
      />
    ),
    news: () => (
      <NewsSection
        key="news"
        section={sectionById.news}
        status={data.status}
        articles={data.news}
        content={data.content}
        onOpenArticle={onOpenArticle}
      />
    ),
    team: () => (
      <TeamSection
        key="team"
        section={sectionById.team}
        players={data.players}
        status={data.sectionStatus.players}
      />
    ),
    club: () => <ClubSection key="club" section={sectionById.club} club={data.club} content={data.content} />,
    shop: () => (
      <ShopSection
        key="shop"
        section={sectionById.shop}
        products={data.products}
        status={data.sectionStatus.products}
        cart={cart}
        onOpenCart={onOpenCart}
      />
    ),
    donation: () => (
      <section id="donation" className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="rounded-[2rem] bg-jso-gold p-7 text-jso-navy shadow-sm sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.16em] opacity-60">Soutenir la JSO</p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-black">1 000 supporters · 10 TND par mois.</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 opacity-70">
                L’objectif est de construire un soutien régulier pour le club : 10 000 TND par mois et 120 000 TND sur 12 mois si 1 000 personnes participent.
              </p>
            </div>
            <a href="/soutenir" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-jso-navy px-6 py-3 font-extrabold text-white hover:bg-white hover:text-jso-navy">
              Participer <HeartHandshake size={17} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    ),
    memberships: () => (
      <MembershipsSection
        key="memberships"
        section={sectionById.memberships}
        token={fan.token}
        onRequireLogin={() => onOpenAuth('login')}
      />
    ),
    media: () => (
      <MediaSection
        key="media"
        section={sectionById.media}
        media={data.media}
        status={data.sectionStatus.media}
      />
    ),
    events: () => (
      <AgendaSection
        key="events"
        section={sectionById.events}
        events={data.events}
        status={data.sectionStatus.events}
      />
    ),
    community: () => (
      sectionById.community
        ? <CommunitySection key="community" section={sectionById.community} programs={data.community} />
        : null
    ),
    archive: () => (
      sectionById.archive
        ? <ArchiveSection key="archive" section={sectionById.archive} archive={data.archive} />
        : null
    ),
    mobile: () => <MobileSection key="mobile" section={sectionById.mobile} />,
    sponsors: () => (
      sectionById.sponsors
        ? <SponsorsSection key="sponsors" section={sectionById.sponsors} sponsors={data.sponsors} />
        : null
    ),
    infos: () => (
      <InfoSection
        key="infos"
        section={sectionById.infos}
        club={data.club}
        documents={data.documents}
        faq={data.faq}
        documentsStatus={data.sectionStatus.documents}
        faqStatus={data.sectionStatus.faq}
      />
    ),
  }

  const defaultSectionOrder = [
    'matches',
    'news',
    'team',
    'media',
    'club',
    'events',
    'shop',
    'donation',
    'memberships',
    'community',
    'sponsors',
    'archive',
    'mobile',
    'infos',
  ]

  const orderedSections = orderHomeSections(defaultSectionOrder, homeLayout)
    .filter((key) => !hiddenSections.includes(key))

  return (
    <main id="main-content" tabIndex={-1}>
      <HeroSection content={data.content} club={data.club} />
      <Reveal><SellingBand nextMatch={data.nextMatch} /></Reveal>
      <Reveal>
        <HighlightsCarousel
          items={buildHighlights({
            data,
            onOpenMatch,
            onOpenArticle,
          })}
        />
      </Reveal>
      {orderedSections.map((key) => {
        const rendered = sectionRenderers[key]?.()
        return rendered ? <Reveal key={key}>{rendered}</Reveal> : null
      })}
    </main>
  )
}