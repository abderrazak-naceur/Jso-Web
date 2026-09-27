import { ArrowDown, ArrowUpRight, CalendarDays, MapPin } from 'lucide-react'
import { formatDate, formatTime, relativeDay } from '../../lib/format'
import TeamBadge from '../matches/TeamBadge'
import { matchSides } from '../matches/matchUtils'
import { CLUB_FOUNDED, CLUB_FULL_NAME, CLUB_NAME, CREST_SRC } from '../site/brand'

function HeroMatchCard({ match, onOpenMatch }) {
  if (!match) {
    return (
      <div className="relative flex min-h-[360px] min-w-0 flex-col items-center justify-center overflow-hidden px-4 py-8 text-center text-white sm:min-h-[430px]">
        <div className="absolute inset-12 rounded-full bg-jso-gold/20 blur-3xl" aria-hidden="true" />
        <img
          src={CREST_SRC}
          alt="Blason de la Jeunesse Sportive de Oudhref"
          className="relative max-h-72 w-auto max-w-[78%] object-contain drop-shadow-[0_24px_38px_rgba(0,0,0,0.7)] sm:max-h-96"
        />
        <a href="#matches" className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-jso-navy/75 px-5 py-3 text-xs font-extrabold tracking-[0.12em] text-jso-gold backdrop-blur-md transition hover:bg-white/10">
          LE CALENDRIER ARRIVE BIENTÔT <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </div>
    )
  }

  const { home, away } = matchSides(match)
  return (
    <div className="relative min-w-0 overflow-hidden rounded-[2rem] border border-white/15 bg-white/95 p-5 text-jso-ink shadow-2xl shadow-black/25 sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-extrabold tracking-[0.2em] text-jso-blue">PROCHAIN MATCH</p>
        <span className="rounded-full bg-jso-gold/25 px-3 py-1 text-xs font-extrabold capitalize text-jso-navy">{relativeDay(match.kickoffAt)}</span>
      </div>
      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        {[home, away].map((team) => (
          <div key={`${team.name}-${team.isClub}`} className="flex min-w-0 flex-col items-center text-center">
            <TeamBadge team={team} compact />
            <p className="mt-3 line-clamp-2 text-sm font-black leading-5 sm:text-base">{team.name}</p>
          </div>
        )).reduce((items, team, index) => (index === 0 ? [team] : [
          ...items,
          <div key="versus" className="pt-4 text-lg font-black text-slate-300">VS</div>,
          team,
        ]), [])}
      </div>
      <div className="mt-6 grid gap-2 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600 sm:grid-cols-2">
        <p className="flex items-center gap-2"><CalendarDays size={16} className="text-jso-blue" aria-hidden="true" /><span><strong>{formatDate(match.kickoffAt, { day: 'numeric', month: 'long' })}</strong> · {formatTime(match.kickoffAt)}</span></p>
        <p className="flex items-center gap-2 sm:justify-end"><MapPin size={16} className="text-jso-blue" aria-hidden="true" /><span className="truncate">{match.venue || 'Lieu à confirmer'}</span></p>
      </div>
      <button type="button" onClick={() => onOpenMatch(match)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-jso-navy px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-jso-blue">
        Ouvrir le Match Center <ArrowUpRight size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

export default function HeroSection({ content, club, nextMatch, onOpenMatch }) {
  const city = club?.city || club?.City || 'Oudhref'

  return (
    <section id="home" aria-labelledby="home-title" className="jso-hero relative isolate overflow-hidden bg-jso-navy text-white">
      <div className="absolute inset-0 bg-gradient-to-r from-jso-navy via-jso-navy/95 to-jso-navy/55" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-jso-navy/55 to-transparent" aria-hidden="true" />
      <div className="relative mx-auto grid min-h-[640px] max-w-7xl items-center gap-10 px-5 py-14 lg:grid-cols-[1.1fr_0.75fr] lg:px-8 lg:py-20">
        <div className="min-w-0 max-w-3xl">
          <p className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-extrabold tracking-[0.18em] text-jso-gold backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-jso-gold" aria-hidden="true" /> {CLUB_FULL_NAME.toUpperCase()}
          </p>
          <h1 id="home-title" className="mt-7 text-5xl font-black leading-[0.94] tracking-[-0.055em] sm:text-7xl xl:text-[5.5rem]">
            {content.hero_title || 'Une ville.'}<br />
            <span className="text-jso-gold">{content.hero_highlight || 'Une passion.'}</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/72">
            {content.hero_description || club?.description || club?.Description || `Toute l'actualité de ${CLUB_NAME}, les matchs et la vie du club au même endroit.`}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#matches" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-jso-gold px-6 py-4 font-extrabold text-jso-navy transition hover:-translate-y-0.5 hover:bg-white sm:w-auto">
              Suivre les matchs <ArrowUpRight size={18} aria-hidden="true" />
            </a>
            <a href="#news" className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-4 font-extrabold text-white transition hover:bg-white/20 sm:w-auto">
              Les actualités <ArrowDown size={18} aria-hidden="true" />
            </a>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/15 pt-6 text-sm text-white/60">
            <span><strong className="text-white">{city}</strong> · Tunisie</span>
            <span><strong className="text-white">Depuis {CLUB_FOUNDED}</strong> · Fierté locale</span>
          </div>
        </div>
        <HeroMatchCard match={nextMatch} onOpenMatch={onOpenMatch} />
      </div>
    </section>
  )
}
