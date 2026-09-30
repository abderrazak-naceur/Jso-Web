import { useEffect, useState } from 'react'
import { LogOut, Menu, X } from 'lucide-react'
import { API_BASE_URL, getConfiguredApiBaseUrl, getDefaultApiBaseUrl, setApiBaseUrl, resetApiBaseUrl } from '../lib/apiConfig'
import VolunteersModule from './Volunteers'
import NewsletterModule from './Newsletter'
import ArchiveModule from './Archive'
import InjuriesModule from './Injuries'
import SupportersModule from './Supporters'
import EditorialCalendarModule from './EditorialCalendar'
import ChecklistModule from './Checklist'
import ClassifiedsModule from './Classifieds'
import FanPhotosModule from './FanPhotos'
import CommunityModule from './Community'
import FacilitiesModule from './Facilities'
import ScoutingModule from './Scouting'
import FeatureFlagsModule from './FeatureFlags'
import AnniversariesModule from './Anniversaries'
import ApiUsageModule from './ApiUsage'
import GdprModule from './Gdpr'
import SponsorQrModule from './SponsorQr'
import CommunityProgramsModule from './CommunityPrograms'
import OrdersModule from './Orders'
import ClubEventsModule from './ClubEvents'
import DocumentsModule from './Documents'
import FaqModule from './Faq'
import TicketsModule from './Tickets'
import HomepageBuilderModule from './HomepageBuilder'
import SeasonsCompetitionsModule from './SeasonsCompetitions'
import MembershipsModule from './Memberships'
import MatchStreamsModule from './MatchStreams'
import FinanceModule from './Finance'
import { adminApi } from './api'
import ContentModule from './content/ContentModule'
import { ADMIN_NAVIGATION, ADMIN_CATEGORY_ORDER } from './navigation'
import ClubSettingsModule from './club/ClubSettingsModule'
import SecurityModule from './system/SecurityModule'
import MediaModule from './content/MediaModule'
import EventsModule from './content/EventsModule'
import FormationsModule from './sport/FormationsModule'
import MatchSheetModule from './sport/MatchSheetModule'
import SettingsModule from './system/SettingsModule'
import TeamsModule from './sport/TeamsModule'
import MatchesModule from './sport/MatchesModule'
import NewsModule from './content/NewsModule'
import ShopModule from './commerce/ShopModule'
import SponsorsModule from './commerce/SponsorsModule'

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
    </form>
  </main>
}


function AdminDashboard({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  // Menu items grouped into premium categories. Format:
  // [id, label, Icon, [roles], category]. The sidebar renders one section per
  // category (in CATEGORY_ORDER) with a heading, instead of a long flat list.
  // Revenue-first: "Billetterie & Abonnements" and "Boutique" sit near the top.
  // Note: the former duplicate id 'events' is split into 'match-events'
  // (match calendar) and 'club-events' (club agenda) to avoid double rendering.
  const role = user.role ?? user.Role
  const displayName = user.displayName ?? user.DisplayName
  const visibleItems = ADMIN_NAVIGATION.filter(([, , , roles]) => roles.includes(role))
  // Group the visible items by category, preserving CATEGORY_ORDER and dropping
  // empty groups (e.g. a role with no items in a category).
  const groupedItems = ADMIN_CATEGORY_ORDER
    .map((category) => [category, visibleItems.filter((item) => item[4] === category)])
    .filter(([, list]) => list.length > 0)

  async function loadDashboard() {
    try { setStats(await adminApi('/admin/dashboard')); setError('') } catch (e) { setError(e.message) }
  }
  useEffect(() => { if (section === 'dashboard') loadDashboard() }, [section])

  function navigate(next) { setSection(next); setOpen(false); setError('') }

  function logout() {
    localStorage.removeItem('jso_admin_token')
    localStorage.removeItem('jso_admin_user')
    onLogout()
  }

  return <main className="min-h-screen bg-jso-paper text-jso-ink">
    <aside className={'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform ' + (open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-jso-navy font-black text-jso-gold">JSO</span><div><p className="font-black">JSO Admin</p><p className="text-xs text-slate-400">{role}</p></div></div><button className="lg:hidden" onClick={() => setOpen(false)}><X /></button></div>
      <nav className="jso-scroll flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">{groupedItems.map(([category, list]) => <div key={category} className="space-y-1"><p className="px-4 pb-1 pt-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{category}</p>{list.map(([id,label,Icon]) => <button key={id} onClick={() => navigate(id)} className={'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition-colors ' + (section === id ? 'bg-jso-navy text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100')}><Icon size={18}/>{label}</button>)}</div>)}</nav>
      <div className="border-t border-slate-100 px-4 py-4"><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700"><LogOut size={18}/>Déconnexion</button></div>
    </aside>
    <div className="lg:pl-72">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur-xl lg:px-8">
        <button className="lg:hidden" onClick={() => setOpen(true)}><Menu /></button>
        <div><p className="text-xs font-extrabold tracking-[0.2em] text-jso-blue">COMMAND CENTER</p><h1 className="text-2xl font-black">{section === 'dashboard' ? 'Bonjour, ' + displayName : visibleItems.find(x => x[0] === section)?.[1]}</h1></div>
        <span className="hidden rounded-full bg-jso-gold/20 px-3 py-2 text-xs font-extrabold text-jso-navy sm:block">{role}</span>
      </header>
      <section className="mx-auto max-w-7xl p-5 lg:p-8">
        {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</div>}
        {section === 'dashboard' && <DashboardStats stats={stats}/>}
        {section === 'club' && <ClubSettingsModule onError={setError}/>}
        {section === 'teams' && <TeamsModule onError={setError}/>}
        {section === 'matches' && <MatchesModule onError={setError}/>}
        {section === 'seasons-competitions' && <SeasonsCompetitionsModule onError={setError}/>}
        {section === 'match-events' && <EventsModule onError={setError}/>}
        {section === 'formations' && <FormationsModule onError={setError}/>}
        {section === 'match-sheet' && <MatchSheetModule onError={setError}/>}
        {section === 'news' && <NewsModule onError={setError}/>}
        {section === 'security' && <SecurityModule onError={setError}/>}
        {section === 'media' && <MediaModule onError={setError}/>}
        {section === 'content' && <ContentModule onError={setError}/>}
        {section === 'homepage' && <HomepageBuilderModule onError={setError}/>}
        {section === 'sponsors' && <SponsorsModule onError={setError}/>}
        {section === 'sponsorqr' && <SponsorQrModule onError={setError}/>}
        {section === 'shop' && <ShopModule onError={setError}/>}
        {section === 'orders' && <OrdersModule onError={setError}/>}
        {section === 'tickets' && <TicketsModule onError={setError}/>}
        {section === 'memberships' && <MembershipsModule onError={setError}/>}
        {section === 'match-streams' && <MatchStreamsModule onError={setError}/>}
        {section === 'analytics' && <AnalyticsModule onError={setError}/>}
        {section === 'finance' && <FinanceModule onError={setError}/>}
        {section === 'volunteers' && <VolunteersModule onError={setError}/>}
        {section === 'newsletter' && <NewsletterModule onError={setError}/>}
        {section === 'archive' && <ArchiveModule onError={setError}/>}
        {section === 'injuries' && <InjuriesModule onError={setError}/>}
        {section === 'supporters' && <SupportersModule onError={setError}/>}
        {section === 'anniversaries' && <AnniversariesModule onError={setError}/>}
        {section === 'editorial' && <EditorialCalendarModule onError={setError}/>}
        {section === 'checklist' && <ChecklistModule onError={setError}/>}
        {section === 'classifieds' && <ClassifiedsModule onError={setError}/>}
        {section === 'fan-photos' && <FanPhotosModule onError={setError}/>}
        {section === 'community-moderation' && <CommunityModule onError={setError}/>}
        {section === 'facilities' && <FacilitiesModule onError={setError}/>}
        {section === 'scouting' && <ScoutingModule onError={setError}/>}
        {section === 'community' && <CommunityProgramsModule onError={setError}/>}
        {section === 'featureflags' && <FeatureFlagsModule onError={setError}/>}
        {section === 'apiusage' && <ApiUsageModule onError={setError}/>}
        {section === 'gdpr' && <GdprModule onError={setError}/>}
        {section === 'club-events' && <ClubEventsModule onError={setError}/>}
        {section === 'documents' && <DocumentsModule onError={setError}/>}
        {section === 'faq' && <FaqModule onError={setError}/>}
        {section === 'settings' && <SettingsModule/>}
      </section>
    </div>
  </main>
}

// Premium admin command center: a revenue hero, three sales KPIs
// (Billetterie / Abonnements / Boutique), quick on/off toggles for the public
// home sections, plus today's activity and the recent audit feed.
function DashboardStats({ stats }) {
  const [sections, setSections] = useState([])
  const [toggleError, setToggleError] = useState('')

  useEffect(() => {
    let active = true
    adminApi('/admin/home-visibility')
      .then((v) => { if (active) setSections(v) })
      .catch(() => { if (active) setSections([]) })
    return () => { active = false }
  }, [])

  async function toggleSection(id) {
    const next = sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    setSections(next)
    try {
      await adminApi('/admin/home-visibility', { method: 'PUT', body: JSON.stringify({ hidden: next.filter((s) => !s.enabled).map((s) => s.id) }) })
      setToggleError('')
    } catch (e) {
      setToggleError(e.message)
      try { setSections(await adminApi('/admin/home-visibility')) } catch { /* keep optimistic state */ }
    }
  }

  if (!stats) return <div className="rounded-[1.5rem] bg-white p-8 text-slate-500">Chargement du dashboard…</div>

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

    {/* Home section quick toggles */}
    {sections.length > 0 && (
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Sections de la page d’accueil</h2>
        <p className="mt-1 text-sm text-slate-500">Activez ou masquez chaque section du site public.</p>
        {toggleError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{toggleError}</p>}
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((s) => (
            <button key={s.id} type="button" onClick={() => toggleSection(s.id)} aria-pressed={s.enabled} className={'flex items-center justify-between rounded-xl border p-3 text-left transition ' + (s.enabled ? 'border-jso-blue/40 bg-jso-blue/5' : 'border-slate-200 bg-slate-50')}>
              <span className="flex items-center gap-2 font-bold text-jso-ink">{s.enabled ? <Eye size={16} className="text-jso-blue"/> : <EyeOff size={16} className="text-slate-400"/>}{s.label}</span>
              <span className={'relative h-6 w-11 shrink-0 rounded-full transition ' + (s.enabled ? 'bg-jso-blue' : 'bg-slate-300')}><span className={'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ' + (s.enabled ? 'left-[22px]' : 'left-0.5')} /></span>
            </button>
          ))}
        </div>
      </div>
    )}

    {/* Club figures */}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {clubCards.map(([label,value,Icon]) => <div key={label} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"><Icon className="text-jso-blue" size={22}/><p className="mt-7 text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 text-4xl font-black">{value}</p></div>)}
    </div>

    {today && <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Activité du jour</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{todayFigures.map(([label,value]) => <div key={label} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="font-semibold text-slate-500">{label}</p><p className="mt-1 text-3xl font-black">{value ?? 0}</p></div>)}</div></div>}

    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Activité récente</h2><div className="mt-4 space-y-2">{recent.length ? recent.map(a => <div key={a.id} className="rounded-xl bg-slate-50 p-3 text-sm"><div className="flex justify-between gap-3"><b>{a.action} · {a.entityType}</b><span className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString('fr-FR')}</span></div><p className="mt-1 text-xs text-slate-500">{a.userEmail || 'Système'}{a.entityId ? ' · ' + a.entityId : ''}</p></div>) : <p className="text-sm text-slate-500">Aucune activité récente.</p>}</div></div>
  </div>
}

function AnalyticsModule({ onError }) {
  const [teams, setTeams] = useState([])
  const [teamId, setTeamId] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  async function loadTeams() {
    try { const data = await adminApi('/admin/teams'); setTeams(data); if (data[0]) select(data[0].id) }
    catch (e) { onError(e.message) }
  }
  async function select(id) {
    setTeamId(id)
    setLoading(true)
    try { const data = await adminApi('/admin/teams/' + id + '/analytics'); setRows(data.players || []); onError('') }
    catch (e) { onError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { loadTeams() }, [])

  return <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="text-xl font-black">Analytics joueurs</h2>
      <select value={teamId} onChange={e => select(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-jso-blue">
        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </div>
    <p className="mt-2 text-xs text-slate-400">Statistiche derivate da presenze (compositions) ed eventi partita.</p>
    <div className="mt-5 overflow-x-auto">
      {loading ? <p className="text-sm text-slate-400">Chargement…</p>
        : rows.length === 0 ? <p className="text-sm text-slate-400">Aucune donnée de match pour cette équipe.</p>
        : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">#</th><th className="p-2">Joueur</th><th className="p-2">Présences</th><th className="p-2">Buts</th><th className="p-2">🟨</th><th className="p-2">🟥</th></tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-b last:border-0"><td className="p-2 font-black">{r.shirtNumber ?? '—'}</td><td className="p-2 font-bold">{r.name}</td><td className="p-2">{r.appearances}</td><td className="p-2 font-bold text-jso-blue">{r.goals}</td><td className="p-2">{r.yellowCards}</td><td className="p-2">{r.redCards}</td></tr>)}</tbody></table>}
    </div>
  </div>
}


export default function AdminApp() {
  const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('jso_admin_user')||'null')}catch{return null}})
  return user ? <AdminDashboard user={user} onLogout={()=>setUser(null)}/> : <Login onLogin={setUser}/>
}

