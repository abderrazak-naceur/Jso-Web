import { useState } from 'react'
import { X, Trash2, ShoppingBag } from 'lucide-react'
import { shopOrderApi } from '../../lib/api'

// Slide-over cart + checkout. Controlled via props. Requires a fan token to
// place the order; if the fan is not logged in, it invites them to sign in
// (the parent decides how, via onRequireLogin). The order is created server-side
// (prices recomputed there); payment is confirmed later by the club (manual
// gateway), so after ordering the fan sees a "commande enregistrée" state.
export default function CartDrawer({ open, cart, token, onClose, onRequireLogin }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [placed, setPlaced] = useState(null)

  if (!open) return null

  const money = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cart.currency || 'TND' }).format(n || 0)

  async function checkout() {
    setError('')
    if (!token) { onRequireLogin?.(); return }
    if (cart.items.length === 0) return
    setBusy(true)
    try {
      const body = { items: cart.items.map((x) => ({ productId: x.productId, quantity: x.quantity })) }
      const order = await shopOrderApi.create(body, token)
      cart.clear()
      setPlaced(order)
    } catch (e) {
      setError(e?.message || 'La commande a échoué. Veuillez réessayer.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-jso-navy/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Panier">
      <div className="flex h-full w-full max-w-md flex-col bg-white text-jso-ink shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-2"><ShoppingBag size={20} className="text-jso-blue" /><h2 className="text-xl font-black">Mon panier</h2></div>
          <button onClick={onClose} aria-label="Fermer" className="rounded-full border border-slate-200 p-2"><X size={18} /></button>
        </div>

        {placed ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><ShoppingBag size={28} /></div>
            <h3 className="text-2xl font-black">Commande enregistrée</h3>
            <p className="text-sm text-slate-500">Votre commande d’un montant de {money(placed.total)} a bien été enregistrée. Le club confirmera le paiement et vous tiendra informé. Retrouvez-la dans « Mes commandes ».</p>
            <button onClick={onClose} className="mt-2 rounded-full bg-jso-navy px-6 py-3 font-extrabold text-white hover:bg-jso-blue">Fermer</button>
          </div>
        ) : cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-slate-500">
            <ShoppingBag size={40} className="text-slate-300" />
            <p className="font-semibold">Votre panier est vide.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {cart.items.map((x) => (
                  <div key={x.productId} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      {x.imageUrl ? <img src={x.imageUrl} alt={x.name} className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{x.name}</p>
                      <p className="text-sm text-slate-500">{money(x.price)}</p>
                    </div>
                    <input
                      type="number" min="1" max="99" value={x.quantity}
                      onChange={(e) => cart.setQuantity(x.productId, e.target.value)}
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-center outline-none focus:border-jso-blue"
                      aria-label={'Quantité ' + x.name}
                    />
                    <button onClick={() => cart.remove(x.productId)} className="text-red-600" aria-label="Retirer"><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-200 px-6 py-5">
              {error && <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
              <div className="mb-4 flex items-center justify-between text-lg font-black"><span>Total</span><span>{money(cart.total)}</span></div>
              <button onClick={checkout} disabled={busy} className="w-full rounded-xl bg-jso-navy px-4 py-3 font-extrabold text-white hover:bg-jso-blue disabled:opacity-60">
                {busy ? 'Traitement…' : token ? 'Passer la commande' : 'Se connecter pour commander'}
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">Paiement confirmé par le club (retrait au club).</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
