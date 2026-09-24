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
} from 'lucide-react'\nimport { publicApi } from './lib/api'

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
  const [demoOpen, setDemoOpen] = useState(false)\n  const [club, setClub] = useState(null)\n  const [matches, setMatches] = useState([])\n  const [articles, setArticles] = useState([])\n  const [apiState, setApiState] = useState('loading')\n\n  useEffect(() => {\n    const controller = new AbortController()\n    Promise.all([publicApi.getClub(controller.signal), publicApi.getMatches(controller.signal), publicApi.getNews(controller.signal)])\n      .then(([clubData, matchData, newsData]) => {\n        setClub(clubData)\n        setMatches(matchData)\n        setArticles(newsData)\n        setApiState('ready')\n      })\n      .catch((error) => {\n        if (error.name !== 'AbortError') setApiState('offline')\n      })\n    return () => controller.abort()\n  }, [])

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
          <h1 className="max-w-3xl text-5xl font-black leading-[0.94] tracking-[-0.06em] sm:text-7xl lg:text-8xl">Toujours plus haut.<br /><span className="text-jso-blue">Toujours JSO.</span></h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">{club?.Description || 'La maison digitale de la Jeunesse Sportive de Oudhref. Une plateforme pour vivre le club, suivre les matchs et partager la passion d’une ville.'} Une plateforme pour vivre le club, suivre les matchs et partager la passion d’une ville.</p>
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
            <div className="grid items-center gap-5 py-10 sm:grid-cols-[1fr_auto_1fr]"><div className="text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-jso-navy text-2xl font-black text-jso-gold">JSO</div><h3 className="mt-3 text-xl font-black">JSO Oudhref</h3><p className="text-sm text-slate-500">Domicile</p></div><div className="text-center"><div className="text-xs font-extrabold text-slate-400">DATE À CONFIRMER</div><div className="my-2 text-4xl font-black text-jso-navy">VS</div><div className="text-xs text-slate-500">Stade d’Oudhref</div></div><div className="text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-slate-200 bg-slate-50 text-xl font-black text-slate-400">TBA</div><h3 className="mt-3 text-xl font-black">Adversaire</h3><p className="text-sm text-slate-500">À confirmer</p></div></div>
            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-5 text-sm text-slate-500"><span className="rounded-full bg-slate-100 px-3 py-2">Composition</span><span className="rounded-full bg-slate-100 px-3 py-2">Statistiques</span><span className="rounded-full bg-slate-100 px-3 py-2">Commentaires</span></div>
          </div>
          <div className="rounded-[2rem] bg-jso-navy p-6 text-white shadow-xl shadow-blue-950/20"><div className="text-xs font-extrabold tracking-[0.2em] text-white/60">CLUB SNAPSHOT</div><div className="mt-6 space-y-5"><div className="flex items-center justify-between border-b border-white/15 pb-4"><span className="flex items-center gap-2 text-white/75"><Trophy size={18} /> Dernier résultat</span><strong>—</strong></div><div className="flex items-center justify-between border-b border-white/15 pb-4"><span className="flex items-center gap-2 text-white/75"><CalendarDays size={18} /> Calendrier</span><strong>À venir</strong></div><div className="flex items-center justify-between border-b border-white/15 pb-4"><span className="flex items-center gap-2 text-white/75"><Users size={18} /> Effectif</span><strong>JSO</strong></div><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-white/75"><Shield size={18} /> Identité</span><strong className="text-jso-gold">Oudhref</strong></div></div></div>
        </div>
      </section>

      <section id="club" className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end"><SectionTitle eyebrow="02 / LE CLUB" title="Une histoire." muted="Une ville. Une passion." /><p className="max-w-xl text-lg leading-8 text-slate-600">JSO est plus qu’un nom sur un maillot. C’est une identité collective, un lien entre les générations et une ambition pour l’avenir du football à Oudhref.</p></div><div className="mt-10 grid gap-4 sm:grid-cols-3">{[['Identité forte','Un langage visuel premium et une présence digitale cohérente.'],['Communauté','Supporters, joueurs, familles et passionnés réunis.'],['Nouvelle génération','Une plateforme rapide, responsive et pensée pour le futur.']].map(([title, text], index) => <div key={title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40"><div className="text-2xl font-black text-jso-blue">0{index + 1}</div><h3 className="mt-8 text-xl font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>)}</div></section>

      <section id="news" className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><SectionTitle eyebrow="03 / NEWSROOM" title="Le club" muted="en mouvement." /><div className="mt-10 grid gap-5 md:grid-cols-3">{(articles.length ? articles : fallbackNews).map((item) => <article key={item.title} className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40 transition hover:-translate-y-1 hover:shadow-xl"><span className="text-xs font-extrabold tracking-[0.2em] text-jso-gold">{item.category}</span><h3 className="mt-8 text-2xl font-black tracking-tight">{item.title}</h3><p className="mt-3 leading-7 text-slate-500">{item.text}</p><button onClick={() => setDemoOpen(true)} className="mt-8 font-extrabold text-jso-blue">Lire la suite <ChevronRight className="inline" size={17} /></button></article>)}</div></section>

      <section id="team" className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><SectionTitle eyebrow="04 / ÉQUIPE" title="Les visages" muted="de JSO." /><div className="mt-8 grid gap-5 sm:grid-cols-3"><div className="rounded-[2rem] bg-jso-navy p-6 text-white"><Users size={28} className="text-jso-gold" /><h3 className="mt-12 text-2xl font-black">Équipe première</h3><p className="mt-2 text-white/65">Effectif, staff et profils des joueurs.</p></div><div className="rounded-[2rem] border border-slate-200 bg-white p-6"><Trophy size={28} className="text-jso-blue" /><h3 className="mt-12 text-2xl font-black">Palmarès</h3><p className="mt-2 text-slate-500">Les moments et les résultats qui ont marqué le club.</p></div><div className="rounded-[2rem] border border-slate-200 bg-white p-6"><Shield size={28} className="text-jso-blue" /><h3 className="mt-12 text-2xl font-black">Formation</h3><p className="mt-2 text-slate-500">La nouvelle génération de talents d’Oudhref.</p></div></div></section>

      <section id="media" className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><SectionTitle eyebrow="05 / MEDIA HOUSE" title="Voir, vivre," muted="partager." /><div className="mt-8 grid gap-5 md:grid-cols-[1.3fr_0.7fr]"><div className="flex min-h-64 items-end rounded-[2rem] bg-gradient-to-br from-jso-navy to-jso-blue p-7 text-white shadow-xl"><div><p className="text-xs font-extrabold tracking-[0.2em] text-jso-gold">GALERIE JSO</p><h3 className="mt-3 text-3xl font-black">Les couleurs du club.</h3><p className="mt-2 max-w-md text-white/70">Photos, vidéos et moments forts de la communauté.</p></div></div><div className="rounded-[2rem] border border-slate-200 bg-white p-7"><p className="text-xs font-extrabold tracking-[0.2em] text-slate-400">À VENIR</p><h3 className="mt-8 text-3xl font-black">Le contenu du club, autrement.</h3><p className="mt-3 text-slate-500">Un espace média moderne pour chaque supporter.</p></div></div></section>

      <section id="shop" className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><div className="rounded-[2.5rem] bg-jso-gold p-8 sm:p-12"><div className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><div><p className="text-xs font-extrabold tracking-[0.2em] text-jso-navy/60">06 / BOUTIQUE</p><h2 className="mt-3 text-4xl font-black tracking-tight text-jso-navy sm:text-6xl">Porte les couleurs.<br />Vis l’identité.</h2></div><button onClick={() => setDemoOpen(true)} className="rounded-full bg-jso-navy px-6 py-4 font-extrabold text-white transition hover:bg-jso-blue"><ShoppingBag className="mr-2 inline" size={18} /> Boutique bientôt disponible</button></div></div></section>

      <footer className="mt-12 bg-jso-navy px-5 py-10 text-white lg:px-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><div className="text-xl font-black">JSO · Jeunesse Sportive de Oudhref</div><p className="mt-1 text-sm text-white/60">Plus qu’un club. Une identité.</p></div><p className="text-sm text-white/50">© 2026 JSO. Tous droits réservés.</p></div></footer>

      {demoOpen && <div className="fixed inset-0 z-[60] grid place-items-center bg-jso-navy/60 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Présentation JSO"><div className="w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl"><div className="flex items-start justify-between gap-5"><div><p className="text-xs font-extrabold tracking-[0.2em] text-jso-gold">JSO DIGITAL</p><h2 className="mt-3 text-3xl font-black">Bienvenue dans la nouvelle maison du club.</h2></div><button aria-label="Fermer" onClick={() => setDemoOpen(false)} className="rounded-full border border-slate-200 p-2"><X size={18} /></button></div><p className="mt-4 leading-7 text-slate-600">Cette interface est une première version visuelle. Les données réelles, les comptes administrateur, les résultats et la boutique seront connectés dans les prochaines étapes.</p><button onClick={() => setDemoOpen(false)} className="mt-7 rounded-full bg-jso-navy px-5 py-3 font-extrabold text-white">Continuer</button></div></div>}
    </main>
  )
}

export default App
