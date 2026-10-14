import { useEffect, useState } from 'react'
import { Save, X, Plus, RefreshCw, ImagePlus } from 'lucide-react'
import MembershipCardArtwork from './MembershipCardArtwork'
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

const emptyPlan = { name: '', description: '', price: '', currency: 'TND', durationDays: 365, isActive: true, displayOrder: 0 }
const STATUS_STYLES = {
  Active: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
  Expired: 'bg-slate-100 text-slate-500',
  Cancelled: 'bg-slate-100 text-slate-500',
}

// Admin management for supporter membership plans (idea B: monetisation) plus a
// read-only oversight of subscriptions. No card data is handled here: a
// membership becomes Active only via the verified payment webhook.
export default function MembershipsModule({ onError }) {
  const [plans, setPlans] = useState([])
  const [memberships, setMemberships] = useState([])
  const [form, setForm] = useState(emptyPlan)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [artworkOpen, setArtworkOpen] = useState(false)

  async function loadPlans() {
    setLoading(true)
    try { setPlans(await api('/admin/membership-plans')); onError('') }
    catch (e) { onError(e.message) }
    finally { setLoading(false) }
  }
  async function loadMemberships() {
    try { setMemberships(await api('/admin/memberships')) }
    catch (e) { onError(e.message) }
  }
  useEffect(() => { loadPlans(); loadMemberships() }, [])

  function reset() { setForm(emptyPlan); setEditing(null); setModalOpen(false) }
  function startCreate() { setForm(emptyPlan); setEditing(null); setModalOpen(true) }
  function edit(p) {
    setEditing(p.id)
    setForm({ name: p.name || '', description: p.description || '', price: p.price ?? '', currency: p.currency || 'TND', durationDays: p.durationDays ?? 365, isActive: p.isActive, displayOrder: p.displayOrder ?? 0 }); setModalOpen(true)
  }

  async function save(e) {
    e.preventDefault()
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price) || 0,
        currency: (form.currency || 'TND').trim().toUpperCase(),
        durationDays: Number(form.durationDays) || 1,
        isActive: form.isActive,
        displayOrder: Number(form.displayOrder) || 0,
      }
      if (editing) await api('/admin/membership-plans/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/membership-plans', { method: 'POST', body: JSON.stringify(body) })
      reset(); await loadPlans()
    } catch (e) { onError(e.message) }
  }
  async function remove(id) {
    if (!confirm('Supprimer cet abonnement ?')) return
    try { await api('/admin/membership-plans/' + id, { method: 'DELETE' }); await loadPlans() }
    catch (e) { onError(e.message) }
  }

  const money = (n, c) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c || 'TND' }).format(n || 0)

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Abonnements — Formules</h2><p className="mt-1 text-sm text-slate-500">Créez vos formules et choisissez le visuel commun recto/verso de la carte.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setArtworkOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><ImagePlus size={16}/> Visuels recto/verso</button><button type="button" onClick={startCreate} className="inline-flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 text-sm font-black text-white"><Plus size={16}/> Nouvel abonnement</button></div></div>
        <div className="mt-5 overflow-x-auto">
          {loading ? <p className="text-sm text-slate-400">Chargement…</p>
            : plans.length === 0 ? <p className="text-sm text-slate-400">Aucune formule. Créez la première avec le formulaire.</p>
            : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Formule</th><th className="p-2">Prix</th><th className="p-2">Durée</th><th className="p-2">Active</th><th className="p-2"></th></tr></thead><tbody>{plans.map((p) => <tr key={p.id} className="border-b last:border-0"><td className="p-2"><b>{p.name}</b><div className="text-xs text-slate-400">{p.description || '—'}</div></td><td className="p-2 whitespace-nowrap">{money(p.price, p.currency)}</td><td className="p-2 whitespace-nowrap">{p.durationDays} j</td><td className="p-2">{p.isActive ? 'Oui' : 'Non'}</td><td className="p-2 whitespace-nowrap"><button onClick={() => edit(p)} className="mr-2 text-jso-blue"><Save size={16}/></button><button onClick={() => remove(p.id)} className="text-red-600"><X size={16}/></button></td></tr>)}</tbody></table>}
        </div>
      </div>
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between"><h2 className="text-xl font-black">Abonnés</h2><button onClick={loadMemberships} className="rounded-xl border border-slate-200 p-2 text-slate-600" aria-label="Actualiser"><RefreshCw size={16}/></button></div>
      <div className="mt-4 overflow-x-auto">
        {memberships.length === 0 ? <p className="text-sm text-slate-400">Aucun abonnement souscrit.</p>
          : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Date</th><th className="p-2">Formule</th><th className="p-2">Prix</th><th className="p-2">Statut</th><th className="p-2">Fin</th></tr></thead><tbody>{memberships.map((m) => <tr key={m.id} className="border-b last:border-0"><td className="p-2 whitespace-nowrap">{new Date(m.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'short' })}</td><td className="p-2">{m.planName}</td><td className="p-2 whitespace-nowrap font-bold">{money(m.price, m.currency)}</td><td className="p-2"><span className={'rounded-full px-2.5 py-1 text-xs font-extrabold ' + (STATUS_STYLES[m.status] || 'bg-slate-100 text-slate-600')}>{m.status}</span></td><td className="p-2 whitespace-nowrap">{m.endsAt ? new Date(m.endsAt).toLocaleDateString('fr-FR', { dateStyle: 'short' }) : '—'}</td></tr>)}</tbody></table>}
      </div>
    </div>
    {modalOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) reset() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="membership-modal-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-jso-blue">Abonnements</p><h3 id="membership-modal-title" className="mt-1 text-xl font-black">{editing ? 'Modifier la formule' : 'Nouvel abonnement'}</h3><p className="mt-1 text-sm text-slate-500">Les visuels recto/verso sont partagés entre toutes les formules.</p></div><button type="button" onClick={reset} aria-label="Fermer" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={20}/></button></div>
        <form onSubmit={save} className="space-y-4">
          <label className="block text-sm font-bold">Nom<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/></label>
          <label className="block text-sm font-bold">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows="3" className="mt-1 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-jso-blue"/></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-bold">Prix<input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/></label>
            <label className="block text-sm font-bold">Durée (jours)<input type="number" min="1" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-bold">Devise<input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/></label>
            <label className="block text-sm font-bold">Ordre<input type="number" min="0" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/></label>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}/> Active</label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={reset} className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-600">Annuler</button><button className="inline-flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/>{editing ? 'Mettre à jour' : 'Créer la formule'}</button></div>
        </form>
      </div>
    </div>}
    {artworkOpen && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setArtworkOpen(false) }}>
      <div role="dialog" aria-modal="true" aria-labelledby="artwork-modal-title" className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h3 id="artwork-modal-title" className="text-xl font-black">Visuels communs de la carte</h3><p className="mt-1 text-sm text-slate-500">Sélectionnez séparément le recto et le verso.</p></div><button type="button" onClick={() => setArtworkOpen(false)} aria-label="Fermer" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={20}/></button></div>
        <MembershipCardArtwork onError={onError}/>
      </div>
    </div>}
  </div>
}
