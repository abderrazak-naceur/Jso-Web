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
    return (
    <section id={section?.id || 'memberships'} aria-labelledby="memberships-title" className="relative isolate overflow-hidden bg-[#11164f] px-5 py-16 text-white sm:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-60">
        <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-yellow-300/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-12 h-80 w-80 rounded-full bg-blue-500/40 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,220,60,0.12),transparent_55%)]" />
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-300/40 bg-yellow-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-yellow-200">
            Saison 2026–2027
          </span>
          <h2 id="memberships-title" className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
            {section?.label || 'Carte d’abonnement'}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-blue-100/80 sm:text-base">
            Devenez abonné pour la saison 2026–2027 et affichez votre soutien au club. L’abonnement annuel est proposé à un tarif unique de 30 TND.
          </p>
        </div>

        {loading ? (
          <p role="status" className="mx-auto mt-10 max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-blue-100">Chargement des abonnements…</p>
        ) : error && !pending ? (
          <p role="alert" className="mx-auto mt-10 max-w-2xl rounded-2xl border border-red-300/30 bg-red-950/40 p-5 text-sm font-semibold text-red-100">{error}</p>
        ) : plans.length === 0 ? (
          <p className="mx-auto mt-10 max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-blue-100">Aucune formule d’abonnement disponible pour le moment.</p>
        ) : (
          <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
            {plans.map((plan) => (
              <article key={plan.id} className="relative flex flex-col overflow-hidden rounded-[1.75rem] border border-yellow-200/30 bg-white text-slate-900 shadow-2xl shadow-black/20">
                <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-[#f8d83c] via-[#ffe977] to-[#f8d83c] px-6 py-5">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#38306b]">Carte officielle</p>
                    <h3 className="mt-1 text-xl font-black sm:text-2xl">{plan.name}</h3>
                  </div>
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[#4c4382]/15 bg-white/60 text-[#26205c]">
                    <CreditCard size={28} aria-hidden="true" />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-6 sm:p-8">
                  {plan.description && <p className="text-sm leading-6 text-slate-600">{plan.description}</p>}
                  <div className="mt-6 flex items-end gap-2">
                    <p className="text-5xl font-black tracking-tight text-[#15194f]">{money(plan.price, plan.currency)}</p>
                    <span className="pb-1 text-sm font-bold text-slate-500">/ an</span>
                  </div>
                  <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm font-semibold text-slate-700">
                    <p className="flex items-center gap-3"><CheckCircle2 size={18} className="shrink-0 text-emerald-600" /> Saison sportive 2026–2027</p>
                    <p className="flex items-center gap-3"><CheckCircle2 size={18} className="shrink-0 text-emerald-600" /> Validité : {plan.durationDays} jours après activation</p>
                    <p className="flex items-center gap-3"><CheckCircle2 size={18} className="shrink-0 text-emerald-600" /> Paiement sécurisé en ligne si disponible</p>
                  </div>

                  {pending && pending.plan.id === plan.id ? (
                    <div className="mt-6">
                      <p className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} /> Abonnement créé. Réglez pour l’activer.</p>
                      <PayOnlineButton pay={(country) => membershipApi.pay(pending.membershipId, country, token)} label="Payer l’abonnement — 30 TND" />
                    </div>
                  ) : (
                    <button
                      onClick={() => subscribe(plan)}
                      disabled={subscribing && selected === plan.id}
                      className="mt-7 rounded-full bg-[#171b55] px-6 py-3.5 font-extrabold text-white transition hover:bg-[#292f82] focus:outline-none focus:ring-4 focus:ring-yellow-300/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {subscribing && selected === plan.id ? 'Traitement…' : token ? 'Acheter mon abonnement' : 'Se connecter pour s’abonner'}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        {error && pending && <p role="alert" className="mx-auto mt-6 max-w-3xl rounded-2xl bg-red-950/50 p-4 text-sm font-semibold text-red-100">{error}</p>}
        <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-5 text-blue-100/60">Le statut de l’abonnement est confirmé après validation du paiement par le prestataire. Les dates exactes de validité sont calculées à l’activation.</p>
      </div>
    </section>
  )
}
