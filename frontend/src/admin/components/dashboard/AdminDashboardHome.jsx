import { ArrowUpRight, BrickWall, CheckCircle2, Images, Megaphone, MessageSquare, Newspaper, ShoppingBag, Ticket, Trophy, Users } from 'lucide-react'
import { adminSectionUrl } from '../../adminRoutes'

const money = (n, c = 'TND') => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: c || 'TND',
  maximumFractionDigits: 0,
}).format(n || 0)

function ActionCenter({ stats, visibleSectionIds, onNavigate }) {
  if (!stats) return null
  const tickets = stats.tickets || {}
  const sales = stats.sales || {}
  const matches = stats.matches || {}
  const moderation = stats.moderation || {}
  const items = [
    { section: 'tickets', count: tickets.pending ?? 0, label: 'réservations en attente', hint: 'Confirmer les billets vendus', Icon: Ticket },
    { section: 'orders', count: sales.pending ?? 0, label: 'commandes à traiter', hint: 'Préparer les commandes boutique', Icon: ShoppingBag },
    { section: 'tickets', count: matches.upcomingWithoutTickets ?? 0, label: 'matchs sans billets', hint: 'Préparer leur billetterie', Icon: Trophy },
    { section: 'community-moderation', count: (moderation.comments ?? 0) + (moderation.reports ?? 0), label: 'contenus à modérer', hint: 'Commentaires et signalements', Icon: MessageSquare },
    { section: 'fan-photos', count: moderation.fanPhotos ?? 0, label: 'photos à modérer', hint: 'Photos supporters en attente', Icon: Images },
    { section: 'classifieds', count: moderation.classifieds ?? 0, label: 'annonces à modérer', hint: 'Petites annonces en attente', Icon: Megaphone },
    { section: 'supporters', count: moderation.supporters ?? 0, label: 'briques à confirmer', hint: 'Paiements du mur supporters', Icon: BrickWall },
  ].filter((item) => item.count > 0 && visibleSectionIds.has(item.section))

  return (
    <section aria-labelledby="admin-action-center">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 id="admin-action-center" className="text-lg font-black text-slate-900">À traiter</h2>
          <p className="mt-0.5 text-sm text-slate-500">Les priorités qui demandent une action.</p>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-bold text-emerald-800">
          <CheckCircle2 size={20} className="shrink-0 text-emerald-600" aria-hidden="true" />
          Rien à traiter : tout est à jour.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map(({ section, count, label, hint, Icon }, index) => (
            <a
              key={`${section}-${index}`}
              href={adminSectionUrl(section)}
              onClick={(event) => onNavigate(event, section)}
              className="group flex items-center gap-4 rounded-2xl border border-red-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-red-400 hover:shadow-md"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-100 text-red-700">
                <Icon size={22} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-2xl font-black text-red-700">{count}</span>
                <span className="block text-sm font-black text-slate-800">{label}</span>
                <span className="mt-0.5 block text-xs font-semibold text-slate-500">{hint}</span>
              </span>
              <ArrowUpRight size={18} className="shrink-0 text-slate-300 transition group-hover:text-red-600" aria-hidden="true" />
            </a>
          ))}
        </div>
      )}
    </section>
  )
}

function RevenueChart({ series }) {
  const days = Array.isArray(series) ? series : []
  if (!days.length) return <div className="grid min-h-64 place-items-center rounded-3xl border border-slate-200 bg-white text-sm font-semibold text-slate-400">Aucune donnée de revenus disponible.</div>
  const totals = days.map((day) => Number(day.tickets || 0) + Number(day.shop || 0) + Number(day.memberships || 0))
  const max = Math.max(1, ...totals)
  const total = totals.reduce((sum, value) => sum + value, 0)

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">Revenus · 30 jours</h2>
          <p className="mt-1 text-sm text-slate-500">Billetterie, boutique et abonnements.</p>
        </div>
        <p className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-black text-jso-navy">{money(total)}</p>
      </div>
      <div className="mt-6 flex h-44 items-stretch gap-[3px]" aria-label="Graphique des revenus des 30 derniers jours">
        {days.map((day, index) => {
          const tickets = Number(day.tickets || 0)
          const shop = Number(day.shop || 0)
          const memberships = Number(day.memberships || 0)
          const dayTotal = tickets + shop + memberships
          const label = new Date(day.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
          return (
            <div
              key={day.date || index}
              title={`${label} · ${money(dayTotal)}\nBilletterie ${money(tickets)} · Boutique ${money(shop)} · Abonnements ${money(memberships)}`}
              className="flex min-w-0 flex-1 cursor-default flex-col justify-end gap-px"
            >
              {dayTotal === 0 ? <div className="w-full rounded-sm bg-slate-100" style={{ height: '3%' }} /> : <>
                {memberships > 0 && <div className="w-full rounded-t-sm bg-jso-blue" style={{ height: `${(memberships / max) * 100}%` }} />}
                {shop > 0 && <div className="w-full bg-jso-gold" style={{ height: `${(shop / max) * 100}%` }} />}
                {tickets > 0 && <div className="w-full rounded-b-sm bg-jso-navy" style={{ height: `${(tickets / max) * 100}%` }} />}
              </>}
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-jso-navy" />Billetterie</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-jso-gold" />Boutique</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-jso-blue" />Abonnements</span>
      </div>
    </section>
  )
}

function RevenueSummary({ stats, canOpenFinance, onNavigate }) {
  const sales = stats.sales || {}
  const tickets = stats.tickets || {}
  const memberships = stats.memberships || {}
  const total = Number(tickets.revenue || 0) + Number(memberships.revenue || 0) + Number(sales.revenue || 0)
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-jso-navy to-jso-blue p-6 text-white shadow-sm">
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full border-[30px] border-white/5" />
      <p className="text-xs font-black uppercase tracking-[0.18em] text-jso-gold">Vue d’ensemble</p>
      <p className="mt-7 text-4xl font-black">{money(total)}</p>
      <p className="mt-1 text-sm font-semibold text-white/55">Revenus cumulés</p>
      <div className="mt-7 space-y-3 border-t border-white/10 pt-5 text-sm">
        <p className="flex justify-between gap-4"><span className="text-white/60">Billets vendus</span><strong>{tickets.ticketsSold ?? 0}</strong></p>
        <p className="flex justify-between gap-4"><span className="text-white/60">Abonnés actifs</span><strong>{memberships.active ?? 0}</strong></p>
        <p className="flex justify-between gap-4"><span className="text-white/60">Produits vendus</span><strong>{sales.productsSold ?? 0}</strong></p>
      </div>
      {canOpenFinance && <a href={adminSectionUrl('finance')} onClick={(event) => onNavigate(event, 'finance')} className="mt-6 inline-flex items-center gap-2 text-sm font-black text-jso-gold">Voir les finances <ArrowUpRight size={16} /></a>}
    </section>
  )
}

function MainKpis({ stats, visibleSectionIds, onNavigate }) {
  const matches = stats.matches || {}
  const news = stats.news || {}
  const cards = [
    { section: 'matches', label: 'Prochaines rencontres', value: matches.upcoming ?? 0, Icon: Trophy, tone: 'text-jso-blue' },
    { section: 'tickets', label: 'Billets vendus', value: stats.tickets?.ticketsSold ?? 0, Icon: Ticket, tone: 'text-emerald-600' },
    { section: 'news', label: 'Actualités publiées', value: news.published ?? 0, Icon: Newspaper, tone: 'text-amber-600' },
    { section: 'fan-accounts', label: 'Profils supporters', value: stats.fanAccounts ?? '—', Icon: Users, tone: 'text-violet-600' },
  ].filter((card) => visibleSectionIds.has(card.section))

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ section, label, value, Icon, tone }) => (
        <a key={section} href={adminSectionUrl(section)} onClick={(event) => onNavigate(event, section)} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-jso-blue hover:shadow-md">
          <Icon size={20} className={tone} aria-hidden="true" />
          <p className="mt-6 text-sm font-semibold text-slate-500">{label}</p>
          <div className="mt-1 flex items-end justify-between gap-3"><p className="text-3xl font-black text-slate-900">{value}</p><ArrowUpRight size={16} className="text-slate-300 group-hover:text-jso-blue" /></div>
        </a>
      ))}
    </div>
  )
}

function RecentActivity({ items }) {
  const recent = Array.isArray(items) ? items : []
  return (
    <details className="group rounded-3xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-black text-slate-900 sm:px-6">
        Activité récente
        <span className="text-xs font-semibold text-slate-400 group-open:hidden">Afficher {recent.length} événement{recent.length > 1 ? 's' : ''}</span>
        <span className="hidden text-xs font-semibold text-slate-400 group-open:inline">Masquer</span>
      </summary>
      <div className="space-y-2 border-t border-slate-100 p-5 sm:p-6">
        {recent.length ? recent.map((item) => (
          <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><strong className="text-slate-800">{item.action} · {item.entityType}</strong><span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString('fr-FR')}</span></div>
            <p className="mt-1 text-xs text-slate-500">{item.userEmail || 'Système'}{item.entityId ? ' · ' + item.entityId : ''}</p>
          </div>
        )) : <p className="text-sm text-slate-500">Aucune activité récente.</p>}
      </div>
    </details>
  )
}

export default function AdminDashboardHome({ stats, loading, visibleItems, onRetry, onNavigate }) {
  const visibleSectionIds = new Set(visibleItems.map(([id]) => id))
  if (!stats) return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500">
      <p>{loading ? 'Chargement du tableau de bord…' : 'Les statistiques sont momentanément indisponibles. Les rubriques restent accessibles.'}</p>
      {!loading && <button type="button" onClick={onRetry} className="mt-3 text-sm font-bold text-jso-blue underline">Réessayer</button>}
    </div>
  )

  return (
    <div className="space-y-8">
      <ActionCenter stats={stats} visibleSectionIds={visibleSectionIds} onNavigate={onNavigate} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(300px,0.85fr)]">
        <RevenueChart series={stats.revenueSeries} />
        <RevenueSummary stats={stats} canOpenFinance={visibleSectionIds.has('finance')} onNavigate={onNavigate} />
      </div>
      <MainKpis stats={stats} visibleSectionIds={visibleSectionIds} onNavigate={onNavigate} />
      <RecentActivity items={stats.recentActivity} />
    </div>
  )
}
