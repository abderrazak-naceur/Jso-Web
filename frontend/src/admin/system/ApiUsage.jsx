import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, RefreshCw, ServerCog } from 'lucide-react'
import { API_BASE_URL } from '../../lib/apiConfig'

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

const WINDOWS = [[7, '7 jours'], [30, '30 jours'], [90, '90 jours']]
const QUOTA_STYLES = {
  ok: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  exceeded: 'bg-red-100 text-red-700',
}
const QUOTA_LABELS = { ok: 'Sous le seuil', warning: 'Proche du seuil', exceeded: 'Seuil dépassé' }

function fmtNumber(n) { return new Intl.NumberFormat('fr-FR').format(n || 0) }
function fmtDay(d) { return d ? new Date(d + 'T00:00:00Z').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—' }

// API usage & quota dashboard (idea E16). Reads ONLY the aggregate counters
// exposed by GET /api/admin/api-usage: request volume per day, per route group
// and per status class, plus a static free-tier quota indicator. No personal
// data is ever displayed (no IP, no user id, no raw path with ids). Restricted
// to SuperAdmin / ClubAdmin server-side.
export default function ApiUsageModule({ onError }) {
  const [data, setData] = useState(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      setData(await api('/admin/api-usage?days=' + days))
      onError('')
    } catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [days])

  if (loading && !data) return <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-slate-500">Chargement de l’utilisation de l’API…</div>

  const totals = data?.totals
  const quota = data?.quota
  const byDay = data?.byDay ?? []
  const byGroup = data?.byGroup ?? []
  const byStatusClass = data?.byStatusClass ?? []
  const hasData = (totals?.requests ?? 0) > 0
  const maxDay = Math.max(1, ...byDay.map(d => d.total))
  const maxGroup = Math.max(1, ...byGroup.map(g => g.total))
  const quotaPct = Math.min(100, Math.round((quota?.usageRatio ?? 0) * 100))

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><ServerCog className="text-jso-blue" size={20}/><h2 className="text-xl font-black">Utilisation API</h2></div>
        <div className="flex flex-wrap items-center gap-2">
          {WINDOWS.map(([value, label]) => <button key={value} onClick={() => setDays(value)} className={'rounded-xl px-3 py-1.5 text-sm font-bold ' + (days === value ? 'bg-jso-navy text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100')}>{label}</button>)}
          <button onClick={load} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600"><RefreshCw size={15}/>Actualiser</button>
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-400">Métriques agrégées uniquement : volume de requêtes, erreurs et proximité des quotas gratuites. Aucune donnée personnelle n’est collectée ni affichée (pas d’adresse IP, pas d’identifiant, pas de chemin avec identifiants bruts).</p>
    </div>

    {!hasData
      ? <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center text-slate-500">Aucune donnée d’utilisation sur la période sélectionnée. Les compteurs se remplissent au fil des requêtes reçues par l’API.</div>
      : <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Requêtes totales', fmtNumber(totals.requests), Activity],
            ['Erreurs client (4xx)', fmtNumber(totals.clientErrors), AlertTriangle],
            ['Erreurs serveur (5xx)', fmtNumber(totals.serverErrors), AlertTriangle],
            ['Taux d’erreur', ((totals.errorRate ?? 0) * 100).toFixed(2) + ' %', Activity],
          ].map(([label, value, Icon]) => <div key={label} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"><Icon className="text-jso-blue" size={22}/><p className="mt-6 text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></div>)}
        </div>

        {quota && <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-black">Proximité de la quota (mois en cours)</h3>
            <span className={'rounded-full px-3 py-1 text-xs font-extrabold ' + (QUOTA_STYLES[quota.status] || 'bg-slate-100 text-slate-500')}>{QUOTA_LABELS[quota.status] || quota.status}</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">{fmtNumber(quota.monthlyUsed)} / {fmtNumber(quota.monthlyQuota)} requêtes ce mois-ci ({quotaPct} %). Seuil d’alerte à {Math.round((quota.warningRatio ?? 0) * 100)} %.</p>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={'h-full rounded-full ' + (quota.status === 'exceeded' ? 'bg-red-500' : quota.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: quotaPct + '%' }}/>
          </div>
        </div>}

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-black">Volume par jour</h3>
          <div className="mt-4 space-y-2">
            {byDay.map(d => <div key={d.date} className="flex items-center gap-3 text-sm">
              <span className="w-14 shrink-0 text-xs font-semibold text-slate-500">{fmtDay(d.date)}</span>
              <div className="flex h-5 flex-1 overflow-hidden rounded-md bg-slate-100">
                <div className="h-full bg-jso-blue" style={{ width: (d.success / maxDay * 100) + '%' }} title={'Succès : ' + d.success}/>
                <div className="h-full bg-amber-400" style={{ width: (d.clientErrors / maxDay * 100) + '%' }} title={'4xx : ' + d.clientErrors}/>
                <div className="h-full bg-red-500" style={{ width: (d.serverErrors / maxDay * 100) + '%' }} title={'5xx : ' + d.serverErrors}/>
              </div>
              <span className="w-16 shrink-0 text-right font-bold">{fmtNumber(d.total)}</span>
            </div>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-jso-blue"/>Succès (2xx/3xx)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-400"/>Erreurs client (4xx)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-500"/>Erreurs serveur (5xx)</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black">Volume par groupe d’endpoints</h3>
            <div className="mt-4 space-y-3">
              {byGroup.map(g => <div key={g.routeGroup} className="text-sm">
                <div className="flex items-center justify-between">
                  <b className="font-mono text-xs text-slate-700">{g.routeGroup}</b>
                  <span className="text-xs text-slate-500">{fmtNumber(g.total)} req · {fmtNumber(g.clientErrors)} × 4xx · {fmtNumber(g.serverErrors)} × 5xx</span>
                </div>
                <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-jso-navy" style={{ width: (g.total / maxGroup * 100) + '%' }}/>
                </div>
              </div>)}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black">Par classe de statut</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Classe</th><th className="p-2 text-right">Requêtes</th></tr></thead>
                <tbody>{byStatusClass.map(s => <tr key={s.statusClass} className="border-b last:border-0"><td className="p-2 font-bold">{s.statusClass}</td><td className="p-2 text-right">{fmtNumber(s.total)}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      </>}
  </div>
}
