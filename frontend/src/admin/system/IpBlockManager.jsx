import { useEffect, useState } from 'react'
import { Ban, Plus, RefreshCw, ShieldAlert, Clock3 } from 'lucide-react'
import { API_BASE_URL } from '../../lib/apiConfig'

async function request(path, options = {}) {
  const token = localStorage.getItem('jso_admin_token')
  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(options.headers || {}),
    },
  })
  if (!response.ok) {
    let message = 'Erreur API (' + response.status + ').'
    try { message = (await response.json()).message || message } catch {}
    throw new Error(response.status === 403 ? 'Accès réservé au SuperAdmin.' : message)
  }
  if (response.status === 204) return null
  return response.json()
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('fr-FR') : 'Aucune'
}

export default function IpBlockManager() {
  const [rules, setRules] = useState([])
  const [events, setEvents] = useState([])
  const [network, setNetwork] = useState('')
  const [reason, setReason] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setBusy(true)
    setError('')
    try {
      const [blockResult, eventResult] = await Promise.all([
        request('/admin/security/ip-blocks'),
        request('/admin/security/traffic-events?limit=100'),
      ])
      setRules(blockResult.rules || [])
      setEvents(eventResult.events || [])
    } catch (e) { setError(e.message || 'Impossible de charger les règles de sécurité.') }
    finally { setBusy(false) }
  }

  useEffect(() => { load() }, [])

  async function addRule(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      await request('/admin/security/ip-blocks', {
        method: 'POST',
        body: JSON.stringify({
          networkCidr: network.trim(),
          reason: reason.trim(),
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      })
      setNetwork('')
      setReason('')
      setExpiresAt('')
      setMessage('Règle enregistrée. Elle reste en mode préparation : aucun client n’est encore bloqué.')
      await load()
    } catch (e) { setError(e.message || 'Impossible de créer la règle.') }
  }

  async function disableRule(id) {
    setError('')
    try {
      await request('/admin/security/ip-blocks/' + id + '/disable', { method: 'PATCH' })
      await load()
    } catch (e) { setError(e.message || 'Impossible de désactiver la règle.') }
  }

  return <div className="space-y-6">
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Ban size={22} className="mt-1 text-jso-blue"/>
          <div><h3 className="text-lg font-black text-jso-ink">Règles de blocage IP / CIDR</h3><p className="mt-1 text-sm text-slate-600">Préparez les règles, avec justification et expiration. L’application aux requêtes reste désactivée tant que l’adresse client fiable de Render n’a pas été validée.</p></div>
        </div>
        <button onClick={load} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"><RefreshCw size={15}/>Actualiser</button>
      </div>
      <form onSubmit={addRule} className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">IP ou réseau CIDR
          <input required value={network} onChange={e => setNetwork(e.target.value)} placeholder="203.0.113.10 ou 203.0.113.0/24" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal"/>
        </label>
        <label className="text-sm font-bold text-slate-700">Scadenza (facoltativa)
          <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal"/>
        </label>
        <label className="text-sm font-bold text-slate-700 md:col-span-2">Motivo
          <input required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="Spam, tentativi ripetuti, abuso verificato…" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal"/>
        </label>
        <div><button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 text-sm font-extrabold text-white"><Plus size={16}/>Aggiungi regola</button></div>
      </form>
      {message && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="py-3 pr-3">IP / CIDR</th><th className="py-3 pr-3">Motivo</th><th className="py-3 pr-3">Creata</th><th className="py-3 pr-3">Scadenza</th><th className="py-3 pr-3">Stato</th><th className="py-3">Azione</th></tr></thead>
          <tbody>{rules.map(rule => <tr key={rule.id} className="border-b border-slate-100"><td className="py-3 pr-3 font-mono">{rule.networkCidr}</td><td className="max-w-[260px] py-3 pr-3">{rule.reason}</td><td className="py-3 pr-3">{formatDate(rule.createdAt)}</td><td className="py-3 pr-3">{formatDate(rule.expiresAt)}</td><td className="py-3 pr-3">{!rule.isEnabled ? 'Disattivata' : rule.isExpired ? 'Scaduta' : 'Preparazione'}</td><td className="py-3">{rule.isEnabled && !rule.isExpired && <button onClick={() => disableRule(rule.id)} className="font-bold text-rose-700 underline">Disattiva</button>}</td></tr>)}</tbody>
        </table>
        {!rules.length && <p className="py-6 text-sm text-slate-500">Nessuna regola configurata.</p>}
      </div>
    </section>

    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-3"><ShieldAlert size={22} className="text-jso-blue"/><div><h3 className="text-lg font-black text-jso-ink">Eventi di sicurezza</h3><p className="text-sm text-slate-600">Feed pronto per segnali di traffico sospetto; nessun evento è classificato come bot verificato senza prove affidabili.</p></div></div>
      {!events.length ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Nessun evento registrato. La raccolta dei segnali di rilevamento deve essere attivata dopo la validazione dell’identità client.</p> : <div className="mt-4 divide-y divide-slate-100">{events.map(item => <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3"><div><p className="font-bold">{item.signal}</p><p className="mt-1 text-xs text-slate-500">{item.path} · {item.category} · {item.severity}</p></div><span className="inline-flex items-center gap-1 text-xs text-slate-500"><Clock3 size={13}/>{formatDate(item.createdAt)}</span></div>)}</div>}
    </section>
  </div>
}
