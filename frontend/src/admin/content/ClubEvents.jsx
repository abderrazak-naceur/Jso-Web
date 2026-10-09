import { useEffect, useState } from 'react'
import { Link2, Save, Pencil, X, Plus } from 'lucide-react'
import { API_BASE_URL } from '../../lib/apiConfig'
import { adminEditIdFromPath, adminEditUrl, navigateAdminEdit } from '../adminRoutes'
import { sharePreviewUrl } from '../../lib/sharePreviewUrl'

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

const empty = { title: '', slug: '', description: '', startAt: '', endAt: '', location: '', isPublished: false }

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default function ClubEventsModule({ onError }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try { setItems(await api('/admin/events')); onError('') }
    catch (e) { onError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    function syncRoute() {
      const id = adminEditIdFromPath('club-events')
      if (!id) { setForm(empty); setEditing(null); return }
      const item = items.find((event) => String(event.id) === id)
      if (item) setSelected(item)
      else if (items.length) onError('Événement admin introuvable.')
    }
    syncRoute()
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [items, onError])

  function reset() { navigateAdminEdit('club-events', null); setForm(empty); setEditing(null) }
  function edit(x) { navigateAdminEdit('club-events', x.id); setSelected(x) }
  function setSelected(x) {
    setEditing(x.id)
    setForm({
      title: x.title || '', slug: x.slug || '', description: x.description || '',
      startAt: x.startAt ? x.startAt.slice(0, 16) : '', endAt: x.endAt ? x.endAt.slice(0, 16) : '',
      location: x.location || '', isPublished: x.isPublished,
    })
  }
  async function copyAdminLink(x) { try { await navigator.clipboard.writeText(window.location.origin + adminEditUrl('club-events', x.id)) } catch { onError('Impossible de copier le lien admin.') } }
  async function copyPublicLink(x) { try { await navigator.clipboard.writeText(sharePreviewUrl('event', x.slug)) } catch { onError('Impossible de copier le lien public.') } }

  async function save(e) {
    e.preventDefault()
    try {
      const body = {
        title: form.title.trim(),
        slug: form.slug.trim() || slugify(form.title),
        description: form.description.trim() || null,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
        location: form.location.trim() || null,
        isPublished: form.isPublished,
      }
      if (editing) await api('/admin/events/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/events', { method: 'POST', body: JSON.stringify(body) })
      reset()
      await load()
    } catch (e) { onError(e.message) }
  }

  async function remove(id) {
    if (!confirm('Supprimer cet événement ?')) return
    try { await api('/admin/events/' + id, { method: 'DELETE' }); if (editing === id) reset(); await load() }
    catch (e) { onError(e.message) }
  }

  return <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between"><h2 className="text-xl font-black">Événements du club</h2><button onClick={reset} className="rounded-xl bg-jso-navy p-2 text-white"><Plus size={18}/></button></div>
      <div className="mt-5 overflow-x-auto">
        {loading ? <p className="text-sm text-slate-400">Chargement…</p>
          : items.length === 0 ? <p className="text-sm text-slate-400">Aucun événement pour le moment.</p>
          : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Événement</th><th className="p-2">Date</th><th className="p-2">Publié</th><th className="p-2"></th></tr></thead><tbody>{items.map(x => <tr key={x.id} className="border-b last:border-0"><td className="p-2"><b>{x.title}</b><div className="text-xs text-slate-400">{x.location || '—'}</div></td><td className="p-2 whitespace-nowrap">{x.startAt ? new Date(x.startAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td><td className="p-2">{x.isPublished ? 'Oui' : 'Non'}</td><td className="p-2 whitespace-nowrap"><button onClick={() => edit(x)} title="Modifier" className="mr-2 text-jso-blue"><Pencil size={16}/></button><button onClick={() => copyAdminLink(x)} title="Copier le lien admin" className="mr-2 text-jso-blue"><Link2 size={16}/></button>{x.isPublished && x.slug && <button onClick={() => copyPublicLink(x)} title="Copier le lien public" className="mr-2 text-xs font-bold text-jso-blue">Public</button>}<button onClick={() => remove(x.id)} title="Supprimer" className="text-red-600"><X size={16}/></button></td></tr>)}</tbody></table>}
      </div>
    </div>
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">{editing ? 'Modifier l’événement' : 'Nouvel événement'}</h2>
      <form onSubmit={save} className="mt-5 space-y-3">
        <label className="block text-sm font-bold">Titre<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })} required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"/></label>
        <label className="block text-sm font-bold">Slug<input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"/></label>
        <label className="block text-sm font-bold">Description<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows="3" className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-jso-blue"/></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-bold">Début<input type="datetime-local" value={form.startAt} onChange={e => setForm({ ...form, startAt: e.target.value })} required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/></label>
          <label className="block text-sm font-bold">Fin<input type="datetime-local" value={form.endAt} onChange={e => setForm({ ...form, endAt: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/></label>
        </div>
        <label className="block text-sm font-bold">Lieu<input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"/></label>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })}/> Publié</label>
        <div className="flex gap-2 pt-2"><button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/> {editing ? 'Mettre à jour' : 'Créer'}</button>{editing && <button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}</div>
      </form>
    </div>
  </div>
}
