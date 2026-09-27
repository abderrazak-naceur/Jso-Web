import { useEffect, useState } from 'react'
import { Save, Pencil, X, Plus } from 'lucide-react'
import { API_BASE_URL } from '../lib/apiConfig'

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

const empty = { title: '', category: '', fileUrl: '', isPublished: false }
const CATEGORIES = ['Communiqué', 'Règlement', 'Formulaire', 'Autre']

export default function DocumentsModule({ onError }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try { setItems(await api('/admin/documents')); onError('') }
    catch (e) { onError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function reset() { setForm(empty); setEditing(null) }
  function edit(x) {
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
      if (editing) await api('/admin/documents/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/documents', { method: 'POST', body: JSON.stringify(body) })
      reset()
      await load()
    } catch (e) { onError(e.message) }
  }

  async function remove(id) {
    if (!confirm('Supprimer ce document ?')) return
    try { await api('/admin/documents/' + id, { method: 'DELETE' }); await load() }
    catch (e) { onError(e.message) }
  }

  return <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between"><h2 className="text-xl font-black">Documents</h2><button onClick={reset} className="rounded-xl bg-jso-navy p-2 text-white"><Plus size={18}/></button></div>
      <div className="mt-5 overflow-x-auto">
        {loading ? <p className="text-sm text-slate-400">Chargement…</p>
          : items.length === 0 ? <p className="text-sm text-slate-400">Aucun document pour le moment.</p>
          : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Document</th><th className="p-2">Catégorie</th><th className="p-2">Publié</th><th className="p-2"></th></tr></thead><tbody>{items.map(x => <tr key={x.id} className="border-b last:border-0"><td className="p-2"><b>{x.title}</b><div className="text-xs text-slate-400"><a href={x.fileUrl} target="_blank" rel="noopener noreferrer" className="text-jso-blue hover:underline">Voir le fichier</a></div></td><td className="p-2">{x.category || '—'}</td><td className="p-2">{x.isPublished ? 'Oui' : 'Non'}</td><td className="p-2 whitespace-nowrap"><button onClick={() => edit(x)} className="mr-2 text-jso-blue"><Pencil size={16}/></button><button onClick={() => remove(x.id)} className="text-red-600"><X size={16}/></button></td></tr>)}</tbody></table>}
      </div>
    </div>
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">{editing ? 'Modifier le document' : 'Nouveau document'}</h2>
      <form onSubmit={save} className="mt-5 space-y-3">
        <label className="block text-sm font-bold">Titre<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"/></label>
        <label className="block text-sm font-bold">Catégorie<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"><option value="">—</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
        <label className="block text-sm font-bold">URL du fichier<input value={form.fileUrl} onChange={e => setForm({ ...form, fileUrl: e.target.value })} required placeholder="/uploads/... ou https://…" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"/></label>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })}/> Publié</label>
        <div className="flex gap-2 pt-2"><button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/> {editing ? 'Mettre à jour' : 'Créer'}</button>{editing && <button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}</div>
      </form>
    </div>
  </div>
}
