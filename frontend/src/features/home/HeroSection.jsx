import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { CLUB_FOUNDED, CLUB_FULL_NAME, CLUB_NAME, CREST_SRC } from '../site/brand'
import SignatureHero from './SignatureHero'
import './premium-home.css'

function HeroClubEmblem() {
  return (
    <div className="jso-premium-emblem relative grid min-h-[330px] min-w-0 place-items-center overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-br from-[#102b50] via-jso-navy to-[#061329] shadow-2xl shadow-black/25 sm:min-h-[430px]">
      <div className="absolute left-1/2 top-1/2 h-[78%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" aria-hidden="true" />
      <div className="absolute left-1/2 top-1/2 h-[62%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-jso-gold/20" aria-hidden="true" />
      <img src={CREST_SRC} alt="Emblème de la Jeunesse Sportive de Oudhref" fetchPriority="high" className="relative z-10 h-52 w-52 rounded-full object-contain drop-shadow-[0_20px_45px_rgba(0,0,0,0.45)] sm:h-72 sm:w-72 lg:h-80 lg:w-80" />
      <div className="jso-premium-emblem-caption absolute inset-x-0 bottom-0 bg-gradient-to-t from-jso-navy/95 to-transparent px-5 pb-5 pt-16 text-center sm:pb-7">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-jso-gold">Notre blason · Notre ville</p>
        <p className="mt-2 text-xl font-black text-white sm:text-2xl">Fierté · Passion · Oudhref</p>
      </div>
    </div>
  )
}

export default function HeroSection({ content, club, variant, nextMatch, showMatch, showDonation }) {
  if (variant === 'modern-2026') return <SignatureHero content={content} club={club} nextMatch={nextMatch} showMatch={showMatch} showDonation={showDonation} />
  const premium = variant === 'premium-2026'
  const city = club?.city || club?.City || 'Oudhref'
  const heroTitle = content.hero_title || (premium ? 'Plus qu’un club,' : 'Une ville.')
  const heroHighlight = content.hero_highlight || (premium ? 'une famille.' : 'Une passion.')

  return (
    <section id="home" aria-labelledby="home-title" className={`jso-hero relative isolate overflow-hidden ${premium ? 'jso-hero--premium bg-white text-jso-navy' : 'bg-jso-navy text-white'}`}>
      <div className={`absolute inset-0 ${premium ? 'jso-premium-overlay' : 'bg-gradient-to-r from-jso-navy via-jso-navy/95 to-jso-navy/55'}`} aria-hidden="true" />
      <div className={`absolute inset-x-0 bottom-0 h-40 ${premium ? 'jso-premium-bottom-overlay' : 'bg-gradient-to-t from-jso-navy/55 to-transparent'}`} aria-hidden="true" />
      <div className="relative mx-auto grid min-h-[600px] max-w-7xl items-center gap-10 px-5 py-14 lg:grid-cols-[1.1fr_0.75fr] lg:px-8 lg:py-20">
        <div className="jso-premium-copy min-w-0 max-w-3xl">
          <p className={`jso-premium-eyebrow inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-extrabold tracking-[0.18em] backdrop-blur-md ${premium ? 'text-jso-blue' : 'text-jso-gold'}`}>
            <span className="h-2 w-2 rounded-full bg-jso-gold" aria-hidden="true" /> {premium ? 'NOTRE VILLE. NOTRE CLUB.' : CLUB_FULL_NAME.toUpperCase()}
          </p>
          <h1 id="home-title" className="mt-7 text-5xl font-black leading-[0.94] tracking-[-0.055em] sm:text-7xl xl:text-[5.5rem]">
            {heroTitle}<br />
            <span className="text-jso-gold">{heroHighlight}</span>
          </h1>
          <p className={`jso-premium-description mt-7 max-w-2xl text-lg leading-8 ${premium ? 'text-slate-600' : 'text-white/72'}`}>
            {content.hero_description || club?.description || club?.Description || `Toute l'actualité de ${CLUB_NAME}, les matchs et la vie du club au même endroit.`}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="/matchs" className={`jso-premium-primary inline-flex w-full items-center justify-center gap-2 rounded-full bg-jso-gold px-6 py-4 font-extrabold text-jso-navy transition hover:-translate-y-0.5 hover:bg-white sm:w-auto`}>
              {premium ? 'Acheter un billet' : 'Suivre les matchs'} <ArrowUpRight size={18} aria-hidden="true" />
            </a>
            <a href={premium ? '/abonnements' : '/actualites'} className={`jso-premium-secondary inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-4 font-extrabold text-white transition hover:bg-white/20 sm:w-auto`}>
              {premium ? 'Voir les abonnements' : 'Les actualités'} <ArrowDown size={18} aria-hidden="true" />
            </a>
          </div>
          <div className="jso-premium-facts mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/15 pt-6 text-sm text-white/60">
            <span><strong className="text-white">{city}</strong> · Tunisie</span>
            <span><strong className="text-white">Depuis {CLUB_FOUNDED}</strong> · Fierté locale</span>
          </div>
        </div>
        <HeroClubEmblem />
      </div>
    </section>
  )
}
