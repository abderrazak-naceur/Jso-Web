import { ArrowUpRight, CreditCard, ShoppingBag, Ticket } from 'lucide-react'
import { formatDate } from '../../lib/format'

// Revenue-first band shown right under the hero: three large premium cards for
// the club's paid offers — match tickets, season memberships and the boutique.
// Tickets open the next match's Match Center (existing purchase flow); the
// others jump to their home section. Each card is a big, photo-friendly panel.
export default function SellingBand({ nextMatch, onOpenMatch }) {
  const opponent = nextMatch ? (nextMatch.opponentName || nextMatch.OpponentName || 'À venir') : null
  const kickoff = nextMatch ? formatDate(nextMatch.kickoffAt || nextMatch.KickoffAt) : null

  return (
    <section aria-label="Billetterie, abonnements et boutique" className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-jso-blue">Billetterie &amp; Abonnements</p>
      <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Vivez la JSO</h2>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {/* Tickets — the biggest emphasis; opens the next match */}
        <article className="group relative flex min-h-[300px] flex-col justify-end overflow-hidden rounded-[2rem] bg-jso-navy p-8 text-white shadow-xl shadow-jso-navy/20 lg:col-span-1">
          <img src="/jso-stadium-hero.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-45 transition duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-jso-navy via-jso-navy/70 to-jso-navy/25" aria-hidden="true" />
          <Ticket className="absolute right-6 top-6 text-jso-gold/40" size={72} aria-hidden="true" />
          <div className="relative">
            <span className="w-fit rounded-full bg-jso-gold px-3 py-1 text-[11px] font-black uppercase tracking-[0.15em] text-jso-navy">
              {nextMatch ? 'Prochain match' : 'Billetterie'}
            </span>
            <h3 className="mt-4 text-3xl font-black leading-tight">Vos billets</h3>
            {nextMatch ? (
              <p className="mt-1 text-jso-gold2 font-bold">JSO — {opponent}{kickoff ? ` · ${kickoff}` : ''}</p>
            ) : (
              <p className="mt-1 text-white/70">Réservez votre place au stade.</p>
            )}
            {nextMatch ? (
              <button
                type="button"
                onClick={() => onOpenMatch(nextMatch)}
                className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-jso-gold px-6 py-3 font-extrabold text-jso-navy transition hover:-translate-y-0.5 hover:bg-white"
              >
                Réserver ma place <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <a href="#matches" className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-jso-gold px-6 py-3 font-extrabold text-jso-navy transition hover:-translate-y-0.5 hover:bg-white">
                Voir les matchs <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            )}
          </div>
        </article>

        {/* Memberships */}
        <article className="group relative flex min-h-[300px] flex-col justify-end overflow-hidden rounded-[2rem] bg-jso-blue p-8 text-white shadow-xl shadow-jso-blue/20">
          <img src="/team-hero.svg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-30 transition duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-jso-blue via-jso-blue/70 to-jso-blue/25" aria-hidden="true" />
          <CreditCard className="absolute right-6 top-6 text-white/30" size={72} aria-hidden="true" />
          <div className="relative">
            <span className="w-fit rounded-full bg-jso-gold px-3 py-1 text-[11px] font-black uppercase tracking-[0.15em] text-jso-navy">Saison 2026/27</span>
            <h3 className="mt-4 text-3xl font-black leading-tight">Devenez abonné</h3>
            <p className="mt-1 text-white/85">Soutenez la JSO toute la saison.</p>
            <a href="#memberships" className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 font-extrabold text-jso-navy transition hover:-translate-y-0.5 hover:bg-jso-gold">
              Voir les formules <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </article>

        {/* Boutique */}
        <article className="group relative flex min-h-[300px] flex-col justify-end overflow-hidden rounded-[2rem] bg-jso-gold p-8 text-jso-navy shadow-xl shadow-jso-gold/30">
          <img src="/jersey.svg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-30 transition duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-jso-gold via-jso-gold/75 to-jso-gold/35" aria-hidden="true" />
          <ShoppingBag className="absolute right-6 top-6 text-jso-navy/25" size={72} aria-hidden="true" />
          <div className="relative">
            <span className="w-fit rounded-full bg-jso-navy px-3 py-1 text-[11px] font-black uppercase tracking-[0.15em] text-jso-gold">Boutique</span>
            <h3 className="mt-4 text-3xl font-black leading-tight">Maillots &amp; articles</h3>
            <p className="mt-1 font-semibold text-jso-navy/75">Portez les couleurs du club.</p>
            <a href="#shop" className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-jso-navy px-6 py-3 font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-jso-blue">
              Découvrir <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </article>
      </div>
    </section>
  )
}
