import { useEffect, useState } from 'react'
import { CalendarDays, MapPin, X } from 'lucide-react'
import { publicApi } from '../../lib/api'
import { formatDateTime, pick } from '../../lib/format'
import { useDialog } from '../site/useDialog'
import CommentsSection from '../community/CommentsSection'
import MatchStreamPanel from './MatchStreamPanel'
import TeamBadge from './TeamBadge'
import { eventLabel, hasScore, matchSides, matchStatusLabel, normalizeMatch } from './matchUtils'

const EMPTY_DETAILS = { events: [], lineup: [], officials: [], stats: [], liveblog: [] }

function asArray(result) {
  return result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []
}

export default function MatchCenterModal({ match, onClose, token, onRequireLogin }) {
  const [details, setDetails] = useState(() => ({ ...match, ...EMPTY_DETAILS }))
  const [loading, setLoading] = useState(true)
  const dialogRef = useDialog(onClose)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    setDetails({ ...match, ...EMPTY_DETAILS })
    setLoading(true)

    Promise.allSettled([
      publicApi.getMatch(match.id, signal),
      publicApi.getMatchEvents(match.id, signal),
      publicApi.getMatchLineup(match.id, signal),
      publicApi.getMatchOfficials(match.id, signal),
      publicApi.getMatchStats(match.id, signal),
      publicApi.getMatchLiveBlog(match.id, signal),
    ]).then(([matchResult, eventsResult, lineupResult, officialsResult, statsResult, liveblogResult]) => {
      if (signal.aborted) return
      const latestMatch = matchResult.status === 'fulfilled' ? normalizeMatch(matchResult.value) : null
      setDetails({
        ...match,
        ...latestMatch,
        events: asArray(eventsResult),
        lineup: asArray(lineupResult),
        officials: asArray(officialsResult),
        stats: asArray(statsResult),
        liveblog: asArray(liveblogResult),
      })
      setLoading(false)
    })

    return () => controller.abort()
  }, [match])

  const sides = matchSides(details)
  const score = hasScore(details) ? `${sides.home.score} – ${sides.away.score}` : 'VS'

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-jso-navy/65 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="match-center-title" tabIndex={-1} className="mx-auto my-6 w-full max-w-4xl rounded-[2rem] bg-white p-5 text-jso-ink shadow-2xl outline-none sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-extrabold tracking-[0.2em] text-jso-blue">MATCH CENTER</p>
            <h2 id="match-center-title" className="mt-2 text-2xl font-black sm:text-3xl">{sides.home.name} <span className="text-slate-400">–</span> {sides.away.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer le Match Center" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 transition hover:bg-slate-100"><X size={18} aria-hidden="true" /></button>
        </div>

        <div className="mt-7 rounded-[1.7rem] bg-jso-navy p-5 text-white sm:p-7">
          <div className="flex items-center justify-center gap-2 text-sm text-white/60"><CalendarDays size={16} aria-hidden="true" />{formatDateTime(details.kickoffAt, 'full')}</div>
          <div className="mx-auto mt-6 grid max-w-2xl grid-cols-[1fr_auto_1fr] items-start gap-3 sm:gap-8">
            {[sides.home, sides.away].map((team) => (
              <div key={`${team.name}-${team.isClub}`} className="flex min-w-0 flex-col items-center text-center">
                <TeamBadge team={team} compact dark />
                <p className="mt-3 line-clamp-2 text-sm font-black sm:text-lg">{team.name}</p>
              </div>
            )).reduce((items, team, index) => index === 0 ? [team] : [...items, <p key="score" className="pt-3 text-3xl font-black text-jso-gold sm:text-5xl">{score}</p>, team], [])}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-white/65">
            <span className="font-extrabold text-jso-gold">{matchStatusLabel(details.status)}</span>
            <span className="flex items-center gap-1.5"><MapPin size={15} aria-hidden="true" />{details.venue || 'Lieu à confirmer'}</span>
          </div>
        </div>

        {loading ? (
          <p role="status" className="mt-7 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Chargement des informations du match…</p>
        ) : (
          <div className="mt-8 space-y-8">
            {details.id && (
              <MatchStreamPanel matchId={details.id} token={token} onRequireLogin={onRequireLogin} />
            )}
            {details.liveblog.length > 0 && (
              <section aria-labelledby="live-title">
                <h3 id="live-title" className="flex items-center gap-2 text-xl font-black"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" aria-hidden="true" />Fil du match</h3>
                <div className="mt-4 space-y-2">
                  {details.liveblog.map((entry) => {
                    const id = pick(entry, 'id', 'Id')
                    const minute = pick(entry, 'minute', 'Minute')
                    const kind = pick(entry, 'kind', 'Kind')
                    const body = pick(entry, 'body', 'Body')
                    const pinned = Boolean(pick(entry, 'isPinned', 'IsPinned'))
                    return (
                      <article key={id || `${minute}-${body}`} className={`rounded-xl p-4 ${pinned ? 'border border-jso-gold bg-jso-gold/10' : 'bg-slate-50'}`}>
                        <p className="flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-jso-blue">{minute != null && <span>{minute}’</span>}<span className="rounded-full bg-jso-navy px-2 py-0.5 text-white">{eventLabel(kind)}</span>{pinned && <span>À la une</span>}</p>
                        <p className="mt-2 text-sm leading-6">{body}</p>
                      </article>
                    )
                  })}
                </div>
              </section>
            )}

            <section aria-labelledby="events-title-modal">
              <h3 id="events-title-modal" className="text-xl font-black">Temps forts</h3>
              {details.events.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {details.events.map((event) => {
                    const id = pick(event, 'id', 'Id')
                    const minute = pick(event, 'minute', 'Minute')
                    const type = pick(event, 'type', 'Type')
                    const player = pick(event, 'playerName', 'PlayerName')
                    const notes = pick(event, 'notes', 'Notes')
                    return (
                      <article key={id || `${minute}-${type}`} className="flex gap-4 rounded-xl bg-slate-50 p-4">
                        <span className="w-10 shrink-0 font-black text-jso-blue">{minute}’</span>
                        <div><p className="font-black">{eventLabel(type)}</p>{player && <p className="text-sm text-slate-600">{player}</p>}{notes && <p className="mt-1 text-sm text-slate-500">{notes}</p>}</div>
                      </article>
                    )
                  })}
                </div>
              ) : <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Aucun événement enregistré.</p>}
            </section>

            <section aria-labelledby="lineup-title">
              <h3 id="lineup-title" className="text-xl font-black">Composition</h3>
              {details.lineup.length > 0 ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {details.lineup.map((player) => {
                    const id = pick(player, 'id', 'Id')
                    const firstName = pick(player, 'firstName', 'FirstName') || ''
                    const lastName = pick(player, 'lastName', 'LastName') || ''
                    const role = pick(player, 'role', 'Role')
                    return (
                      <article key={id || `${firstName}-${lastName}`} className="rounded-xl border border-slate-200 p-3">
                        <p className="font-black">#{pick(player, 'shirtNumber', 'ShirtNumber') ?? '—'} {firstName} {lastName}</p>
                        <p className="mt-1 text-xs text-slate-500">{pick(player, 'position', 'Position') || 'Joueur'} · {role === 'Substitute' ? 'Remplaçant' : 'Titulaire'}{pick(player, 'isCaptain', 'IsCaptain') ? ' · Capitaine' : ''}</p>
                      </article>
                    )
                  })}
                </div>
              ) : <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Composition non publiée.</p>}
            </section>

            <div className="grid gap-7 md:grid-cols-2">
              <section aria-labelledby="officials-title">
                <h3 id="officials-title" className="text-xl font-black">Officiels</h3>
                {details.officials.length > 0 ? <div className="mt-4 space-y-2">{details.officials.map((official) => <p key={pick(official, 'id', 'Id') || pick(official, 'name', 'Name')} className="rounded-xl bg-slate-50 p-3 text-sm"><strong>{pick(official, 'name', 'Name')}</strong><span className="ml-2 text-slate-500">{pick(official, 'role', 'Role')}</span></p>)}</div> : <p className="mt-3 text-sm text-slate-500">Non renseignés.</p>}
              </section>
              <section aria-labelledby="stats-title">
                <h3 id="stats-title" className="text-xl font-black">Statistiques</h3>
                {details.stats.length > 0 ? <div className="mt-4 space-y-2">{details.stats.map((stat) => <div key={pick(stat, 'id', 'Id') || pick(stat, 'name', 'Name')} className="grid grid-cols-[1fr_auto_16px_auto] items-center rounded-xl bg-slate-50 p-3 text-sm"><span>{pick(stat, 'name', 'Name')}</span><strong>{pick(stat, 'homeValue', 'HomeValue') ?? '—'}</strong><span className="text-center text-slate-400">–</span><strong>{pick(stat, 'awayValue', 'AwayValue') ?? '—'}</strong></div>)}</div> : <p className="mt-3 text-sm text-slate-500">Non renseignées.</p>}
              </section>
            </div>
          </div>
        )}

        {details.id && (
          <CommentsSection
            targetType="Match"
            targetId={details.id}
            token={token}
            onRequireLogin={onRequireLogin}
          />
        )}
      </div>
    </div>
  )
}
