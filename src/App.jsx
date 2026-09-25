import { useEffect, useState } from 'react'
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CirclePlay,
  Menu,
  Shield,
  ShoppingBag,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { publicApi } from './lib/api'

const navigation = [
  ['Accueil', 'home'],
  ['Le Club', 'club'],
  ['Équipe', 'team'],
  ['Matchs', 'matches'],
  ['Actualités', 'news'],
  ['Médias', 'media'],
  ['Boutique', 'shop'],
]

const fallbackNews = [
  { category: 'CLUB', title: 'Une nouvelle identité digitale pour JSO', text: 'Le club entre dans une nouvelle ère avec une expérience moderne et pensée pour toute sa communauté.' },
  { category: 'MATCH', title: 'Tout suivre au même endroit', text: 'Calendrier, résultats, compositions et informations de match réunis dans un seul espace.' },
  { category: 'FORMATION', title: 'Construire la relève d’Oudhref', text: 'Une attention particulière portée aux jeunes joueurs et à la formation.' },
]

function pick(object, ...keys) {
  for (const key of keys) {
    if (object?.[key] !== undefined && object?.[key] !== null) return object[key]
  }
  return undefined
}

function normalizeMatch(match) {
  return {
    Id: pick(match, 'Id', 'id'),
    OpponentName: pick(match, 'OpponentName', 'opponentName') || 'TBA',
    KickoffAt: pick(match, 'KickoffAt', 'kickoffAt'),
    Venue: pick(match, 'Venue', 'venue'),
    IsHome: pick(match, 'IsHome', 'isHome'),
    HomeScore: pick(match, 'HomeScore', 'homeScore'),
    AwayScore: pick(match, 'AwayScore', 'awayScore'),
    Status: pick(match, 'Status', 'status') || 'Scheduled',
  }
}

function normalizePlayer(player) {
  return {
    Id: pick(player, 'Id', 'id'),
    FirstName: pick(player, 'FirstName', 'firstName') || '',
    LastName: pick(player, 'LastName', 'lastName') || '',
    ShirtNumber: pick(player, 'ShirtNumber', 'shirtNumber'),
    Position: pick(player, 'Position', 'position'),
  }
}

function SectionTitle({ eyebrow, title, muted }) {
  return (
    <div>
      <p className="text-xs font-extrabold tracking-[0.24em] text-jso-gold">{eyebrow}</p>
      <h2 className="mt-3 text-4xl font-black tracking-tight text-jso-ink sm:text-6xl">
        {title} <span className="text-slate-400">{muted}</span>
      </h2>
    </div>
  )
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState('Accueil')
  const [demoOpen, setDemoOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [matchEvents, setMatchEvents] = useState([])
  const [matchLoading, setMatchLoading] = useState(false)
  const [club, setClub] = useState(null)
  const [matches, setMatches] = useState([])
  const [articles, setArticles] = useState([])
  const [teamPlayers, setTeamPlayers] = useState([])
  const [content, setContent] = useState({})
  const [apiState, setApiState] = useState('loading')

  const [media, setMedia] = useState([])

  useEffect(() => {
    const controller = new AbortController()

    Promise.allSettled([
      publicApi.getHome(controller.signal),
      publicApi.getMedia(controller.signal),
      publicApi.getTeams(controller.signal),
    ]).then(async ([homeResult, mediaResult, teamsResult]) => {
      if (homeResult.status === 'fulfilled') {
        const home = homeResult.value
        setClub(home.club || null)
        setContent(home.content || {})
        setMatches([
          ...(home.nextMatch ? [normalizeMatch(home.nextMatch)] : []),
          ...(home.recentMatches || []).map(normalizeMatch),
        ])
        setArticles((home.news || []).map((item) => ({
          category: pick(item, 'Status', 'status') || 'CLUB',
          title: pick(item, 'Title', 'title') || 'Actualité JSO',
          text: pick(item, 'Excerpt', 'excerpt') || '',
          slug: pick(item, 'Slug', 'slug'),
        })))
      }

      if (mediaResult.status === 'fulfilled') {
        setMedia(mediaResult.value || [])
      }

      if (teamsResult.status === 'fulfilled') {
        const teams = teamsResult.value || []
        const firstTeam = teams[0]
        const teamId = pick(firstTeam, 'Id', 'id')
        if (teamId) {
          try {
            const players = await publicApi.getTeamPlayers(teamId, controller.signal)
            setTeamPlayers((players || []).map(normalizePlayer))
          } catch (error) {
            if (error.name !== 'AbortError') setTeamPlayers([])
          }
        }
      }

      if (homeResult.status === 'fulfilled' || mediaResult.status === 'fulfilled' || teamsResult.status === 'fulfilled') {
        setApiState('ready')
      } else {
        setApiState('offline')
      }
    }).catch((error) => {
      if (error.name !== 'AbortError') setApiState('offline')
    })

    return () => controller.abort()
  }, [])

  async function openMatch(match) {
    setSelectedMatch(match)
    setMatchEvents([])
    setMatchLoading(true)
    try {
      const [details, events] = await Promise.all([
        publicApi.getMatch(match.Id),
        publicApi.getMatchEvents(match.Id),
      ])
      const normalizedDetails = normalizeMatch(details)
      setSelectedMatch({ ...match, ...normalizedDetails })
      setMatchEvents((events || []).map((event) => ({
        ...event,
        Id: pick(event, 'Id', 'id'),
        Minute: pick(event, 'Minute', 'minute'),
        Type: pick(event, 'Type', 'type'),
        PlayerName: pick(event, 'PlayerName', 'playerName'),
        Notes: pick(event, 'Notes', 'notes'),
      })))
    } catch {
      setMatchEvents([])
    } finally {
      setMatchLoading(false)
    }
  }

  const goTo = (label, id) => {
    setActive(label)
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="min-h-screen overflow-hidden bg-jso-paper text-jso-ink">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <button onClick={() => goTo('Accueil', 'home')} className="flex items-center gap-3 text-left">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-jso-navy text-xl font-black text-jso-gold shadow-lg shadow-slate-300/40">JSO</span>
            <span className="hidden sm:block">
              <span className="block text-base font-black tracking-tight">Jeunesse Sportive</span>
              <span className="block text-[10px] font-bold tracking-[0.22em] text-slate-500">DE OUDHREF · TUNISIE</span>
            </span>
          </button>

          <nav className="hidden items-center gap-6 lg:flex" aria-label="Navigation principale">
            {navigation.map(([label, id]) => (
              <button key={id} onClick={() => goTo(label, id)} className={`text-sm font-bold transition ${active === label ? 'text-jso-blue' : 'text-slate-600 hover:text-jso-navy'}`}>
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => goTo('Matchs', 'matches')} className="hidden rounded-full bg-jso-navy px-5 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-jso-blue sm:block">Match Center ↗</button>
            <button aria-label="Ouvrir le menu" onClick={() => setMenuOpen((value) => !value)} className="rounded-full border border-slate-200 p-3 lg:hidden">
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-200 bg-white px-5 py-3 lg:hidden">
            {navigation.map(([label, id]) => (
              <button key={id} onClick={() => goTo(label, id)} className="block w-full py-3 text-left font-bold text-slate-700">{label}</button>
            ))}
          </div>
        )}
      </header>

      <section id="home" className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8 lg:pt-20">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-jso-gold/40 bg-jso-gold/10 px-4 py-2 text-xs font-extrabold tracking-[0.16em] text-jso-navy"><span className="h-2 w-2 rounded-full bg-jso-gold" /> SAISON 2026 / 27</div>
          <h1 className="max-w-3xl text-5xl font-black leading-[0.94] tracking-[-0.06em] sm:text-7xl lg:text-8xl">{content.hero_title || 'Toujours plus haut.'}<br /><span className="text-jso-blue">{content.hero_highlight || 'Toujours JSO.'}</span></h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">{content.hero_description || pick(club, 'Description', 'description') || 'La maison digitale de la Jeunesse Sportive de Oudhref. Une plateforme pour vivre le club, suivre les matchs et partager la passion d’une ville.'}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button onClick={() => goTo('Matchs', 'matches')} className="rounded-full bg-jso-navy px-6 py-4 font-extrabold text-white transition hover:-translate-y-1 hover:bg-jso-blue">Découvrir le Match Center <ArrowUpRight className="ml-2 inline" size={18} /></button>
            <button onClick={() => setDemoOpen(true)} className="rounded-full border border-slate-300 bg-white px-6 py-4 font-extrabold text-jso-navy transition hover:border-jso-blue hover:text-jso-blue"><CirclePlay className="mr-2 inline" size={18} /> Découvrir JSO</button>
          </div>
          <div className="mt-10 flex flex-wrap gap-7 text-sm text-slate-500"><span><strong className="text-jso-navy">{club?.City || 'Oudhref'}</strong> Club</span><span><strong className="text-jso-navy">{apiState === 'ready' ? matches.length : '—'}</strong> Matchs</span><span><strong className="text-jso-navy">100%</strong> Passion</span></div>
        </div>

        <div className="relative min-h-[430px] lg:min-h-[560px]">
          <div className="absolute -inset-8 rounded-full bg-blue-200/50 blur-3xl" />
          <div className="absolute inset-0 rounded-[3rem] border border-slate-200 bg-gradient-to-br from-blue-100 via-white to-amber-100 shadow-2xl shadow-slate-300/50" />
          <div className="absolute inset-5 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-jso-navy via-[#12356b] to-jso-blue">
            <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:32px_32px]" />
            <div className="absolute left-7 top-7 text-xs font-extrabold tracking-[0.24em] text-jso-gold">JSO / OUDHREF</div>
            <div className="absolute inset-x-0 top-24 text-center text-[9rem] font-black leading-none text-white/10 sm:text-[13rem]">JSO</div>
            <div className="absolute bottom-0 left-1/2 h-[68%] w-[75%] -translate-x-1/2 rounded-t-full border border-white/20 bg-gradient-to-t from-white/15 to-transparent" />
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center text-white"><div className="text-7xl font-black tracking-[-0.08em] sm:text-8xl">JSO</div><div className="mt-2 text-xs font-extrabold tracking-[0.3em] text-jso-gold">JEUNESSE SPORTIVE</div><div className="text-xs font-extrabold tracking-[0.3em] text-white/70">DE OUDHREF</div></div>
            <div className="absolute left-5 top-28 rounded-3xl border border-white/20 bg-white/15 p-4 text-white shadow-xl backdrop-blur-xl sm:left-8"><div className="text-[10px] font-extrabold tracking-widest text-white/70">NEXT MATCH</div><div className="mt-1 flex items-center gap-3"><strong className="text-2xl">JSO</strong><span className="text-xs text-jso-gold">VS</span><strong className="text-2xl">{matches[0]?.OpponentName || 'TBA'}</strong></div><div className="mt-2 text-xs text-white/70">{matches[0] ? new Date(matches[0].KickoffAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Date à confirmer'}</div></div>
            <div className="absolute bottom-6 right-5 rounded-3xl border border-white/20 bg-white/15 p-4 text-white shadow-xl backdrop-blur-xl sm:right-8"><div className="text-xs font-extrabold text-jso-gold">DIGITAL CLUB</div><div className="mt-1 text-lg font-black">Built for the future.</div></div>
          </div>
        </div>
      </section>

      <section id="matches" className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <SectionTitle eyebrow="01 / MATCHDAY" title="Le match," muted="en direct." />
        <div className="mb-5 flex items-center justify-between"><span className={`rounded-full px-3 py-1 text-xs font-extrabold ${apiState === 'ready' ? 'bg-emerald-100 text-emerald-700' : apiState === 'offline' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{apiState === 'ready' ? 'API CONNESSA' : apiState === 'offline' ? 'MODALITÀ DEMO' : 'CONNESSIONE API...'}</span></div><div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-500"><span className="rounded-full bg-jso-gold/20 px-3 py-1 text-jso-navy">PROCHAIN MATCH</span><span>À VENIR</span></div>
            <div className="grid items-center gap-5 py-10 sm:grid-cols-[1fr_auto_1fr]"><div className="text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-jso-navy text-2xl font-black text-jso-gold">JSO</div><h3 className="mt-3 text-xl font-black">JSO Oudhref</h3><p className="text-sm text-slate-500">Domicile</p></div><div className="text-center"><div className="text-xs font-extrabold text-slate-400">{matches[0]?.KickoffAt ? new Date(matches[0].KickoffAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : 'DATE À CONFIRMER'}</div><div className="my-2 text-4xl font-black text-jso-navy">VS</div><div className="text-xs text-slate-500">{matches[0]?.Venue || 'Stade d’Oudhref'}</div></div><div className="text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-slate-200 bg-slate-50 text-xl font-black text-slate-400">{matches[0]?.OpponentName?.slice(0, 3).toUpperCase() || 'TBA'}</div><h3 className="mt-3 text-xl font-black">{matches[0]?.OpponentName || 'Adversaire'}</h3><p className="text-sm text-slate-500">{matches[0]?.IsHome ? 'Extérieur' : 'Domicile'}</p></div></div>
            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-5 text-sm text-slate-500"><span className="rounded-full bg-slate-100 px-3 py-2">Composition</span><span className="rounded-full bg-slate-100 px-3 py-2">Statistiques</span><span className="rounded-full bg-slate-100 px-3 py-2">Commentaires</span></div>
          </div>
          <div className="rounded-[2rem] bg-jso-navy p-6 text-white shadow-xl shadow-blue-950/20"><div className="text-xs font-extrabold tracking-[0.2em] text-white/60">CLUB SNAPSHOT</div><div className="mt-6 space-y-5"><div className="flex items-center justify-between border-b border-white/15 pb-4"><span className="flex items-center gap-2 text-white/75"><Trophy size={18} /> Dernier résultat</span><strong>{matches.find((match) => match.HomeScore != null && match.AwayScore != null) ? `${matches.find((match) => match.HomeScore != null && match.AwayScore != null).HomeScore} - ${matches.find((match) => match.HomeScore != null && match.AwayScore != null).AwayScore}` : '—'}</strong></div><div className="flex items-center justify-between border-b border-white/15 pb-4"><span className="flex items-center gap-2 text-white/75"><CalendarDays size={18} /> Calendrier</span><strong>À venir</strong></div><div className="flex items-center justify-between border-b border-white/15 pb-4"><span className="flex items-center gap-2 text-white/75"><Users size={18} /> Effectif</span><strong>JSO</strong></div><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-white/75"><Shield size={18} /> Identité</span><strong className="text-jso-gold">Oudhref</strong></div></div></div>
        </div>
      </section>

      <section id="match-highlight" className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <SectionTitle eyebrow="01 / MATCH CENTER" title="Calendario." muted="Résultats." />
        <div className="mt-8 grid gap-4">
          {matches.length ? matches.map((match) => (
            <article key={match.Id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                <span>{match.Status || 'Scheduled'}</span>
                <span>{new Date(match.KickoffAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
              <div className="mt-5 grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
                <div><p className="text-xs font-bold text-slate-400">JSO</p><h3 className="text-2xl font-black">JSO Oudhref</h3></div>
                <div className="text-center text-3xl font-black text-jso-blue">{match.HomeScore != null && match.AwayScore != null ? match.HomeScore + ' - ' + match.AwayScore : 'VS'}</div>
                <div className="sm:text-right"><p className="text-xs font-bold text-slate-400">ADVERSAIRE</p><h3 className="text-2xl font-black">{match.OpponentName}</h3></div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-sm text-slate-500">
                {match.Venue && <span className="rounded-full bg-slate-100 px-3 py-2">{match.Venue}</span>}
                <span className="rounded-full bg-slate-100 px-3 py-2">{match.IsHome ? 'Domicile' : 'Extérieur'}</span>
              </div>              <button onClick={() => openMatch(match)} className="mt-5 rounded-full bg-jso-navy px-5 py-3 text-sm font-extrabold text-white hover:bg-jso-blue">Voir le détail <ChevronRight className="ml-1 inline" size={16}/></button>
            </article>
          )) : <div className="rounded-[2rem] bg-white p-8 text-slate-500">Aucun match publié.</div>}
        </div>
      </section>

      <section id="club" className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end"><SectionTitle eyebrow={content.club_eyebrow || '02 / LE CLUB'} title={content.club_title || 'Une histoire.'} muted={content.club_muted || 'Une ville. Une passion.'} /><p className="max-w-xl text-lg leading-8 text-slate-600">JSO est plus qu’un nom sur un maillot. C’est une identité collective, un lien entre les générations et une ambition pour l’avenir du football à Oudhref.</p></div><div className="mt-10 grid gap-4 sm:grid-cols-3">{[['Identité forte','Un langage visuel premium et une présence digitale cohérente.'],['Communauté','Supporters, joueurs, familles et passionnés réunis.'],['Nouvelle génération','Une plateforme rapide, responsive et pensée pour le futur.']].map(([title, text], index) => <div key={title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40"><div className="text-2xl font-black text-jso-blue">0{index + 1}</div><h3 className="mt-8 text-xl font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>)}</div></section>

      <section id="news" className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><SectionTitle eyebrow={content.news_eyebrow || '03 / NEWSROOM'} title={content.news_title || 'Le club'} muted={content.news_muted || 'en mouvement.'} /><div className="mt-10 grid gap-5 md:grid-cols-3">{(articles.length ? articles : fallbackNews).map((item) => <article key={item.title} className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40 transition hover:-translate-y-1 hover:shadow-xl"><span className="text-xs font-extrabold tracking-[0.2em] text-jso-gold">{item.category}</span><h3 className="mt-8 text-2xl font-black tracking-tight">{item.title}</h3><p className="mt-3 leading-7 text-slate-500">{item.text}</p><button onClick={() => setDemoOpen(true)} className="mt-8 font-extrabold text-jso-blue">Lire la suite <ChevronRight className="inline" size={17} /></button></article>)}</div></section>

      <section id="team" className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><SectionTitle eyebrow="04 / ÉQUIPE" title="Les visages" muted="de JSO." /><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">{teamPlayers.length ? teamPlayers.map((player) => (<div key={player.Id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/40"><div className="grid h-28 place-items-center rounded-2xl bg-jso-navy text-4xl font-black text-jso-gold">{player.ShirtNumber || '—'}</div><h3 className="mt-4 font-black">{player.FirstName} {player.LastName}</h3><p className="mt-1 text-sm text-slate-500">{player.Position || 'Joueur'}</p></div>')) : (<div className="rounded-[2rem] bg-jso-navy p-6 text-white sm:col-span-2 lg:col-span-5"><Users size={28} className="text-jso-gold" /><h3 className="mt-12 text-2xl font-black">Équipe première</h3><p className="mt-2 text-white/65">Effectif, staff et profils des joueurs.</p></div>')}</div></section>

      <section id="media" className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><SectionTitle eyebrow="05 / MEDIA HOUSE" title="Voir, vivre," muted="partager." /><div className="mt-8 grid gap-5 md:grid-cols-[1.3fr_0.7fr]">{media.length ? media.slice(0, 3).map((item) => { const url = pick(item, 'Url', 'url'); const thumb = pick(item, 'ThumbnailUrl', 'thumbnailUrl') || url; const title = pick(item, 'Title', 'title') || 'Media JSO'; const caption = pick(item, 'Caption', 'caption') || 'Moments forts de la communauté JSO.'; return <article key={pick(item, 'Id', 'id') || url} className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg shadow-slate-200/40"><div className="h-64 overflow-hidden bg-slate-100">{url ? <img src={thumb} alt={title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" /> : <div className="grid h-full place-items-center bg-jso-navy text-4xl font-black text-jso-gold">JSO</div>}</div><div className="p-6"><p className="text-xs font-extrabold tracking-[0.2em] text-jso-gold">{pick(item, 'Type', 'type') || 'MEDIA'}</p><h3 className="mt-2 text-xl font-black">{title}</h3><p className="mt-2 text-sm text-slate-500">{caption}</p></div></article> }) : <><div className="flex min-h-64 items-end rounded-[2rem] bg-gradient-to-br from-jso-navy to-jso-blue p-7 text-white shadow-xl"><div><p className="text-xs font-extrabold tracking-[0.2em] text-jso-gold">GALERIE JSO</p><h3 className="mt-3 text-3xl font-black">Les couleurs du club.</h3><p className="mt-2 max-w-md text-white/70">Photos, vidéos et moments forts de la communauté.</p></div></div><div className="rounded-[2rem] border border-slate-200 bg-white p-7"><p className="text-xs font-extrabold tracking-[0.2em] text-slate-400">À VENIR</p><h3 className="mt-8 text-3xl font-black">Le contenu du club, autrement.</h3><p className="mt-3 text-slate-500">Un espace média moderne pour chaque supporter.</p></div></>}</div></section>

      <section id="shop" className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><div className="rounded-[2.5rem] bg-jso-gold p-8 sm:p-12"><div className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><div><p className="text-xs font-extrabold tracking-[0.2em] text-jso-navy/60">06 / BOUTIQUE</p><h2 className="mt-3 text-4xl font-black tracking-tight text-jso-navy sm:text-6xl">Porte les couleurs.<br />Vis l’identité.</h2></div><button onClick={() => setDemoOpen(true)} className="rounded-full bg-jso-navy px-6 py-4 font-extrabold text-white transition hover:bg-jso-blue"><ShoppingBag className="mr-2 inline" size={18} /> Boutique bientôt disponible</button></div></div></section>

      {selectedMatch && <div className="fixed inset-0 z-[70] overflow-y-auto bg-jso-navy/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
        <div className="mx-auto mt-10 max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
          <div className="flex items-start justify-between gap-5">
            <div><p className="text-xs font-extrabold tracking-[0.2em] text-jso-gold">MATCH CENTER</p><h2 className="mt-2 text-3xl font-black">JSO Oudhref <span className="text-slate-400">vs</span> {selectedMatch.OpponentName}</h2></div>
            <button onClick={() => setSelectedMatch(null)} className="rounded-full border border-slate-200 p-2"><X size={18}/></button>
          </div>
          <div className="mt-6 rounded-2xl bg-jso-navy p-6 text-center text-white">
            <p className="text-sm text-white/60">{new Date(selectedMatch.KickoffAt).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}</p>
            <div className="my-4 text-5xl font-black">{selectedMatch.HomeScore != null && selectedMatch.AwayScore != null ? selectedMatch.HomeScore + ' - ' + selectedMatch.AwayScore : 'VS'}</div>
            <p className="text-sm text-white/70">{selectedMatch.Venue || 'Lieu à confirmer'} · {selectedMatch.IsHome ? 'Domicile' : 'Extérieur'}</p>
          </div>
          <div className="mt-7"><h3 className="text-xl font-black">Événements</h3>
            {matchLoading ? <p className="mt-4 text-sm text-slate-500">Chargement…</p> : matchEvents.length ? <div className="mt-4 space-y-3">{matchEvents.map(event => <div key={event.Id} className="flex gap-4 rounded-xl bg-slate-50 p-4"><span className="font-black text-jso-blue">{event.Minute}'</span><div><b>{event.Type}</b>{event.PlayerName && <p className="text-sm text-slate-500">{event.PlayerName}</p>}{event.Notes && <p className="text-sm text-slate-500">{event.Notes}</p>}</div></div>)}</div> : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Nessun evento registrato per questa partita.</p>}
          </div>
        </div>
      </div>}
      <footer className="mt-12 bg-jso-navy px-5 py-10 text-white lg:px-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><div className="text-xl font-black">JSO · Jeunesse Sportive de Oudhref</div><p className="mt-1 text-sm text-white/60">Plus qu’un club. Une identité.</p></div><p className="text-sm text-white/50">© 2026 JSO. Tous droits réservés.</p></div></footer>

      {demoOpen && <div className="fixed inset-0 z-[60] grid place-items-center bg-jso-navy/60 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Présentation JSO"><div className="w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl"><div className="flex items-start justify-between gap-5"><div><p className="text-xs font-extrabold tracking-[0.2em] text-jso-gold">JSO DIGITAL</p><h2 className="mt-3 text-3xl font-black">Bienvenue dans la nouvelle maison du club.</h2></div><button aria-label="Fermer" onClick={() => setDemoOpen(false)} className="rounded-full border border-slate-200 p-2"><X size={18} /></button></div><p className="mt-4 leading-7 text-slate-600">Cette interface est une première version visuelle. Les données réelles, les comptes administrateur, les résultats et la boutique seront connectés dans les prochaines étapes.</p><button onClick={() => setDemoOpen(false)} className="mt-7 rounded-full bg-jso-navy px-5 py-3 font-extrabold text-white">Continuer</button></div></div>}
    </main>
  )
}

export default App
