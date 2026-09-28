import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, XCircle, RefreshCw } from 'lucide-react'
import { shopOrderApi, ticketApi, supporterApi, membershipApi, matchStreamApi } from '../../lib/api'

const FAN_TOKEN_KEY = 'jso_fan_token'

// Landing page shown after the fan comes back from the provider's hosted
// payment page. It NEVER marks anything paid: it only reads the current payable
// status (set server-side by the verified webhook) and reflects it.
//
// It is GENERIC over the payable type so the same page serves the shop,
// ticketing and the supporters' wall. The type is carried in the URL:
//   - Shop (legacy):  /payment/success?orderId=<guid>
//   - Ticket/Brick:   /payment/success?payableType=TicketOrder|SupporterBrick&payableId=<guid>
// Two entry paths, decided by the URL (/payment/success or /payment/cancel):
//   - success: the payment may still be "en cours de vérification" until the
//     webhook lands, so we poll the payable status a few times.
//   - cancel: the fan abandoned the payment; we simply say so.

// Maps each payable type to how we fetch it and how we read a "paid" / "failed"
// status from its response, so the UI logic stays uniform.
function resolvePayable(params) {
  const orderId = params.get('orderId')
  const payableType = params.get('payableType')
  const payableId = params.get('payableId')

  // Legacy shop links carry only orderId.
  if (orderId && !payableType) {
    return {
      id: orderId,
      fetch: (token) => shopOrderApi.myOrder(orderId, token),
      // Shop order status: Paid / Cancelled / Failed / Pending.
      isPaid: (s) => s === 'Paid',
      isFailed: (s) => s === 'Cancelled' || s === 'Failed',
      readStatus: (r) => r?.status || 'Pending',
    }
  }

  if (payableType === 'TicketOrder' && payableId) {
    return {
      id: payableId,
      fetch: (token) => ticketApi.myTicket(payableId, token),
      // Ticket status: Confirmed (paid) / Cancelled / Pending.
      isPaid: (s) => s === 'Confirmed',
      isFailed: (s) => s === 'Cancelled',
      readStatus: (r) => r?.status || 'Pending',
    }
  }

  if (payableType === 'SupporterBrick' && payableId) {
    return {
      id: payableId,
      fetch: (token) => supporterApi.myBrick(payableId, token),
      // Brick payment status: Paid / Pending (moderation is separate and never
      // exposed here).
      isPaid: (s) => s === 'Paid',
      isFailed: () => false,
      readStatus: (r) => r?.paymentStatus || 'Pending',
    }
  }

  if (payableType === 'Membership' && payableId) {
    return {
      id: payableId,
      fetch: (token) => membershipApi.myMembership(payableId, token),
      // Membership payment status: Paid / Pending (lifecycle Status is Active
      // once paid, but PaymentStatus is the payment source of truth).
      isPaid: (s) => s === 'Paid',
      isFailed: () => false,
      readStatus: (r) => r?.paymentStatus || 'Pending',
    }
  }

  if (payableType === 'MatchStreamAccess' && payableId) {
    return {
      id: payableId,
      fetch: (token) => matchStreamApi.access(payableId, token),
      // Access status: Paid / Pending.
      isPaid: (s) => s === 'Paid',
      isFailed: () => false,
      readStatus: (r) => r?.status || 'Pending',
    }
  }

  return null
}

export default function PaymentReturn() {
  const params = new URLSearchParams(window.location.search)
  const outcome = window.location.pathname.includes('/cancel') ? 'cancel' : 'success'
  const payable = resolvePayable(params)

  const [status, setStatus] = useState(outcome === 'cancel' ? 'Cancelled' : null)
  const [loading, setLoading] = useState(outcome === 'success' && !!payable)
  const [error, setError] = useState('')

  const token = (() => { try { return localStorage.getItem(FAN_TOKEN_KEY) } catch { return null } })()

  async function refresh() {
    if (!payable || !token) { setLoading(false); return }
    setLoading(true)
    setError('')
    try {
      const row = await payable.fetch(token)
      setStatus(payable.readStatus(row))
    } catch (e) {
      setError(e?.message || 'Impossible de récupérer le statut du paiement.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (outcome !== 'success' || !payable || !token) {
      setLoading(false)
      return undefined
    }
    let active = true
    let attempts = 0
    let timer = null

    async function poll() {
      attempts += 1
      try {
        const row = await payable.fetch(token)
        if (!active) return
        const s = payable.readStatus(row)
        setStatus(s)
        setLoading(false)
        // Keep polling while still pending (webhook may not have landed yet).
        if (!payable.isPaid(s) && !payable.isFailed(s) && attempts < 5) {
          timer = setTimeout(poll, 2500)
        }
      } catch (e) {
        if (!active) return
        setError(e?.message || 'Impossible de récupérer le statut du paiement.')
        setLoading(false)
      }
    }
    poll()
    return () => { active = false; if (timer) clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isPaid = payable ? payable.isPaid(status) : status === 'Paid'
  const isCancelled = payable ? (payable.isFailed(status) || status === 'Cancelled') : (status === 'Cancelled' || status === 'Failed')
  const isPending = !isPaid && !isCancelled

  return (
    <div className="grid min-h-screen place-items-center bg-jso-paper px-4 text-jso-ink">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <RefreshCw size={40} className="animate-spin text-jso-blue" />
            <h1 className="text-2xl font-black">Paiement en cours de vérification…</h1>
            <p className="text-sm text-slate-500">Nous confirmons votre paiement auprès du prestataire. Merci de patienter quelques instants.</p>
          </div>
        ) : isPaid ? (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle2 size={48} className="text-emerald-600" />
            <h1 className="text-2xl font-black">Paiement confirmé</h1>
            <p className="text-sm text-slate-500">Merci ! Votre paiement a bien été confirmé.</p>
          </div>
        ) : isCancelled ? (
          <div className="flex flex-col items-center gap-4">
            <XCircle size={48} className="text-red-600" />
            <h1 className="text-2xl font-black">Paiement annulé</h1>
            <p className="text-sm text-slate-500">Votre paiement n’a pas été finalisé. Vous pouvez réessayer.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Clock size={48} className="text-amber-500" />
            <h1 className="text-2xl font-black">En cours de vérification</h1>
            <p className="text-sm text-slate-500">Votre paiement est en cours de traitement. Le statut sera mis à jour automatiquement dès la confirmation du prestataire.</p>
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
            <button onClick={refresh} className="rounded-full border border-slate-200 px-5 py-2 text-sm font-bold hover:border-jso-blue">Actualiser</button>
          </div>
        )}
        <a href="/" className="mt-6 inline-block rounded-full bg-jso-navy px-6 py-3 font-extrabold text-white hover:bg-jso-blue">Retour à l’accueil</a>
        {isPending && !loading && <p className="mt-3 text-xs text-slate-400">Statut actuel : {status || 'inconnu'}</p>}
      </div>
    </div>
  )
}
