import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CalendarDays, CheckCircle2, Download, MapPin, Search, Ticket, Trophy } from 'lucide-react'
import { publicApi } from '../../lib/api'
import { formatDate, formatTime } from '../../lib/format'
import { clubResult, hasScore, matchSides, matchStatusLabel, normalizeMatch, RESULT_LABELS } from './matchUtils'
import TeamBadge from './TeamBadge'

const FILTERS = [
  { id: 'all', label: 'Tutte le partite' },
  { id: 'upcoming', label: 'Prossime' },
  { id: 'home', label: 'In casa' },
  { id: 'away', label: 'In trasferta' },
  { id: 'results', label: 'Risultati' },
]

function dateValue(match) {
  const value = new Date(match.kickoffAt || 0).getTime()
  return Number.isFinite(value) ? value : 0
}

function MatchCard({ match, onOpenMatch }) {
  const sides = matchSides(match)
  const played = hasScore(match)
  const result = clubResult(match)
  const resultStyle = result === 'win' ? 'bg-emerald-50 text-emerald-700' : result === 'loss' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      {match.isHome && (
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#081b3b] to-[#123e78] px-5 py-3 text-white">
          <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#ffd22f]"><Ticket size={15}/> Match à domicile</span>
          <span className="text-xs font-bold text-white/75">Stade d’Oudhref</span>
        </div>
      )}
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-600"><CalendarDays size={14}/>{formatDate(match.kickoffAt, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
          {played ? <span className={'rounded-full px-3 py-1.5 text-xs font-black ' + resultStyle}>{RESULT_LABELS[result] || 'Terminé'}</span> : <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">{matchStatusLabel(match.status)}</span>}
        </div>
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
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
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500">
          <span className="flex items-center gap-2"><CalendarDays size={15}/>{formatTime(match.kickoffAt)}</span>
          <span className="flex min-w-0 items-center gap-2"><MapPin size={15}/><span className="truncate">{match.venue || (match.isHome ? 'Stade d’Oudhref' : 'Lieu à confirmer')}</span></span>
        </div>
        {match.isHome && (
          <div className="mt-5 rounded-2xl border border-dashed border-[#d6b64c] bg-[#fffaf0] p-3">
            {match.ticketArtworkUrl ? (
              <>
                <img src={match.ticketArtworkUrl} alt={`Billet JSO contre ${match.opponentName}`} className="max-h-44 w-full rounded-xl bg-white object-contain" loading="lazy"/>
                <a href={match.ticketArtworkUrl} download className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#081b3b] px-4 py-2.5 text-sm font-extrabold text-white hover:bg-[#123e78]"><Download size={16}/>Télécharger le billet</a>
              </>
            ) : (
              <div className="flex items-start gap-3 text-sm">
                <Ticket className="mt-0.5 shrink-0 text-amber-700" size={20}/>
                <div><p className="font-extrabold text-[#081b3b]">Billet bientôt disponible</p><p className="mt-1 text-xs leading-5 text-slate-500">Le visuel officiel sera publié par le club pour cette rencontre.</p></div>
              </div>
            )}
          </div>
        )}
        <button type="button" onClick={() => onOpenMatch(match)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-extrabold text-[#081b3b] transition hover:border-[#081b3b] hover:bg-slate-50">Détails du match <ArrowUpRight size={16}/></button>
      </div>
    </article>
  )
}

const MATCHES_CACHE_KEY = 'jso_matches_cache_v1'

function readCachedMatches() {
  try {
    const cached = JSON.parse(window.localStorage.getItem(MATCHES_CACHE_KEY) || 'null')
    return Array.isArray(cached) ? cached.map(normalizeMatch).filter(Boolean) : []
  } catch {
    return []
  }
}

export default function MatchsPage({ onOpenMatch }) {
  const [matches, setMatches] = useState(readCachedMatches)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(() => readCachedMatches().length === 0)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    publicApi.getMatches(controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return
        const normalized = Array.isArray(items) ? items.map(normalizeMatch).filter(Boolean) : []
        setMatches(normalized)
        try { window.localStorage.setItem(MATCHES_CACHE_KEY, JSON.stringify(normalized)) } catch { /* storage may be unavailable */ }
        setError('')
      })
      .catch((reason) => {
        if (controller.signal.aborted) return
        setError(readCachedMatches().length ? '' : (reason?.message || 'Impossible de charger le calendrier.'))
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  const now = Date.now()
  const ordered = useMemo(() => [...matches].sort((a, b) => dateValue(a) - dateValue(b)), [matches])
  const filtered = useMemo(() => ordered.filter((match) => {
    const future = dateValue(match) >= now && !hasScore(match)
    if (filter === 'upcoming' && !future) return false
    if (filter === 'home' && !match.isHome) return false
    if (filter === 'away' && match.isHome) return false
    if (filter === 'results' && !hasScore(match)) return false
    const searchable = `${match.opponentName} ${match.venue || ''}`.toLocaleLowerCase()
    return searchable.includes(query.trim().toLocaleLowerCase())
  }), [ordered, filter, query, now])
  const homeCount = matches.filter((match) => match.isHome).length
  const upcomingCount = matches.filter((match) => dateValue(match) >= now && !hasScore(match)).length
  const resultCount = matches.filter(hasScore).length

  return (
    <main className="min-h-[75vh] bg-[#f4f7fc] pb-16">
      <section className="relative overflow-hidden bg-[#081b3b] text-white">
        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border-[36px] border-white/5"/>
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full border-[28px] border-[#ffd22f]/10"/>
        <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-[#ffd22f]"><Trophy size={16}/> Saison 2026–2027 · JSO Oudhref</p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div><h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Match Center <span className="text-[#ffd22f]">JSO</span></h1><p className="mt-4 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">Le calendrier, les résultats et les billets des rencontres à domicile réunis au même endroit.</p></div>
            <a href="/admin" className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#ffd22f] px-5 py-3 font-black text-[#081b3b] shadow-lg shadow-black/10">Espace club <ArrowUpRight size={17}/></a>
          </div>
          <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-sm font-semibold text-white/60">Prochaines rencontres</p><p className="mt-1 text-3xl font-black">{upcomingCount}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-sm font-semibold text-white/60">Matchs à domicile</p><p className="mt-1 text-3xl font-black">{homeCount}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-sm font-semibold text-white/60">Résultats publiés</p><p className="mt-1 text-3xl font-black">{resultCount}</p></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pt-8 sm:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-xl font-black text-[#081b3b]">Calendrier des matchs</h2><p className="mt-1 text-sm text-slate-500">Les billets sont affichés uniquement pour les rencontres à domicile.</p></div>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 lg:w-80"><Search size={18} className="shrink-0 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un adversaire…" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label>
          </div>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{FILTERS.map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={'shrink-0 rounded-xl px-4 py-2.5 text-sm font-extrabold transition ' + (filter === item.id ? 'bg-[#081b3b] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>{item.label}</button>)}</div>
        </div>
        {loading ? <div className="grid min-h-64 place-items-center text-sm font-bold text-slate-500">Chargement du calendrier…</div>
          : error ? <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">{error}</div>
            : filtered.length === 0 ? <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><CalendarDays className="mx-auto text-slate-400" size={32}/><h3 className="mt-4 text-lg font-black text-[#081b3b]">Aucune rencontre trouvée</h3><p className="mt-1 text-sm text-slate-500">Modifiez le filtre ou votre recherche.</p></div>
              : <><div className="mt-5 flex items-center justify-between text-sm text-slate-500"><span>{filtered.length} rencontre{filtered.length > 1 ? 's' : ''}</span><span className="hidden sm:block">Bleu & or · Billetterie JSO</span></div><div className="mt-4 grid gap-5 lg:grid-cols-2">{filtered.map((match) => <MatchCard key={match.id} match={match} onOpenMatch={onOpenMatch}/>)}</div></>}
      </section>
    </main>
  )
}
