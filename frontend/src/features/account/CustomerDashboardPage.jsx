import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, CheckCircle2, CircleAlert, Clock3, Download, LogIn, Package, RefreshCw, ShieldCheck, Ticket, UserRound, X } from 'lucide-react'
import { membershipApi, shopOrderApi, ticketApi } from '../../lib/api'
import { useFanSession } from './useFanSession'
import AuthModal from './AuthModal'
import StandalonePageHeader from '../site/StandalonePageHeader'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

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
    Promise.allSettled([
      ticketApi.mine(fan.token),
      shopOrderApi.myOrders(fan.token),
      membershipApi.mine(fan.token),
    ]).then((tasks) => {
      if (!active) return
      const names = ['tickets', 'orders', 'memberships']
      setData(Object.fromEntries(names.map((name, index) => {
        const result = tasks[index]
        return [name, result.status === 'fulfilled'
          ? { status: 'ready', items: listOf(result.value) }
          : { status: 'error', items: [], message: result.reason?.message || 'Service temporairement indisponible.' }]
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

  if (fan.status === 'unknown') {
    return <div className="min-h-screen bg-jso-paper"><StandalonePageHeader /><main className="mx-auto max-w-5xl px-5 py-20 text-center"><p className="font-bold text-slate-500">Vérification de votre session…</p></main></div>
  }

  if (fan.status !== 'authenticated' || !fan.token) {
    return (
      <div className="min-h-screen bg-jso-paper text-jso-ink">
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
    )
  }

  const ticketItems = data.tickets.items
  const orderItems = data.orders.items
  const membershipItems = data.memberships.items
  const allLoading = [data.tickets, data.orders, data.memberships].every((item) => item.status === 'loading')

  return (
    <div className="min-h-screen bg-jso-paper text-jso-ink">
      <StandalonePageHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-10 sm:py-14 lg:px-8">
        <a href="/" className="inline-flex items-center gap-2 text-sm font-extrabold text-jso-blue hover:text-jso-navy"><ArrowLeft size={16} /> Retour au site</a>
        <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-extrabold tracking-[0.2em] text-jso-blue">ESPACE SUPPORTER</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Bonjour, {fan.user?.displayName || fan.user?.email || 'supporter'} !</h1><p className="mt-3 max-w-2xl text-slate-500">Vos billets, abonnements et achats réunis au même endroit.</p></div>
          <button type="button" onClick={() => setReload((n) => n + 1)} className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold hover:border-jso-blue sm:self-auto"><RefreshCw size={16} /> Actualiser</button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Mes billets', count: data.tickets.status === 'ready' ? ticketItems.length : '—', icon: Ticket },
            { label: 'Mes abonnements', count: data.memberships.status === 'ready' ? membershipItems.length : '—', icon: CheckCircle2 },
            { label: 'Mes commandes', count: data.orders.status === 'ready' ? orderItems.length : '—', icon: Package },
          ].map((stat) => <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-500">{stat.label}</span><stat.icon size={19} className="text-jso-blue" aria-hidden="true" /></div><p className="mt-3 text-3xl font-black">{stat.count}</p></div>)}
        </div>

        {allLoading && <div role="status" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">Chargement de vos informations…</div>}

        <section className="mt-10 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeading eyebrow="BILLETTERIE" title="Mes billets" count={data.tickets.status === 'ready' ? ticketItems.length : undefined} icon={Ticket} />
          {data.tickets.status === 'error' ? <DataError message={data.tickets.message} onRetry={() => setReload((n) => n + 1)} /> : data.tickets.status === 'loading' ? <p className="mt-5 text-sm text-slate-400">Chargement…</p> : ticketItems.length === 0 ? <EmptyState title="Aucun billet pour le moment" detail="Vos réservations et billets apparaîtront ici après votre achat." /> : <div className="mt-5 space-y-3">{ticketItems.map((ticket, index) => {
            const id = idOf(ticket) ?? index
            const status = statusOf(ticket)
            const digitalData = digital[id]
            const qr = value(digitalData, 'qrCodeDataUrl', 'QrCodeDataUrl', 'qrCodeUrl', 'QrCodeUrl', 'qrCode', 'QrCode', 'imageDataUrl', 'ImageDataUrl')
            const qrImage = typeof qr === 'string' && (qr.startsWith('data:image/') || /^https:\/\//i.test(qr))
            const canRequestDigital = ['Confirmed', 'Paid', 'Used', 'CheckedIn'].includes(status)
            return <article key={id} className="rounded-2xl border border-slate-200 p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="font-extrabold">{value(ticket, 'matchTitle', 'MatchTitle', 'matchName', 'MatchName', 'opponentName', 'OpponentName', 'ticketTypeName', 'TicketTypeName') || 'Billet JSO'}</p><p className="mt-1 text-sm text-slate-500">{value(ticket, 'quantity', 'Quantity') ? `Quantité : ${value(ticket, 'quantity', 'Quantity')} · ` : ''}{dateOf(ticket, 'createdAt', 'CreatedAt', 'purchaseDate', 'PurchaseDate', 'kickoffAt', 'KickoffAt')}</p>{moneyOf(ticket) && <p className="mt-1 text-sm font-bold">{moneyOf(ticket)}</p>}</div><span className={`w-fit rounded-full px-3 py-1 text-xs font-extrabold ${statusClass(status)}`}>{prettyStatus(status)}</span></div>
              {canRequestDigital && <div className="mt-4"><button type="button" onClick={() => showDigital(ticket)} disabled={Boolean(digitalBusy[id])} className="inline-flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 text-sm font-extrabold text-white hover:bg-jso-blue disabled:opacity-60">{digitalBusy[id] ? 'Chargement…' : <><Ticket size={16} /> Afficher mon billet / QR</>}</button></div>}
              {digitalErrors[id] && <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{digitalErrors[id]}</p>}
              {digitalData && <div className="mt-4 flex flex-col items-start gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center">{qrImage ? <img src={qr} alt="QR code du billet" className="h-40 w-40 rounded-xl border border-slate-200 bg-white p-2" /> : <div className="rounded-xl bg-white p-3 text-sm text-slate-600">Billet numérique chargé. Présentez les informations officielles fournies par le club.</div>}<div><p className="font-extrabold">Billet numérique</p><p className="mt-1 text-sm text-slate-500">Le QR est fourni par l’API après vérification de votre compte et du statut du billet.</p>{qrImage && <a href={qr} download={`jso-ticket-${id}.png`} className="mt-3 inline-flex items-center gap-2 text-sm font-extrabold text-jso-blue"><Download size={15} /> Enregistrer le QR</a>}</div><button type="button" onClick={() => setDigital((state) => { const next = { ...state }; delete next[id]; return next })} aria-label="Fermer le billet numérique" className="ml-auto rounded-full border border-slate-200 p-2"><X size={16} /></button></div>}
            </article>
          })}</div>}
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeading eyebrow="VOTRE ADHÉSION" title="Mes abonnements" count={data.memberships.status === 'ready' ? membershipItems.length : undefined} icon={CheckCircle2} />
          {data.memberships.status === 'error' ? <DataError message={data.memberships.message} onRetry={() => setReload((n) => n + 1)} /> : data.memberships.status === 'loading' ? <p className="mt-5 text-sm text-slate-400">Chargement…</p> : membershipItems.length === 0 ? <EmptyState title="Aucun abonnement enregistré" detail="Si vous souscrivez un abonnement, il apparaîtra ici avec son état et sa période de validité." /> : <div className="mt-5 space-y-3">{membershipItems.map((membership, index) => { const id = idOf(membership) ?? index; const status = statusOf(membership); return <article key={id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-extrabold">{value(membership, 'planName', 'PlanName', 'name', 'Name', 'membershipName', 'MembershipName') || 'Abonnement JSO'}</p><p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500"><CalendarDays size={15} /> {dateOf(membership, 'startDate', 'StartDate', 'startsAt', 'StartsAt')} – {dateOf(membership, 'endDate', 'EndDate', 'expiresAt', 'ExpiresAt')}</p>{moneyOf(membership) && <p className="mt-1 text-sm font-bold">{moneyOf(membership)}</p>}</div><span className={`w-fit rounded-full px-3 py-1 text-xs font-extrabold ${statusClass(status)}`}>{prettyStatus(status)}</span></article> })}</div>}
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeading eyebrow="BOUTIQUE JSO" title="Mes commandes" count={data.orders.status === 'ready' ? orderItems.length : undefined} icon={Package} />
          {data.orders.status === 'error' ? <DataError message={data.orders.message} onRetry={() => setReload((n) => n + 1)} /> : data.orders.status === 'loading' ? <p className="mt-5 text-sm text-slate-400">Chargement…</p> : orderItems.length === 0 ? <EmptyState title="Aucune commande pour le moment" detail="Vos achats dans la boutique apparaîtront ici avec leur statut et leur montant." /> : <div className="mt-5 space-y-3">{orderItems.map((order, index) => { const id = idOf(order) ?? index; const status = statusOf(order); return <article key={id} className="rounded-2xl border border-slate-200 p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-extrabold">Commande {String(id).slice(0, 8)}</p><p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500"><Clock3 size={15} /> {dateOf(order, 'createdAt', 'CreatedAt', 'orderDate', 'OrderDate', 'createdOn', 'CreatedOn')}</p>{moneyOf(order) && <p className="mt-1 text-lg font-black">{moneyOf(order)}</p>}</div><span className={`w-fit rounded-full px-3 py-1 text-xs font-extrabold ${statusClass(status)}`}>{prettyStatus(status)}</span></div>{Array.isArray(value(order, 'items', 'Items', 'lines', 'Lines')) && <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-600">{value(order, 'items', 'Items', 'lines', 'Lines').map((line, i) => <li key={value(line, 'id', 'Id') || i}>{value(line, 'productName', 'ProductName', 'name', 'Name', 'title', 'Title') || 'Articolo'} × {value(line, 'quantity', 'Quantity') || 1}</li>)}</ul>}</article> })}</div>}
        </section>

        <section className="mt-6 flex flex-col gap-4 rounded-[1.75rem] bg-jso-navy p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8"><div className="flex items-start gap-3"><UserRound size={22} className="mt-1 shrink-0 text-jso-gold" /><div><h2 className="font-black">Profilo e sicurezza</h2><p className="mt-1 text-sm text-white/65">Gestisci i tuoi dati personali e le impostazioni dell’account dal menu del tuo profilo.</p></div></div><a href="/" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-extrabold text-jso-navy hover:bg-jso-gold">Torna al sito <ArrowLeft size={15} className="rotate-180" /></a></section>
      </main>
    </div>
  )
}
