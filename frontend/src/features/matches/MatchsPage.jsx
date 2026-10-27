import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CalendarDays, Download, Home, MapPin, Plane, Search, Ticket, Trophy } from 'lucide-react'
import { publicApi, ticketApi } from '../../lib/api'
import { formatDate, formatTime } from '../../lib/format'
import { BILLETTERIE_PATH } from '../tickets/ticketsUrl'
import { clubResult, hasScore, matchSides, matchStatusLabel, normalizeMatch, RESULT_LABELS } from './matchUtils'
import TeamBadge from './TeamBadge'

const FILTERS = [
  { id: 'all', label: 'Toutes' },
  { id: 'home', label: 'À domicile' },
  { id: 'away', label: 'À l’extérieur' },
  { id: 'tickets', label: 'Billets en vente' },
]

function dateValue(match) {
  const value = new Date(match.kickoffAt || 0).getTime()
  return Number.isFinite(value) ? value : 0
}

const money = (value, currency) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency || 'TND', maximumFractionDigits: 0 }).format(value || 0)

// A single home/away pill, always shown so a visitor instantly reads the venue.
function VenuePill({ isHome }) {
  return isHome
    ? <span className="inline-flex items-center gap-1.5 rounded-full bg-[#081b3b] px-3 py-1.5 text-xs font-black text-[#ffd22f]"><Home size={13}/> À domicile</span>
    : <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-3 py-1.5 text-xs font-black text-slate-700"><Plane size={13}/> À l’extérieur</span>
}

// Ticket status derived from the live billetterie feed (not from isHome).
function ticketState(ticket) {
  if (!ticket) return null
  if ((ticket.available ?? 0) <= 0) return { kind: 'soldout' }
  return { kind: 'open', fromPrice: ticket.fromPrice, currency: ticket.currency, available: ticket.available }
}

function MatchCard({ match, ticket, onOpenMatch }) {
  const sides = matchSides(match)
  const played = hasScore(match)
  const result = clubResult(match)
  const resultStyle = result === 'win' ? 'bg-emerald-50 text-emerald-700' : result === 'loss' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'
  const tickets = ticketState(ticket)
  return (
    <article className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <VenuePill isHome={match.isHome}/>
        {played
          ? <span className={'rounded-full px-3 py-1.5 text-xs font-black ' + resultStyle}>{RESULT_LABELS[result] || 'Terminé'}</span>
          : <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">{matchStatusLabel(match.status)}</span>}
      </div>

      <div className="flex-1 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold text-slate-500">
          <span className="flex items-center gap-2"><CalendarDays size={14}/>{formatDate(match.kickoffAt, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · {formatTime(match.kickoffAt)}</span>
          {match.competitionName && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600"><Trophy size={12}/>{match.competitionName}</span>}
        </div>
        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex min-w-0 flex-col items-center text-center">
            <TeamBadge team={sides.home}/>
            <p className="mt-3 line-clamp-2 text-sm font-black sm:text-base">{sides.home.name}</p>
          </div>
          <div className="min-w-[54px] text-center">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{played ? 'Score' : 'VS'}</p>
            <p className="mt-1 text-2xl font-black text-[#081b3b]">{played ? `${sides.home.score} – ${sides.away.score}` : 'VS'}</p>
          </div>
          <div className="flex min-w-0 flex-col items-center text-center">
            <TeamBadge team={sides.away}/>
            <p className="mt-3 line-clamp-2 text-sm font-black sm:text-base">{sides.away.name}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-sm text-slate-500">
          <MapPin size={15} className="shrink-0"/><span className="truncate">{match.venue || (match.isHome ? 'Stade d’Oudhref' : 'Lieu à confirmer')}</span>
        </div>

        {/* Real ticket status, driven by the live billetterie feed. */}
        {tickets?.kind === 'open' && (
          <a href={BILLETTERIE_PATH} className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#d6b64c] bg-[#fffaf0] px-4 py-3 transition hover:border-[#081b3b]">
            <span className="flex items-center gap-2 text-sm font-extrabold text-[#081b3b]"><Ticket size={17} className="text-amber-700"/> Billets en vente{tickets.fromPrice != null ? ` · dès ${money(tickets.fromPrice, tickets.currency)}` : ''}</span>
            <span className="inline-flex items-center gap-1 rounded-xl bg-[#081b3b] px-3 py-2 text-xs font-extrabold text-white">Acheter <ArrowUpRight size={14}/></span>
          </a>
        )}
        {tickets?.kind === 'soldout' && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-extrabold text-slate-500"><Ticket size={16}/> Complet</div>
        )}

        {/* Downloadable artwork, when the club published one for a home match. */}
        {match.isHome && match.ticketArtworkUrl && (
          <a href={match.ticketArtworkUrl} download className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-[#081b3b] transition hover:border-[#081b3b]"><Download size={16}/> Télécharger le visuel du billet</a>
        )}
      </div>

      <button type="button" onClick={() => onOpenMatch(match)} className="m-5 mt-0 flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-extrabold text-[#081b3b] transition hover:border-[#081b3b] hover:bg-slate-50">Détails du match <ArrowUpRight size={16}/></button>
    </article>
  )
}

function MatchGroup({ title, hint, matches, ticketById, onOpenMatch }) {
  if (matches.length === 0) return null
  return (
    <div className="mt-8">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-xl font-black text-[#081b3b]">{title}</h2>
        <span className="text-sm text-slate-500">{matches.length} rencontre{matches.length > 1 ? 's' : ''}</span>
      </div>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      <div className="mt-4 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {matches.map((match) => <MatchCard key={match.id} match={match} ticket={ticketById[match.id]} onOpenMatch={onOpenMatch}/>)}
      </div>
    </div>
  )
}

export default function MatchsPage({ onOpenMatch }) {
  const [matches, setMatches] = useState([])
  const [ticketById, setTicketById] = useState({})
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    // The calendar must load even if the (optional) ticket feed is unavailable.
    Promise.allSettled([publicApi.getMatches(signal), ticketApi.matchesOnSale(signal)])
      .then(([matchesResult, ticketsResult]) => {
        if (signal.aborted) return
        if (matchesResult.status === 'fulfilled') {
          setMatches(Array.isArray(matchesResult.value) ? matchesResult.value.map(normalizeMatch).filter(Boolean) : [])
        } else {
          setError(matchesResult.reason?.message || 'Impossible de charger le calendrier.')
        }
        if (ticketsResult.status === 'fulfilled' && Array.isArray(ticketsResult.value)) {
          const map = {}
          for (const row of ticketsResult.value) {
            const id = row.id ?? row.Id
            if (id) map[id] = { fromPrice: row.fromPrice, currency: row.currency, available: row.available }
          }
          setTicketById(map)
        }
      })
      .finally(() => { if (!signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  const now = Date.now()

  const visible = useMemo(() => matches.filter((match) => {
    if (filter === 'home' && !match.isHome) return false
    if (filter === 'away' && match.isHome) return false
    if (filter === 'tickets' && !((ticketById[match.id]?.available ?? 0) > 0)) return false
    const searchable = `${match.opponentName} ${match.venue || ''}`.toLocaleLowerCase()
    return searchable.includes(query.trim().toLocaleLowerCase())
  }), [matches, filter, query, ticketById])

  // Group into upcoming (soonest first) and results (most recent first).
  const upcoming = useMemo(() => visible
    .filter((m) => !hasScore(m) && dateValue(m) >= now)
    .sort((a, b) => dateValue(a) - dateValue(b)), [visible, now])
  const results = useMemo(() => visible
    .filter((m) => hasScore(m) || dateValue(m) < now)
    .sort((a, b) => dateValue(b) - dateValue(a)), [visible, now])

  // Sub-group the upcoming matches by competition so visitors can read the
  // calendar one competition at a time. When no competition name is available
  // everything falls into a single untitled group (same flat behaviour).
  const upcomingByCompetition = useMemo(() => {
    const groups = new Map()
    for (const match of upcoming) {
      const key = match.competitionName || ''
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(match)
    }
    return [...groups.entries()]
  }, [upcoming])

  const homeCount = matches.filter((m) => m.isHome).length
  const upcomingCount = matches.filter((m) => dateValue(m) >= now && !hasScore(m)).length
  const onSaleCount = matches.filter((m) => (ticketById[m.id]?.available ?? 0) > 0).length

  return (
    <main className="min-h-[75vh] bg-[#f4f7fc] pb-16">
      <section className="relative overflow-hidden bg-[#081b3b] text-white">
        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border-[36px] border-white/5"/>
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full border-[28px] border-[#ffd22f]/10"/>
        <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-[#ffd22f]"><Trophy size={16}/> JSO Oudhref</p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div><h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Match Center <span className="text-[#ffd22f]">JSO</span></h1><p className="mt-4 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">Le calendrier, les résultats et les billets des rencontres, réunis au même endroit.</p></div>
            <a href={BILLETTERIE_PATH} className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#ffd22f] px-5 py-3 font-black text-[#081b3b] shadow-lg shadow-black/10">Billetterie <ArrowUpRight size={17}/></a>
          </div>
          <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-sm font-semibold text-white/60">Prochaines rencontres</p><p className="mt-1 text-3xl font-black">{upcomingCount}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-sm font-semibold text-white/60">Matchs à domicile</p><p className="mt-1 text-3xl font-black">{homeCount}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-sm font-semibold text-white/60">Billetteries ouvertes</p><p className="mt-1 text-3xl font-black">{onSaleCount}</p></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pt-8 sm:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-xl font-black text-[#081b3b]">Calendrier des matchs</h2><p className="mt-1 text-sm text-slate-500">À domicile ou à l’extérieur, et les rencontres dont la billetterie est ouverte.</p></div>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 lg:w-80"><Search size={18} className="shrink-0 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un adversaire…" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label>
          </div>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{FILTERS.map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={'shrink-0 rounded-xl px-4 py-2.5 text-sm font-extrabold transition ' + (filter === item.id ? 'bg-[#081b3b] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>{item.label}</button>)}</div>
        </div>

        {loading ? <div className="grid min-h-64 place-items-center text-sm font-bold text-slate-500">Chargement du calendrier…</div>
          : error ? <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">{error}</div>
            : upcoming.length === 0 && results.length === 0
              ? <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><CalendarDays className="mx-auto text-slate-400" size={32}/><h3 className="mt-4 text-lg font-black text-[#081b3b]">Aucune rencontre trouvée</h3><p className="mt-1 text-sm text-slate-500">Modifiez le filtre ou votre recherche.</p></div>
              : <>
                  {upcoming.length > 0 && <div className="mt-8"><h2 className="text-xl font-black text-[#081b3b]">Prochains matchs</h2><p className="mt-1 text-sm text-slate-500">Les rencontres à venir, groupées par compétition.</p></div>}
                  {upcomingByCompetition.map(([competition, list]) => (
                    <MatchGroup key={competition || 'all'} title={competition || 'Calendrier'} matches={list} ticketById={ticketById} onOpenMatch={onOpenMatch}/>
                  ))}
                  <MatchGroup title="Résultats & matchs passés" matches={results} ticketById={ticketById} onOpenMatch={onOpenMatch}/>
                </>}
      </section>
    </main>
  )
}
