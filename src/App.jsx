import { useState } from 'react'
import {
  ArrowUpRight, CalendarDays, ChevronRight, CirclePlay, Menu, Search,
  Shield, Sparkles, Trophy, Users, X, Zap,
} from 'lucide-react'

const nav = ['Accueil', 'Le Club', 'Équipe', 'Matchs', 'Actualités', 'Médias', 'Boutique']

const news = [
  { tag: 'CLUB', title: 'JSO ouvre un nouveau chapitre digital', text: 'Toute l’actualité de Jeunesse Sportive de Oudhref dans une expérience moderne.' },
  { tag: 'MATCH', title: 'Le Match Center arrive', text: 'Résultats, calendrier, compositions et statistiques réunis au même endroit.' },
  { tag: 'FORMATION', title: 'La relève d’Oudhref', text: 'Un espace dédié aux jeunes talents et à la formation du club.' },
]

function GlassCard({ children, className = '' }) {
  return <div className={`rounded-3xl border border-white/10 bg-white/[0.07] shadow-2xl shadow-black/20 backdrop-blur-2xl ${className}`}>{children}</div>
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState('Accueil')
  const [showDemo, setShowDemo] = useState(false)

  const go = (label) => {
    setActive(label)
    setMenuOpen(false)
    const id = label === 'Accueil' ? 'home' : label === 'Le Club' ? 'club' : label === 'Équipe' ? 'team' : label === 'Matchs' ? 'matches' : label === 'Actualités' ? 'news' : label === 'Médias' ? 'media' : 'shop'
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050816] text-slate-100 selection:bg-[#f5c542] selection:text-[#050816]">
      <div className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(circle_at_10%_0%,rgba(59,130,246,.22),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(245,197,66,.12),transparent_25%)]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050816]/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <button onClick={() => go('Accueil')} className="flex items-center gap-3 text-left">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#f5c542] to-[#b78618] font-black text-[#071225] shadow-lg shadow-[#f5c542]/20">JSO</div>
            <div><div className="text-lg font-black tracking-tight">Jeunesse Sportive</div><div className="text-xs font-medium text-slate-400">DE OUDHREF · TUNISIE</div></div>
          </button>
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Navigation principale">
            {nav.map((item) => <button key={item} onClick={() => go(item)} className={`text-sm font-semibold transition ${active === item ? 'text-[#f5c542]' : 'text-slate-300 hover:text-white'}`}>{item}</button>)}
          </nav>
          <div className="flex items-center gap-2">
            <button aria-label="Rechercher" className="hidden rounded-full border border-white/10 p-3 text-slate-300 transition hover:border-white/30 hover:text-white sm:block"><Search size={17} /></button>
            <button onClick={() => go('Matchs')} className="hidden rounded-full bg-[#f5c542] px-5 py-3 text-sm font-black text-[#071225] transition hover:-translate-y-0.5 hover:bg-[#ffd95a] sm:block">Match Center ↗</button>
            <button aria-label="Apri menu" onClick={() => setMenuOpen(!menuOpen)} className="rounded-full border border-white/10 p-3 lg:hidden">{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
          </div>
        </div>
        {menuOpen && <div className="border-t border-white/10 bg-[#071225] px-5 py-4 lg:hidden">{nav.map((item) => <button key={item} onClick={() => go(item)} className="block w-full py-3 text-left font-semibold text-slate-200">{item}</button>)}</div>}
      </header>

      <section id="home" className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:px-8 lg:pt-24">
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#f5c542]/30 bg-[#f5c542]/10 px-4 py-2 text-xs font-bold tracking-[.18em] text-[#f5c542]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#f5c542]" /> SAISON 2026 / 27</div>
          <h1 className="max-w-3xl text-5xl font-black leading-[.95] tracking-[-.06em] sm:text-7xl lg:text-8xl">Plus qu’un club.<br /><span className="bg-gradient-to-r from-[#f5c542] via-[#ffd95a] to-white bg-clip-text text-transparent">Une identité.</span></h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">Bienvenue sur la nouvelle maison digitale de la Jeunesse Sportive de Oudhref. Le club, les matchs, les joueurs et toute la passion d’Oudhref réunis dans une expérience nouvelle génération.</p>
          <div className="mt-9 flex flex-wrap gap-3"><button onClick={() => go('Matchs')} className="rounded-full bg-[#f5c542] px-6 py-4 font-black text-[#071225] transition hover:-translate-y-1 hover:bg-[#ffd95a]">Découvrir le Match Center <ArrowUpRight className="ml-2 inline" size={18} /></button><button onClick={() => setShowDemo(true)} className="rounded-full border border-white/15 bg-white/5 px-6 py-4 font-bold backdrop-blur-xl transition hover:border-white/30 hover:bg-white/10"><CirclePlay className="mr-2 inline" size={18} /> Découvrir JSO</button></div>
          <div className="mt-10 flex flex-wrap gap-6 text-sm text-slate-400"><span><strong className="text-white">01</strong> Club historique</span><span><strong className="text-white">24/7</strong> Actualités</span><span><strong className="text-white">100%</strong> Passion</span></div>
        </div>

        <div className="relative min-h-[440px] lg:min-h-[570px]">
          <div className="absolute inset-8 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full border border-[#f5c542]/40 bg-[#f5c542]/10 blur-sm" />
          <div className="absolute inset-0 rounded-[3rem] border border-white/10 bg-gradient-to-br from-blue-500/20 via-white/[.04] to-[#f5c542]/10 shadow-2xl shadow-blue-950/50 backdrop-blur-xl" />
          <div className="absolute inset-5 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#102650] via-[#071225] to-[#050816]">
            <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:34px_34px]" />
            <div className="absolute left-8 top-8 text-xs font-bold tracking-[.25em] text-[#f5c542]">JSO / OUDHREF</div>
            <div className="absolute inset-x-0 top-24 text-center text-[10rem] font-black leading-none text-white/[.035] sm:text-[14rem]">JSO</div>
            <div className="absolute bottom-0 left-1/2 h-[72%] w-[72%] -translate-x-1/2 rounded-t-full border border-white/10 bg-gradient-to-t from-blue-500/20 to-transparent" />
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 text-center"><div className="text-7xl font-black tracking-[-.08em] text-white sm:text-8xl">JSO</div><div className="mt-2 text-xs font-bold tracking-[.35em] text-[#f5c542]">JEUNESSE SPORTIVE</div><div className="text-xs font-bold tracking-[.35em] text-slate-400">DE OUDHREF</div></div>
            <GlassCard className="absolute left-5 top-28 p-4 sm:left-8"><div className="text-[10px] font-bold tracking-widest text-slate-400">NEXT MATCH</div><div className="mt-1 flex items-center gap-3"><div className="text-2xl font-black">JSO</div><div className="text-xs text-[#f5c542]">VS</div><div className="text-2xl font-black">TBA</div></div><div className="mt-2 text-xs text-slate-400">Date à confirmer</div></GlassCard>
            <GlassCard className="absolute bottom-6 right-5 p-4 sm:right-8"><div className="flex items-center gap-2 text-xs font-bold text-[#67e8f9]"><Zap size={14} /> DIGITAL CLUB</div><div className="mt-1 text-lg font-black">Built for the future.</div></GlassCard>
          </div>
        </div>
      </section>

      <section id="matches" className="mx-auto max-w-7xl px-5 py-10 lg:px-8"><div className="mb-6 flex items-end justify-between gap-4"><div><div className="text-xs font-black tracking-[.25em] text-[#f5c542]">01 / MATCHDAY</div><h2 className="mt-2 text-3xl font-black sm:text-5xl">Le match, <span className="text-slate-500">en direct.</span></h2></div><button onClick={() => setShowDemo(true)} className="hidden text-sm font-bold text-[#f5c542] sm:block">Voir tous les détails <ChevronRight className="inline" size={16} /></button></div><div className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
        <GlassCard className="p-6 sm:p-8"><div className="flex items-center justify-between text-xs font-bold text-slate-400"><span className="rounded-full bg-[#f5c542]/15 px-3 py-1 text-[#f5c542]">PROCHAIN MATCH</span><span>À VENIR</span></div><div className="grid items-center gap-5 py-10 sm:grid-cols-[1fr_auto_1fr]"><div className="text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-[#f5c542] text-2xl font-black text-[#071225]">JSO</div><h3 className="mt-3 text-xl font-black">JSO Oudhref</h3><p className="text-sm text-slate-400">Domicile</p></div><div className="text-center"><div className="text-xs font-bold text-slate-400">DATE À CONFIRMER</div><div className="my-2 text-4xl font-black">VS</div><div className="text-xs text-slate-400">Stade d’Oudhref</div></div><div className="text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-white/10 bg-white/5 text-xl font-black text-slate-400">TBA</div><h3 className="mt-3 text-xl font-black">Adversaire</h3><p className="text-sm text-slate-400">À confirmer</p></div></div><div className="flex flex-wrap gap-2 border-t border-white/10 pt-5 text-sm text-slate-400"><span className="rounded-full bg-white/5 px-3 py-2">Composition</span><span className="rounded-full bg-white/5 px-3 py-2">Statistiques</span><span className="rounded-full bg-white/5 px-3 py-2">Commentaires</span></div></GlassCard>
        <GlassCard className="p-6"><div className="text-xs font-black tracking-[.2em] text-slate-400">CLUB SNAPSHOT</div><div className="mt-6 space-y-4"><div className="flex items-center justify-between border-b border-white/10 pb-4"><span className="flex items-center gap-2 text-slate-300"><Trophy size={18} /> Dernier résultat</span><strong>—</strong></div><div className="flex items-center justify-between border-b border-white/10 pb-4"><span className="flex items-center gap-2 text-slate-300"><CalendarDays size={18} /> Calendrier</span><strong>À venir</strong></div><div className="flex items-center justify-between border-b border-white/10 pb-4"><span className="flex items-center gap-2 text-slate-300"><Users size={18} /> Effectif</span><strong>JSO</strong></div><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-slate-300"><Shield size={18} /> Identité</span><strong className="text-[#f5c542]">Oudhref</strong></div></div></GlassCard>
      </div></section>

      <section id="club" className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><div className="text-xs font-black tracking-[.25em] text-[#f5c542]">02 / LE CLUB</div><h2 className="mt-3 text-4xl font-black sm:text-6xl">Une histoire.<br /><span className="text-slate-500">Une ville. Une passion.</span></h2></div><p className="max-w-xl text-lg leading-8 text-slate-400">JSO est plus qu’un nom sur un maillot. C’est une identité collective, un lien entre les générations et une ambition pour l’avenir du football à Oudhref.</p></div><div className="mt-10 grid gap-4 sm:grid-cols-3"><GlassCard className="p-6"><Sparkles className="text-[#f5c542]" /><h3 className="mt-8 text-xl font-black">Identité forte</h3><p className="mt-2 text-sm leading-6 text-slate-400">Un langage visuel premium et une présence digitale cohérente.</p></GlassCard><GlassCard className="p-6"><Users className="text-[#67e8f9]" /><h3 className="mt-8 text-xl font-black">Communauté</h3><p className="mt-2 text-sm leading-6 text-slate-400">Supporters, joueurs, familles et passionnés réunis.</p></GlassCard><GlassCard className="p-6"><Zap className="text-blue-400" /><h3 className="mt-8 text-xl font-black">Nouvelle génération</h3><p className="mt-2 text-sm leading-6 text-slate-400">Une plateforme rapide, responsive et pensée pour le futur.</p></GlassCard></div></section>

      <section id="news" className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><div className="flex items-end justify-between"><div><div className="text-xs font-black tracking-[.25em] text-[#f5c542]">03 / NEWSROOM</div><h2 className="mt-3 text-4xl font-black sm:text-6xl">Le club <span className="text-slate-500">en mouvement.</span></h2></div><button className="hidden text-sm font-bold text-[#f5c542] sm:block">Toutes les actualités →</button></div><div className="mt-10 grid gap-5 md:grid-cols-3">{news.map((item, index) => <GlassCard key={item.title} className="group overflow-hidden"><div className={`h-44 bg-gradient-to-br ${index === 0 ? 'from-blue-500/50 via-[#102650] to-[#071225]' : index === 1 ? 'from-[#f5c542]/40 via-[#6d5115] to-[#071225]' : 'from-cyan-400/30 via-[#102650] to-[#071225]'} p-5`}><div className="flex h-full items-end justify-between"><span className="rounded-full bg-black/20 px-3 py-1 text-xs font-black backdrop-blur-xl">{item.tag}</span><span className="text-5xl font-black text-white/20">0{index + 1}</span></div></div><div className="p-6"><h3 className="text-xl font-black transition group-hover:text-[#f5c542]">{item.title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{item.text}</p><button className="mt-6 text-sm font-bold text-[#f5c542]">Lire la suite ↗</button></div></GlassCard>)}</div></section>

      <section id="team" className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><GlassCard className="relative overflow-hidden p-8 sm:p-12"><div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" /><div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="text-xs font-black tracking-[.25em] text-[#f5c542]">04 / ÉQUIPE</div><h2 className="mt-3 text-4xl font-black sm:text-6xl">Les couleurs.<br /><span className="text-slate-500">La nouvelle génération.</span></h2><p className="mt-5 max-w-xl text-slate-400">Découvrez prochainement les joueurs, le staff, les équipes jeunes et les profils de la famille JSO.</p></div><div className="grid h-44 w-44 place-items-center rounded-full border border-[#f5c542]/40 bg-[#f5c542]/10 text-5xl font-black text-[#f5c542] shadow-2xl shadow-[#f5c542]/10">JSO</div></div></GlassCard></section>

      <section id="media" className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><div className="rounded-[2.5rem] border border-white/10 bg-gradient-to-r from-[#0b1a33] to-[#101b3a] p-8 sm:p-12"><div className="flex flex-wrap items-center justify-between gap-5"><div><div className="text-xs font-black tracking-[.25em] text-[#67e8f9]">05 / MEDIA HOUSE</div><h2 className="mt-3 text-4xl font-black sm:text-5xl">Voir le club.<br /><span className="text-slate-400">Ressentir le club.</span></h2></div><button onClick={() => setShowDemo(true)} className="rounded-full border border-white/15 bg-white/10 px-5 py-3 font-bold backdrop-blur-xl hover:bg-white/15"><CirclePlay className="mr-2 inline" size={18} /> Ouvrir la Media House</button></div></div></section>

      <section id="shop" className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><div className="grid gap-6 rounded-[2.5rem] border border-[#f5c542]/20 bg-gradient-to-br from-[#f5c542]/15 via-[#0b1a33] to-[#071225] p-8 sm:p-12 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="text-xs font-black tracking-[.25em] text-[#f5c542]">06 / CLUB SHOP</div><h2 className="mt-3 text-4xl font-black sm:text-5xl">Porter les couleurs.<br /><span className="text-slate-400">Vivre l’identité JSO.</span></h2><p className="mt-4 max-w-xl text-slate-400">La boutique officielle arrive bientôt : maillots, accessoires et collections du club.</p></div><div className="grid h-48 w-48 place-items-center rounded-3xl border border-white/10 bg-white/5 text-5xl font-black text-[#f5c542] shadow-2xl backdrop-blur-xl">JSO</div></div></section>

      <footer className="border-t border-white/10 px-5 py-10 lg:px-8"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5"><div><div className="text-xl font-black">JSO — Jeunesse Sportive de Oudhref</div><div className="mt-1 text-sm text-slate-500">Plus qu’un club. Une identité.</div></div><div className="text-sm text-slate-500">© 2026 JSO. Tous droits réservés.</div></div></footer>

      {showDemo && <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-5 backdrop-blur-md"><GlassCard className="relative w-full max-w-lg bg-[#0b1a33] p-8"><button aria-label="Fermer" onClick={() => setShowDemo(false)} className="absolute right-5 top-5 rounded-full border border-white/10 p-2"><X size={18} /></button><div className="text-xs font-black tracking-[.25em] text-[#f5c542]">JSO / PREVIEW</div><h2 className="mt-4 text-3xl font-black">L’expérience JSO arrive.</h2><p className="mt-4 leading-7 text-slate-400">Questa sezione sarà collegata al vero Match Center, alle news, ai media e all’area supporter quando il backend sarà pronto.</p><button onClick={() => setShowDemo(false)} className="mt-7 rounded-full bg-[#f5c542] px-5 py-3 font-black text-[#071225]">Continua a esplorare</button></GlassCard></div>}
    </main>
  )
}

export default App
