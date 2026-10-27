import { useEffect, useState } from 'react'
import { adminApi } from '../api'
import { RefreshCw } from 'lucide-react'

const STATUS_STYLES = {
  Confirmed: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
  Unsubscribed: 'bg-slate-200 text-slate-600',
}
const STATUS_LABELS = { Confirmed: 'Confirmé', Pending: 'En attente', Unsubscribed: 'Désinscrit' }

function StatCard({ label, value, accent }) {
  return <div className={'rounded-2xl border border-slate-200 bg-white p-4 ' + (accent || '')}>
    <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-1 text-2xl font-black">{value}</p>
  </div>
}

// Newsletter digest administration (idea A4). Read-only list of subscribers with their
// double opt-in status and counts. No email is sent from here: sending requires a
// transactional provider (TODO documented on the backend).
export default function NewsletterModule({ onError }) {
  const [counts, setCounts] = useState(null)
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const data = await adminApi('/admin/newsletter/subscriptions')
      setCounts(data.counts)
      setSubscriptions(data.subscriptions)
      onError('')
    } catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  return <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-black">Newsletter</h2>
        <p className="mt-1 text-xs text-slate-400">Inscription à double confirmation (double opt-in). L'envoi d'e-mails nécessite un fournisseur transactionnel (à venir).</p>
      </div>
      <button onClick={load} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"><RefreshCw size={16}/> Actualiser</button>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total" value={loading ? '…' : (counts?.total ?? 0)}/>
      <StatCard label="Confirmés" value={loading ? '…' : (counts?.confirmed ?? 0)}/>
      <StatCard label="En attente" value={loading ? '…' : (counts?.pending ?? 0)}/>
      <StatCard label="Désinscrits" value={loading ? '…' : (counts?.unsubscribed ?? 0)}/>
    </div>

    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-black">Inscrits</h3>
      <div className="mt-5 overflow-x-auto">
        {loading ? <p className="text-sm text-slate-400">Chargement…</p>
          : subscriptions.length === 0 ? <p className="text-sm text-slate-400">Aucun inscrit pour le moment.</p>
          : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">E-mail</th><th className="p-2">Statut</th><th className="p-2">Confirmé le</th><th className="p-2">Inscrit le</th></tr></thead><tbody>{subscriptions.map(s => <tr key={s.id} className="border-b last:border-0"><td className="p-2 font-bold">{s.email}</td><td className="p-2"><span className={'inline-flex rounded-full px-2 py-0.5 text-xs font-bold ' + (STATUS_STYLES[s.status] || 'bg-slate-100 text-slate-600')}>{STATUS_LABELS[s.status] || s.status}</span></td><td className="p-2 text-slate-500">{s.confirmedAt ? new Date(s.confirmedAt).toLocaleDateString('fr-FR') : '—'}</td><td className="p-2 text-slate-500">{new Date(s.createdAt).toLocaleDateString('fr-FR')}</td></tr>)}</tbody></table>}
      </div>
    </div>
  </div>
}
