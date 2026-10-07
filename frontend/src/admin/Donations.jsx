import { useEffect, useState } from 'react'
import { Copy, ExternalLink, HeartHandshake, RefreshCw } from 'lucide-react'
import { adminApi } from './api'

function money(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'TND', maximumFractionDigits: 2 }).format(Number(n) || 0)
}

export default function DonationsModule({ onError }) {
  const [data, setData] = useState(null)
  const [configuration, setConfiguration] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [summary, settings] = await Promise.all([
        adminApi('/admin/donations/summary'),
        adminApi('/admin/donations/settings'),
      ])
      setData(summary)
      setConfiguration(settings)
      setForm(settings.settings)
      onError('')
    }
    catch (e) { onError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const progress = data?.goalTnd ? Math.min(100, Math.max(0, Number(data.monthlyPaidTnd || 0) / Number(data.goalTnd) * 100)) : 0
  const cashProgress = data?.goalTnd ? Math.min(100, Math.max(0, Number(data.monthlyCashPaidTnd || 0) / Number(data.goalTnd) * 100)) : 0

  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.origin + '/soutenir') } catch {}
  }

  async function saveSettings(event) {
    event.preventDefault()
    setSaving(true)
    setFeedback('')
    try {
      const updated = await adminApi('/admin/donations/settings', {
        method: 'PUT',
        body: JSON.stringify({
          suggestedMonthlyContributionTnd: Number(form.suggestedMonthlyContributionTnd),
          monthlyGoalTnd: Number(form.monthlyGoalTnd),
          targetDonors: Number(form.targetDonors),
        }),
      })
      setForm(updated)
      setConfiguration((current) => ({ ...current, settings: updated }))
      setData((current) => current && ({ ...current, goalTnd: updated.monthlyGoalTnd }))
      setFeedback('Paramètres de campagne enregistrés.')
      onError('')
    } catch (e) { onError(e.message) }
    finally { setSaving(false) }
  }

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] bg-jso-navy p-6 text-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-jso-gold">Collecte</p>
          <h2 className="mt-2 text-3xl font-black">Soutien JSO</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">Suivez les contributions en ligne et partagez le lien officiel de collecte.</p>
        </div>
        <HeartHandshake className="text-jso-gold" size={34} aria-hidden="true" />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white/5 p-4"><p className="text-xs font-bold text-white/45">Confirmé ce mois-ci</p><p className="mt-1 text-3xl font-black">{money(data?.monthlyPaidTnd)}</p><p className="mt-1 text-xs text-white/45">Total historique : {money(data?.totalPaidTnd)}</p></div>
        <div className="rounded-2xl bg-white/5 p-4"><p className="text-xs font-bold text-white/45">Contributions</p><p className="mt-1 text-3xl font-black">{data?.paidCount ?? 0}</p></div>
        <div className="rounded-2xl bg-white/5 p-4"><p className="text-xs font-bold text-white/45">Objectif mensuel</p><p className="mt-1 text-3xl font-black">{money(data?.goalTnd)}</p></div>
        <div className="rounded-2xl bg-white/5 p-4"><p className="text-xs font-bold text-white/45">Cash ce mois-ci</p><p className="mt-1 text-3xl font-black">{money(data?.monthlyCashPaidTnd)}</p><p className="mt-1 text-xs font-semibold text-white/45">{data?.cashPaidCount ?? 0} reçus · {money(data?.cashPaidTnd)} au total</p></div>
      </div>
      <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-jso-gold" style={{ width: progress + '%' }}/></div>
      <p className="mt-2 text-sm font-semibold text-white/55">{progress.toFixed(0)}% atteint · {data?.pendingCount ?? 0} paiement(s) à confirmer · Cash {cashProgress.toFixed(0)}%</p>
    </div>

    <div className="flex flex-wrap gap-3">
      <button onClick={copyLink} className="inline-flex items-center gap-2 rounded-full bg-jso-navy px-5 py-3 text-sm font-extrabold text-white"><Copy size={16}/> Copier le lien de collecte</button>
      <a href="/soutenir" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-jso-navy"><ExternalLink size={16}/> Voir la page</a>
      <button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-600"><RefreshCw size={16}/> Actualiser</button>
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={saveSettings} className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h3 className="text-xl font-black text-jso-navy">Paramètres de la campagne</h3>
        <p className="mt-2 text-sm text-slate-500">Le montant conseillé est libre : chaque don est ponctuel, sans prélèvement automatique mensuel.</p>
        {form && <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">Contribution conseillée (TND)
            <input type="number" min="1" max="1000000" step="0.001" required value={form.suggestedMonthlyContributionTnd} onChange={(e) => setForm({ ...form, suggestedMonthlyContributionTnd: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
          <label className="text-sm font-bold">Objectif mensuel (TND)
            <input type="number" min="1" max="10000000" step="0.001" required value={form.monthlyGoalTnd} onChange={(e) => setForm({ ...form, monthlyGoalTnd: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
          <label className="text-sm font-bold">Objectif de donateurs
            <input type="number" min="1" max="1000000" step="1" required value={form.targetDonors} onChange={(e) => setForm({ ...form, targetDonors: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
        </div>}
        <button type="submit" disabled={!form || saving} className="mt-5 rounded-full bg-jso-navy px-5 py-3 text-sm font-extrabold text-white disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        {feedback && <p role="status" className="mt-3 text-sm font-bold text-emerald-700">{feedback}</p>}
      </form>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h3 className="text-xl font-black text-jso-navy">Moyens de paiement</h3>
        <p className="mt-2 text-sm text-slate-500">Les clés marchandes se configurent sur le service API dans Render, jamais dans ce formulaire.</p>
        {['flouci', 'stripe'].map((provider) => {
          const status = configuration?.providers?.[provider]
          return <div key={provider} className="mt-4 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-2"><strong>{provider === 'flouci' ? 'Flouci · Tunisie' : 'Stripe · international'}</strong><span className={'text-xs font-black ' + (status?.available ? 'text-emerald-700' : 'text-amber-700')}>{status?.available ? 'Disponible' : 'Non configuré'}</span></div>
            {!!status?.missing?.length && <p className="mt-2 break-words text-xs text-slate-500">Variables manquantes : {status.missing.join(', ')}</p>}
          </div>
        })}
        <p className="mt-4 text-xs leading-5 text-slate-500">D17, e-DINAR, ClicToPay, Konnect et SMS nécessitent une intégration et un compte marchand dédiés. Les espèces se saisissent dans « Dons en espèces » par un membre du personnel autorisé.</p>
      </div>
    </div>

    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <th className="p-4">Date</th><th className="p-4">Donateur</th><th className="p-4">Montant</th><th className="p-4">Statut</th><th className="p-4">Pays</th><th className="p-4">Provider</th><th className="p-4">Point</th><th className="p-4">Message</th>
          </tr></thead>
          <tbody>
            {(data?.donations || []).map((item) => (
              <tr key={item.id} className="border-b border-slate-100 last:border-0">
                <td className="p-4 whitespace-nowrap">{item.paidAt ? new Date(item.paidAt).toLocaleString('fr-FR') : new Date(item.createdAt).toLocaleString('fr-FR')}</td>
                <td className="p-4 font-bold">{item.displayName || '—'}</td>
                <td className="p-4 font-black text-jso-navy">{money(item.amount)}</td>
                <td className="p-4"><span className={'rounded-full px-2.5 py-1 text-xs font-black ' + (item.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>{item.paymentStatus === 'Paid' ? 'Payé' : 'En attente'}</span></td>
                <td className="p-4">{item.country || '—'}</td>
                <td className="p-4">{item.paymentProvider || '—'}</td>
                <td className="p-4">{item.cashPointName || (item.paymentProvider === 'Cash' ? '—' : '')}</td>
                <td className="p-4 max-w-sm truncate text-slate-500">{item.message || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data?.donations?.length && !loading && <p className="p-6 text-sm text-slate-500">Aucune contribution enregistrée.</p>}
    </div>
  </div>
}
