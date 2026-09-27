import { useEffect, useState } from 'react'
import { X, User, ShieldCheck, Bell, Receipt } from 'lucide-react'
import { shopOrderApi } from '../../lib/api'

const ORDER_STATUS_LABELS = {
  Pending: 'En attente de paiement',
  Paid: 'Payée',
  Shipped: 'Expédiée',
  Delivered: 'Livrée',
  Cancelled: 'Annulée',
  Failed: 'Échouée',
}
const ORDER_STATUS_STYLES = {
  Pending: 'bg-amber-100 text-amber-700',
  Paid: 'bg-emerald-100 text-emerald-700',
  Shipped: 'bg-blue-100 text-blue-700',
  Delivered: 'bg-slate-200 text-slate-700',
  Cancelled: 'bg-slate-100 text-slate-500',
  Failed: 'bg-red-100 text-red-700',
}

export default function AccountSettingsModal({ open, user, token, onClose, onOpenProfile, onOpenChangePassword }) {
  const [tab, setTab] = useState('profil')
  const [orders, setOrders] = useState(null)
  const [ordersError, setOrdersError] = useState('')

  useEffect(() => {
    if (!open || tab !== 'commandes' || !token) return
    let active = true
    setOrders(null)
    setOrdersError('')
    shopOrderApi.myOrders(token)
      .then((list) => { if (active) setOrders(list || []) })
      .catch((e) => { if (active) setOrdersError(e?.message || 'Impossible de charger vos commandes.') })
    return () => { active = false }
  }, [open, tab, token])

  if (!open) return null

  const money = (n, c) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c || 'TND' }).format(n || 0)

  const tabs = [
    { id: 'profil', label: 'Profil', icon: User },
    { id: 'commandes', label: 'Mes commandes', icon: Receipt },
    { id: 'securite', label: 'Sécurité', icon: ShieldCheck },
    { id: 'preferences', label: 'Préférences', icon: Bell },
  ]

  const tabClass = (id) =>
    `rounded-full px-4 py-2 text-sm font-bold ${
      tab === id ? 'bg-jso-navy text-white' : 'text-slate-600 hover:bg-slate-100'
    }`

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-jso-navy/60 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-[2rem] bg-white p-8 text-jso-ink shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-jso-gold">
              PARAMÈTRES
            </p>
            <h2 className="text-3xl font-black">Mon compte</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full border border-slate-200 p-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={tabClass(id)}>
              <span className="inline-flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'profil' && (
            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-black">Profil</h3>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Nom</p>
                  <p className="font-semibold">{user?.displayName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Adresse e-mail
                  </p>
                  <p className="font-semibold">{user?.email || '—'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenProfile}
                className="mt-5 rounded-xl bg-jso-navy px-4 py-3 font-extrabold text-white hover:bg-jso-blue"
              >
                Modifier le profil
              </button>
            </div>
          )}

          {tab === 'commandes' && (
            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-black">Mes commandes</h3>
              {ordersError ? (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{ordersError}</p>
              ) : orders === null ? (
                <p className="mt-4 text-sm text-slate-400">Chargement…</p>
              ) : orders.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">Vous n’avez pas encore de commande. Découvrez la boutique du club !</p>
              ) : (
                <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                  {orders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                      <div>
                        <p className="font-bold">{money(o.total, o.currency)}</p>
                        <p className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'medium' })}</p>
                      </div>
                      <span className={'rounded-full px-2.5 py-1 text-xs font-extrabold ' + (ORDER_STATUS_STYLES[o.status] || 'bg-slate-100 text-slate-600')}>
                        {ORDER_STATUS_LABELS[o.status] || o.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'securite' && (
            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-black">Sécurité</h3>
              <p className="mt-3 text-sm text-slate-600">
                Gérez la sécurité de votre compte. Pour protéger votre accès, choisissez un mot de
                passe unique et suffisamment long.
              </p>
              <button
                type="button"
                onClick={onOpenChangePassword}
                className="mt-5 rounded-xl bg-jso-navy px-4 py-3 font-extrabold text-white hover:bg-jso-blue"
              >
                Changer le mot de passe
              </button>
            </div>
          )}

          {tab === 'preferences' && (
            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-black">Préférences</h3>
              <p className="mt-3 text-sm text-slate-600">
                Bientôt, vous pourrez choisir les notifications que vous souhaitez recevoir : alertes
                sur les matchs, résultats en direct et actualités du club. Vous pourrez également
                gérer votre abonnement à la newsletter directement depuis cet espace.
              </p>
              <p className="mt-4 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                Bientôt disponible
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
