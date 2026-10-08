import { Component, Suspense, useEffect, useRef, useState } from 'react'
import { Copy, CreditCard, ExternalLink, LogOut, Menu, Newspaper, Search, ShoppingBag, Ticket, Trophy, Users, X } from 'lucide-react'
import { adminApi } from './api'
import { ADMIN_CATEGORY_ORDER, ADMIN_PUBLIC_PATHS, visibleAdminItems } from './navigation'
import { adminSectionFromPath, adminSectionUrl } from './adminRoutes'
import { ADMIN_MODULES } from './moduleRegistry'

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@jso.tn')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      const result = await adminApi('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      localStorage.setItem('jso_admin_token', result.accessToken)
      localStorage.setItem('jso_admin_user', JSON.stringify(result.user))
      onLogin(result.user)
    } catch (e) { setError(e.message || 'Identifiants invalides ou API indisponible.') }
  }

  return <main className="grid min-h-screen place-items-center bg-jso-navy px-5 py-10">
    <form onSubmit={submit} className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-jso-navy text-xl font-black text-jso-gold">JSO</div>
      <p className="mt-8 text-xs font-extrabold tracking-[0.2em] text-jso-blue">ADMINISTRATION</p>
      <h1 className="mt-2 text-4xl font-black text-jso-ink">Connexion</h1>
      <p className="mt-2 text-sm text-slate-500">Accès sécurisé au back office JSO.</p>
      <label className="mt-7 block text-sm font-bold">Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" /></label>
      <label className="mt-4 block text-sm font-bold">Mot de passe<input value={password} onChange={e => setPassword(e.target.value)} type="password" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" /></label>
      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      <button className="mt-6 w-full rounded-xl bg-jso-navy px-4 py-3 font-extrabold text-white hover:bg-jso-blue">Se connecter</button>
      <a href="/" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-jso-blue hover:underline">Retour au site <ExternalLink size={15} aria-hidden="true" /></a>
    </form>
  </main>
}


class AdminModuleBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  render() {
    if (!this.state.failed) return this.props.children
    return <div role="alert" className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-8 text-amber-900">
      <p className="font-bold">Cette rubrique n'a pas pu s'ouvrir.</p>
      <button type="button" onClick={() => window.location.reload()} className="mt-3 text-sm font-bold underline">Actualiser la page</button>
    </div>
  }
}

function AdminDashboard({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState(() => adminSectionFromPath())
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const searchRef = useRef(null)

  const role = user.role ?? user.Role
  const displayName = user.displayName ?? user.DisplayName
  const visibleItems = visibleAdminItems(role)
  const filteredItems = visibleAdminItems(role, search)
  const currentItem = visibleItems.find(([id]) => id === section)
  const publicPath = ADMIN_PUBLIC_PATHS[section] || '/'
  const ActiveModule = ADMIN_MODULES[section]
  const groupedItems = ADMIN_CATEGORY_ORDER
    .map((category) => [category, filteredItems.filter((item) => item[4] === category)])
    .filter(([, list]) => list.length > 0)

  async function loadDashboard() {
    setDashboardLoading(true)
    try { setStats(await adminApi('/admin/dashboard')); setError('') }
    catch (e) { setError(e.message); setStats(null) }
    finally { setDashboardLoading(false) }
  }
  useEffect(() => {
    if (section !== 'dashboard') return
    if (visibleItems.some(([id]) => id === 'dashboard')) loadDashboard()
    else if (visibleItems[0]) {
      const next = visibleItems[0][0]
      window.history.replaceState({}, '', adminSectionUrl(next))
      setSection(next)
    }
  }, [section])

  useEffect(() => {
    const onPopState = () => { setSection(adminSectionFromPath()); setError('') }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
        searchRef.current?.focus()
      }
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function navigate(event, next) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    const url = adminSectionUrl(next)
    if (window.location.pathname !== url) window.history.pushState({}, '', url)
    window.dispatchEvent(new PopStateEvent('popstate'))
    setSection(next)
    setOpen(false)
    setSearch('')
    setError('')
  }

  async function copyCurrentLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch { setError('Impossible de copier le lien depuis ce navigateur.') }
  }

  function logout() {
    localStorage.removeItem('jso_admin_token')
    localStorage.removeItem('jso_admin_user')
    onLogout()
  }

  return <main className="min-h-screen bg-jso-paper text-jso-ink">
    {open && <button type="button" aria-label="Fermer la navigation" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-jso-navy/60 lg:hidden" />}
    <aside id="admin-sidebar" className={'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform ' + (open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-jso-navy font-black text-jso-gold">JSO</span><div><p className="font-black">JSO Admin</p><p className="text-xs text-slate-400">{role}</p></div></div>
        <button type="button" aria-label="Fermer le menu" className="lg:hidden" onClick={() => setOpen(false)}><X /></button>
      </div>
      <div className="border-b border-slate-100 px-4 py-4">
        <label htmlFor="admin-section-search" className="mb-2 block text-xs font-extrabold text-slate-500">Rechercher une rubrique</label>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-jso-blue">
          <Search size={17} className="text-slate-400" aria-hidden="true" />
          <input id="admin-section-search" ref={searchRef} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Dons, matchs, médias…" className="w-full bg-transparent py-2.5 text-sm outline-none" />
        </div>
        <p className="mt-2 text-xs text-slate-400">{filteredItems.length} rubrique{filteredItems.length > 1 ? 's' : ''} · Ctrl+K pour chercher</p>
      </div>
      <nav aria-label="Rubriques d’administration" className="jso-scroll flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
        {groupedItems.length === 0 && <p className="px-4 py-3 text-sm text-slate-500">Aucune rubrique trouvée.</p>}
        {groupedItems.map(([category, list]) => <div key={category} className="space-y-1">
          <p className="px-4 pb-1 pt-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{category}</p>
          {list.map(([id, label, Icon]) => <a key={id} href={adminSectionUrl(id)} onClick={(event) => navigate(event, id)} aria-current={section === id ? 'page' : undefined} className={'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition-colors ' + (section === id ? 'bg-jso-navy text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100')}><Icon size={18} aria-hidden="true" />{label}</a>)}
        </div>)}
      </nav>
      <div className="border-t border-slate-100 px-4 py-4">
        <a href={publicPath} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-jso-blue hover:bg-slate-100"><ExternalLink size={18} aria-hidden="true" />Voir sur le site</a>
        <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700"><LogOut size={18} aria-hidden="true" />Déconnexion</button>
      </div>
    </aside>
    <div className="lg:pl-72">
      <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur-xl lg:px-8">
        <button type="button" aria-label="Ouvrir le menu" aria-controls="admin-sidebar" aria-expanded={open} className="lg:hidden" onClick={() => setOpen(true)}><Menu /></button>
        <div className="min-w-0 flex-1"><p className="text-xs font-extrabold tracking-[0.15em] text-jso-blue">ADMINISTRATION {currentItem && `· ${currentItem[4].toUpperCase()}`}</p><h1 className="truncate text-2xl font-black">{section === 'dashboard' ? 'Bonjour, ' + displayName : currentItem?.[1] || 'Rubrique introuvable'}</h1></div>
        <button type="button" onClick={copyCurrentLink} className="hidden items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-jso-navy hover:border-jso-blue sm:inline-flex"><Copy size={15} aria-hidden="true" />{copied ? 'Lien copié' : 'Copier le lien'}</button>
        <a href={publicPath} className="hidden items-center gap-2 rounded-full bg-jso-navy px-3 py-2 text-xs font-bold text-white hover:bg-jso-blue sm:inline-flex"><ExternalLink size={15} aria-hidden="true" />Voir sur le site</a>
      </header>
      <section className="mx-auto max-w-7xl p-5 lg:p-8">
        {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</div>}
        {!section && <div role="alert" className="rounded-[1.5rem] bg-white p-8 text-slate-600">Page admin introuvable. <a href="/admin" className="font-bold text-jso-blue underline">Ouvrir le tableau de bord</a></div>}
        {section && !visibleItems.some(([id]) => id === section) && <div role="alert" className="rounded-[1.5rem] bg-white p-8 text-slate-600">Accès refusé à cette section.</div>}
        {currentItem && section === 'dashboard' && <>
          <AdminQuickLinks items={visibleItems} onNavigate={navigate} />
          <DashboardStats stats={stats} loading={dashboardLoading} onRetry={loadDashboard} />
        </>}
        {currentItem && ActiveModule && <AdminModuleBoundary key={section}><Suspense fallback={<div role="status" className="rounded-[1.5rem] bg-white p-8 text-slate-500">Chargement de la rubrique…</div>}><ActiveModule onError={setError} /></Suspense></AdminModuleBoundary>}
      </section>
    </div>
  </main>
}

function AdminQuickLinks({ items, onNavigate }) {
  const groups = ADMIN_CATEGORY_ORDER.filter((category) => category !== 'Tableau de bord')
    .map((category) => [category, items.filter((item) => item[4] === category).slice(0, 3)])
    .filter(([, links]) => links.length > 0)

  return <section aria-labelledby="admin-quick-links" className="mb-8">
    <h2 id="admin-quick-links" className="mb-3 text-lg font-black">Accès rapide</h2>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map(([category, links]) => <div key={category} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-jso-blue">{category}</h3>
        <div className="space-y-1">{links.map(([id, label, Icon]) => <a key={id} href={adminSectionUrl(id)} onClick={(event) => onNavigate(event, id)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-jso-ink hover:bg-slate-100"><Icon size={16} aria-hidden="true" />{label}</a>)}</div>
      </div>)}
    </div>
  </section>
}

function DashboardStats({ stats, loading, onRetry }) {
  if (!stats) return <div className="rounded-[1.5rem] bg-white p-8 text-slate-500">
    <p>{loading ? 'Chargement du tableau de bord…' : 'Les statistiques sont momentanément indisponibles. Les rubriques restent accessibles.'}</p>
    {!loading && <button type="button" onClick={onRetry} className="mt-3 text-sm font-bold text-jso-blue underline">Réessayer</button>}
  </div>

  const sales = stats.sales || { enabled: false, currency: 'TND', revenue: 0, orders: 0, activeProducts: 0, productsSold: 0 }
  const tickets = stats.tickets || { currency: 'TND', revenue: 0, orders: 0, ticketsSold: 0, pending: 0 }
  const memberships = stats.memberships || { currency: 'TND', revenue: 0, active: 0, total: 0 }
  const money = (n, c = 'TND') => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c || 'TND', maximumFractionDigits: 0 }).format(n || 0)
  const totalRevenue = (tickets.revenue || 0) + (memberships.revenue || 0) + (sales.revenue || 0)

  // The three revenue engines, revenue-first.
  const revenueCards = [
    { key: 'tickets', label: 'Billetterie', Icon: Ticket, revenue: tickets.revenue, sub: `${tickets.ticketsSold ?? 0} billets · ${tickets.pending ?? 0} en attente`, cls: 'bg-jso-navy text-white', accent: 'text-jso-gold' },
    { key: 'memberships', label: 'Abonnements', Icon: CreditCard, revenue: memberships.revenue, sub: `${memberships.active ?? 0} abonnés actifs`, cls: 'bg-jso-blue text-white', accent: 'text-white/85' },
    { key: 'shop', label: 'Boutique', Icon: ShoppingBag, revenue: sales.revenue, sub: `${sales.orders ?? 0} commandes · ${sales.productsSold ?? 0} produits`, cls: 'bg-jso-gold text-jso-navy', accent: 'text-jso-navy/70' },
  ]

  const clubCards = [
    ['Parties à venir', stats.matches.upcoming, Trophy], ['Résultats', stats.matches.finished, Trophy],
    ['News publiées', stats.news.published, Newspaper], ['Brouillons', stats.news.drafts, Newspaper],
    ['Équipes', stats.teams, Users], ['Joueurs actifs', stats.players, Users],
  ]
  const today = stats.todayActivity
  const todayFigures = today ? [
    ['News publiées', today.newsPublished], ['Matchs du jour', today.matchesToday],
    ['Médias ajoutés', today.mediaUploaded], ['Actions d’audit', today.auditActions],
  ] : []
  const recent = stats.recentActivity ?? []

  return <div className="space-y-8">
    {/* Revenue hero */}
    <div className="flex flex-col justify-between gap-4 rounded-[1.5rem] bg-jso-navy p-6 text-white sm:flex-row sm:items-center">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-jso-gold">Revenus</p>
        <p className="mt-1 text-sm text-white/60">Billetterie + Abonnements + Boutique</p>
      </div>
      <p className="text-4xl font-black">{money(totalRevenue)}</p>
    </div>

    {/* Three revenue engines */}
    <div>
      <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.15em] text-jso-blue">Analytics des ventes</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {revenueCards.map(({ key, label, Icon, revenue, sub, cls, accent }) => (
          <div key={key} className={'relative overflow-hidden rounded-[1.5rem] p-6 shadow-sm ' + cls}>
            <Icon className="absolute right-5 top-5 opacity-30" size={40} aria-hidden="true" />
            <p className="text-xs font-black uppercase tracking-[0.15em] opacity-80">{label}</p>
            <p className="mt-6 text-3xl font-black">{money(revenue)}</p>
            <p className={'mt-1 text-sm font-semibold ' + accent}>{sub}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Club figures */}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {clubCards.map(([label,value,Icon]) => <div key={label} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"><Icon className="text-jso-blue" size={22}/><p className="mt-7 text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 text-4xl font-black">{value}</p></div>)}
    </div>

    {today && <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Activité du jour</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{todayFigures.map(([label,value]) => <div key={label} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="font-semibold text-slate-500">{label}</p><p className="mt-1 text-3xl font-black">{value ?? 0}</p></div>)}</div></div>}

    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Activité récente</h2><div className="mt-4 space-y-2">{recent.length ? recent.map(a => <div key={a.id} className="rounded-xl bg-slate-50 p-3 text-sm"><div className="flex justify-between gap-3"><b>{a.action} · {a.entityType}</b><span className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString('fr-FR')}</span></div><p className="mt-1 text-xs text-slate-500">{a.userEmail || 'Système'}{a.entityId ? ' · ' + a.entityId : ''}</p></div>) : <p className="text-sm text-slate-500">Aucune activité récente.</p>}</div></div>
  </div>
}

export default function AdminApp() {
  const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('jso_admin_user')||'null')}catch{return null}})
  useEffect(() => {
    const onSessionExpired = () => setUser(null)
    window.addEventListener('jso:admin-session-expired', onSessionExpired)
    return () => window.removeEventListener('jso:admin-session-expired', onSessionExpired)
  }, [])
  return user ? <AdminDashboard user={user} onLogout={()=>setUser(null)}/> : <Login onLogin={setUser}/>
}
