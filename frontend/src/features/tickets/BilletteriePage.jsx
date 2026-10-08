import { useEffect, useState, useCallback } from 'react'
import { CalendarDays, MapPin, Ticket, Minus, Plus, LogIn, X, CheckCircle2 } from 'lucide-react'
import { ticketApi } from '../../lib/api'
import { formatDateTime, formatMoney } from '../../lib/format'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useFanSession } from '../account/useFanSession'
import AuthModal from '../account/AuthModal'
import PayOnlineButton from '../shop/PayOnlineButton'
import StandalonePageHeader from '../site/StandalonePageHeader'

// Standalone public billetterie page (route /billetterie). It is the first and
// only place a fan can actually buy match tickets in the web app: it lists every
// published match on sale (from GET /tickets/matches), and for the match the fan
// opens, its active ticket types (GET /tickets/match/{id}). Buying requires a fan
// account, so the page carries its own fan session and shows the AuthModal on
// demand; the reservation + payment reuse the exact shop/membership flow
// (reserve -> PayOnlineButton -> hosted provider page, confirmed server-side by
// the webhook).

// Home/away label mirroring the admin match label style.
function matchTitle(match) {
  return match.isHome ? `JSO — ${match.opponentName}` : `${match.opponentName} — JSO`
}

// Single match card: header (opponent, date, venue, from-price) + inline
// purchase panel that loads ticket types on demand when expanded.
function MatchCard({ match, expanded, onToggle, fan, onNeedAuth }) {
  const [types, setTypes] = useState(null)
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [typesError, setTypesError] = useState('')

  useEffect(() => {
    if (!expanded || types) return undefined
    const controller = new AbortController()
    setLoadingTypes(true)
    setTypesError('')
    ticketApi.forMatch(match.id, controller.signal)
      .then((list) => setTypes(Array.isArray(list) ? list : []))
      .catch((error) => { if (error.name !== 'AbortError') setTypesError('Impossible de charger les billets pour ce match.') })
      .finally(() => setLoadingTypes(false))
    return () => controller.abort()
  }, [expanded, match.id, types])

  const soldOut = match.available <= 0

  return (
    <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-jso-navy/5 px-3 py-1 text-xs font-extrabold tracking-[0.15em] text-jso-navy">
            {match.isHome ? 'À DOMICILE' : 'À L’EXTÉRIEUR'}
          </span>
          <h2 className="mt-3 truncate text-2xl font-black text-jso-ink sm:text-3xl">{matchTitle(match)}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5"><CalendarDays size={16} aria-hidden="true" className="text-jso-blue" /> {formatDateTime(match.kickoffAt)}</span>
            {match.venue && <span className="inline-flex items-center gap-1.5"><MapPin size={16} aria-hidden="true" className="text-jso-blue" /> {match.venue}</span>}
          </div>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          {match.fromPrice != null && (
            <p className="text-sm font-bold text-slate-400">À partir de</p>
          )}
          <p className="text-2xl font-black text-jso-navy">
            {match.fromPrice != null ? formatMoney(match.fromPrice, match.currency) : 'Sur place'}
          </p>
          <p className={`mt-1 text-xs font-extrabold ${soldOut ? 'text-red-500' : 'text-green-600'}`}>
            {soldOut ? 'Complet' : `${match.available} place${match.available > 1 ? 's' : ''} disponibles`}
          </p>
          <button
            type="button"
            onClick={onToggle}
            disabled={soldOut}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-jso-gold px-6 py-3 font-extrabold text-jso-navy transition hover:-translate-y-0.5 hover:bg-jso-navy hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Ticket size={18} aria-hidden="true" />
            {expanded ? 'Masquer les billets' : 'Acheter un billet'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-jso-paper/60 p-6 sm:p-8">
          {loadingTypes ? (
            <p className="text-sm font-semibold text-slate-500">Chargement des billets…</p>
          ) : typesError ? (
            <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{typesError}</p>
          ) : !types || types.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500">Aucun billet en vente pour ce match pour le moment.</p>
          ) : (
            <div className="grid gap-4">
              {types.map((type) => (
                <TicketTypeRow key={type.id} type={type} fan={fan} onNeedAuth={onNeedAuth} />
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  )
}

// One ticket type with a quantity stepper, reserve and pay. The whole purchase
// lives here so each row keeps its own reservation/payment state.
function TicketTypeRow({ type, fan, onNeedAuth }) {
  const [quantity, setQuantity] = useState(1)
  const [reserving, setReserving] = useState(false)
  const [error, setError] = useState('')
  const [orderId, setOrderId] = useState(null)

  const max = Math.min(10, type.available ?? 0)
  const soldOut = max <= 0

  async function handleReserve() {
    if (fan.status !== 'authenticated' || !fan.token) {
      onNeedAuth()
      return
    }
    setError('')
    setReserving(true)
    try {
      const order = await ticketApi.reserve({ ticketTypeId: type.id, quantity }, fan.token)
      setOrderId(order.id)
    } catch (e) {
      setError(e?.message || 'La réservation a échoué. Veuillez réessayer.')
    } finally {
      setReserving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-lg font-black text-jso-ink">{type.name}</p>
          <p className="text-sm font-bold text-jso-navy">{formatMoney(type.price, type.currency)}</p>
          <p className={`text-xs font-extrabold ${soldOut ? 'text-red-500' : 'text-slate-400'}`}>
            {soldOut ? 'Épuisé' : `${type.available} disponibles`}
          </p>
        </div>

        {!orderId && !soldOut && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Diminuer la quantité"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-jso-navy transition hover:border-jso-blue disabled:opacity-40"
            >
              <Minus size={16} aria-hidden="true" />
            </button>
            <span className="w-8 text-center text-lg font-black" aria-live="polite">{quantity}</span>
            <button
              type="button"
              aria-label="Augmenter la quantité"
              onClick={() => setQuantity((q) => Math.min(max, q + 1))}
              disabled={quantity >= max}
              className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-jso-navy transition hover:border-jso-blue disabled:opacity-40"
            >
              <Plus size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      {orderId ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-jso-paper/60 p-5">
          <p className="inline-flex items-center gap-2 text-sm font-extrabold text-green-700">
            <CheckCircle2 size={18} aria-hidden="true" /> Réservation créée. Finalisez le paiement pour recevoir votre billet.
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {quantity} × {type.name} — {formatMoney(type.price * quantity, type.currency)}
          </p>
          <div className="mt-4">
            <PayOnlineButton pay={(country) => ticketApi.pay(orderId, country, fan.token)} label="Payer mon billet" />
          </div>
        </div>
      ) : !soldOut && (
        <button
          type="button"
          onClick={handleReserve}
          disabled={reserving}
          className="mt-4 w-full rounded-xl bg-jso-navy px-6 py-3 font-extrabold text-white transition hover:bg-jso-blue disabled:opacity-60 sm:w-auto"
        >
          {reserving ? 'Réservation…' : fan.status === 'authenticated'
            ? `Réserver ${quantity} billet${quantity > 1 ? 's' : ''}`
            : 'Se connecter pour réserver'}
        </button>
      )}
    </div>
  )
}

export default function BilletteriePage() {
  const fan = useFanSession()
  const [state, setState] = useState({ status: 'loading', matches: [] })
  const [expandedId, setExpandedId] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  useDocumentTitle('Billetterie')

  useEffect(() => {
    const controller = new AbortController()
    ticketApi.matchesOnSale(controller.signal)
      .then((list) => setState({ status: 'ready', matches: Array.isArray(list) ? list : [] }))
      .catch((error) => { if (error.name !== 'AbortError') setState({ status: 'error', matches: [] }) })
    return () => controller.abort()
  }, [])

  const openAuth = useCallback(() => setAuthOpen(true), [])

  return (
    <div className="min-h-screen bg-jso-paper text-jso-ink">
      <StandalonePageHeader>
        {fan.status !== 'authenticated' && <button type="button" onClick={openAuth} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-white/10"><LogIn size={16} aria-hidden="true" /> Connexion</button>}
      </StandalonePageHeader>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-5xl px-5 py-16 lg:px-8">
        <p className="text-xs font-extrabold tracking-[0.2em] text-jso-blue">BILLETTERIE</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Achetez vos billets</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-500">
          Réservez votre place pour les prochains matchs de la Jeunesse Sportive de Oudhref et payez en ligne en toute sécurité.
        </p>

        <div className="mt-10 space-y-6">
          {state.status === 'loading' ? (
            <div role="status" className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center text-slate-500">Chargement de la billetterie…</div>
          ) : state.status === 'error' ? (
            <div role="alert" className="rounded-[2rem] border border-amber-200 bg-amber-50 p-10 text-center text-amber-900">La billetterie est momentanément indisponible.</div>
          ) : state.matches.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
              <Ticket size={40} aria-hidden="true" className="mx-auto text-slate-300" />
              <p className="mt-4 text-lg font-black text-jso-ink">Aucun match en vente pour le moment</p>
              <p className="mt-1 text-slate-500">Revenez bientôt : les billets des prochains matchs seront disponibles ici.</p>
            </div>
          ) : (
            state.matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                expanded={expandedId === match.id}
                onToggle={() => setExpandedId((id) => (id === match.id ? null : match.id))}
                fan={fan}
                onNeedAuth={openAuth}
              />
            ))
          )}
        </div>

        {fan.status === 'authenticated' && (
          <p className="mt-8 text-center text-sm font-semibold text-slate-400">
            Connecté en tant que {fan.user?.displayName || fan.user?.email}. Retrouvez vos billets dans votre espace supporter.
          </p>
        )}
      </main>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthenticated={(result) => { fan.signIn(result); setAuthOpen(false) }}
      />

      {/* Simple footer link back, keeps the page focused on buying. */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-8 lg:px-8">
          <a href="/" className="inline-flex items-center gap-2 text-sm font-extrabold text-jso-navy hover:text-jso-blue">
            <X size={16} aria-hidden="true" className="rotate-45" /> Retour à l’accueil
          </a>
          <p className="text-xs font-semibold text-slate-400">© {new Date().getFullYear()} Jeunesse Sportive de Oudhref</p>
        </div>
      </footer>
    </div>
  )
}
