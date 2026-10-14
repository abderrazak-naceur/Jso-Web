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
import { ArrowUpRight, HeartHandshake } from 'lucide-react'
import ProductDetail from '../shop/ProductDetail'
import EventDetail from './EventDetail'
import Reveal from '../site/Reveal'
import { formatDate } from '../../lib/format'
import { orderHomeSections } from './useHomeLayout'
import { getHomeTemplate, HOME_TEMPLATE_IDS } from './homeTemplates'

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
    onSelect: () => { window.location.assign('/boutique') },
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
    onSelect: () => { window.location.assign('/abonnements') },
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
  focusSection,
  productSlug,
  eventSlug,
  templatePreview = null,
}) {
  const sectionById = Object.fromEntries(sections.map((section) => [section.id, section]))

  const sectionRenderers = {
    hero: () => <HeroSection variant={template} content={data.content} club={data.club} />,
    'selling-band': () => <SellingBand nextMatch={data.nextMatch} />,
    highlights: () => (
      <HighlightsCarousel
        items={buildHighlights({ data, onOpenMatch, onOpenArticle })}
      />
    ),
    'app-download': () => (
      <section aria-labelledby="mobile-app-download-title" className="mx-auto max-w-7xl px-5 pb-8 lg:px-8">
        <div className="rounded-[2rem] bg-jso-navy p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-jso-gold">JSO Mobile</p>
              <h2 id="mobile-app-download-title" className="mt-2 text-2xl font-black">La JSO dans votre poche</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">Téléchargez la version Android officielle de JSO Mobile et retrouvez les actualités, les matchs et la vie du club.</p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-white/65">
                <span>Version 1.0.1 · Build 2</span>
                <span>Mise à jour : 14/10/2026</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:items-end">
              <a href="https://github.com/abderrazak-naceur/Jso-Web/releases/download/android-latest/app-release.apk" className="inline-flex items-center justify-center gap-2 rounded-full bg-jso-gold px-6 py-3 font-extrabold text-jso-navy transition hover:bg-white" aria-label="Télécharger JSO Mobile version 1.0.1 pour Android">Télécharger l’APK <ArrowUpRight size={18} aria-hidden="true" /></a>
              <a href="/application" className="text-sm font-bold text-white/75 underline underline-offset-4 hover:text-white">Détails de l’application</a>
            </div>
          </div>
        </div>
      </section>
    ),
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
    shop: () => productSlug ? <ProductDetail key="shop-product" slug={productSlug} cart={cart} onOpenCart={onOpenCart} /> : (
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
    events: () => eventSlug ? <EventDetail key="event-detail" slug={eventSlug} /> : (
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

  const requestedTemplate = templatePreview || data.content?.home_template
  const template = HOME_TEMPLATE_IDS.has(requestedTemplate) ? requestedTemplate : 'modern-2026'
  const defaultSectionOrder = getHomeTemplate(template).sectionOrder
  const orderedSections = orderHomeSections(defaultSectionOrder, homeLayout)
    .filter((key) => !hiddenSections.includes(key))

  const pageSections = focusSection
    ? defaultSectionOrder.filter((key) => key === focusSection && !hiddenSections.includes(key))
    : orderedSections

  return (
    <main id="main-content" tabIndex={-1} className={`home-template-${template}`}>
      {templatePreview && <div className="mx-auto max-w-7xl px-5 pt-4 lg:px-8"><p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">Anteprima del modello · non ancora pubblicata</p></div>}
      {focusSection && <div className="mx-auto max-w-7xl px-5 pt-8 lg:px-8"><a href="/" className="text-sm font-bold text-jso-blue underline">← Accueil</a></div>}
      {focusSection && !pageSections.includes(focusSection) && <div role="alert" className="mx-auto max-w-7xl px-5 py-16 text-slate-600 lg:px-8">Cette page n'est pas disponible pour le moment.</div>}
      {pageSections.map((key) => {
        const rendered = sectionRenderers[key]?.()
        if (!rendered) return null
        const content = key === 'hero' ? rendered : <Reveal>{rendered}</Reveal>
        return <div key={key} data-home-section={key}>{content}</div>
      })}
    </main>
  )
}
