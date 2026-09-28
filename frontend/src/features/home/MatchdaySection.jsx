import { ArrowUpRight, CalendarDays, MapPin, Trophy } from 'lucide-react'
import { formatDate, formatTime } from '../../lib/format'
import TeamBadge from '../matches/TeamBadge'
import { clubResult, hasScore, isLive, matchSides, matchStatusLabel, RESULT_LABELS, RESULT_SHORT } from '../matches/matchUtils'
import SectionHeading from './SectionHeading'

function MatchStatus({ match }) {
  const live = isLive(match)
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold ${live ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
      {live && <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden="true" />}
      {matchStatusLabel(match.status)}
    </span>
  )
}

function MainMatch({ match, onOpenMatch }) {
  if (!match) {
    return (
      <div className="grid min-h-96 place-items-center rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
        <div>
          <CalendarDays className="mx-auto text-jso-blue" size={34} aria-hidden="true" />
          <h3 className="mt-4 text-2xl font-black">Aucun match programmé</h3>
          <p className="mt-2 text-slate-500">Le prochain rendez-vous apparaîtra ici dès sa publication.</p>
        </div>
      </div>
    )
  }

  const { home, away } = matchSides(match)
  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/45 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-extrabold tracking-[0.2em] text-jso-blue">PROCHAIN MATCH</p>
        <MatchStatus match={match} />
      </div>
      <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-start gap-3 sm:gap-6">
        {[home, away].map((team) => (
          <div key={`${team.name}-${team.isClub}`} className="flex min-w-0 flex-col items-center text-center">
            <TeamBadge team={team} />
            <h3 className="mt-4 line-clamp-2 text-base font-black sm:text-xl">{team.name}</h3>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">{team.isClub ? 'JSO' : 'Adversaire'}</p>
          </div>
        )).reduce((items, team, index) => (index === 0 ? [team] : [
          ...items,
          <div key="versus" className="pt-8 text-center sm:pt-10">
            <span className="text-3xl font-black text-jso-navy sm:text-4xl">VS</span>
          </div>,
          team,
        ]), [])}
      </div>
      <div className="mt-8 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
        <p className="flex items-center gap-2 text-slate-600"><CalendarDays size={17} className="text-jso-blue" aria-hidden="true" /><span><strong className="text-jso-ink">{formatDate(match.kickoffAt, { weekday: 'long', day: 'numeric', month: 'long' })}</strong> · {formatTime(match.kickoffAt)}</span></p>
        <p className="flex items-center gap-2 text-slate-600 sm:justify-end"><MapPin size={17} className="text-jso-blue" aria-hidden="true" />{match.venue || 'Lieu à confirmer'}</p>
      </div>
      <button type="button" onClick={() => onOpenMatch(match)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-jso-navy px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-jso-blue">
        Détails, composition et statistiques <ArrowUpRight size={16} aria-hidden="true" />
      </button>
    </article>
  )
}

function RecentResult({ match, onOpenMatch }) {
  const sides = matchSides(match)
  const result = clubResult(match)
  const resultTone = result === 'win' ? 'bg-emerald-100 text-emerald-700' : result === 'loss' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'

  return (
    <button type="button" onClick={() => onOpenMatch(match)} className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-jso-blue/40 hover:shadow-lg">
      <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-400">
        <time dateTime={match.kickoffAt}>{formatDate(match.kickoffAt, { day: 'numeric', month: 'short' })}</time>
        {result && <span className={`rounded-full px-2.5 py-1 font-black ${resultTone}`} title={RESULT_LABELS[result]}>{RESULT_SHORT[result]}</span>}
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <p className={`truncate text-sm font-black ${sides.home.isClub ? 'text-jso-navy' : 'text-slate-600'}`}>{sides.home.name}</p>
        <p className="rounded-lg bg-jso-navy px-3 py-1.5 text-base font-black text-white">{hasScore(match) ? `${sides.home.score} – ${sides.away.score}` : '—'}</p>
        <p className={`truncate text-right text-sm font-black ${sides.away.isClub ? 'text-jso-navy' : 'text-slate-600'}`}>{sides.away.name}</p>
      </div>
      <p className="mt-3 flex items-center justify-end gap-1 text-xs font-extrabold text-jso-blue opacity-0 transition group-hover:opacity-100">Voir le détail <ArrowUpRight size={13} aria-hidden="true" /></p>
    </button>
  )
}

export default function MatchdaySection({ section, status, nextMatch, recentMatches, onOpenMatch }) {
  return (
    <section id="matches" aria-labelledby="matches-title" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
      <SectionHeading section={section} title="Le match," muted="au cœur du club." description="Prochain rendez-vous, derniers résultats et informations du Match Center." />

      {status === 'loading' ? (
        <div role="status" className="mt-10 grid min-h-96 animate-pulse place-items-center rounded-[2rem] bg-white text-slate-400">Chargement du calendrier…</div>
      ) : status === 'offline' ? (
        <div role="alert" className="mt-10 rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-amber-900">
          <h3 className="text-xl font-black">Le calendrier est momentanément indisponible.</h3>
          <p className="mt-2 text-sm">Veuillez réessayer dans quelques instants.</p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <MainMatch match={nextMatch} onOpenMatch={onOpenMatch} />
          <div className="rounded-[2rem] bg-jso-navy p-5 text-white sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-jso-gold text-jso-navy"><Trophy size={19} aria-hidden="true" /></span>
              <div><p className="text-xs font-extrabold tracking-[0.18em] text-white/45">DERNIERS RÉSULTATS</p><h3 className="font-black">La forme récente</h3></div>
            </div>
            <div className="mt-5 space-y-3">
              {recentMatches.length > 0
                ? recentMatches.map((match) => <RecentResult key={match.id || match.kickoffAt} match={match} onOpenMatch={onOpenMatch} />)
                : <p className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-white/60">Aucun résultat publié pour le moment.</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
