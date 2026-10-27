import { Component, Suspense, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, BrickWall, CheckCircle2, ChevronDown, Copy, CreditCard, ExternalLink, Images, LayoutDashboard, LogOut, Megaphone, Menu, MessageSquare, Moon, Newspaper, PanelLeftClose, PanelLeftOpen, Search, ShoppingBag, Sun, Ticket, Trophy, Users, X } from 'lucide-react'
import { adminApi } from './api'
import { ADMIN_CATEGORY_ORDER, ADMIN_PUBLIC_PATHS, ADMIN_QUICK_SECTION_IDS, visibleAdminItems } from './navigation'
import { adminSectionFromPath, adminSectionUrl } from './adminRoutes'
import { ADMIN_MODULES } from './moduleRegistry'
import { ToastProvider } from './components/ui/Toast'
import { ConfirmProvider } from './components/ui/ConfirmDialog'
import CommandPalette from './components/ui/CommandPalette'
import './admin-responsive.css'
import './admin-dark.css'

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

  return <main className="jso-admin-login grid min-h-screen place-items-center bg-jso-navy px-5 py-10">
    <form onSubmit={submit} className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-jso-navy text-xl font-black text-jso-gold">JSO</div>
      <p className="mt-8 text-xs font-extrabold tracking-[0.2em] text-jso-blue">ADMINISTRATION</p>
      <h1 className="mt-2 text-4xl font-black text-jso-ink">Connexion</h1>
      <p className="mt-2 text-sm text-slate-500">Accès sécurisé au back office JSO.</p>
      <label className="mt-7 block text-sm font-bold">Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" /></label>
      <label className="mt-4 block text-sm font-bold">Mot de passe<input value={password} onChange={e => setPassword(e.target.value)} type="password" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" /></label>
      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      <button className="mt-6 w-full rounded-xl bg-jso-navy px-4 py-3 font-extrabold text-white hover:bg-jso-blue">Se connecter</button>
      <a href="/password-reset?type=admin" className="mt-4 block text-center text-sm font-bold text-jso-blue hover:underline">Mot de passe oublié ?</a>
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

function AdminDashboard({ user, dark, onToggleTheme, onLogout }) {
  const [open, setOpen] = useState(false)
  // Collapsed = icon-only sidebar (desktop). Persisted across sessions.
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('jso_admin_sidebar_collapsed') === '1' } catch { return false }
  })
  const [section, setSection] = useState(() => adminSectionFromPath())
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedCategories, setExpandedCategories] = useState({})
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
  const activeCategory = currentItem?.[4]
  const publicPath = ADMIN_PUBLIC_PATHS[section] || '/'
  const ActiveModule = ADMIN_MODULES[section]
  const groupedItems = ADMIN_CATEGORY_ORDER
    .map((category) => [category, filteredItems.filter((item) => item[4] === category)])
    .filter(([, list]) => list.length > 0)
  const quickItems = ADMIN_QUICK_SECTION_IDS.map((id) => visibleItems.find((item) => item[0] === id)).filter(Boolean)
  // Action-needed counters shown as red badges on the sidebar entries, so the
  // admin sees where work is waiting without opening each section.
  const pendingBySection = {
    tickets: stats?.tickets?.pending ?? 0,
    orders: stats?.sales?.pending ?? 0,
    'community-moderation': (stats?.moderation?.comments ?? 0) + (stats?.moderation?.reports ?? 0),
    'fan-photos': stats?.moderation?.fanPhotos ?? 0,
    classifieds: stats?.moderation?.classifieds ?? 0,
    supporters: stats?.moderation?.supporters ?? 0,
  }

  useEffect(() => {
    if (activeCategory) setExpandedCategories((previous) => ({ ...previous, [activeCategory]: true }))
  }, [activeCategory])

  async function loadDashboard() {
    setDashboardLoading(true)
    try { setStats(await adminApi('/admin/dashboard')); setError('') }
    catch (e) { setError(e.message); setStats(null) }
    finally { setDashboardLoading(false) }
  }
  // Load the stats once on mount: the sidebar badges need them even before the
  // dashboard itself is opened.
  useEffect(() => {
    if (visibleItems.some(([id]) => id === 'dashboard')) loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
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
        setPaletteOpen(true)
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

  function openSearch() {
    setPaletteOpen(true)
  }

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current
      try { localStorage.setItem('jso_admin_sidebar_collapsed', next ? '1' : '0') } catch { /* private mode */ }
      return next
    })
  }

  // Palette selection: mirror navigate() but driven by the palette (no event).
  function paletteNavigate(next) {
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
    window.JsoAdminBridge?.postMessage('logout')
    onLogout()
  }

  return <main className="jso-admin-shell min-h-screen bg-jso-paper text-jso-ink">
    {open && <button type="button" aria-label="Fermer la navigation" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-jso-navy/60 lg:hidden" />}
    <aside id="admin-sidebar" className={'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-all ' + (open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0') + (collapsed ? ' lg:w-20' : '')}>
      <div className={'flex items-center justify-between border-b border-slate-100 px-4 py-5 ' + (collapsed ? 'lg:justify-center lg:px-2' : 'lg:px-6')}>
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-jso-navy font-black text-jso-gold">JSO</span><div className={collapsed ? 'lg:hidden' : ''}><p className="font-black">JSO Admin</p><p className="text-xs text-slate-400">{role}</p></div></div>
        <button type="button" aria-label="Fermer le menu" className="lg:hidden" onClick={() => setOpen(false)}><X /></button>
      </div>
      <div className={'border-b border-slate-100 px-4 py-4' + (collapsed ? ' lg:hidden' : '')}>
        <label htmlFor="admin-section-search" className="mb-2 block text-xs font-extrabold text-slate-500">Rechercher une rubrique</label>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-jso-blue">
          <Search size={17} className="text-slate-400" aria-hidden="true" />
          <input id="admin-section-search" ref={searchRef} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Dons, matchs, médias…" className="w-full bg-transparent py-2.5 text-sm outline-none" />
        </div>
        <p className="mt-2 text-xs text-slate-400">{filteredItems.length} rubrique{filteredItems.length > 1 ? 's' : ''} · Ctrl+K pour chercher</p>
      </div>
      <nav aria-label="Rubriques d’administration" className="jso-scroll flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
        {!search && <div className="space-y-1 border-b border-slate-100 pb-4">
          <p className={'px-4 pb-1 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400' + (collapsed ? ' lg:hidden' : '')}>Accès rapide</p>
          {quickItems.slice(0, 6).map(([id, label, Icon]) => <a key={id} href={adminSectionUrl(id)} onClick={(event) => navigate(event, id)} title={label} aria-current={section === id ? 'page' : undefined} className={'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold ' + (section === id ? 'bg-jso-navy text-white' : 'text-slate-600 hover:bg-slate-100') + (collapsed ? ' lg:justify-center lg:px-2' : '')}><Icon size={17} aria-hidden="true" /><span className={collapsed ? 'lg:hidden' : ''}>{label}</span>{pendingBySection[id] > 0 && <span className={'ml-auto rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-black text-white' + (collapsed ? ' lg:hidden' : '')}>{pendingBySection[id]}</span>}</a>)}
        </div>}
        {groupedItems.length === 0 && <p className="px-4 py-3 text-sm text-slate-500">Aucune rubrique trouvée.</p>}
        {groupedItems.map(([category, list]) => <div key={category} className="space-y-1">
          {collapsed
            ? <div aria-hidden="true" className="mx-3 hidden border-t border-slate-100 lg:block" />
            : <button type="button" aria-expanded={Boolean(search || (expandedCategories[category] ?? (currentItem?.[4] === category)))} onClick={() => setExpandedCategories((previous) => ({ ...previous, [category]: !(previous[category] ?? (currentItem?.[4] === category)) }))} className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-xs font-black text-jso-navy hover:bg-slate-100">
                <span>{category} <span className="font-semibold text-slate-400">({list.length})</span></span><ChevronDown size={16} className={'transition-transform ' + (search || (expandedCategories[category] ?? (currentItem?.[4] === category)) ? 'rotate-180' : '')} aria-hidden="true" />
              </button>}
          {(search || (expandedCategories[category] ?? (currentItem?.[4] === category))) && list.map(([id, label, Icon]) => <a key={id} href={adminSectionUrl(id)} onClick={(event) => navigate(event, id)} title={label} aria-current={section === id ? 'page' : undefined} className={'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition-colors ' + (section === id ? 'bg-jso-navy text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100') + (collapsed ? ' lg:justify-center lg:px-2' : '')}><Icon size={18} aria-hidden="true" /><span className={collapsed ? 'lg:hidden' : ''}>{label}</span>{pendingBySection[id] > 0 && <span className={'ml-auto rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-black text-white' + (collapsed ? ' lg:hidden' : '')}>{pendingBySection[id]}</span>}</a>)}
        </div>)}
      </nav>
      <div className="border-t border-slate-100 px-4 py-4">
        <div className={'flex gap-2 ' + (collapsed ? 'lg:flex-col' : '')}>
          <button type="button" onClick={toggleCollapsed} title={collapsed ? 'Développer le menu' : 'Réduire le menu'} aria-label={collapsed ? 'Développer le menu' : 'Réduire le menu'} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-600 hover:border-jso-blue">
            {collapsed ? <PanelLeftOpen size={17} aria-hidden="true" /> : <PanelLeftClose size={17} aria-hidden="true" />}
            <span className={collapsed ? 'lg:hidden' : ''}>{collapsed ? 'Développer' : 'Réduire'}</span>
          </button>
          <button type="button" onClick={onToggleTheme} title={dark ? 'Mode clair' : 'Mode sombre'} aria-label={dark ? 'Mode clair' : 'Mode sombre'} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-600 hover:border-jso-blue">
            {dark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
            <span className={collapsed ? 'lg:hidden' : ''}>{dark ? 'Clair' : 'Sombre'}</span>
          </button>
        </div>
        <button type="button" onClick={copyCurrentLink} title={copied ? 'Lien copié' : 'Copier le lien de cette rubrique'} className={'mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-jso-navy hover:bg-slate-100' + (collapsed ? ' lg:justify-center lg:px-2' : '')}><Copy size={18} aria-hidden="true" /><span className={collapsed ? 'lg:hidden' : ''}>{copied ? 'Lien copié' : 'Copier le lien de cette rubrique'}</span></button>
        <a href={publicPath} title="Voir sur le site" className={'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-jso-blue hover:bg-slate-100' + (collapsed ? ' lg:justify-center lg:px-2' : '')}><ExternalLink size={18} aria-hidden="true" /><span className={collapsed ? 'lg:hidden' : ''}>Voir sur le site</span></a>
        <button type="button" onClick={logout} title="Déconnexion" className={'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700' + (collapsed ? ' lg:justify-center lg:px-2' : '')}><LogOut size={18} aria-hidden="true" /><span className={collapsed ? 'lg:hidden' : ''}>Déconnexion</span></button>
      </div>
    </aside>
    <div className={collapsed ? 'lg:pl-20' : 'lg:pl-72'}>
      <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur-xl lg:px-8">
        <button type="button" aria-label="Ouvrir le menu" aria-controls="admin-sidebar" aria-expanded={open} className="lg:hidden" onClick={() => setOpen(true)}><Menu /></button>
        <div className="min-w-0 flex-1"><p className="text-xs font-extrabold tracking-[0.15em] text-jso-blue">ADMINISTRATION{currentItem && ` · ${currentItem[4].toUpperCase()}`}{currentItem && section !== 'dashboard' && ` · ${currentItem[1].toUpperCase()}`}</p><h1 className="truncate text-2xl font-black">{section === 'dashboard' ? 'Bonjour, ' + displayName : currentItem?.[1] || 'Rubrique introuvable'}</h1></div>
        <button type="button" onClick={copyCurrentLink} className="hidden items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-jso-navy hover:border-jso-blue sm:inline-flex"><Copy size={15} aria-hidden="true" />{copied ? 'Lien copié' : 'Copier le lien'}</button>
        <a href={publicPath} className="hidden items-center gap-2 rounded-full bg-jso-navy px-3 py-2 text-xs font-bold text-white hover:bg-jso-blue sm:inline-flex"><ExternalLink size={15} aria-hidden="true" />Voir sur le site</a>
      </header>
      <section className="mx-auto max-w-7xl p-5 lg:p-8">
        {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</div>}
        {!section && <div role="alert" className="rounded-[1.5rem] bg-white p-8 text-slate-600">Page admin introuvable. <a href="/admin" className="font-bold text-jso-blue underline">Ouvrir le tableau de bord</a></div>}
        {section && !visibleItems.some(([id]) => id === section) && <div role="alert" className="rounded-[1.5rem] bg-white p-8 text-slate-600">Accès refusé à cette section.</div>}
        {currentItem && section === 'dashboard' && <>
          <ActionCenter stats={stats} onNavigate={navigate} />
          <AdminQuickLinks items={visibleItems} quickItems={quickItems} onNavigate={navigate} />
          <DashboardStats stats={stats} loading={dashboardLoading} onRetry={loadDashboard} />
        </>}
        {currentItem && ActiveModule && <AdminModuleBoundary key={section}><Suspense fallback={<div role="status" className="rounded-[1.5rem] bg-white p-8 text-slate-500">Chargement de la rubrique…</div>}><ActiveModule onError={setError} /></Suspense></AdminModuleBoundary>}
      </section>
    </div>
    <nav aria-label="Navigation admin mobile" className="jso-admin-mobile-nav lg:hidden">
      <a href="/admin" onClick={(event) => navigate(event, 'dashboard')} aria-current={section === 'dashboard' ? 'page' : undefined}><LayoutDashboard size={20} aria-hidden="true" /><span>Accueil</span></a>
      <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="admin-sidebar"><Menu size={20} aria-hidden="true" /><span>Rubriques</span></button>
      <button type="button" onClick={openSearch}><Search size={20} aria-hidden="true" /><span>Chercher</span></button>
      <a href={publicPath}><ExternalLink size={20} aria-hidden="true" /><span>Voir le site</span></a>
    </nav>
    <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={visibleItems} onNavigate={paletteNavigate} />
  </main>
}

// Actionable home: what needs the admin's attention right now, each card
// linking straight to the section where the work gets done.
function ActionCenter({ stats, onNavigate }) {
  if (!stats) return null
  const tickets = stats.tickets || {}
  const sales = stats.sales || {}
  const matches = stats.matches || {}
  const moderation = stats.moderation || {}
  const items = [
    { section: 'tickets', count: tickets.pending ?? 0, label: 'réservations en attente', hint: 'Confirmez les billets vendus', Icon: Ticket },
    { section: 'orders', count: sales.pending ?? 0, label: 'commandes à traiter', hint: 'Préparez les commandes de la boutique', Icon: ShoppingBag },
    { section: 'tickets', count: matches.upcomingWithoutTickets ?? 0, label: 'matchs futurs sans billets', hint: 'Créez la billetterie de ces rencontres', Icon: Trophy },
    { section: 'community-moderation', count: (moderation.comments ?? 0) + (moderation.reports ?? 0), label: 'contenus à modérer', hint: 'Commentaires et signalements en file', Icon: MessageSquare },
    { section: 'fan-photos', count: moderation.fanPhotos ?? 0, label: 'photos à modérer', hint: 'Photos des supporters en attente', Icon: Images },
    { section: 'classifieds', count: moderation.classifieds ?? 0, label: 'annonces à modérer', hint: 'Petites annonces en attente', Icon: Megaphone },
    { section: 'supporters', count: moderation.supporters ?? 0, label: 'briques à confirmer', hint: 'Paiements du mur des supporters', Icon: BrickWall },
  ].filter((item) => item.count > 0)

  return (
    <section aria-labelledby="admin-action-center" className="mb-8">
      <h2 id="admin-action-center" className="mb-3 text-lg font-black">À traiter</h2>
      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold text-emerald-800">
          <CheckCircle2 size={20} className="shrink-0 text-emerald-600" aria-hidden="true" />
          Rien à traiter : tout est à jour.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map(({ section, count, label, hint, Icon }, index) => (
            <a key={index} href={adminSectionUrl(section)} onClick={(event) => onNavigate(event, section)}
              className="group flex items-center gap-4 rounded-2xl border border-red-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-red-400 hover:shadow-md">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-100 text-red-700">
                <Icon size={22} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-2xl font-black text-red-700">{count}</span>
                <span className="block text-sm font-black text-slate-800">{label}</span>
                <span className="mt-0.5 block text-xs font-semibold text-slate-500">{hint}</span>
              </span>
              <ArrowUpRight size={18} className="shrink-0 text-slate-300 transition group-hover:text-red-600" aria-hidden="true" />
            </a>
          ))}
        </div>
      )}
    </section>
  )
}

function AdminQuickLinks({ items, quickItems, onNavigate }) {
  const groups = ADMIN_CATEGORY_ORDER.filter((category) => category !== 'Tableau de bord')
    .map((category) => [category, items.filter((item) => item[4] === category).slice(0, 3)])
    .filter(([, links]) => links.length > 0)

  return <section aria-labelledby="admin-quick-links" className="mb-8">
    <h2 id="admin-quick-links" className="mb-3 text-lg font-black">Accès rapide</h2>
    <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
      {quickItems.map(([id, label, Icon]) => <a key={id} href={adminSectionUrl(id)} onClick={(event) => onNavigate(event, id)} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-jso-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-jso-blue"><Icon size={16} aria-hidden="true" />{label}</a>)}
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map(([category, links]) => <div key={category} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-jso-blue">{category}</h3>
        <div className="space-y-1">{links.map(([id, label, Icon]) => <a key={id} href={adminSectionUrl(id)} onClick={(event) => onNavigate(event, id)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-jso-ink hover:bg-slate-100"><Icon size={16} aria-hidden="true" />{label}</a>)}</div>
      </div>)}
    </div>
  </section>
}

// 30-day stacked revenue bars (billetterie / boutique / abonnements) drawn in
// pure CSS: no chart dependency, tooltips carry the exact daily figures.
function RevenueChart({ series, money }) {
  const days = Array.isArray(series) ? series : []
  const totals = days.map((d) => (d.tickets || 0) + (d.shop || 0) + (d.memberships || 0))
  const max = Math.max(1, ...totals)
  const total = totals.reduce((n, v) => n + v, 0)
  if (!days.length) return null
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">Revenus · 30 derniers jours</h2>
        <p className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-black text-jso-navy">{money(total)}</p>
      </div>
      <div className="mt-5 flex h-44 items-stretch gap-[3px]">
        {days.map((d, i) => {
          const t = d.tickets || 0
          const s = d.shop || 0
          const m = d.memberships || 0
          const dayTotal = t + s + m
          const dayLabel = new Date(d.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
          return (
            <div key={d.date || i} title={`${dayLabel} · ${money(dayTotal)}\nBilletterie ${money(t)} · Boutique ${money(s)} · Abonnements ${money(m)}`} className="flex min-w-0 flex-1 cursor-default flex-col justify-end gap-px">
              {dayTotal === 0 ? <div className="w-full rounded-sm bg-slate-100" style={{ height: '3%' }} /> : <>
                {m > 0 && <div className="w-full rounded-t-sm bg-jso-blue" style={{ height: `${(m / max) * 100}%` }} />}
                {s > 0 && <div className="w-full bg-jso-gold" style={{ height: `${(s / max) * 100}%` }} />}
                {t > 0 && <div className="w-full rounded-b-sm bg-jso-navy" style={{ height: `${(t / max) * 100}%` }} />}
              </>}
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-jso-navy" aria-hidden="true"/>Billetterie</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-jso-gold" aria-hidden="true"/>Boutique</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-jso-blue" aria-hidden="true"/>Abonnements</span>
      </div>
    </div>
  )
}

function DashboardStats({ stats, loading, onRetry }) {
  if (!stats) return <div className="rounded-[1.5rem] bg-white p-8 text-slate-500">
    <p>{loading ? 'Chargement du tableau de bord…' : 'Les statistiques sont momentanément indisponibles. Les rubriques restent accessibles.'}</p>
    {!loading && <button type="button" onClick={onRetry} className="mt-3 text-sm font-bold text-jso-blue underline">Réessayer</button>}
  </div>

  const sales = stats.sales || { enabled: false, currency: 'TND', revenue: 0, orders: 0, activeProducts: 0, productsSold: 0 }
  const tickets = stats.tickets || { currency: 'TND', revenue: 0, orders: 0, ticketsSold: 0, pending: 0 }
  const memberships = stats.memberships || { currency: 'TND', revenue: 0, active: 0, total: 0 }
  const matches = stats.matches || {}
  const news = stats.news || {}
  const money = (n, c = 'TND') => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c || 'TND', maximumFractionDigits: 0 }).format(n || 0)
  const totalRevenue = (tickets.revenue || 0) + (memberships.revenue || 0) + (sales.revenue || 0)

  // The three revenue engines, revenue-first.
  const revenueCards = [
    { key: 'tickets', label: 'Billetterie', Icon: Ticket, revenue: tickets.revenue, sub: `${tickets.ticketsSold ?? 0} billets · ${tickets.pending ?? 0} en attente`, cls: 'bg-jso-navy text-white', accent: 'text-jso-gold' },
    { key: 'memberships', label: 'Abonnements', Icon: CreditCard, revenue: memberships.revenue, sub: `${memberships.active ?? 0} abonnés actifs`, cls: 'bg-jso-blue text-white', accent: 'text-white/85' },
    { key: 'shop', label: 'Boutique', Icon: ShoppingBag, revenue: sales.revenue, sub: `${sales.orders ?? 0} commandes · ${sales.productsSold ?? 0} produits`, cls: 'bg-jso-gold text-jso-navy', accent: 'text-jso-navy/70' },
  ]

  const clubCards = [
    ['Parties à venir', matches.upcoming ?? 0, Trophy], ['Résultats', matches.finished ?? 0, Trophy],
    ['News publiées', news.published ?? 0, Newspaper], ['Brouillons', news.drafts ?? 0, Newspaper],
    ['Équipes', stats.teams ?? 0, Users], ['Joueurs actifs', stats.players ?? 0, Users],
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

    {/* 30-day revenue chart */}
    <RevenueChart series={stats.revenueSeries} money={money} />

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
  // Theme persisted per device: the whole back office (shell + modules +
  // floating UI) is wrapped in .admin-dark, which remaps the neutral palette.
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('jso_admin_theme') === 'dark' } catch { return false } })
  function toggleTheme() {
    setDark((current) => {
      const next = !current
      try { localStorage.setItem('jso_admin_theme', next ? 'dark' : 'light') } catch { /* private mode */ }
      return next
    })
  }
  useEffect(() => {
    const onSessionExpired = () => {
      setUser(null)
      window.JsoAdminBridge?.postMessage('logout')
    }
    window.addEventListener('jso:admin-session-expired', onSessionExpired)
    return () => window.removeEventListener('jso:admin-session-expired', onSessionExpired)
  }, [])
  return user
    ? <div className={dark ? 'admin-dark' : ''}><ToastProvider><ConfirmProvider><AdminDashboard user={user} dark={dark} onToggleTheme={toggleTheme} onLogout={()=>setUser(null)}/></ConfirmProvider></ToastProvider></div>
    : <Login onLogin={setUser}/>
}
