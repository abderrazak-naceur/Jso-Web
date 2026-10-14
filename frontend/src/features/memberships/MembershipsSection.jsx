import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Heart, LockKeyhole, ShieldCheck, ShoppingCart, Sparkles, Trophy, UsersRound } from 'lucide-react'
import { membershipApi } from '../../lib/api'
import PayOnlineButton from '../shop/PayOnlineButton'

const CARD_ART = '/img/jso-membership-card-2026-2027.svg'

export default function MembershipsSection({ section, token, onRequireLogin }) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [pending, setPending] = useState(null)
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

  const money = (n, c) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c || 'TND', maximumFractionDigits: 3 }).format(n || 0)

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
    <section id={section?.id || 'memberships'} aria-labelledby="memberships-title" className="relative isolate overflow-hidden bg-[#030a39] px-4 py-14 text-white sm:px-6 sm:py-20 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-yellow-300/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(255,216,61,0.16),transparent_52%)]" />
      </div>

      <div className="mx-auto max-w-6xl">
        <header className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-300/50 bg-yellow-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-yellow-200 shadow-[0_0_30px_rgba(255,216,61,.12)]">
            <Sparkles size={14} aria-hidden="true" /> Saison 2026–2027
          </span>
          <h2 id="memberships-title" className="mt-5 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            {section?.label || 'Abonnements'} <span className="text-[#ffdc3d]">JSO</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-blue-100/90 sm:text-lg">
            Plus qu’un abonnement, <span className="font-extrabold text-[#ffdc3d]">une fierté</span>. Vivez toute la saison 2026–2027 aux couleurs du club.
          </p>
        </header>

        <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-2 md:gap-6">
          <figure className="group relative overflow-hidden rounded-[1.75rem] border border-yellow-200/60 bg-[#121b61] shadow-[0_18px_70px_rgba(0,0,0,.38)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_80px_rgba(255,216,61,.14)]">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/10 via-transparent to-blue-500/15" aria-hidden="true" />
            <img src={CARD_ART} alt="Recto et verso de la carte officielle d’abonnement JSO 2026–2027" className="relative aspect-[4/3] w-full object-contain p-2 sm:p-3" loading="lazy" decoding="async" />
            <figcaption className="sr-only">Carte officielle d’abonnement JSO, saison 2026–2027</figcaption>
            <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-white/10" />
          </figure>
          <div className="flex flex-col justify-center rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-6 shadow-xl backdrop-blur-md sm:p-8">
            <span className="w-fit rounded-full bg-[#ffdc3d] px-4 py-1.5 text-xs font-black uppercase tracking-wide text-[#06103f]">Carte officielle</span>
            <h3 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">Abonnement annuel <span className="text-[#ffdc3d]">2026–2027</span></h3>
            <p className="mt-4 text-sm leading-6 text-blue-100/85 sm:text-base">La carte de soutien officielle JSO pour la nouvelle saison. Rejoignez les supporters et partagez la fierté du club.</p>
            <div className="mt-6 grid gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#07113f]/70 p-3.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-yellow-300/20 bg-yellow-300/10 text-[#ffdc3d]"><CalendarDays size={21} /></span>
                <div><p className="font-bold">Saison sportive 2026–2027</p><p className="mt-0.5 text-sm text-blue-100/70">L’abonnement pour la nouvelle saison</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#07113f]/70 p-3.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-yellow-300/20 bg-yellow-300/10 text-[#ffdc3d]"><ShieldCheck size={21} /></span>
                <div><p className="font-bold">Validité : selon la formule</p><p className="mt-0.5 text-sm text-blue-100/70">Calculée après activation</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#07113f]/70 p-3.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-yellow-300/20 bg-yellow-300/10 text-[#ffdc3d]"><LockKeyhole size={21} /></span>
                <div><p className="font-bold">Paiement en ligne</p><p className="mt-0.5 text-sm text-blue-100/70">Activation après confirmation du paiement</p></div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <p role="status" className="mx-auto mt-8 max-w-2xl animate-pulse rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-blue-100">Chargement des abonnements…</p>
        ) : error && !pending ? (
          <p role="alert" className="mx-auto mt-8 max-w-2xl rounded-2xl border border-red-300/30 bg-red-950/40 p-5 text-sm font-semibold text-red-100">{error}</p>
        ) : plans.length === 0 ? (
          <p className="mx-auto mt-8 max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-blue-100">Aucune formule d’abonnement disponible pour le moment.</p>
        ) : (
          <div className="mx-auto mt-8 grid max-w-5xl gap-5 md:grid-cols-2">
            {plans.map((plan) => (
              <article key={plan.id} className="flex flex-col rounded-[1.75rem] border border-yellow-200/25 bg-gradient-to-b from-[#101c5b] to-[#09113f] p-6 shadow-2xl shadow-black/20 sm:p-8">
                {plan.description && <p className="text-sm leading-6 text-blue-100/80">{plan.description}</p>}
                <p className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-yellow-200">{plan.name}</p>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-5xl font-black tracking-tight text-[#ffdc3d] sm:text-6xl">{money(plan.price, plan.currency)}</p>
                  <span className="font-bold text-blue-100/70">/ an</span>
                </div>
                <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm font-semibold text-blue-50/90">
                  <p className="flex items-center gap-3"><CheckCircle2 size={18} className="shrink-0 text-yellow-300" /> Saison sportive 2026–2027</p>
                  <p className="flex items-center gap-3"><CheckCircle2 size={18} className="shrink-0 text-yellow-300" /> Validité : {plan.durationDays} jours après activation</p>
                  <p className="flex items-center gap-3"><CheckCircle2 size={18} className="shrink-0 text-yellow-300" /> Paiement sécurisé en ligne si disponible</p>
                </div>
                {pending && pending.plan.id === plan.id ? (
                  <div className="mt-6">
                    <p className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-3 text-sm font-semibold text-emerald-200"><CheckCircle2 size={16} /> Abonnement créé. Réglez pour l’activer.</p>
                    <PayOnlineButton pay={(country) => membershipApi.pay(pending.membershipId, country, token)} label={`Payer l’abonnement — ${money(plan.price, plan.currency)}`} />
                  </div>
                ) : (
                  <button onClick={() => subscribe(plan)} disabled={subscribing && selected === plan.id} className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-[#ffdc3d] px-6 py-4 font-black text-[#07103d] shadow-[0_8px_30px_rgba(255,220,61,.22)] transition hover:bg-yellow-200 hover:shadow-[0_10px_35px_rgba(255,220,61,.32)] focus:outline-none focus:ring-4 focus:ring-yellow-300/40 disabled:cursor-not-allowed disabled:opacity-60">
                    <ShoppingCart size={19} aria-hidden="true" /> {subscribing && selected === plan.id ? 'Traitement…' : token ? 'Acheter mon abonnement' : 'Se connecter pour s’abonner'}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}

        {error && pending && <p role="alert" className="mx-auto mt-6 max-w-3xl rounded-2xl bg-red-950/50 p-4 text-sm font-semibold text-red-100">{error}</p>}

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { icon: UsersRound, title: 'Soutenez votre club', text: 'Votre abonnement contribue à faire vivre la JSO.' },
            { icon: Heart, title: 'Vivez la passion', text: 'Partagez les émotions de la saison 2026–2027.' },
            { icon: Trophy, title: 'Une grande famille', text: 'Rejoignez la communauté et portez nos couleurs.' },
          ].map(({ icon: Icon, title, text: description }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-6 text-center backdrop-blur-sm">
              <Icon size={32} className="mx-auto text-[#ffdc3d]" aria-hidden="true" />
              <h4 className="mt-3 text-lg font-black">{title}</h4>
              <p className="mt-2 text-sm leading-6 text-blue-100/75">{description}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-7 max-w-2xl text-center text-xs leading-5 text-blue-100/55">Le statut de l’abonnement est confirmé uniquement après validation du paiement par le prestataire. Les dates exactes de validité sont calculées à l’activation.</p>
      </div>
    </section>
  )
}
