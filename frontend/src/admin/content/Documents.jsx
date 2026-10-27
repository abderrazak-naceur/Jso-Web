import { useEffect, useState } from 'react'
import { adminApi } from '../api'
import { useConfirm } from '../components/ui/ConfirmDialog'
import { Save, Pencil, X, Plus } from 'lucide-react'

const empty = { title: '', category: '', fileUrl: '', isPublished: false }
const CATEGORIES = ['Communiqué', 'Règlement', 'Formulaire', 'Autre']

export default function DocumentsModule({ onError }) {
  const confirm = useConfirm()
  const [items, setItems] = useState([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try { setItems(await adminApi('/admin/documents')); onError('') }
    catch (e) { onError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function reset() { setForm(empty); setEditing(null); setModalOpen(false) }
  function edit(x) { setModalOpen(true);
    setEditing(x.id)
    setForm({ title: x.title || '', category: x.category || '', fileUrl: x.fileUrl || '', isPublished: x.isPublished })
  }

  async function save(e) {
    e.preventDefault()
    try {
      const body = {
        title: form.title.trim(),
        category: form.category.trim() || null,
        fileUrl: form.fileUrl.trim(),
        isPublished: form.isPublished,
      }
      if (editing) await adminApi('/admin/documents/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      else await adminApi('/admin/documents', { method: 'POST', body: JSON.stringify(body) })
      reset()
      await load()
    } catch (e) { onError(e.message) }
  }

  async function remove(id) {
    if (!await confirm('Supprimer ce document ?')) return
    try { await adminApi('/admin/documents/' + id, { method: 'DELETE' }); await load() }
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
      <div className="flex items-center justify-between"><h2 className="text-xl font-black">Documents</h2><button onClick={() => { setForm(empty); setEditing(null); setModalOpen(true) }} className="rounded-xl bg-jso-navy p-2 text-white"><Plus size={18}/></button></div>
      <div className="mt-5 overflow-x-auto">
        {loading ? <p className="text-sm text-slate-400">Chargement…</p>
          : items.length === 0 ? <p className="text-sm text-slate-400">Aucun document pour le moment.</p>
          : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Document</th><th className="p-2">Catégorie</th><th className="p-2">Publié</th><th className="p-2"></th></tr></thead><tbody>{items.map(x => <tr key={x.id} className="border-b last:border-0"><td className="p-2"><b>{x.title}</b><div className="text-xs text-slate-400"><a href={x.fileUrl} target="_blank" rel="noopener noreferrer" className="text-jso-blue hover:underline">Voir le fichier</a></div></td><td className="p-2">{x.category || '—'}</td><td className="p-2">{x.isPublished ? 'Oui' : 'Non'}</td><td className="p-2 whitespace-nowrap"><button onClick={() => edit(x)} className="mr-2 text-jso-blue"><Pencil size={16}/></button><button onClick={() => remove(x.id)} className="text-red-600"><X size={16}/></button></td></tr>)}</tbody></table>}
      </div>
    </div>
{modalOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" onMouseDown={e => { if(e.target===e.currentTarget) reset() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="admin-form-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <h2 id="admin-form-title" className="text-xl font-black">{editing ? 'Modifier' : 'Créer'} · document</h2>
          <button type="button" aria-label="Fermer" onClick={reset} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20}/></button>
        </div>
        <form onSubmit={save} className="mt-5 space-y-3">
        <label className="block text-sm font-bold">Titre<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"/></label>
        <label className="block text-sm font-bold">Catégorie<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"><option value="">—</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
        <label className="block text-sm font-bold">URL du fichier<input value={form.fileUrl} onChange={e => setForm({ ...form, fileUrl: e.target.value })} required placeholder="/uploads/... ou https://…" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"/></label>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })}/> Publié</label>
        <div className="flex gap-2 pt-2"><button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/> {editing ? 'Mettre à jour' : 'Créer'}</button>{editing && <button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}</div>
      </form>
      </section>
    </div>}
  </div>
}
