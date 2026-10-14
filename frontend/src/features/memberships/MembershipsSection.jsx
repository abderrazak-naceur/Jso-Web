import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Heart, LockKeyhole, ShieldCheck, ShoppingCart, Sparkles, Ticket, Trophy, UsersRound } from 'lucide-react'
import { membershipApi } from '../../lib/api'
import PayOnlineButton from '../shop/PayOnlineButton'

const CARD_ART = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3DuYKVhdmNmMSAGu9ckyEmyckau/bc085e64-e8a5-4878-8383-da4cdaf30fd5.jpg'

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
    <section id={section?.id || 'memberships'} aria-labelledby="memberships-title" className="relative isolate overflow-hidden bg-[#06113f] px-4 py-10 text-white sm:px-6 sm:py-14 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_18%,rgba(30,75,190,.58),transparent_48%),radial-gradient(ellipse_at_12%_55%,rgba(255,214,52,.12),transparent_35%),linear-gradient(180deg,#07113d_0%,#06164d_54%,#041039_100%)]" />
        <div className="absolute -left-28 top-56 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -right-20 top-72 h-96 w-96 rounded-full bg-yellow-300/15 blur-3xl" />
        <div className="absolute inset-0 opacity-[.12] bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[size:22px_22px]" />
      </div>

      <div className="mx-auto max-w-6xl">
        <header className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-300/60 bg-[#111b4e]/80 px-5 py-2 text-xs font-black uppercase tracking-[0.22em] text-yellow-200 shadow-[0_0_28px_rgba(255,216,61,.16)]">
            <Sparkles size={14} aria-hidden="true" /> Saison 2026–2027
          </span>
          <h2 id="memberships-title" className="mt-4 text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl">
            {section?.label || 'Abonnements'} <span className="text-[#ffdc3d]">JSO</span>
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-lg font-medium leading-8 text-blue-50 sm:text-2xl">
            Plus qu’un abonnement, <span className="font-extrabold text-[#ffdc3d]">une fierté</span>
          </p>
        </header>

        <figure className="relative mx-auto mt-7 max-w-5xl overflow-hidden rounded-[1.75rem] border border-yellow-200/50 bg-[#101b5a]/70 shadow-[0_20px_70px_rgba(0,0,0,.42)] sm:mt-9">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/10 via-transparent to-blue-400/10" aria-hidden="true" />
          <img
            src={CARD_ART}
            alt="Recto et verso de la carte d’abonnement JSO pour la saison 2026–2027"
            className="relative mx-auto block w-full object-contain p-2 sm:p-4"
            loading="eager"
            decoding="async"
          />
          <figcaption className="sr-only">Carte d’abonnement JSO, saison 2026–2027</figcaption>
        </figure>

        <div className="mx-auto mt-7 max-w-5xl rounded-[2rem] border border-white/15 bg-[#071541]/85 p-5 shadow-[0_22px_70px_rgba(0,0,0,.32)] backdrop-blur-xl sm:mt-10 sm:p-8 lg:p-10">
          <div className="grid gap-7 lg:grid-cols-[1.15fr_.85fr] lg:gap-9">
            <div className="flex flex-col">
              <span className="w-fit rounded-full bg-[#ffdc3d] px-4 py-2 text-xs font-black uppercase tracking-wide text-[#06103f]">Carte officielle</span>
              <h3 className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">Abonnement annuel <span className="text-[#ffdc3d]">2026–2027</span></h3>
              <p className="mt-4 max-w-xl text-base leading-7 text-blue-50/90">Carte d’abonnement annuelle JSO pour la saison 2026–2027. Soutenez votre club et vivez tous les matchs avec nous.</p>

              {loading ? (
                <p role="status" className="mt-6 animate-pulse rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-blue-100">Chargement des abonnements…</p>
              ) : error && !pending ? (
                <p role="alert" className="mt-6 rounded-2xl border border-red-300/30 bg-red-950/40 p-4 text-sm font-semibold text-red-100">{error}</p>
              ) : plans.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-blue-100">Aucune formule d’abonnement disponible pour le moment.</p>
              ) : (
                <div className="mt-6 space-y-4">
                  {plans.map((plan) => (
                    <article key={plan.id} className="rounded-2xl border border-yellow-200/25 bg-[#030d32]/75 p-4 sm:p-5">
                      {plan.description && <p className="mb-2 text-sm leading-6 text-blue-100/80">{plan.description}</p>}
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-200">{plan.name}</p>
                      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <p className="text-4xl font-black tracking-tight text-[#ffdc3d] sm:text-5xl">{money(plan.price, plan.currency)}</p>
                        <span className="font-bold text-blue-100/75">/ an</span>
                      </div>
                      <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-sm font-semibold text-blue-50/90">
                        <p className="flex items-center gap-2"><CheckCircle2 size={17} className="shrink-0 text-yellow-300" /> Saison sportive 2026–2027</p>
                        <p className="flex items-center gap-2"><CheckCircle2 size={17} className="shrink-0 text-yellow-300" /> Validité : {plan.durationDays} jours après activation</p>
                      </div>
                      {pending && pending.plan.id === plan.id ? (
                        <div className="mt-4">
                          <p className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-3 text-sm font-semibold text-emerald-200"><CheckCircle2 size={16} /> Abonnement créé. Réglez pour l’activer.</p>
                          <PayOnlineButton pay={(country) => membershipApi.pay(pending.membershipId, country, token)} label={`Payer l’abonnement — ${money(plan.price, plan.currency)}`} />
                        </div>
                      ) : (
                        <button onClick={() => subscribe(plan)} disabled={subscribing && selected === plan.id} className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#ffe65a] to-[#ffca28] px-6 py-4 text-base font-black text-[#07103d] shadow-[0_8px_30px_rgba(255,220,61,.22)] transition hover:brightness-105 focus:outline-none focus:ring-4 focus:ring-yellow-300/40 disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg">
                          <ShoppingCart size={21} aria-hidden="true" /> {subscribing && selected === plan.id ? 'Traitement…' : token ? 'Acheter mon abonnement' : 'Se connecter pour s’abonner'} <span aria-hidden="true">→</span>
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
              {error && pending && <p role="alert" className="mt-4 rounded-xl bg-red-950/50 p-4 text-sm font-semibold text-red-100">{error}</p>}
              <p className="mt-4 text-center text-xs leading-5 text-blue-100/70">ⓘ Le statut de l’abonnement est confirmé après validation du paiement.</p>
            </div>

            <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {[
                { icon: CalendarDays, title: 'Saison sportive 2026–2027', text: 'Accès aux matchs de la saison' },
                { icon: ShieldCheck, title: 'Validité : 365 jours', text: 'Après activation de votre carte' },
                { icon: Ticket, title: 'Carte officielle digitale', text: 'Avec QR Code et numéro unique' },
                { icon: LockKeyhole, title: 'Paiement sécurisé en ligne', text: 'Simple, rapide et fiable' },
              ].map(({ icon: Icon, title, text: description }) => (
                <div key={title} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0a1a4b]/80 p-4 sm:p-5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-yellow-300/25 bg-yellow-300/10 text-[#ffdc3d]"><Icon size={23} aria-hidden="true" /></span>
                  <div><p className="font-bold leading-snug">{title}</p><p className="mt-1 text-sm leading-5 text-blue-100/75">{description}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            { icon: UsersRound, title: 'Soutenez votre club', text: 'Votre abonnement contribue au développement de la JSO.' },
            { icon: Heart, title: 'Vivez la passion', text: 'Participez à toutes les rencontres de la saison 2026–2027.' },
            { icon: Trophy, title: 'Une grande famille', text: 'Rejoignez la communauté JSO et partagez la même fierté.' },
          ].map(({ icon: Icon, title, text: description }) => (
            <div key={title} className="rounded-2xl border border-white/15 bg-white/[0.055] p-6 text-center shadow-lg backdrop-blur-md sm:p-7">
              <Icon size={38} className="mx-auto text-[#ffdc3d]" aria-hidden="true" />
              <h4 className="mt-3 text-lg font-black">{title}</h4>
              <p className="mt-2 text-sm leading-6 text-blue-100/80">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

