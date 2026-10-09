import { useEffect, useState } from 'react'
import { Plus, Pencil, Save, X, BrickWall, Check, Ban } from 'lucide-react'
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

const emptyBrick = { displayName: '', message: '', amount: '', status: 'Pending' }
const STATUSES = ['Pending', 'Approved', 'Rejected']
const STATUS_LABELS = { Pending: 'En attente', Approved: 'Approuvé', Rejected: 'Refusé' }
const STATUS_STYLES = {
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
}
const FILTERS = ['Pending', 'Approved', 'Rejected', '']

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }
function fmtAmount(a) { return (a == null ? 0 : a).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TND' }

// Mur des supporters (idée B7) : coïncide avec la file de modération.
// La modération est obligatoire avant publication : un mattone reste « En
// attente » jusqu'à ce qu'un CommunityManager / ClubAdmin l'approuve. Le mur
// public n'affiche que les briques approuvées et aucune donnée personnelle
// hormis le nom et le message choisis.
// Paiements HORS PÉRIMÈTRE cette itération : le montant est déclaratif et la
// date de paiement est optionnelle / simulée (TODO : prestataire certifié).
export default function SupportersModule({ onError }) {
  const [bricks, setBricks] = useState([])
  const [filter, setFilter] = useState('Pending')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(emptyBrick)
  const [editing, setEditing] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const q = filter ? '?status=' + encodeURIComponent(filter) : ''
      setBricks(await api('/admin/supporters' + q))
      onError('')
    } catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [filter])

  function edit(brick) {
    setEditing(brick.id)
    setForm({
      displayName: brick.displayName || '',
      message: brick.message || '',
      amount: brick.amount != null ? String(brick.amount) : '',
      status: brick.status || 'Pending',
    })
  }
  function reset() { setForm(emptyBrick); setEditing(null) }

  async function save(e) {
    e.preventDefault()
    try {
      const body = {
        displayName: form.displayName.trim(),
        message: form.message.trim() || null,
        amount: form.amount === '' ? 0 : Number(form.amount),
        status: form.status,
      }
      if (editing) await api('/admin/supporters/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/supporters', { method: 'POST', body: JSON.stringify(body) })
      reset()
      await load()
    } catch (err) { onError(err.message) }
  }

  async function moderate(id, action) {
    try { await api('/admin/supporters/' + id + '/' + action, { method: 'POST' }); await load() }
    catch (err) { onError(err.message) }
  }

  async function remove(id) {
    if (!confirm('Supprimer définitivement cette brique ?')) return
    try { await api('/admin/supporters/' + id, { method: 'DELETE' }); if (editing === id) reset(); await load() }
    catch (err) { onError(err.message) }
  }

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2"><BrickWall className="text-jso-blue" size={20}/><h2 className="text-xl font-black">Mur des supporters</h2></div>
      <p className="mt-1 text-xs text-slate-400">Modération obligatoire avant publication : seules les briques approuvées apparaissent sur le mur public. Aucune donnée personnelle publiée hormis le nom et le message. Paiements hors périmètre (montant déclaratif, paiement simulé — TODO : prestataire certifié).</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map(f => <button key={f || 'all'} onClick={() => setFilter(f)} className={'rounded-full px-3 py-1.5 text-xs font-bold transition-colors ' + (filter === f ? 'bg-jso-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>{f ? STATUS_LABELS[f] : 'Toutes'}</button>)}
      </div>
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Briques {filter && '— ' + STATUS_LABELS[filter]}</h2>
        <div className="mt-5 space-y-2">
          {loading ? <p className="text-sm text-slate-400">Chargement…</p>
            : bricks.length === 0 ? <p className="text-sm text-slate-500">Aucune brique dans cette file.</p>
            : bricks.map(b => <div key={b.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3">
                <div>
                  <b>{b.displayName}</b>
                  <span className={'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ' + (STATUS_STYLES[b.status] || 'bg-slate-200 text-slate-600')}>{STATUS_LABELS[b.status] || b.status}</span>
                  <span className="ml-2 text-xs font-bold text-jso-blue">{fmtAmount(b.amount)}</span>
                  {b.message && <p className="mt-1 text-xs text-slate-500">{b.message}</p>}
                  <p className="mt-1 text-xs text-slate-400">Reçue le {fmtDate(b.createdAt)}{b.paidAt ? ' · Payée le ' + fmtDate(b.paidAt) : ''}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {b.status !== 'Approved' && <button onClick={() => moderate(b.id, 'approve')} title="Approuver" className="text-emerald-600"><Check size={16}/></button>}
                  {b.status !== 'Rejected' && <button onClick={() => moderate(b.id, 'reject')} title="Refuser" className="text-amber-600"><Ban size={16}/></button>}
                  <button onClick={() => edit(b)} title="Modifier" className="text-jso-blue"><Pencil size={16}/></button>
                  <button onClick={() => remove(b.id)} title="Supprimer" className="text-red-600"><X size={16}/></button>
                </div>
              </div>)}
        </div>
      </div>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">{editing ? 'Modifier la brique' : 'Nouvelle brique'}</h2>
        <form onSubmit={save} className="mt-5 space-y-3">
          <label className="block text-sm font-bold">Nom affiché
            <input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} required maxLength="80" placeholder="ex. Famille Ben Salah" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
          </label>
          <label className="block text-sm font-bold">Dédicace (facultatif)
            <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} maxLength="280" rows="3" placeholder="Message visible sur le mur public" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
          </label>
          <label className="block text-sm font-bold">Montant (TND)
            <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
          </label>
          <label className="block text-sm font-bold">Statut de modération
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue">
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </label>
          <div className="flex gap-2 pt-2">
            <button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white">{editing ? <><Save size={16}/> Mettre à jour</> : <><Plus size={16}/> Enregistrer</>}</button>
            {editing && <button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}
          </div>
        </form>
      </div>
    </div>
  </div>
}
