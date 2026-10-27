import { useEffect, useState } from 'react'
import { adminApi } from '../api'
import { useConfirm } from '../components/ui/ConfirmDialog'
import { Link2, Save, Pencil, X, Plus } from 'lucide-react'
import { adminEditIdFromPath, adminEditUrl, navigateAdminEdit } from '../adminRoutes'
import { sharePreviewUrl } from '../../lib/sharePreviewUrl'

const empty = { title: '', slug: '', description: '', startAt: '', endAt: '', location: '', isPublished: false }

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default function ClubEventsModule({ onError }) {
  const confirm = useConfirm()
  const [items, setItems] = useState([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(Boolean(adminEditIdFromPath('club-events')))
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try { setItems(await adminApi('/admin/events')); onError('') }
    catch (e) { onError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    function syncRoute() {
      const id = adminEditIdFromPath('club-events')
      if (!id) { setForm(empty); setEditing(null); setModalOpen(false); return }
      const item = items.find((event) => String(event.id) === id)
      if (item) { setSelected(item); setModalOpen(true) }
      else if (items.length) onError('Événement admin introuvable.')
    }
    syncRoute()
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [items, onError])

  function reset() { navigateAdminEdit('club-events', null); setForm(empty); setEditing(null); setModalOpen(false) }
  function edit(x) { navigateAdminEdit('club-events', x.id); setSelected(x); setModalOpen(true) }
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
      if (editing) await adminApi('/admin/events/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      else await adminApi('/admin/events', { method: 'POST', body: JSON.stringify(body) })
      reset()
      await load()
    } catch (e) { onError(e.message) }
  }

  async function remove(id) {
    if (!await confirm('Supprimer cet événement ?')) return
    try { await adminApi('/admin/events/' + id, { method: 'DELETE' }); if (editing === id) reset(); await load() }
    catch (e) { onError(e.message) }
  }

  useEffect(() => {
    if (!modalOpen) return
    const closeOnEscape = event => { if (event.key === 'Escape') reset() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [modalOpen])
  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between"><h2 className="text-xl font-black">Événements du club</h2><button onClick={() => { setForm(empty); setEditing(null); setModalOpen(true) }} className="rounded-xl bg-jso-navy p-2 text-white"><Plus size={18}/></button></div>
      <div className="mt-5 overflow-x-auto">
        {loading ? <p className="text-sm text-slate-400">Chargement…</p>
          : items.length === 0 ? <p className="text-sm text-slate-400">Aucun événement pour le moment.</p>
          : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Événement</th><th className="p-2">Date</th><th className="p-2">Publié</th><th className="p-2"></th></tr></thead><tbody>{items.map(x => <tr key={x.id} className="border-b last:border-0"><td className="p-2"><b>{x.title}</b><div className="text-xs text-slate-400">{x.location || '—'}</div></td><td className="p-2 whitespace-nowrap">{x.startAt ? new Date(x.startAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td><td className="p-2">{x.isPublished ? 'Oui' : 'Non'}</td><td className="p-2 whitespace-nowrap"><button onClick={() => edit(x)} title="Modifier" className="mr-2 text-jso-blue"><Pencil size={16}/></button><button onClick={() => copyAdminLink(x)} title="Copier le lien admin" className="mr-2 text-jso-blue"><Link2 size={16}/></button>{x.isPublished && x.slug && <button onClick={() => copyPublicLink(x)} title="Copier le lien public" className="mr-2 text-xs font-bold text-jso-blue">Public</button>}<button onClick={() => remove(x.id)} title="Supprimer" className="text-red-600"><X size={16}/></button></td></tr>)}</tbody></table>}
      </div>
    </div>
{modalOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" onMouseDown={e => { if(e.target===e.currentTarget) reset() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="admin-form-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <h2 id="admin-form-title" className="text-xl font-black">{editing ? 'Modifier' : 'Créer'} · événement du club</h2>
          <button type="button" aria-label="Fermer" onClick={reset} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20}/></button>
        </div>
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
      </section>
    </div>}
  </div>
}
