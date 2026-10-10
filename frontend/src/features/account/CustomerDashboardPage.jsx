import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, CheckCircle2, CircleAlert, Clock3, Download, LogIn, Package, RefreshCw, ShieldCheck, Ticket, UserRound, X, LayoutDashboard, Crown, ShoppingBag, Settings, LogOut, Menu, ChevronDown, ChevronRight } from 'lucide-react'
import { membershipApi, shopOrderApi, ticketApi } from '../../lib/api'
import { useFanSession } from './useFanSession'
import AuthModal from './AuthModal'
import StandalonePageHeader from '../site/StandalonePageHeader'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import './CustomerDashboardPage.css'

const value = (item, ...keys) => {
  for (const key of keys) if (item?.[key] !== undefined && item?.[key] !== null) return item[key]
  return undefined
}
const idOf = (item) => value(item, 'id', 'Id', 'ticketId', 'TicketId', 'orderId', 'OrderId', 'membershipId', 'MembershipId')
const listOf = (data) => Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.Items) ? data.Items : Array.isArray(data?.data) ? data.data : Array.isArray(data?.Data) ? data.Data : []
const dateOf = (item, ...keys) => {
  const raw = value(item, ...keys)
  if (!raw) return '—'
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? String(raw) : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
const moneyOf = (item) => {
  const amount = value(item, 'total', 'Total', 'totalAmount', 'TotalAmount', 'amount', 'Amount', 'price', 'Price')
  if (amount === undefined) return null
  const currency = value(item, 'currency', 'Currency') || 'TND'
  try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(Number(amount)) } catch { return String(amount) }
}
const statusOf = (item) => String(value(item, 'status', 'Status', 'paymentStatus', 'PaymentStatus') || '—')
const prettyStatus = (status) => ({
  Paid: 'Payé', Confirmed: 'Confirmé', Active: 'Actif', Pending: 'En attente',
  Cancelled: 'Annulé', Failed: 'Échoué', Expired: 'Expiré', Used: 'Utilisé',
}[status] || status)
const statusClass = (status) => ['Paid', 'Confirmed', 'Active', 'Used'].includes(status)
  ? 'bg-emerald-50 text-emerald-700'
  : ['Pending', 'Created', 'Processing'].includes(status)
    ? 'bg-amber-50 text-amber-700'
    : ['Cancelled', 'Failed', 'Expired', 'Rejected'].includes(status)
      ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'

function SectionHeading({ eyebrow, title, count, icon: Icon }) {
  return <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-jso-navy text-jso-gold"><Icon size={20} aria-hidden="true" /></span><div><p className="text-xs font-extrabold tracking-[0.16em] text-jso-blue">{eyebrow}</p><h2 className="mt-1 text-xl font-black sm:text-2xl">{title}</h2></div></div>{count !== undefined && <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-extrabold text-slate-600">{count}</span>}</div>
}

function EmptyState({ title, detail }) {
  return <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center"><p className="font-extrabold text-jso-ink">{title}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></div>
}

function DataError({ message, onRetry }) {
  return <div role="alert" className="mt-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"><span className="inline-flex items-start gap-2"><CircleAlert size={18} className="mt-0.5 shrink-0" />{message}</span><button type="button" onClick={onRetry} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 font-bold hover:bg-amber-100"><RefreshCw size={15} /> Réessayer</button></div>
}



export default function CustomerDashboardPage() {
  const fan = useFanSession()
  const [authOpen, setAuthOpen] = useState(false)
  const [reload, setReload] = useState(0)
  const [data, setData] = useState({
    tickets: { status: 'loading', items: [] },
    orders: { status: 'loading', items: [] },
    memberships: { status: 'loading', items: [] },
  })
  const [digital, setDigital] = useState({})
  const [digitalBusy, setDigitalBusy] = useState({})
  const [digitalErrors, setDigitalErrors] = useState({})
  useDocumentTitle('La mia area')

  useEffect(() => {
    if (fan.status !== 'authenticated' || !fan.token) return
    let active = true
    Promise.allSettled([ticketApi.mine(fan.token), shopOrderApi.myOrders(fan.token), membershipApi.mine(fan.token)]).then((tasks) => {
      if (!active) return
      const names = ['tickets', 'orders', 'memberships']
      setData(Object.fromEntries(names.map((name, index) => {
        const result = tasks[index]
        return [name, result.status === 'fulfilled' ? { status: 'ready', items: listOf(result.value) } : { status: 'error', items: [], message: result.reason?.message || 'Service temporairement indisponible.' }]
      })))
    })
    return () => { active = false }
  }, [fan.status, fan.token, reload])

  async function showDigital(ticket) {
    const id = idOf(ticket)
    if (!id) return
    setDigitalBusy((state) => ({ ...state, [id]: true }))
    setDigitalErrors((state) => ({ ...state, [id]: '' }))
    try {
      const result = await ticketApi.digital(id, fan.token)
      setDigital((state) => ({ ...state, [id]: result }))
    } catch (error) {
      setDigitalErrors((state) => ({ ...state, [id]: error?.message || 'Billet numérique indisponible. Vérifiez que le paiement est confirmé.' }))
    } finally {
      setDigitalBusy((state) => ({ ...state, [id]: false }))
    }
  }

  if (fan.status === 'unknown') return <div className="min-h-screen bg-jso-paper"><StandalonePageHeader /><main className="mx-auto max-w-5xl px-5 py-20 text-center"><p className="font-bold text-slate-500">Vérification de votre session…</p></main></div>

  if (fan.status !== 'authenticated' || !fan.token) {
    return <div className="min-h-screen bg-jso-paper text-jso-ink">
      <StandalonePageHeader />
      <main className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
        <a href="/" className="inline-flex items-center gap-2 text-sm font-extrabold text-jso-blue"><ArrowLeft size={16} /> Retour au site</a>
        <section className="mt-8 overflow-hidden rounded-[2rem] bg-jso-navy p-8 text-white shadow-xl sm:p-12">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-jso-gold"><ShieldCheck size={28} /></span>
          <p className="mt-6 text-xs font-extrabold tracking-[0.2em] text-jso-gold">ESPACE SUPPORTER</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Votre espace personnel</h1>
          <p className="mt-4 max-w-xl leading-7 text-white/70">Retrouvez vos billets, vos abonnements et vos commandes dans un seul endroit sécurisé.</p>
          <button type="button" onClick={() => setAuthOpen(true)} className="mt-7 inline-flex items-center gap-2 rounded-full bg-jso-gold px-6 py-3 font-extrabold text-jso-navy hover:bg-white"><LogIn size={18} /> Se connecter</button>
          <p className="mt-4 text-sm text-white/55">Vous n’avez pas encore de compte ? Ouvrez la connexion puis choisissez « Créer un compte ».</p>
        </section>
      </main>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthenticated={(result) => { fan.signIn(result); setAuthOpen(false) }} />
    </div>
  }

  const ticketItems = data.tickets.items
  const orderItems = data.orders.items
  const membershipItems = data.memberships.items
  const allLoading = [data.tickets, data.orders, data.memberships].every((item) => item.status === 'loading')
  const nextTicket = ticketItems[0]
  const nextTicketId = nextTicket ? idOf(nextTicket) : null
  const nextDigital = nextTicketId ? digital[nextTicketId] : null
  const nextQr = value(nextDigital, 'qrCodeDataUrl', 'QrCodeDataUrl', 'qrCodeUrl', 'QrCodeUrl', 'qrCode', 'QrCode', 'imageDataUrl', 'ImageDataUrl')
  const nextQrImage = typeof nextQr === 'string' && (nextQr.startsWith('data:image/') || /^https:\/\//i.test(nextQr))
  const activeMembership = membershipItems.find((item) => ['Active', 'Confirmed', 'Paid'].includes(statusOf(item))) || membershipItems[0]
  const recentOrders = orderItems.slice(0, 3)
  const displayName = fan.user?.displayName || fan.user?.fullName || fan.user?.name || fan.user?.email?.split('@')[0] || 'Supporter'
  const initials = displayName.split(/[\\s._-]+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'JS'
  const jumpTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    document.getElementById('jso-mobile-sidebar')?.classList.remove('is-open')
  }
  function NavItem({ icon: Icon, label, href, active = false, onClick }) {
    const classes = "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition " + (active ? 'bg-blue-600 text-white shadow-md' : 'text-white/75 hover:bg-white/10 hover:text-white')
    return onClick
      ? <button type="button" onClick={onClick} className={classes}><Icon size={18} aria-hidden="true" /><span>{label}</span></button>
      : <a href={href} aria-current={active ? 'page' : undefined} className={classes}><Icon size={18} aria-hidden="true" /><span>{label}</span></a>
  }
  const sidebar = <aside className="jso-dashboard-sidebar">
    <a href="/" className="jso-brand-lockup" aria-label="JSO, accueil"><img src="/JSO-crest-regenerated-ok.png" alt="" /><span><strong>JSO</strong><small>FOOTBALL CLUB</small></span></a>
    <nav aria-label="Navigazione area supporter" className="jso-sidebar-nav">
      <NavItem icon={LayoutDashboard} label="Mon espace" href="/mon-espace" active />
      <NavItem icon={Ticket} label="Mes billets" href="#mes-billets" onClick={() => jumpTo('mes-billets')} />
      <NavItem icon={Crown} label="Mes abonnements" href="#mes-abonnements" onClick={() => jumpTo('mes-abonnements')} />
      <NavItem icon={ShoppingBag} label="Mes commandes" href="#mes-commandes" onClick={() => jumpTo('mes-commandes')} />
      <NavItem icon={UserRound} label="Mon profil" onClick={() => setAuthOpen(true)} />
      <NavItem icon={Settings} label="Paramètres" onClick={() => setAuthOpen(true)} />
      <NavItem icon={LogOut} label="Se déconnecter" onClick={fan.signOut} />
    </nav>
    <div className="jso-sidebar-art" aria-hidden="true"><span>Plus qu’un club</span><em>Une famille</em></div>
    <div className="jso-sidebar-foot">JSO · Ensemble vers la victoire</div>
  </aside>

  return <div className="jso-account-page min-h-screen bg-jso-paper text-jso-ink">
    {sidebar}
    <div className="jso-dashboard-shell">
      <header className="jso-dashboard-topbar">
        <button type="button" className="jso-mobile-menu" aria-label="Afficher le menu supporter" onClick={() => document.getElementById('jso-mobile-sidebar')?.classList.toggle('is-open')}><Menu size={21} /></button>
        <a href="/" className="jso-mobile-brand"><img src="/JSO-crest-regenerated-ok.png" alt="" /><strong>JSO</strong><small>FOOTBALL CLUB</small></a>
        <nav className="jso-top-links" aria-label="Navigation principale"><a href="/">Accueil</a><a href="/matchs">Matches</a><a href="/billetterie">Billetterie</a><a href="/abonnements">Abonnements</a><a href="/boutique">Boutique</a><a href="/actualites">Actualités</a></nav>
        <div className="jso-top-user"><span className="jso-notification-dot" aria-label="Notifications">♧</span><span className="jso-avatar" aria-label={displayName}>{initials}</span><span className="jso-top-user-name">{displayName}</span><ChevronDown size={15} aria-hidden="true" /></div>
      </header>
      <main id="main-content" tabIndex={-1} className="jso-dashboard-main">
        <div className="jso-welcome"><div><p className="jso-eyebrow">ESPACE SUPPORTER</p><h1>Bonjour {displayName},</h1><p className="jso-welcome-subtitle">Bienvenue dans votre espace personnel.</p><p className="jso-welcome-copy">Retrouvez ici tous vos billets, abonnements, commandes et informations.</p></div><div className="jso-welcome-actions"><button type="button" onClick={() => setReload((n) => n + 1)}><RefreshCw size={16} /> Actualiser</button></div></div>
        <div className="jso-dashboard-kpis" aria-label="Résumé de votre compte">
          <article className="jso-kpi-card"><span className="jso-kpi-icon"><Ticket size={23} /></span><div><span className="jso-kpi-label">Mes billets</span><strong>{data.tickets.status === 'ready' ? ticketItems.length : '—'}</strong><small>{ticketItems.length ? 'Votre prochain match' : 'Vos billets apparaîtront ici'}</small></div><ChevronRight size={18} className="jso-kpi-arrow" /></article>
          <article className="jso-kpi-card jso-kpi-gold"><span className="jso-kpi-icon"><Crown size={23} /></span><div><span className="jso-kpi-label">Mon abonnement</span><strong className="jso-kpi-word">{activeMembership ? 'Actif' : '—'}</strong><small>{value(activeMembership, 'planName', 'PlanName', 'name', 'Name') || 'Saison 2026/27'}</small></div><ChevronRight size={18} className="jso-kpi-arrow" /></article>
          <article className="jso-kpi-card"><span className="jso-kpi-icon"><ShoppingBag size={23} /></span><div><span className="jso-kpi-label">Mes commandes</span><strong>{data.orders.status === 'ready' ? orderItems.length : '—'}</strong><small>{recentOrders[0] ? dateOf(recentOrders[0], 'createdAt', 'CreatedAt', 'orderDate', 'OrderDate') : 'Vos achats JSO'}</small></div><ChevronRight size={18} className="jso-kpi-arrow" /></article>
        </div>
        <div className="jso-dashboard-panels">
          <section className="jso-panel jso-next-match" id="mes-billets">
            <div className="jso-panel-heading"><div><span className="jso-panel-eyebrow">BILLETTERIE</span><h2>Prochain match</h2></div><a href="/matchs">Voir tous les matchs <ChevronRight size={14} /></a></div>
            {data.tickets.status === 'error' ? <DataError message={data.tickets.message} onRetry={() => setReload((n) => n + 1)} /> : data.tickets.status === 'loading' ? <p className="jso-muted">Chargement des billets…</p> : nextTicket ? <div className="jso-match-ticket">
              <div className="jso-match-banner"><img src="/JSO-crest-regenerated-ok.png" alt="JSO" className="jso-match-crest" /><div className="jso-match-info"><p>{value(nextTicket, 'competitionName', 'CompetitionName', 'matchTitle', 'MatchTitle', 'matchName', 'MatchName', 'opponentName', 'OpponentName', 'ticketTypeName', 'TicketTypeName') || 'Match JSO'}</p><h3>JSO <span>vs</span> {value(nextTicket, 'opponentName', 'OpponentName') || 'Adversaire'}</h3><small><CalendarDays size={13} /> {dateOf(nextTicket, 'kickoffAt', 'KickoffAt', 'createdAt', 'CreatedAt', 'purchaseDate', 'PurchaseDate')} · {value(nextTicket, 'venue', 'Venue') || 'Stade Municipal'}</small></div></div>
              <div className="jso-ticket-details"><span><small>Tribune</small><strong>{value(nextTicket, 'standName', 'StandName', 'tribune', 'Tribune') || '—'}</strong></span><span><small>Rang</small><strong>{value(nextTicket, 'row', 'Row', 'rank', 'Rank') || '—'}</strong></span><span><small>Siège</small><strong>{value(nextTicket, 'seat', 'Seat') || '—'}</strong></span>{nextQrImage && <img className="jso-ticket-qr" src={nextQr} alt="QR code du billet" />}</div>
              <div className="jso-ticket-actions"><span className={'jso-status-pill ' + (['Confirmed', 'Paid', 'Active'].includes(statusOf(nextTicket)) ? 'is-ok' : '')}><CheckCircle2 size={14} /> {prettyStatus(statusOf(nextTicket))}</span><button type="button" onClick={() => showDigital(nextTicket)} disabled={!nextTicketId || Boolean(digitalBusy[nextTicketId])}>{digitalBusy[nextTicketId] ? 'Chargement…' : <><Ticket size={15} /> Voir mon billet</>}</button></div>
              {digitalErrors[nextTicketId] && <p role="alert" className="jso-dashboard-error">{digitalErrors[nextTicketId]}</p>}
              {nextDigital && <div className="jso-ticket-extra"><p>Billet numérique</p>{nextQrImage && <a href={nextQr} download={'jso-ticket-' + nextTicketId + '.png'}><Download size={14} /> Télécharger le billet</a>}<button type="button" onClick={() => setDigital((state) => { const next = { ...state }; delete next[nextTicketId]; return next })}>Fermer</button></div>}
            </div> : <EmptyState title="Aucun billet pour le moment" detail="Vos réservations apparaîtront ici après l’achat." />}
          </section>
          <section className="jso-panel jso-membership-panel" id="mes-abonnements">
            <div className="jso-panel-heading"><div><span className="jso-panel-eyebrow">VOTRE ADHÉSION</span><h2>Mon abonnement</h2></div><a href="#historique-abonnements">Voir les détails <ChevronRight size={14} /></a></div>
            {data.memberships.status === 'error' ? <DataError message={data.memberships.message} onRetry={() => setReload((n) => n + 1)} /> : data.memberships.status === 'loading' ? <p className="jso-muted">Chargement de votre abonnement…</p> : activeMembership ? <>
              <div className="jso-membership-feature"><div className="jso-membership-cover"><img src="/JSO-crest-regenerated-ok.png" alt="" /><strong>ABONNEMENT</strong><small>SAISON 2026/27</small></div><div className="jso-membership-status"><span className="jso-status-pill is-ok"><CheckCircle2 size={14} /> {prettyStatus(statusOf(activeMembership))}</span><h3>{value(activeMembership, 'planName', 'PlanName', 'name', 'Name', 'membershipName', 'MembershipName') || 'Abonnement JSO'}</h3><p>Valide jusqu’au {dateOf(activeMembership, 'endDate', 'EndDate', 'expiresAt', 'ExpiresAt')}</p></div></div>
              <div className="jso-membership-facts"><span><small>Nom</small><strong>{displayName}</strong></span><span><small>Catégorie</small><strong>{value(activeMembership, 'category', 'Category') || 'Adulte'}</strong></span><span><small>N° abonné</small><strong>{value(activeMembership, 'membershipNumber', 'MembershipNumber', 'number', 'Number') || '—'}</strong></span></div>
              <div className="jso-membership-actions"><button type="button" onClick={() => setDigitalErrors((s) => ({ ...s, membership: 'La carte sera affichée ici lorsqu’elle sera fournie par l’API.' }))}><Ticket size={15} /> Voir la carte</button><button type="button" className="is-secondary" onClick={() => setDigitalErrors((s) => ({ ...s, membership: 'Le téléchargement sera disponible lorsque l’API fournira le document.' }))}><Download size={15} /> Télécharger</button></div>
              {digitalErrors.membership && <p role="status" className="jso-dashboard-error">{digitalErrors.membership}</p>}
              {membershipItems.length > 1 && <div id="historique-abonnements" className="jso-membership-history"><strong>Historique</strong>{membershipItems.slice(1).map((membership, i) => <div key={idOf(membership) ?? i}><span>{value(membership, 'planName', 'PlanName', 'name', 'Name') || 'Abonnement JSO'}</span><span>{prettyStatus(statusOf(membership))}</span></div>)}</div>}
            </> : <EmptyState title="Aucun abonnement registrato" detail="Le informazioni sull’abbonamento appariranno qui." />}
          </section>
          <section className="jso-panel jso-orders-panel" id="mes-commandes">
            <div className="jso-panel-heading"><div><span className="jso-panel-eyebrow">BOUTIQUE JSO</span><h2>Dernières commandes</h2></div><a href="/boutique">Voir toutes <ChevronRight size={14} /></a></div>
            {data.orders.status === 'error' ? <DataError message={data.orders.message} onRetry={() => setReload((n) => n + 1)} /> : data.orders.status === 'loading' ? <p className="jso-muted">Chargement des commandes…</p> : recentOrders.length ? <div className="jso-order-list">{recentOrders.map((order, index) => {
              const id = idOf(order) ?? index
              const lines = value(order, 'items', 'Items', 'lines', 'Lines')
              const firstLine = Array.isArray(lines) ? lines[0] : null
              return <article key={id} className="jso-order-row"><span className="jso-order-thumb"><ShoppingBag size={23} /></span><span className="jso-order-text"><strong>{value(firstLine, 'productName', 'ProductName', 'name', 'Name', 'title', 'Title') || ('Commande ' + String(id).slice(0, 8))}</strong><small>{dateOf(order, 'createdAt', 'CreatedAt', 'orderDate', 'OrderDate')} · {prettyStatus(statusOf(order))}</small></span><strong className="jso-order-price">{moneyOf(order) || '—'}</strong><ChevronRight size={16} /></article>
            })}</div> : <EmptyState title="Aucune commande pour le moment" detail="Vos achats seront affichés ici avec leur statut et leur montant." />}
          </section>
        </div>
        <section className="jso-panel jso-news-panel"><div className="jso-panel-heading"><div><span className="jso-panel-eyebrow">JSO FOOTBALL CLUB</span><h2>Actualités pour vous</h2></div><a href="/actualites">Voir toutes les actualités <ChevronRight size={14} /></a></div>
          <div className="jso-news-grid">
            <a href="/actualites" className="jso-news-card"><div className="jso-news-photo jso-news-photo-one" /><strong>Préparez votre venue au stade</strong><small>Infos match · JSO</small></a>
            <a href="/abonnements" className="jso-news-card"><div className="jso-news-photo jso-news-photo-two" /><strong>Les abonnements 2026/27</strong><small>Vie du club · JSO</small></a>
            <a href="/actualites" className="jso-news-card"><div className="jso-news-photo jso-news-photo-three" /><strong>Une belle dynamique avant la prochaine journée</strong><small>Équipe · JSO</small></a>
            <a href="/boutique" className="jso-news-card"><div className="jso-news-photo jso-news-photo-four" /><strong>Nouvelle collection disponible</strong><small>Boutique · JSO</small></a>
          </div>
        </section>
        <div className="jso-mobile-bottom-nav"><a href="/mon-espace" className="is-active"><LayoutDashboard size={18} /><small>Mon espace</small></a><a href="#mes-billets"><Ticket size={18} /><small>Mes billets</small></a><a href="/boutique"><ShoppingBag size={18} /><small>Boutique</small></a><a href="#mes-commandes"><UserRound size={18} /><small>Profil</small></a></div>
        <div className="jso-dashboard-footer">JSO Football Club · Espace supporter</div>
      </main>
    </div>
    <div id="jso-mobile-sidebar" className="jso-mobile-sidebar">{sidebar}<button type="button" className="jso-mobile-sidebar-close" onClick={() => document.getElementById('jso-mobile-sidebar')?.classList.remove('is-open')}>Fermer le menu</button></div>
    {allLoading && <div className="jso-loading-bar" role="status">Chargement de vos informations…</div>}
    <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthenticated={(result) => { fan.signIn(result); setAuthOpen(false) }} />
  </div>
}
