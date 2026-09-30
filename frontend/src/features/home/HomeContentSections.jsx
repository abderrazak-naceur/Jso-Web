export { default as TeamSection } from '../team/TeamSection'

import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Download,
  FileText,
  HeartHandshake,
  Landmark,
  MapPin,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Sprout,
} from 'lucide-react'
import { formatDate, formatMoney, formatTime, pick } from '../../lib/format'
import { CLUB_FOUNDED, CLUB_NAME } from '../site/brand'
import { eyebrowText } from '../site/navigation'
import SectionHeading from './SectionHeading'
import { SectionError, SectionLoading } from './SectionState'

export function ClubSection({ section, club, content }) {
  const city = pick(club, 'city', 'City') || 'Oudhref'
  const description = pick(club, 'description', 'Description')

  return (
    <section id="club" aria-labelledby="club-title" className="relative overflow-hidden bg-jso-navy text-white">
      <div className="absolute -right-20 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full border-[70px] border-white/[0.025]" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHeading
          section={section}
          eyebrow={eyebrowText(content.club_eyebrow, section.eyebrow)}
          title={content.club_title || 'Une histoire.'}
          muted={content.club_muted || 'Une ville. Une passion.'}
          description={description || 'La JSO est une identité collective, un lien entre les générations et une ambition pour l’avenir du football à Oudhref.'}
          light
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <article className="rounded-[2rem] border border-white/10 bg-white/5 p-7 backdrop-blur-sm">
            <p className="text-5xl font-black text-jso-gold">{CLUB_FOUNDED}</p>
            <h3 className="mt-8 text-xl font-black">Nos racines</h3>
            <p className="mt-2 text-sm leading-6 text-white/60">Une histoire sportive qui se transmet de génération en génération.</p>
          </article>
          <article className="rounded-[2rem] border border-white/10 bg-white/5 p-7 backdrop-blur-sm">
            <Landmark size={38} className="text-jso-gold" aria-hidden="true" />
            <h3 className="mt-8 text-xl font-black">{city}</h3>
            <p className="mt-2 text-sm leading-6 text-white/60">Un club ancré dans sa ville et porté par toute une communauté.</p>
          </article>
          <article className="rounded-[2rem] border border-white/10 bg-white/5 p-7 backdrop-blur-sm">
            <Sprout size={38} className="text-jso-gold" aria-hidden="true" />
            <h3 className="mt-8 text-xl font-black">La relève</h3>
            <p className="mt-2 text-sm leading-6 text-white/60">Former, accompagner et faire grandir les talents de demain.</p>
          </article>
        </div>
      </div>
    </section>
  )
}

export function ShopSection({ section, products, cart, onOpenCart, status = 'ready' }) {
  return (
    <section id="shop" aria-labelledby="shop-title" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-jso-gold p-7 sm:p-10 lg:p-12">
        <div className="absolute -right-12 -top-20 h-72 w-72 rounded-full border-[48px] border-jso-navy/5" aria-hidden="true" />
        <div className="relative">
          <SectionHeading
            section={section}
            title="Porte les couleurs."
            muted="Vis l’identité."
            description="Retrouvez les produits officiels de la Jeunesse Sportive de Oudhref."
            action={products.length > 0 ? (
              <button type="button" onClick={onOpenCart} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-jso-navy px-6 py-4 font-extrabold text-white transition hover:bg-jso-blue">
                <ShoppingBag size={18} aria-hidden="true" /> Panier ({cart.count})
              </button>
            ) : null}
          />
          {status === 'loading' ? (
            <p className="mt-10 rounded-2xl bg-white/45 p-6 font-semibold text-jso-navy/75" role="status">Chargement de la boutique…</p>
          ) : status === 'error' ? (
            <p className="mt-10 rounded-2xl bg-white/60 p-6 font-semibold text-jso-navy/75" role="alert">La boutique est momentanément indisponible.</p>
          ) : products.length === 0 ? (
            <p className="mt-10 rounded-2xl bg-white/45 p-6 font-semibold text-jso-navy/75">La boutique arrive bientôt. Les produits officiels seront disponibles ici.</p>
          ) : (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((rawProduct) => {
                const product = {
                  id: pick(rawProduct, 'id', 'Id'),
                  name: pick(rawProduct, 'name', 'Name') || 'Produit JSO',
                  description: pick(rawProduct, 'description', 'Description'),
                  price: pick(rawProduct, 'price', 'Price') || 0,
                  currency: pick(rawProduct, 'currency', 'Currency') || 'TND',
                  imageUrl: pick(rawProduct, 'imageUrl', 'ImageUrl'),
                  category: pick(rawProduct, 'category', 'Category'),
                  inStock: Boolean(pick(rawProduct, 'inStock', 'InStock')),
                }
                return (
                  <article key={product.id || product.name} className="flex flex-col overflow-hidden rounded-[1.7rem] bg-white shadow-xl shadow-jso-navy/10">
                    <div className="grid aspect-[4/3] place-items-center overflow-hidden bg-slate-100">
                      {product.imageUrl
                        ? <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
                        : <ShoppingBag size={42} className="text-slate-300" aria-hidden="true" />}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      {product.category && <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-jso-blue">{product.category}</p>}
                      <h3 className="mt-1 text-xl font-black text-jso-ink">{product.name}</h3>
                      {product.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{product.description}</p>}
                      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                        <span className="text-xl font-black text-jso-navy">{formatMoney(product.price, product.currency)}</span>
                        {product.inStock
                          ? <button type="button" onClick={() => cart.add(product)} className="rounded-full bg-jso-navy px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-jso-blue">Ajouter</button>
                          : <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-400">Épuisé</span>}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export function AgendaSection({ section, events, status = 'ready' }) {
  return (
    <section id="events" aria-labelledby="events-title" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
      <SectionHeading section={section} title="Les rendez-vous" muted="du club." description="Matchs, réunions et événements à ne pas manquer." />
      {status === 'loading' ? (
        <div className="mt-10"><SectionLoading message="Chargement de l’agenda…" /></div>
      ) : status === 'error' ? (
        <div className="mt-10"><SectionError message="L’agenda est momentanément indisponible." /></div>
      ) : (
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.length > 0 ? events.map((event) => {
          const id = pick(event, 'id', 'Id')
          const title = pick(event, 'title', 'Title')
          const startAt = pick(event, 'startAt', 'StartAt')
          const endAt = pick(event, 'endAt', 'EndAt')
          const location = pick(event, 'location', 'Location')
          const description = pick(event, 'description', 'Description')
          return (
            <article key={id || `${title}-${startAt}`} className="rounded-[1.7rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/35">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.15em] text-jso-blue"><CalendarDays size={16} aria-hidden="true" />{formatDate(startAt, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <h3 className="mt-4 text-2xl font-black">{title}</h3>
              {location && <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-500"><MapPin size={15} aria-hidden="true" />{location}</p>}
              {description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">{description}</p>}
              <p className="mt-5 text-sm font-black text-jso-navy">{formatTime(startAt)}{endAt ? ` → ${formatTime(endAt)}` : ''}</p>
            </article>
          )
        }) : (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-slate-500 md:col-span-2 lg:col-span-3">Aucun événement annoncé pour le moment.</div>
        )}
      </div>
      )}
    </section>
  )
}

export function CommunitySection({ section, programs }) {
  return (
    <section id="community" aria-labelledby="community-title" className="border-y border-slate-200 bg-white/45">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHeading section={section} title="Ensemble pour" muted="Oudhref." description="Les initiatives sportives et citoyennes portées par le club et ses partenaires." />
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <article key={pick(program, 'id', 'Id')} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-lg shadow-slate-200/35">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-jso-navy text-jso-gold"><HeartHandshake size={24} aria-hidden="true" /></span>
              <h3 className="mt-7 text-2xl font-black">{pick(program, 'title', 'Title')}</h3>
              {pick(program, 'partnerName', 'PartnerName') && <p className="mt-1 text-sm font-bold text-jso-blue">Avec {pick(program, 'partnerName', 'PartnerName')}</p>}
              {pick(program, 'description', 'Description') && <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-500">{pick(program, 'description', 'Description')}</p>}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function ArchiveSection({ section, archive }) {
  return (
    <section id="archive" aria-labelledby="archive-title" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
      <SectionHeading section={section} title="La mémoire" muted="du club." description="Archives, images et histoires qui construisent l’identité de la JSO." />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {archive.map((item) => {
          const mediaUrl = pick(item, 'mediaUrl', 'MediaUrl')
          return (
            <article key={pick(item, 'id', 'Id')} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg shadow-slate-200/35">
              {mediaUrl
                ? <div className="aspect-[4/3] overflow-hidden bg-slate-100"><img src={mediaUrl} alt={pick(item, 'title', 'Title') || ''} loading="lazy" className="h-full w-full object-cover" /></div>
                : <div className="grid aspect-[4/3] place-items-center bg-jso-navy"><Landmark size={50} className="text-jso-gold" aria-hidden="true" /></div>}
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em]">
                  {pick(item, 'year', 'Year') && <span className="rounded-full bg-jso-navy px-3 py-1 text-jso-gold">{pick(item, 'year', 'Year')}</span>}
                  {pick(item, 'category', 'Category') && <span className="text-slate-400">{pick(item, 'category', 'Category')}</span>}
                </div>
                <h3 className="mt-4 text-xl font-black">{pick(item, 'title', 'Title')}</h3>
                {pick(item, 'body', 'Body') && <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-500">{pick(item, 'body', 'Body')}</p>}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export function MobileSection({ section }) {
  return (
    <section id="mobile" aria-labelledby="mobile-title" className="overflow-hidden bg-jso-navy text-white">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[0.7fr_1.3fr] lg:px-8">
        <div>
          <SectionHeading section={section} title="La JSO" muted="dans ta poche." description="Le Match Center, les actualités et la vie du club dans une expérience pensée pour iOS et Android." light />
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-jso-gold/30 bg-jso-gold/10 px-4 py-2 text-sm font-bold text-jso-gold"><Smartphone size={16} aria-hidden="true" /> Application en préparation</p>
        </div>
        <div className="grid grid-cols-2 items-end gap-3 sm:gap-6">
          <img src="/jso-flutter-home-concept.png" alt="Aperçu de l’écran d’accueil de l’application JSO" loading="lazy" className="w-full rounded-[1.5rem] shadow-2xl shadow-black/35" />
          <img src="/jso-flutter-match-concept.png" alt="Aperçu du Match Center de l’application JSO" loading="lazy" className="w-full rounded-[1.5rem] shadow-2xl shadow-black/35" />
        </div>
      </div>
    </section>
  )
}

export function SponsorsSection({ section, sponsors }) {
  // Sponsors that provide a wide advertising banner are featured on top as
  // clickable banners; the rest keep the compact logo grid below.
  const banners = sponsors.filter((sponsor) => pick(sponsor, 'bannerImageUrl', 'BannerImageUrl'))

  return (
    <section id="sponsors" aria-labelledby="sponsors-title" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
      <SectionHeading section={section} title="Ils soutiennent" muted="le club." />

      {banners.length > 0 && (
        <div className="mt-10 space-y-4">
          {banners.map((sponsor) => {
            const id = pick(sponsor, 'id', 'Id')
            const name = pick(sponsor, 'name', 'Name') || 'Partenaire JSO'
            const bannerUrl = pick(sponsor, 'bannerImageUrl', 'BannerImageUrl')
            const websiteUrl = pick(sponsor, 'websiteUrl', 'WebsiteUrl')
            const banner = <img src={bannerUrl} alt={`Bannière ${name}`} loading="lazy" className="w-full object-cover" />
            const bannerClass = 'block overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl'
            return websiteUrl
              ? <a key={`banner-${id || name}`} href={websiteUrl} target="_blank" rel="noopener noreferrer" aria-label={`${name} (nouvel onglet)`} className={bannerClass}>{banner}</a>
              : <div key={`banner-${id || name}`} className={bannerClass}>{banner}</div>
          })}
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
        {sponsors.map((sponsor) => {
          const id = pick(sponsor, 'id', 'Id')
          const name = pick(sponsor, 'name', 'Name') || 'Partenaire JSO'
          const logoUrl = pick(sponsor, 'logoUrl', 'LogoUrl')
          const websiteUrl = pick(sponsor, 'websiteUrl', 'WebsiteUrl')
          const content = logoUrl ? <img src={logoUrl} alt={name} loading="lazy" className="max-h-16 max-w-full object-contain" /> : <span className="text-center text-lg font-black text-jso-navy">{name}</span>
          const className = 'grid h-28 w-44 place-items-center rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg'
          return websiteUrl
            ? <a key={id || name} href={websiteUrl} target="_blank" rel="noopener noreferrer" className={className}>{content}</a>
            : <div key={id || name} className={className}>{content}</div>
        })}
      </div>
    </section>
  )
}

export function InfoSection({ section, club, documents, faq, documentsStatus = 'ready', faqStatus = 'ready' }) {
  const city = pick(club, 'city', 'City') || 'Oudhref'
  const country = pick(club, 'country', 'Country') || 'Tunisie'

  return (
    <section id="infos" aria-labelledby="infos-title" className="border-t border-slate-200 bg-white/55">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHeading section={section} title="Tout savoir" muted="sur la JSO." description="Accès au club, documents officiels et réponses aux questions fréquentes." />
        <div className="mt-10 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="space-y-4">
            <article className="rounded-[2rem] bg-jso-navy p-7 text-white">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-jso-gold text-jso-navy"><MapPin size={22} aria-hidden="true" /></span>
              <h3 className="mt-8 text-2xl font-black">Retrouvez le club</h3>
              <p className="mt-3 text-white/65">Stade d’Oudhref<br />{city}, {country}</p>
              <a href="#matches" className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-jso-gold">Voir le calendrier <ArrowUpRight size={15} aria-hidden="true" /></a>
            </article>

            {documentsStatus === 'error' ? (
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3"><FileText className="text-jso-blue" size={22} aria-hidden="true" /><h3 className="text-xl font-black">Documents officiels</h3></div>
                <p className="mt-4 text-sm font-semibold text-amber-800" role="alert">Les documents sont momentanément indisponibles.</p>
              </div>
            ) : documents.length > 0 && (
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3"><FileText className="text-jso-blue" size={22} aria-hidden="true" /><h3 className="text-xl font-black">Documents officiels</h3></div>
                <div className="mt-4 space-y-2">
                  {documents.map((document) => (
                    <a key={pick(document, 'id', 'Id')} href={pick(document, 'fileUrl', 'FileUrl')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold transition hover:bg-slate-100">
                      <span className="min-w-0 flex-1 truncate">{pick(document, 'title', 'Title')}</span><span className="sr-only"> (télécharger, nouvel onglet)</span><Download size={16} className="shrink-0 text-jso-blue" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex items-center gap-3"><CircleHelp className="text-jso-blue" size={24} aria-hidden="true" /><h3 className="text-2xl font-black">Questions fréquentes</h3></div>
            {faqStatus === 'loading' ? (
              <p className="mt-6 rounded-2xl bg-slate-50 p-6 font-semibold text-slate-500" role="status">Chargement des questions…</p>
            ) : faqStatus === 'error' ? (
              <p className="mt-6 rounded-2xl bg-amber-50 p-6 font-semibold text-amber-900" role="alert">La foire aux questions est momentanément indisponible.</p>
            ) : faq.length > 0 ? (
              <div className="mt-5 divide-y divide-slate-200">
                {faq.map((item) => (
                  <details key={pick(item, 'id', 'Id')} className="group py-4 [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex cursor-pointer items-center justify-between gap-4 font-black">
                      {pick(item, 'question', 'Question')}
                      <ChevronRight size={18} className="shrink-0 text-jso-blue transition group-open:rotate-90" aria-hidden="true" />
                    </summary>
                    <p className="mt-3 whitespace-pre-line pr-8 text-sm leading-6 text-slate-600">{pick(item, 'answer', 'Answer')}</p>
                  </details>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl bg-slate-50 p-6">
                <p className="font-black">Besoin d’une information ?</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">Les informations pratiques du club seront complétées prochainement.</p>
              </div>
            )}
          </div>
        </div>
        <p className="sr-only">{CLUB_NAME}, fondé en {CLUB_FOUNDED}.</p>
      </div>
    </section>
  )
}
