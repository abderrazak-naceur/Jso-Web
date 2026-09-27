import { useEffect, useState } from 'react'
import { ShieldCheck, Download, UserX, RefreshCw } from 'lucide-react'
import { API_BASE_URL } from '../lib/apiConfig'

// Admin API helper scoped to this module (mirrors the one in AdminApp.jsx).
async function api(path, options = {}) {
  const token = localStorage.getItem('jso_admin_token')
  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers,
    },
  })
  if (!response.ok) {
    let message = 'Request failed: ' + response.status
    try { message = (await response.json()).message || message } catch { /* ignore */ }
    throw new Error(message)
  }
  if (response.status === 204) return null
  return response.json()
}

function fmtDate(d) { return d ? new Date(d).toLocaleString('fr-FR') : '—' }

// Colour-code the lifecycle state so the compliance state is readable at a glance.
function StatusBadge({ status }) {
  const map = {
    Ready: 'bg-emerald-100 text-emerald-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Pending: 'bg-amber-100 text-amber-700',
    Failed: 'bg-red-100 text-red-700',
  }
  const cls = map[status] || 'bg-slate-200 text-slate-600'
  return <span className={'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ' + cls}>{status}</span>
}

// Centre d'export et de portabilité des données RGPD (idée E17) : supervision
// des demandes d'export (droit d'accès / portabilité) et de suppression de
// compte (droit à l'effacement) déposées par les supporters. Réservé aux rôles
// SuperAdmin / ClubAdmin ; la consultation est auditée côté serveur. Aucune
// donnée personnelle superflue n'est affichée : seuls l'identifiant du
// supporter, l'état et les dates sont exposés, jamais l'e-mail, le nom ou le
// contenu de l'export.
export default function GdprModule({ onError }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setData(await api('/admin/gdpr'))
      onError('')
    } catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const exports = data?.exportRequests ?? []
  const deletions = data?.deletionRequests ?? []
  const counts = data?.counts

  function CountLine({ label, entry }) {
    if (!entry) return null
    const byStatus = Object.entries(entry.byStatus || {})
    return <div className="rounded-xl bg-slate-50 p-3 text-sm">
      <p className="font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black">{entry.total ?? 0}</p>
      {byStatus.length > 0 && <p className="mt-1 text-xs text-slate-500">{byStatus.map(([s, n]) => s + ' : ' + n).join(' · ')}</p>}
    </div>
  }

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><ShieldCheck className="text-jso-blue" size={20}/><h2 className="text-xl font-black">Centre RGPD</h2></div>
        <button onClick={load} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"><RefreshCw size={14}/>Actualiser</button>
      </div>
      <p className="mt-1 text-xs text-slate-400">Suivi des demandes d'export de données (droit d'accès et portabilité) et de suppression de compte (droit à l'effacement) des supporters. Cette vue n'affiche que l'identifiant du supporter, l'état et les dates : aucune autre donnée personnelle n'est exposée. Chaque consultation est auditée.</p>
      {counts && <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <CountLine label="Demandes d'export" entry={counts.exports}/>
        <CountLine label="Demandes de suppression" entry={counts.deletions}/>
      </div>}
    </div>

    {loading && <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-sm text-slate-500">Chargement des demandes RGPD…</div>}

    {!loading && <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2"><Download className="text-jso-blue" size={18}/><h2 className="text-lg font-black">Exports de données</h2></div>
        <div className="mt-4 space-y-2">
          {exports.length === 0 ? <p className="text-sm text-slate-500">Aucune demande d'export pour le moment.</p>
            : exports.map(r => <div key={r.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge status={r.status}/>
                  <span className="text-xs text-slate-400">{fmtDate(r.requestedAt)}</span>
                </div>
                <p className="mt-1 font-mono text-xs text-slate-500">Supporter : {r.fanUserId}</p>
                {r.completedAt && <p className="text-xs text-slate-400">Traité le {fmtDate(r.completedAt)}</p>}
              </div>)}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2"><UserX className="text-jso-blue" size={18}/><h2 className="text-lg font-black">Suppressions de compte</h2></div>
        <div className="mt-4 space-y-2">
          {deletions.length === 0 ? <p className="text-sm text-slate-500">Aucune demande de suppression pour le moment.</p>
            : deletions.map(r => <div key={r.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge status={r.status}/>
                  <span className="text-xs text-slate-400">{fmtDate(r.requestedAt)}</span>
                </div>
                <p className="mt-1 font-mono text-xs text-slate-500">Supporter : {r.fanUserId}</p>
                {r.completedAt && <p className="text-xs text-slate-400">Anonymisé le {fmtDate(r.completedAt)}</p>}
              </div>)}
        </div>
      </div>
    </div>}
  </div>
}
