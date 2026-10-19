import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, CheckCircle2, ChevronRight, Crown, CreditCard, LogIn, LogOut, ShieldCheck, ShoppingBag, Ticket, UserRound, Settings, MapPin } from 'lucide-react'
import { ticketApi, membershipApi, shopOrderApi } from '../../lib/api'
import { useFanSession } from './useFanSession'
import AuthModal from './AuthModal'
import StandalonePageHeader from '../site/StandalonePageHeader'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

const listOf = (value) => Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : Array.isArray(value?.Items) ? value.Items : []
const displayName = (user) => user?.displayName || user?.name || user?.email?.split('@')[0] || 'Supporter JSO'
const formatDate = (value) => {
  if (!value) return 'Date à confirmer'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date à confirmer' : date.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })
}
const formatPrice = (price, currency = 'TND') => {
  if (price == null || !Number.isFinite(Number(price))) return 'Prezzo da definire'
  try { return new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(Number(price)) } catch { return String(price) }
}

function QuickLink({ href, icon: Icon, title, description, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    gold: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
  }
  return <a href={href} className="group flex min-w-0 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:p-5">
    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tones[tone] || tones.blue}`}><Icon size={23} /></span>
    <span className="min-w-0 flex-1"><span className="block font-extrabold text-slate-900">{title}</span><span className="mt-1 block text-sm leading-5 text-slate-500">{description}</span></span>
    <ChevronRight size={19} className="shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600" />
  </a>
}

export default function CustomerDashboardPage() {
  const fan = useFanSession()
  const [authOpen, setAuthOpen] = useState(false)
  const [matches, setMatches] = useState([])
  const [ticketCount, setTicketCount] = useState(null)
  const [membershipCount, setMembershipCount] = useState(null)
  const [orderCount, setOrderCount] = useState(null)
  const [matchesState, setMatchesState] = useState('loading')
  useDocumentTitle('Il mio account — JSO')

  useEffect(() => {
    const controller = new AbortController()
    ticketApi.matchesOnSale(controller.signal)
      .then((items) => { setMatches(listOf(items).slice(0, 3)); setMatchesState('ready') })
      .catch((error) => { if (error?.name !== 'AbortError') setMatchesState('error') })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (fan.status !== 'authenticated' || !fan.token) {
      setTicketCount(null); setMembershipCount(null); setOrderCount(null)
      return undefined
    }
    let active = true
    Promise.allSettled([ticketApi.mine(fan.token), membershipApi.mine(fan.token), shopOrderApi.myOrders(fan.token)]).then((results) => {
      if (!active) return
      setTicketCount(results[0].status === 'fulfilled' ? listOf(results[0].value).length : null)
      setMembershipCount(results[1].status === 'fulfilled' ? listOf(results[1].value).length : null)
      setOrderCount(results[2].status === 'fulfilled' ? listOf(results[2].value).length : null)
    })
    return () => { active = false }
  }, [fan.status, fan.token])

  const name = displayName(fan.user)
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'JSO'

  return <div className="min-h-screen bg-[#f4f7fc] text-[#0b1730]">
    <StandalonePageHeader />
    <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-extrabold tracking-[.2em] text-blue-700">ESPACE SUPPORTER JSO</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Il mio account</h1><p className="mt-2 text-sm text-slate-500 sm:text-base">Biglietti, partite e acquisti: tutto in un unico posto.</p></div>
        {fan.status === 'authenticated' && <button type="button" onClick={fan.signOut} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-red-600"><LogOut size={16}/> Esci</button>}
      </div>

      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#061a43] via-[#0b347c] to-[#1769e0] p-6 text-white shadow-xl sm:p-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full border-[36px] border-white/5" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-1/3 h-64 w-64 rounded-full bg-blue-400/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-2 border-white/70 bg-white/10 text-2xl font-black shadow-inner sm:h-24 sm:w-24 sm:text-3xl">{fan.status === 'authenticated' ? initials : <UserRound size={38}/>}</div>
          <div className="min-w-0 flex-1"><p className="text-xs font-extrabold tracking-[.18em] text-blue-200">BENVENUTO NELLA FAMIGLIA JSO</p><h2 className="mt-2 break-words text-2xl font-black sm:text-3xl">{fan.status === 'authenticated' ? name : 'Il tuo spazio JSO'}</h2><p className="mt-1 break-all text-sm text-blue-100">{fan.status === 'authenticated' ? fan.user?.email : 'Accedi per gestire i tuoi biglietti e i tuoi ordini.'}</p><div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1.5 text-sm font-bold text-emerald-100">{fan.status === 'authenticated' ? <><CheckCircle2 size={16}/> Account connesso</> : <><ShieldCheck size={16}/> Area personale protetta</>}</div></div>
          {fan.status !== 'authenticated' && <button type="button" onClick={() => setAuthOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#ffd700] px-6 py-3 font-extrabold text-[#071a3a] transition hover:bg-white"><LogIn size={18}/> Accedi / Registrati</button>}
          {fan.status === 'authenticated' && <a href="/profil" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-white/30 px-5 py-3 font-bold text-white transition hover:bg-white/10"><Settings size={17}/> Profilo e sicurezza</a>}
        </div>
      </section>

      {fan.status === 'authenticated' && <section aria-label="Riepilogo account" className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-3 text-blue-700"><Ticket size={21}/><span className="text-sm font-bold text-slate-500">I miei biglietti</span></div><p className="mt-3 text-3xl font-black">{ticketCount ?? '—'}</p><a href="/account/tickets" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-blue-700">Visualizza <ArrowRight size={15}/></a></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-3 text-violet-700"><Crown size={21}/><span className="text-sm font-bold text-slate-500">Abbonamenti</span></div><p className="mt-3 text-3xl font-black">{membershipCount ?? '—'}</p><a href="/account/memberships" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-blue-700">Visualizza <ArrowRight size={15}/></a></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-3 text-emerald-700"><ShoppingBag size={21}/><span className="text-sm font-bold text-slate-500">I miei ordini</span></div><p className="mt-3 text-3xl font-black">{orderCount ?? '—'}</p><a href="/account/orders" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-blue-700">Visualizza <ArrowRight size={15}/></a></div>
      </section>}

      <section className="mt-7 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-extrabold tracking-[.16em] text-blue-700">CALENDARIO</p><h2 className="mt-1 text-2xl font-black">Partite in vendita</h2><p className="mt-1 text-sm text-slate-500">Scegli la partita e acquista il tuo biglietto online.</p></div><a href="/billetterie" className="inline-flex items-center gap-1 text-sm font-extrabold text-blue-700 hover:text-blue-900">Tutta la biglietteria <ArrowRight size={16}/></a></div>
          <div className="mt-5 space-y-3">
            {matchesState === 'loading' && <div role="status" className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">Caricamento delle partite disponibili…</div>}
            {matchesState === 'error' && <div role="alert" className="rounded-2xl bg-amber-50 p-5 text-sm font-semibold text-amber-900">Non è stato possibile caricare le partite. Apri la biglietteria per riprovare.</div>}
            {matchesState === 'ready' && matches.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center"><CalendarDays className="mx-auto text-slate-400" size={28}/><p className="mt-2 font-bold">Nessuna partita in vendita al momento</p><p className="mt-1 text-sm text-slate-500">Torna presto per le prossime aperture della biglietteria.</p></div>}
            {matches.map((match) => <article key={match.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-blue-50 text-center text-blue-800"><CalendarDays size={22}/></div><div className="min-w-0 flex-1"><h3 className="font-extrabold">{match.isHome ? `JSO — ${match.opponentName}` : `${match.opponentName} — JSO`}</h3><p className="mt-1 text-sm text-slate-500">{formatDate(match.kickoffAt)}</p>{match.venue && <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500"><MapPin size={13}/>{match.venue}</p>}</div><div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end"><span className="text-sm font-black text-[#0b347c]">{formatPrice(match.fromPrice, match.currency)}</span><a href="/billetterie" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-blue-800">Scegli posto <ArrowRight size={15}/></a></div></article>)}
          </div>
          <a href="/billetterie" className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 font-extrabold text-white transition hover:bg-blue-800"><Ticket size={18}/> Vai alla biglietteria e paga online <ArrowRight size={17}/></a>
        </div>
        <div className="space-y-4">
          <QuickLink href="/account/tickets" icon={Ticket} title="I miei biglietti" description="Biglietti acquistati e QR code, se disponibili." />
          <QuickLink href="/account/memberships" icon={Crown} title="Abbonamenti" description="Consulta le tue adesioni e il relativo stato." tone="violet"/>
          <QuickLink href="/account/orders" icon={ShoppingBag} title="I miei ordini" description="Controlla acquisti e stato dei pagamenti." tone="green"/>
          <QuickLink href="/profil" icon={UserRound} title="Profilo personale" description="Aggiorna i dati del tuo account." tone="gold"/>
          <div className="rounded-2xl bg-[#071a3a] p-5 text-white"><div className="flex items-center gap-3"><CreditCard size={22} className="text-[#ffd700]"/><h3 className="font-extrabold">Pagamento protetto</h3></div><p className="mt-2 text-sm leading-6 text-white/75">La prenotazione e il pagamento vengono gestiti dal flusso ufficiale della biglietteria. La conferma dipende dal provider di pagamento.</p></div>
        </div>
      </section>
      <p className="mt-7 text-center text-xs text-slate-400">JSO · Jeunesse Sportive de Oudhref</p>
    </main>
    <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthenticated={(result) => { fan.signIn(result); setAuthOpen(false) }} />
  </div>
}
