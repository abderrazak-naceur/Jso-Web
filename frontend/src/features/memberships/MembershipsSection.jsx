import { useEffect, useState } from 'react'
import { CreditCard, CheckCircle2 } from 'lucide-react'
import { membershipApi } from '../../lib/api'
import PayOnlineButton from '../shop/PayOnlineButton'

// Public supporter memberships section (idea B: monetisation). Anyone can browse
// the active plans; a signed-in fan subscribes (server recomputes the price) and
// pays online via the shared hosted-payment flow (PayOnlineButton). The
// membership becomes Active only server-side via the verified webhook. Loading,
// empty and error states are handled; no card data ever touches our servers.
export default function MembershipsSection({ section, token, onRequireLogin }) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [pending, setPending] = useState(null) // { membershipId }
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    membershipApi.plans(controller.signal)
      .then((rows) => { setPlans(Array.isArray(rows) ? rows : []); setError('') })
      .catch((e) => { if (!controller.signal.aborted) setError(e?.message || 'Erreur de chargement.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  const money = (n, c) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c || 'TND' }).format(n || 0)

  async function subscribe(plan) {
    setError('')
    if (!token) { onRequireLogin?.(); return }
    setSelected(plan.id)
    setSubscribing(true)
    try {
      const membership = await membershipApi.subscribe(plan.id, token)
      setPending({ membershipId: membership.id ?? membership.Id, plan })
    } catch (e) {
      setError(e?.message || 'La souscription a échoué. Veuillez réessayer.')
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <section id={section?.id || 'memberships'} aria-labelledby="memberships-title" className="mx-auto max-w-6xl px-5 py-14 lg:py-20">
      <div className="flex items-center gap-3">
        <CreditCard className="text-jso-blue" size={22} aria-hidden="true" />
        <h2 id="memberships-title" className="text-3xl font-black sm:text-4xl">{section?.label || 'Abonnements'}</h2>
      </div>
      <p className="mt-3 max-w-2xl text-slate-500">Soutenez la JSO en devenant abonné. Choisissez une formule et réglez en ligne en toute sécurité.</p>

      {loading ? (
        <p role="status" className="mt-8 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Chargement des abonnements…</p>
      ) : error && !pending ? (
        <p className="mt-8 rounded-2xl bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</p>
      ) : plans.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Aucune formule d’abonnement disponible pour le moment.</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.id} className="flex flex-col rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-black">{plan.name}</h3>
              {plan.description && <p className="mt-2 flex-1 text-sm text-slate-500">{plan.description}</p>}
              <p className="mt-4 text-3xl font-black text-jso-navy">{money(plan.price, plan.currency)}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">Durée : {plan.durationDays} jours</p>

              {pending && pending.plan.id === plan.id ? (
                <div className="mt-5">
                  <p className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} /> Abonnement créé. Réglez pour l’activer.</p>
                  <PayOnlineButton pay={(country) => membershipApi.pay(pending.membershipId, country, token)} label="Payer l’abonnement" />
                </div>
              ) : (
                <button
                  onClick={() => subscribe(plan)}
                  disabled={subscribing && selected === plan.id}
                  className="mt-5 rounded-full bg-jso-navy px-6 py-3 font-extrabold text-white hover:bg-jso-blue disabled:opacity-60"
                >
                  {subscribing && selected === plan.id ? 'Traitement…' : token ? 'S’abonner' : 'Se connecter pour s’abonner'}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      {error && pending && <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
    </section>
  )
}
