import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, CheckCircle2, CircleAlert, CreditCard, Download, LogIn, RefreshCw, ShieldCheck, Ticket, UserRound, LayoutDashboard, Crown, ShoppingBag, Settings, LogOut, Menu, ChevronDown, ChevronRight } from 'lucide-react'
import { membershipApi, paymentHistoryApi, shopOrderApi, ticketApi } from '../../lib/api'
import { useFanSession } from './useFanSession'
import AuthModal from './AuthModal'
import AccountFundraising from '../donations/fundraising/AccountFundraising'
import StandalonePageHeader from '../site/StandalonePageHeader'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import './CustomerDashboardPage.css'
import { getProfilePhoto, subscribeProfilePhoto } from './profilePhoto'
import { getSupporterLevel } from './supporterLevel'
import QRCode from 'qrcode'

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
function EmptyState({ title, detail }) {
  return <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center"><p className="font-extrabold text-jso-ink">{title}</p><p className="mt-1 text-sm text-slate-500">{detail}</p></div>
}

function DataError({ message, onRetry }) {
  return <div role="alert" className="mt-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"><span className="inline-flex items-start gap-2"><CircleAlert size={18} className="mt-0.5 shrink-0" />{message}</span><button type="button" onClick={onRetry} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 font-bold hover:bg-amber-100"><RefreshCw size={15} /> Réessayer</button></div>
}



export default function CustomerDashboardPage() {
  const accountSection = ({ '/account/tickets': 'tickets', '/account/memberships': 'memberships', '/account/orders': 'orders', '/account/supports': 'supports', '/account/payments': 'payments' })[window.location.pathname.replace(/\/$/, '')] || ''
  const sectionTitles = { tickets: ['Mes billets', 'Vos billets confirmés et leurs QR codes.'], memberships: ['Mes abonnements', 'Consultez vos abonnements et leur statut.'], orders: ['Mes commandes', 'Suivez vos achats et leurs statuts.'], supports: ['Mes soutiens', 'Retrouvez vos participations aux projets de la JSO.'], payments: ['Mes paiements', 'Consultez l’historique et le statut de vos opérations.'] }
  const sectionHeading = sectionTitles[accountSection]
  const fan = useFanSession()
  const [authOpen, setAuthOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [profilePhoto, setProfilePhoto] = useState(getProfilePhoto)
  useEffect(() => subscribeProfilePhoto(setProfilePhoto), [])
  const [reload, setReload] = useState(0)
  const [data, setData] = useState({
    tickets: { status: 'loading', items: [] },
    orders: { status: 'loading', items: [] },
    memberships: { status: 'loading', items: [] },
    payments: { status: 'loading', items: [] },
  })
  const [digital, setDigital] = useState({})
  const [digitalBusy, setDigitalBusy] = useState({})
  const [digitalErrors, setDigitalErrors] = useState({})
  useDocumentTitle('Mon espace supporter — JSO')

  useEffect(() => {
    if (fan.status !== 'authenticated' || !fan.token) return
    let active = true
    const sources = {
      tickets: () => ticketApi.mine(fan.token),
      orders: () => shopOrderApi.myOrders(fan.token),
      memberships: () => membershipApi.mine(fan.token),
      payments: () => paymentHistoryApi.mine(fan.token),
    }
    const names = {
      tickets: ['tickets'],
      memberships: ['memberships'],
      orders: ['orders'],
      payments: ['payments'],
      supports: [],
    }[accountSection] || Object.keys(sources)
    setData(Object.fromEntries(Object.keys(sources).map(name => [name, names.includes(name) ? { status: 'loading', items: [] } : { status: 'ready', items: [] }])))
    if (!names.length) return () => { active = false }
    Promise.allSettled(names.map(name => sources[name]())).then((tasks) => {
      if (!active) return
      setData(previous => ({ ...previous, ...Object.fromEntries(names.map((name, index) => {
        const result = tasks[index]
        return [name, result.status === 'fulfilled' ? { status: 'ready', items: listOf(result.value) } : { status: 'error', items: [], message: result.reason?.message || 'Service temporairement indisponible.' }]
      })) }))
    })
    return () => { active = false }
  }, [accountSection, fan.status, fan.token, reload])

  useEffect(() => {
    if (fan.status === 'authenticated' && window.location.hash === '#mes-soutiens' &&
      [data.tickets, data.orders, data.memberships].every(item => item.status !== 'loading'))
      document.getElementById('mes-soutiens')?.scrollIntoView({ block: 'start' })
  }, [fan.status, data.tickets.status, data.orders.status, data.memberships.status])

  async function showDigital(ticket) {
    const id = idOf(ticket)
    if (!id) return
    setDigitalBusy((state) => ({ ...state, [id]: true }))
    setDigitalErrors((state) => ({ ...state, [id]: '' }))
    try {
      const result = await ticketApi.digital(id, fan.token)
      const token = value(result, 'token', 'Token')
      const qrCodeDataUrl = token ? await QRCode.toDataURL(token, { width: 320, margin: 2, errorCorrectionLevel: 'M' }) : null
      setDigital((state) => ({ ...state, [id]: { ...result, qrCodeDataUrl } }))
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
          <button type="button" onClick={() => { setAuthMode('login'); setAuthOpen(true) }} className="mt-7 inline-flex items-center gap-2 rounded-full bg-jso-gold px-6 py-3 font-extrabold text-jso-navy hover:bg-white"><LogIn size={18} /> Se connecter</button>
          <button type="button" onClick={() => { setAuthMode('register'); setAuthOpen(true) }} className="ml-3 mt-4 rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white">Créer un compte</button>
        </section>
      </main>
      <AuthModal open={authOpen} initialMode={authMode} onClose={() => setAuthOpen(false)} onAuthenticated={(result) => { fan.signIn(result); setAuthOpen(false) }} />
    </div>
  }

  const ticketItems = data.tickets.items
  const orderItems = data.orders.items
  const membershipItems = data.memberships.items
  const relevantData = accountSection === 'tickets' ? [data.tickets]
    : accountSection === 'memberships' ? [data.memberships]
      : accountSection === 'orders' ? [data.orders]
        : accountSection === 'payments' ? [data.payments]
          : accountSection === 'supports' ? [] : [data.tickets, data.orders, data.memberships, data.payments]
  const allLoading = relevantData.length > 0 && relevantData.every((item) => item.status === 'loading')
  const nextTicket = ticketItems[0]
  const nextTicketId = nextTicket ? idOf(nextTicket) : null
  const nextDigital = nextTicketId ? digital[nextTicketId] : null
  const nextQr = value(nextDigital, 'qrCodeDataUrl', 'QrCodeDataUrl', 'qrCodeUrl', 'QrCodeUrl', 'qrCode', 'QrCode', 'imageDataUrl', 'ImageDataUrl')
  const nextQrImage = typeof nextQr === 'string' && (nextQr.startsWith('data:image/') || /^https:\/\//i.test(nextQr))
  const activeMembership = membershipItems.find((item) => ['Active', 'Confirmed', 'Paid'].includes(statusOf(item))) || membershipItems[0]
  const recentOrders = orderItems.slice(0, 3)
  const displayName = fan.user?.displayName || fan.user?.fullName || fan.user?.name || fan.user?.email?.split('@')[0] || 'Supporter'
  const supporterLevel = getSupporterLevel(fan.user?.loginDaysCount)
  const initials = displayName.split(/[\\s._-]+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'JS'
  const closeMobileMenu = () => setMobileMenuOpen(false)
  function NavItem({ icon: Icon, label, href, active = false, onClick }) {
    const classes = "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition " + (active ? 'bg-blue-600 text-white shadow-md' : 'text-white/75 hover:bg-white/10 hover:text-white')
    return onClick
      ? <button type="button" onClick={() => { onClick(); closeMobileMenu() }} className={classes}><Icon size={18} aria-hidden="true" /><span>{label}</span></button>
      : <a href={href} onClick={closeMobileMenu} aria-current={active ? 'page' : undefined} className={classes}><Icon size={18} aria-hidden="true" /><span>{label}</span></a>
  }
  const sidebar = <aside className="jso-dashboard-sidebar">
    <a href="/" className="jso-brand-lockup" aria-label="JSO, accueil"><img src="/JSO-crest-regenerated-ok.png" alt="" /><span><strong>JSO</strong><small>FOOTBALL CLUB</small></span></a>
    <nav aria-label="Navigazione area supporter" className="jso-sidebar-nav">
      <NavItem icon={LayoutDashboard} label="Mon espace" href="/mon-espace" active={!accountSection} />
      <NavItem icon={Ticket} label="Mes billets" href="/account/tickets" active={accountSection === 'tickets'} />
      <NavItem icon={Crown} label="Mes abonnements" href="/account/memberships" active={accountSection === 'memberships'} />
      <NavItem icon={ShoppingBag} label="Mes commandes" href="/account/orders" active={accountSection === 'orders'} />
      <NavItem icon={ShieldCheck} label="Mes soutiens" href="/account/supports" active={accountSection === 'supports'} />
      <NavItem icon={CreditCard} label="Mes paiements" href="/account/payments" active={accountSection === 'payments'} />
      <NavItem icon={UserRound} label="Mon profil" onClick={() => { window.location.href = "/profil" }} />
      <NavItem icon={Settings} label="Paramètres" onClick={() => setAuthOpen(true)} />
      <NavItem icon={LogOut} label="Se déconnecter" onClick={fan.signOut} />
    </nav>
    <div className="jso-sidebar-art" aria-hidden="true"><span>Plus qu’un club</span><em>Une famille</em></div>
    <div className="jso-sidebar-foot">JSO · Ensemble vers la victoire</div>
  </aside>

  return <div className={'jso-account-page min-h-screen bg-jso-paper text-jso-ink' + (accountSection ? ' jso-account-section-view jso-account-view-' + accountSection : '')}>
    {sidebar}
    <div className="jso-dashboard-shell">
      <header className="jso-dashboard-topbar">
        <button type="button" className="jso-mobile-menu" aria-label="Afficher le menu supporter" aria-expanded={mobileMenuOpen} aria-controls="jso-mobile-sidebar" onClick={() => setMobileMenuOpen((open) => !open)}><Menu size={21} /></button>
        <a href="/" className="jso-mobile-brand"><img src="/JSO-crest-regenerated-ok.png" alt="" /><strong>JSO</strong><small>FOOTBALL CLUB</small></a>
        <nav className="jso-top-links" aria-label="Navigation principale"><a href="/">Accueil</a><a href="/matchs">Matches</a><a href="/billetterie">Billetterie</a><a href="/abonnements">Abonnements</a><a href="/boutique">Boutique</a><a href="/actualites">Actualités</a></nav>
        <div className="jso-top-user"><span className="jso-notification-dot" aria-label="Notifications">♧</span><span className="jso-avatar relative overflow-hidden border-2 border-amber-400 shadow-md" aria-label={displayName}>{profilePhoto ? <img src={profilePhoto} alt="" className="h-full w-full object-cover" /> : initials}<Crown size={12} className="absolute bottom-0 right-0 rounded-full bg-amber-300 p-[1px] text-jso-navy" aria-hidden="true" /></span><span className="jso-top-user-name">{displayName}<small className="block text-[10px] font-bold text-amber-600">{supporterLevel.name} · {'★'.repeat(supporterLevel.stars)}</small></span><ChevronDown size={15} aria-hidden="true" /></div>
      </header>
      <main id="main-content" tabIndex={-1} className="jso-dashboard-main">
        <div className="jso-welcome"><div><p className="jso-eyebrow">ESPACE SUPPORTER</p><h1>{sectionHeading?.[0] || `Bonjour ${displayName},`}</h1><p className="jso-welcome-subtitle">{sectionHeading?.[1] || 'Bienvenue dans votre espace personnel.'}</p>{!accountSection && <p className="jso-welcome-copy">Retrouvez ici tous vos billets, abonnements, commandes et informations.</p>}</div><div className="jso-welcome-actions"><button type="button" onClick={() => setReload((n) => n + 1)}><RefreshCw size={16} /> Actualiser</button></div></div>
        <div className="jso-dashboard-kpis" aria-label="Résumé de votre compte">
          <a href="/account/tickets" className="jso-kpi-card"><span className="jso-kpi-icon"><Ticket size={23} /></span><div><span className="jso-kpi-label">Mes billets</span><strong>{data.tickets.status === 'ready' ? ticketItems.length : '—'}</strong><small>{ticketItems.length ? 'Votre prochain match' : 'Vos billets apparaîtront ici'}</small></div><ChevronRight size={18} className="jso-kpi-arrow" /></a>
          <a href="/account/memberships" className="jso-kpi-card jso-kpi-gold"><span className="jso-kpi-icon"><Crown size={23} /></span><div><span className="jso-kpi-label">Mon abonnement</span><strong className="jso-kpi-word">{activeMembership ? prettyStatus(statusOf(activeMembership)) : 'Aucun'}</strong><small>{value(activeMembership, 'planName', 'PlanName', 'name', 'Name') || 'Consulter mes abonnements'}</small></div><ChevronRight size={18} className="jso-kpi-arrow" /></a>
          <a href="/account/orders" className="jso-kpi-card"><span className="jso-kpi-icon"><ShoppingBag size={23} /></span><div><span className="jso-kpi-label">Mes commandes</span><strong>{data.orders.status === 'ready' ? orderItems.length : '—'}</strong><small>{recentOrders[0] ? dateOf(recentOrders[0], 'createdAt', 'CreatedAt', 'orderDate', 'OrderDate') : 'Vos achats JSO'}</small></div><ChevronRight size={18} className="jso-kpi-arrow" /></a>
        </div>
        <div className="jso-dashboard-panels">
          <section className="jso-panel jso-next-match" id="mes-billets">
            <div className="jso-panel-heading"><div><span className="jso-panel-eyebrow">BILLETTERIE</span><h2>Prochain match</h2></div><a href="/matchs">Voir tous les matchs <ChevronRight size={14} /></a></div>
            {data.tickets.status === 'error' ? <DataError message={data.tickets.message} onRetry={() => setReload((n) => n + 1)} /> : data.tickets.status === 'loading' ? <p className="jso-muted">Chargement des billets…</p> : nextTicket ? <div className="jso-match-ticket">
              <div className="jso-match-banner"><img src="/JSO-crest-regenerated-ok.png" alt="JSO" className="jso-match-crest" /><div className="jso-match-info"><p>{value(nextTicket, 'competitionName', 'CompetitionName', 'matchTitle', 'MatchTitle', 'matchName', 'MatchName', 'opponentName', 'OpponentName', 'ticketTypeName', 'TicketTypeName') || 'Billet JSO'}</p><h3>{value(nextTicket, 'opponentName', 'OpponentName') ? <>JSO <span>vs</span> {value(nextTicket, 'opponentName', 'OpponentName')}</> : 'Match JSO'}</h3><small><CalendarDays size={13} /> {dateOf(nextTicket, 'kickoffAt', 'KickoffAt')} · {value(nextTicket, 'venue', 'Venue') || 'Lieu à confirmer'}</small></div></div>
              <div className="jso-ticket-details"><span><small>Tribune</small><strong>{value(nextTicket, 'standName', 'StandName', 'tribune', 'Tribune') || '—'}</strong></span><span><small>Rang</small><strong>{value(nextTicket, 'row', 'Row', 'rank', 'Rank') || '—'}</strong></span><span><small>Siège</small><strong>{value(nextTicket, 'seat', 'Seat') || '—'}</strong></span>{nextQrImage && <img className="jso-ticket-qr" src={nextQr} alt="QR code du billet" />}</div>
              <div className="jso-ticket-actions"><span className={'jso-status-pill ' + (['Confirmed', 'Paid', 'Active'].includes(statusOf(nextTicket)) ? 'is-ok' : '')}><CheckCircle2 size={14} /> {prettyStatus(statusOf(nextTicket))}</span><button type="button" onClick={() => showDigital(nextTicket)} disabled={!nextTicketId || Boolean(digitalBusy[nextTicketId])}>{digitalBusy[nextTicketId] ? 'Chargement…' : <><Ticket size={15} /> Voir mon billet</>}</button></div>
              {digitalErrors[nextTicketId] && <p role="alert" className="jso-dashboard-error">{digitalErrors[nextTicketId]}</p>}
              {nextDigital && <div className="jso-ticket-extra" role="region" aria-label="Billet numérique"><div><p>Billet numérique</p><small>Présentez ce QR code à l’entrée du stade.</small></div>{nextQrImage && <img src={nextQr} alt="QR code valide pour le contrôle du billet" className="jso-ticket-qr-large" />}<div className="jso-ticket-extra-actions">{nextQrImage && <a href={nextQr} download={'jso-ticket-' + nextTicketId + '.png'}><Download size={16} /> Télécharger le QR</a>}<button type="button" onClick={() => setDigital((state) => { const next = { ...state }; delete next[nextTicketId]; return next })}>Fermer</button></div></div>}
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
            </> : <EmptyState title="Aucun abonnement enregistré" detail="Les informations sur votre abonnement apparaîtront ici." />}
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
        {accountSection === 'tickets' && <section className="jso-panel jso-all-tickets"><div className="jso-panel-heading"><div><span className="jso-panel-eyebrow">BILLETTERIE</span><h2>Tous mes billets</h2></div><a href="/billetterie">Acheter un billet <ChevronRight size={14} /></a></div>
          {data.tickets.status === 'error' ? <DataError message={data.tickets.message} onRetry={() => setReload(n => n + 1)} /> : data.tickets.status === 'loading' ? <p className="jso-muted">Chargement des billets…</p> : ticketItems.length ? <div className="jso-account-ticket-list">{ticketItems.map((ticket, index) => {
            const id = idOf(ticket) || index
            const qrData = value(digital[id], 'qrCodeDataUrl')
            return <article key={id} className="jso-account-ticket-row"><div><strong>{value(ticket, 'ticketTypeName', 'TicketTypeName', 'matchTitle', 'MatchTitle') || 'Billet JSO'}</strong><p>{dateOf(ticket, 'kickoffAt', 'KickoffAt', 'createdAt', 'CreatedAt')} · {prettyStatus(statusOf(ticket))}</p><small>{moneyOf(ticket) || 'Billet numérique'}</small></div>{qrData && <img src={qrData} alt="QR code du billet" className="jso-ticket-qr-large" />}{qrData ? <a href={qrData} download={'jso-ticket-' + id + '.png'} className="jso-account-ticket-action"><Download size={16}/> Télécharger QR</a> : <button type="button" className="jso-account-ticket-action" disabled={Boolean(digitalBusy[id]) || !['Confirmed', 'CheckedIn'].includes(statusOf(ticket))} onClick={() => showDigital(ticket)}>{digitalBusy[id] ? 'Chargement…' : 'Afficher le QR'}</button>}{digitalErrors[id] && <p role="alert" className="jso-dashboard-error">{digitalErrors[id]}</p>}</article>
          })}</div> : <EmptyState title="Aucun billet pour le moment" detail="Les billets achetés apparaîtront ici." />}
        </section>}
        <AccountFundraising key={fan.token} token={fan.token} onChanged={() => setReload(n => n + 1)}/>
        <section className="jso-panel mt-4" id="mes-paiements">
          <div className="jso-panel-heading"><div><span className="jso-panel-eyebrow">SUIVI DE VOS ACHATS</span><h2>Historique des paiements</h2></div><span className="jso-status-pill">{data.payments.items.length} opération{data.payments.items.length === 1 ? '' : 's'}</span></div>
          <p className="mb-3 text-sm text-slate-500">Billets, boutique, abonnements, dons et accès aux directs, avec le statut et le montant enregistré.</p>
          {data.payments.status === 'error' ? <DataError message={data.payments.message} onRetry={() => setReload((n) => n + 1)} /> : data.payments.status === 'loading' ? <p className="jso-muted">Chargement de l’historique…</p> : data.payments.items.length ? <div className="divide-y divide-slate-100">
            {data.payments.items.map((payment) => <article key={idOf(payment)} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-1">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><CreditCard size={18} /></span>
              <span className="min-w-[150px] flex-1"><strong className="block text-sm text-slate-900">{value(payment, 'description', 'Description') || 'Opération JSO'}</strong><small className="text-xs text-slate-500">{dateOf(payment, 'paidAt', 'PaidAt', 'createdAt', 'CreatedAt')}{value(payment, 'provider', 'Provider') ? ` · ${value(payment, 'provider', 'Provider')}` : ''}</small></span>
              <span className={'jso-status-pill ' + (['Paid', 'Confirmed', 'Active', 'Promo', 'CheckedIn'].includes(statusOf(payment)) ? 'is-ok' : '')}>{prettyStatus(statusOf(payment))}</span>
              <strong className="min-w-24 text-right text-sm text-slate-900">{moneyOf(payment) || '—'}</strong>
            </article>)}
          </div> : <EmptyState title="Aucun paiement enregistré" detail="Vos achats et paiements apparaîtront ici, y compris les billets de match." />}
        </section>
        <section className="jso-panel jso-explore-panel"><div className="jso-panel-heading"><div><span className="jso-panel-eyebrow">DÉCOUVRIR LA JSO</span><h2>Continuer avec le club</h2></div></div>
          <div className="jso-explore-grid">
            <a href="/matchs"><span className="jso-explore-icon"><CalendarDays size={22} /></span><span><strong>Calendrier des matchs</strong><small>Retrouvez les prochaines rencontres de la JSO.</small></span><ChevronRight size={18} /></a>
            <a href="/boutique"><span className="jso-explore-icon is-gold"><ShoppingBag size={22} /></span><span><strong>Boutique officielle</strong><small>Découvrez les articles et équipements du club.</small></span><ChevronRight size={18} /></a>
            <a href="/nos-projets"><span className="jso-explore-icon is-green"><ShieldCheck size={22} /></span><span><strong>Soutenir la JSO</strong><small>Suivez vos participations et les projets du club.</small></span><ChevronRight size={18} /></a>
          </div>
        </section>
        <div className="jso-mobile-bottom-nav"><a href="/mon-espace" className={!accountSection ? 'is-active' : ''}><LayoutDashboard size={18} /><small>Mon espace</small></a><a href="/account/tickets" className={accountSection === 'tickets' ? 'is-active' : ''}><Ticket size={18} /><small>Mes billets</small></a><a href="/account/supports" className={accountSection === 'supports' ? 'is-active' : ''}><ShieldCheck size={18} /><small>Mes soutiens</small></a><a href="/account/payments" className={accountSection === 'payments' ? 'is-active' : ''}><CreditCard size={18} /><small>Paiements</small></a><a href="/profil"><UserRound size={18} /><small>Profil</small></a></div>
        <div className="jso-dashboard-footer">JSO Football Club · Espace supporter</div>
      </main>
    </div>
    <div id="jso-mobile-sidebar" className={'jso-mobile-sidebar' + (mobileMenuOpen ? ' is-open' : '')} onKeyDown={(event) => { if (event.key === 'Escape') closeMobileMenu() }}>{sidebar}<button type="button" className="jso-mobile-sidebar-close" onClick={closeMobileMenu}>Fermer le menu</button></div>
    {allLoading && <div className="jso-loading-bar" role="status">Chargement de vos informations…</div>}
    <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthenticated={(result) => { fan.signIn(result); setAuthOpen(false) }} />
  </div>
}
