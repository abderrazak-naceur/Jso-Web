import { useEffect, useState } from 'react'
import { Save, Trash2 } from 'lucide-react'
import { API_BASE_URL } from '../../lib/apiConfig'

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

const emptyStream = { provider: 'YouTube', streamUrl: '', isPaid: true, price: '', currency: 'TND', startsAt: '', endsAt: '', isPublished: false }

function toLocalInput(iso) { return iso ? iso.slice(0, 16) : '' }
function toIsoOrNull(local) { return local ? new Date(local).toISOString() : null }

// Admin configuration of a match's pay-per-view live stream (idea B24). SCOPE:
// this configures the paid ACCESS only; the broadcasting rights and the actual
// stream production (e.g. a YouTube unlisted broadcast) remain the club's
// responsibility (see docs/PAYMENTS.md). No card data is handled here.
export default function MatchStreamsModule({ onError }) {
  const [matches, setMatches] = useState([])
  const [matchId, setMatchId] = useState('')
  const [form, setForm] = useState(emptyStream)
  const [exists, setExists] = useState(false)
  const [saved, setSaved] = useState(false)

  async function loadMatches() {
    try { const m = await api('/admin/matches'); setMatches(m); if (!matchId && m[0]) setMatchId(m[0].id) }
    catch (e) { onError(e.message) }
  }
  useEffect(() => { loadMatches() }, [])

  async function loadStream() {
    if (!matchId) return
    setSaved(false)
    try {
      const s = await api('/admin/matches/' + matchId + '/stream')
      onError('')
      if (s) {
        setExists(true)
        setForm({ provider: s.provider || 'YouTube', streamUrl: s.streamUrl || '', isPaid: s.isPaid, price: s.price ?? '', currency: s.currency || 'TND', startsAt: toLocalInput(s.startsAt), endsAt: toLocalInput(s.endsAt), isPublished: s.isPublished })
      } else {
        setExists(false)
        setForm(emptyStream)
      }
    } catch (e) { onError(e.message) }
  }
  useEffect(() => { loadStream() }, [matchId])

  async function save(e) {
    e.preventDefault()
    setSaved(false)
    try {
      const body = {
        provider: form.provider.trim() || 'YouTube',
        streamUrl: form.streamUrl.trim() || null,
        isPaid: form.isPaid,
        price: form.isPaid ? (Number(form.price) || 0) : 0,
        currency: (form.currency || 'TND').trim().toUpperCase(),
        startsAt: toIsoOrNull(form.startsAt),
        endsAt: toIsoOrNull(form.endsAt),
        isPublished: form.isPublished,
      }
      await api('/admin/matches/' + matchId + '/stream', { method: 'PUT', body: JSON.stringify(body) })
      setSaved(true)
      await loadStream()
    } catch (e) { onError(e.message) }
  }
  async function remove() {
    if (!confirm('Supprimer la diffusion de ce match ?')) return
    try { await api('/admin/matches/' + matchId + '/stream', { method: 'DELETE' }); setForm(emptyStream); setExists(false); setSaved(false) }
    catch (e) { onError(e.message) }
  }

  const matchLabel = (m) => (m.isHome ? 'JSO' : 'Ext.') + ' — ' + (m.opponentName || '') + ' · ' + new Date(m.kickoffAt).toLocaleDateString('fr-FR', { dateStyle: 'short' })

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">Diffusion en direct (pay-per-view)</h2>
        <select value={matchId} onChange={(e) => setMatchId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-jso-blue">
          {matches.map((m) => <option key={m.id} value={m.id}>{matchLabel(m)}</option>)}
        </select>
      </div>
      <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Les droits de diffusion et la production du flux (ex. YouTube en lien non répertorié) relèvent du club. Le lien est protégé côté serveur mais son partage reste possible (pas de DRM). Voir docs/PAYMENTS.md.</p>
      <form onSubmit={save} className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-bold">Fournisseur<input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-jso-blue"/></label>
        <label className="text-sm font-bold">Lien / embed du flux<input value={form.streamUrl} onChange={(e) => setForm({ ...form, streamUrl: e.target.value })} placeholder="https://…" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-jso-blue"/></label>
        <label className="text-sm font-bold">Prix{form.isPaid ? '' : ' (gratuit)'}<input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} disabled={!form.isPaid} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-jso-blue disabled:bg-slate-100"/></label>
        <label className="text-sm font-bold">Devise<input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-jso-blue"/></label>
        <label className="text-sm font-bold">Début<input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-jso-blue"/></label>
        <label className="text-sm font-bold">Fin<input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-jso-blue"/></label>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isPaid} onChange={(e) => setForm({ ...form, isPaid: e.target.checked })}/> Accès payant</label>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}/> Publié</label>
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/> Enregistrer</button>
          {exists && <button type="button" onClick={remove} className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 font-bold text-red-700 hover:bg-red-50"><Trash2 size={16}/> Supprimer</button>}
          {saved && <span className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700">Enregistré</span>}
        </div>
      </form>
    </div>
  </div>
}
