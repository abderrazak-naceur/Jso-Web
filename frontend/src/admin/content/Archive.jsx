import { useEffect, useState } from 'react'
import { Plus, Pencil, Save, X } from 'lucide-react'
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

// Suggested categories for the digital museum / historical archive (idea C10).
const CATEGORIES = ['Season', 'Trophy', 'Photo', 'Milestone']
const CATEGORY_LABELS = { Season: 'Saison', Trophy: 'Trophée', Photo: 'Photo', Milestone: 'Jalon' }

const emptyItem = { year: '', category: 'Season', title: '', body: '', mediaAssetId: '', displayOrder: 0, isPublished: true }

function Field({ label, ...props }) {
  return <label className="block text-sm font-bold">{label}<input {...props} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue" /></label>
}

// Digital museum / historical archive management: past seasons, historic results,
// period photos and honours board. No sensitive personal data is stored here.
// Images reuse the existing MediaAsset library instead of new storage.
export default function ArchiveModule({ onError }) {
  const [items, setItems] = useState([])
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyItem)
  const [editing, setEditing] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const [list, mediaList] = await Promise.all([api('/admin/archive'), api('/media')])
      setItems(list)
      setMedia(mediaList)
      onError('')
    } catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function edit(it) {
    setEditing(it.id)
    setForm({
      year: it.year ?? '',
      category: it.category || 'Season',
      title: it.title || '',
      body: it.body || '',
      mediaAssetId: it.mediaAssetId || '',
      displayOrder: it.displayOrder ?? 0,
      isPublished: Boolean(it.isPublished),
    })
  }
  function reset() { setForm(emptyItem); setEditing(null) }

  async function save(e) {
    e.preventDefault()
    try {
      const body = {
        year: form.year === '' ? null : Number(form.year),
        category: form.category.trim(),
        title: form.title.trim(),
        body: form.body.trim(),
        mediaAssetId: form.mediaAssetId || null,
        displayOrder: Number(form.displayOrder) || 0,
        isPublished: form.isPublished,
      }
      if (editing) await api('/admin/archive/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/archive', { method: 'POST', body: JSON.stringify(body) })
      reset()
      await load()
    } catch (err) { onError(err.message) }
  }

  async function remove(id) {
    if (!confirm('Supprimer cet élément d’archive ?')) return
    try { await api('/admin/archive/' + id, { method: 'DELETE' }); if (editing === id) reset(); await load() }
    catch (err) { onError(err.message) }
  }

  const mediaById = Object.fromEntries(media.map(m => [m.id, m]))

  return <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">Musée digital · Archives</h2>
      <p className="mt-1 text-xs text-slate-400">Patrimoine du club : saisons passées, résultats historiques, photos d’époque, palmarès. Trié par année (récent d’abord). Aucune donnée personnelle sensible.</p>
      <div className="mt-5 overflow-x-auto">
        {loading ? <p className="text-sm text-slate-400">Chargement…</p>
          : items.length === 0 ? <p className="text-sm text-slate-400">Aucun élément d’archive. Ajoute le premier souvenir du club.</p>
          : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Année</th><th className="p-2">Catégorie</th><th className="p-2">Titre</th><th className="p-2">Image</th><th className="p-2">Publié</th><th className="p-2"></th></tr></thead><tbody>{items.map(it => <tr key={it.id} className="border-b last:border-0"><td className="p-2 font-bold">{it.year ?? '—'}</td><td className="p-2">{CATEGORY_LABELS[it.category] || it.category}</td><td className="p-2">{it.title}</td><td className="p-2">{it.mediaAssetId && mediaById[it.mediaAssetId] ? <img src={mediaById[it.mediaAssetId].url} alt="" className="h-8 w-8 rounded object-cover"/> : '—'}</td><td className="p-2">{it.isPublished ? 'Oui' : 'Non'}</td><td className="p-2 whitespace-nowrap"><button onClick={() => edit(it)} className="mr-2 text-jso-blue"><Pencil size={16}/></button><button onClick={() => remove(it.id)} className="text-red-600"><X size={16}/></button></td></tr>)}</tbody></table>}
      </div>
    </div>
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">{editing ? 'Modifier l’élément' : 'Nouvel élément'}</h2>
      <form onSubmit={save} className="mt-5 space-y-3">
        <Field label="Année (optionnel)" type="number" min="1900" max="2200" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} placeholder="ex. 1987"/>
        <label className="block text-sm font-bold">Catégorie
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue">
            {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </label>
        <Field label="Titre" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required maxLength="200"/>
        <label className="block text-sm font-bold">Description
          <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} required rows="5" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
        </label>
        <label className="block text-sm font-bold">Image (bibliothèque médias)
          <select value={form.mediaAssetId} onChange={e => setForm({ ...form, mediaAssetId: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue">
            <option value="">— Aucune —</option>
            {media.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </label>
        <Field label="Ordre d’affichage" type="number" value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: e.target.value })}/>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })}/> Publié (visible sur le site public)</label>
        <div className="flex gap-2 pt-2"><button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white">{editing ? <><Save size={16}/> Mettre à jour</> : <><Plus size={16}/> Créer</>}</button>{editing && <button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}</div>
      </form>
    </div>
  </div>
}
