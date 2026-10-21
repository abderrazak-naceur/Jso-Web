import { useMemo, useState } from 'react'
import { ArrowUpRight, CalendarDays, MapPin, Ticket, Trophy, SlidersHorizontal } from 'lucide-react'
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

function NextMatchTicket({ match, onOpenMatch }) {
  if (!match || !match.isHome) return null

  const { home, away } = matchSides(match)
  return (
    <article className="jso-next-match-ticket overflow-hidden rounded-[1.5rem] border border-white/15 bg-white text-jso-navy shadow-xl shadow-black/10">
      {match.ticketArtworkUrl ? (
        <img src={match.ticketArtworkUrl} alt={`Billet JSO — ${home.name} contre ${away.name}`} className="block max-h-64 w-full bg-white object-contain" loading="lazy" />
      ) : (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#123b78] via-[#071a35] to-[#123b78] p-5 text-white">
          <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full border border-white/10" aria-hidden="true" />
          <div className="absolute -right-2 -top-4 h-20 w-20 rounded-full border border-[#ffc629]/30" aria-hidden="true" />
          <p className="relative flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#ffc629]"><Ticket size={16} aria-hidden="true" /> Billet · Match à domicile</p>
          <div className="relative mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <p className="line-clamp-2 text-sm font-black sm:text-base">{home.name}</p>
            <span className="text-xs font-black text-[#ffc629]">VS</span>
            <p className="line-clamp-2 text-right text-sm font-black sm:text-base">{away.name}</p>
          </div>
          <div className="relative mt-4 border-t border-dashed border-white/30 pt-4 text-sm text-white/85">
            <p className="flex items-start gap-2"><CalendarDays size={16} className="mt-0.5 shrink-0 text-[#ffc629]" aria-hidden="true" />{formatDate(match.kickoffAt, { weekday: 'long', day: 'numeric', month: 'long' })} · {formatTime(match.kickoffAt)}</p>
            <p className="mt-2 flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-[#ffc629]" aria-hidden="true" />{match.venue || 'Lieu à confirmer'}</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 p-4">
        <p className="text-xs leading-5 text-slate-500">Stade Oudhref · Tarif indicatif 5 DT</p>
        <button type="button" onClick={() => onOpenMatch(match)} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#ffc629] px-4 py-2.5 text-xs font-black text-[#071a35] transition hover:bg-[#123b78] hover:text-white">
          Billetterie <ArrowUpRight size={14} aria-hidden="true" />
        </button>
      </div>
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

export default function MatchdaySection({ section, status, nextMatch, recentMatches, matches = [], onOpenMatch }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const now = Date.now()
  const schedule = useMemo(() => {
    const unique = new Map()
    for (const match of [...matches, ...(nextMatch ? [nextMatch] : []), ...recentMatches]) {
      if (!match?.id) continue
      unique.set(String(match.id), match)
    }
    return [...unique.values()].sort((a, b) => new Date(a.kickoffAt || 0) - new Date(b.kickoffAt || 0))
  }, [matches, nextMatch, recentMatches])
  const filtered = schedule.filter((match) => {
    const isPlayed = match.status === 'Finished' || match.status === 'Cancelled'
    if (filter === 'home' && !match.isHome) return false
    if (filter === 'away' && match.isHome) return false
    if (filter === 'upcoming' && (isPlayed || new Date(match.kickoffAt).getTime() < now)) return false
    if (filter === 'results' && !isPlayed) return false
    const search = query.trim().toLocaleLowerCase()
    if (search && !String(match.opponentName || '').toLocaleLowerCase().includes(search)) return false
    return true
  })
  return (
    <section id="matches" aria-labelledby="matches-title" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
      <SectionHeading section={section} title="Le match," muted="au cœur du club." description="Calendrier complet, prochaines rencontres, résultats et billets des matchs à domicile." />

      <section aria-label="Calendrier complet des matchs" className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-jso-blue"><SlidersHorizontal size={15} aria-hidden="true" /> Calendrier JSO</p><h3 className="mt-2 text-2xl font-black text-jso-ink">Toutes les rencontres</h3><p className="mt-1 text-sm text-slate-500">{schedule.length} match(s) chargés depuis le calendrier officiel du site.</p></div>
          <label className="block w-full xl:max-w-xs"><span className="text-xs font-bold text-slate-500">Rechercher un adversaire</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex. adversaire…" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-jso-blue focus:ring-2 focus:ring-jso-blue/10" /></label>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrer les matchs">
          {[
            ['all', 'Tous'],
            ['upcoming', 'À venir'],
            ['home', 'À domicile'],
            ['away', 'À l’extérieur'],
            ['results', 'Résultats'],
          ].map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-extrabold transition ${filter === key ? 'bg-jso-navy text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-jso-blue hover:text-jso-blue'}`}>{label}</button>)}
        </div>
        {status === 'loading' ? <p className="mt-5 animate-pulse rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">Chargement du calendrier…</p> : status === 'offline' ? <p role="alert" className="mt-5 rounded-2xl bg-amber-50 p-6 text-sm text-amber-900">Le calendrier est momentanément indisponible. Réessayez dans quelques instants.</p> : filtered.length ? <div className="mt-5 grid gap-3 md:grid-cols-2">
          {filtered.map((match) => {
            const sides = matchSides(match)
            const isPlayed = match.status === 'Finished'
            const hasTicket = Boolean(match.isHome && match.ticketArtworkUrl && !isPlayed)
            return <article key={match.id} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-jso-blue/40 hover:shadow-lg">
              {hasTicket && <img src={match.ticketArtworkUrl} alt={`Billet JSO pour le match contre ${match.opponentName}`} loading="lazy" className="h-36 w-full bg-slate-50 object-contain p-2" />}
              <div className="flex flex-1 flex-col p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${match.isHome ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{match.isHome ? 'À domicile' : 'À l’extérieur'}</span><time dateTime={match.kickoffAt} className="text-right text-xs font-bold text-slate-400">{formatDate(match.kickoffAt, { day: 'numeric', month: 'short', year: 'numeric' })} · {formatTime(match.kickoffAt)}</time></div>
                <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2"><div className="flex min-w-0 items-center gap-2"><TeamBadge team={sides.home} compact/><p className={`truncate text-sm font-black ${sides.home.isClub ? 'text-jso-navy' : 'text-slate-600'}`}>{sides.home.name}</p></div><p className="rounded-lg bg-jso-navy px-3 py-1.5 text-sm font-black text-white">{hasScore(match) ? `${sides.home.score} – ${sides.away.score}` : 'VS'}</p><div className="flex min-w-0 items-center justify-end gap-2"><p className={`truncate text-right text-sm font-black ${sides.away.isClub ? 'text-jso-navy' : 'text-slate-600'}`}>{sides.away.name}</p><TeamBadge team={sides.away} compact/></div></div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3"><span className="text-xs font-bold text-slate-500">{matchStatusLabel(match.status)} · {match.venue || 'Lieu à confirmer'}</span><button type="button" onClick={() => onOpenMatch(match)} className="inline-flex items-center gap-1 rounded-full bg-jso-navy px-4 py-2 text-xs font-extrabold text-white transition hover:bg-jso-blue">{hasTicket ? 'Billet & détails' : 'Détails du match'} <ArrowUpRight size={14} aria-hidden="true" /></button></div>
              </div>
            </article>
          })}
        </div> : <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">Aucun match ne correspond à ce filtre. Les rencontres apparaissent dès qu’elles sont publiées par le club.</p>}
      </section>

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
            <NextMatchTicket match={nextMatch} onOpenMatch={onOpenMatch} />
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
