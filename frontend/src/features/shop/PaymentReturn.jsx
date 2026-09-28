import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, XCircle, RefreshCw } from 'lucide-react'
import { shopOrderApi } from '../../lib/api'

const FAN_TOKEN_KEY = 'jso_fan_token'

// Landing page shown after the fan comes back from the provider's hosted
// payment page. It NEVER marks an order paid: it only reads the current order
// status (which is set server-side by the verified webhook) and reflects it.
// Two entry paths, decided by the URL (/payment/success or /payment/cancel):
//   - success: the payment may still be "en cours de vérification" until the
//     webhook lands, so we poll GetMyOrder a few times.
//   - cancel: the fan abandoned the payment; we simply say so.
export default function PaymentReturn() {
  const params = new URLSearchParams(window.location.search)
  const orderId = params.get('orderId')
  const outcome = window.location.pathname.includes('/cancel') ? 'cancel' : 'success'

  const [status, setStatus] = useState(outcome === 'cancel' ? 'Cancelled' : null)
  const [loading, setLoading] = useState(outcome === 'success')
  const [error, setError] = useState('')

  const token = (() => { try { return localStorage.getItem(FAN_TOKEN_KEY) } catch { return null } })()

  async function refresh() {
    if (!orderId || !token) { setLoading(false); return }
    setLoading(true)
    setError('')
    try {
      const order = await shopOrderApi.myOrder(orderId, token)
      setStatus(order?.status || 'Pending')
    } catch (e) {
      setError(e?.message || 'Impossible de récupérer le statut de la commande.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (outcome !== 'success' || !orderId || !token) {
      setLoading(false)
      return undefined
    }
    let active = true
    let attempts = 0
    let timer = null

    async function poll() {
      attempts += 1
      try {
        const order = await shopOrderApi.myOrder(orderId, token)
        if (!active) return
        setStatus(order?.status || 'Pending')
        setLoading(false)
        // Keep polling while still pending (webhook may not have landed yet).
        if ((order?.status === 'Pending') && attempts < 5) {
          timer = setTimeout(poll, 2500)
        }
      } catch (e) {
        if (!active) return
        setError(e?.message || 'Impossible de récupérer le statut de la commande.')
        setLoading(false)
      }
    }
    poll()
    return () => { active = false; if (timer) clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const isPaid = status === 'Paid'
  const isCancelled = status === 'Cancelled' || status === 'Failed'
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
            <p className="text-sm text-slate-500">Merci ! Votre commande a bien été payée. Retrouvez-la dans « Mes commandes ».</p>
          </div>
        ) : isCancelled ? (
          <div className="flex flex-col items-center gap-4">
            <XCircle size={48} className="text-red-600" />
            <h1 className="text-2xl font-black">Paiement annulé</h1>
            <p className="text-sm text-slate-500">Votre paiement n’a pas été finalisé. Vous pouvez réessayer depuis votre panier.</p>
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
