import { useEffect, useState } from 'react'
import { Plus, Pencil, Save, X, Megaphone, Check, Ban } from 'lucide-react'
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

const emptyAd = { title: '', body: '', category: '', price: '', contactInfo: '', showContact: false, expiresAt: '', status: 'Pending' }
const STATUSES = ['Pending', 'Approved', 'Rejected']
const STATUS_LABELS = { Pending: 'En attente', Approved: 'Approuvé', Rejected: 'Refusé' }
const STATUS_STYLES = {
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
}
const FILTERS = ['Pending', 'Approved', 'Rejected', '']

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }
function fmtPrice(p) { return p == null ? '—' : p.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TND' }
function toInputDate(d) { return d ? new Date(d).toISOString().slice(0, 10) : '' }

// Petites annonces de la communauté (idée B6) : file de modération + gestion.
// La modération est obligatoire avant publication : une annonce reste « En
// attente » jusqu'à ce qu'un CommunityManager / ClubAdmin l'approuve. Le tableau
// public n'affiche que les annonces approuvées et non expirées, et les
// coordonnées ne sont visibles qu'avec le consentement de l'auteur.
// Paiements HORS PÉRIMÈTRE cette itération : le prix est la valeur déclarée de
// l'objet vendu, jamais une commission encaissée (TODO : passerelle TND).
export default function ClassifiedsModule({ onError }) {
  const [ads, setAds] = useState([])
  const [filter, setFilter] = useState('Pending')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(emptyAd)
  const [editing, setEditing] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const q = filter ? '?status=' + encodeURIComponent(filter) : ''
      setAds(await api('/admin/classifieds' + q))
      onError('')
    } catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [filter])

  function edit(ad) {
    setEditing(ad.id)
    setForm({
      title: ad.title || '',
      body: ad.body || '',
      category: ad.category || '',
      price: ad.price != null ? String(ad.price) : '',
      contactInfo: ad.contactInfo || '',
      showContact: !!ad.showContact,
      expiresAt: toInputDate(ad.expiresAt),
      status: ad.status || 'Pending',
    })
  }
  function reset() { setForm(emptyAd); setEditing(null) }

  async function save(e) {
    e.preventDefault()
    try {
      const body = {
        title: form.title.trim(),
        body: form.body.trim(),
        category: form.category.trim(),
        price: form.price === '' ? null : Number(form.price),
        contactInfo: form.contactInfo.trim() || null,
        showContact: form.showContact,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        status: form.status,
      }
      if (editing) await api('/admin/classifieds/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/classifieds', { method: 'POST', body: JSON.stringify(body) })
      reset()
      await load()
    } catch (err) { onError(err.message) }
  }

  async function moderate(id, action) {
    try { await api('/admin/classifieds/' + id + '/' + action, { method: 'POST' }); await load() }
    catch (err) { onError(err.message) }
  }

  async function remove(id) {
    if (!confirm('Supprimer définitivement cette annonce ?')) return
    try { await api('/admin/classifieds/' + id, { method: 'DELETE' }); if (editing === id) reset(); await load() }
    catch (err) { onError(err.message) }
  }

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2"><Megaphone className="text-jso-blue" size={20}/><h2 className="text-xl font-black">Petites annonces</h2></div>
      <p className="mt-1 text-xs text-slate-400">Modération obligatoire avant publication : seules les annonces approuvées et non expirées apparaissent sur le tableau public. Les coordonnées ne sont visibles qu'avec le consentement de l'auteur. Paiements hors périmètre (le prix est la valeur déclarée de l'objet — TODO : passerelle TND).</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map(f => <button key={f || 'all'} onClick={() => setFilter(f)} className={'rounded-full px-3 py-1.5 text-xs font-bold transition-colors ' + (filter === f ? 'bg-jso-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>{f ? STATUS_LABELS[f] : 'Toutes'}</button>)}
      </div>
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Annonces {filter && '— ' + STATUS_LABELS[filter]}</h2>
        <div className="mt-5 space-y-2">
          {loading ? <p className="text-sm text-slate-400">Chargement…</p>
            : ads.length === 0 ? <p className="text-sm text-slate-500">Aucune annonce dans cette file.</p>
            : ads.map(a => <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3">
                <div>
                  <b>{a.title}</b>
                  <span className={'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ' + (STATUS_STYLES[a.status] || 'bg-slate-200 text-slate-600')}>{STATUS_LABELS[a.status] || a.status}</span>
                  <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">{a.category}</span>
                  {a.price != null && <span className="ml-2 text-xs font-bold text-jso-blue">{fmtPrice(a.price)}</span>}
                  {a.body && <p className="mt-1 text-xs text-slate-500">{a.body}</p>}
                  {a.contactInfo && <p className="mt-1 text-xs text-slate-500">Contact : {a.contactInfo}{a.showContact ? ' (visible)' : ' (masqué)'}</p>}
                  <p className="mt-1 text-xs text-slate-400">Reçue le {fmtDate(a.createdAt)}{a.expiresAt ? ' · Expire le ' + fmtDate(a.expiresAt) : ''}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {a.status !== 'Approved' && <button onClick={() => moderate(a.id, 'approve')} title="Approuver" className="text-emerald-600"><Check size={16}/></button>}
                  {a.status !== 'Rejected' && <button onClick={() => moderate(a.id, 'reject')} title="Refuser" className="text-amber-600"><Ban size={16}/></button>}
                  <button onClick={() => edit(a)} title="Modifier" className="text-jso-blue"><Pencil size={16}/></button>
                  <button onClick={() => remove(a.id)} title="Supprimer" className="text-red-600"><X size={16}/></button>
                </div>
              </div>)}
        </div>
      </div>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">{editing ? 'Modifier l’annonce' : 'Nouvelle annonce'}</h2>
        <form onSubmit={save} className="mt-5 space-y-3">
          <label className="block text-sm font-bold">Titre
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required maxLength="120" placeholder="ex. Vélo enfant en bon état" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
          </label>
          <label className="block text-sm font-bold">Catégorie
            <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required maxLength="60" placeholder="ex. Vente, Service, Emploi" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
          </label>
          <label className="block text-sm font-bold">Description
            <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} required maxLength="4000" rows="4" placeholder="Détails de l'annonce" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
          </label>
          <label className="block text-sm font-bold">Prix déclaré (TND, facultatif)
            <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="Laisser vide si sans prix" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
          </label>
          <label className="block text-sm font-bold">Coordonnées (facultatif)
            <input value={form.contactInfo} onChange={e => setForm({ ...form, contactInfo: e.target.value })} maxLength="200" placeholder="Téléphone ou email" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={form.showContact} onChange={e => setForm({ ...form, showContact: e.target.checked })} className="h-4 w-4 rounded border-slate-300"/>
            Afficher les coordonnées publiquement (consentement)
          </label>
          <label className="block text-sm font-bold">Expiration (facultatif)
            <input type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
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
