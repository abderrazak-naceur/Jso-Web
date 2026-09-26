import { useCallback, useEffect, useState } from 'react'
import { Pin, Plus, Save, Trash2, X } from 'lucide-react'
import { API_BASE_URL } from '../lib/apiConfig'

// Composant autonome pour le live blog (second écran) d'un match.
// Il n'est pas encore câblé dans AdminApp.jsx : voir la note d'intégration en bas de fichier.
//
// Utilisation :
//   <LiveBlog matchId={match.id} onError={setError} />
// Le composant gère lui-même le jeton admin et les états chargement / vide / erreur.

async function api(path, options = {}) {
  const token = localStorage.getItem('jso_admin_token')
  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers,
    },
  })
  if (!response.ok) {
    let message = 'Échec de la requête : ' + response.status
    try { message = (await response.json()).message || message } catch { /* corps non JSON */ }
    throw new Error(message)
  }
  if (response.status === 204) return null
  return response.json()
}

const KINDS = [
  { value: 'Text', label: 'Commentaire' },
  { value: 'Goal', label: 'But' },
  { value: 'Card', label: 'Carton' },
  { value: 'Substitution', label: 'Remplacement' },
]

const emptyEntry = { body: '', kind: 'Text', minute: '', isPinned: false }

function kindLabel(value) {
  return KINDS.find(k => k.value === value)?.label || value
}

export default function LiveBlog({ matchId, onError }) {
  const [entries, setEntries] = useState([])
  const [form, setForm] = useState(emptyEntry)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const report = useCallback((message) => {
    setError(message)
    if (onError) onError(message)
  }, [onError])

  const load = useCallback(async () => {
    if (!matchId) return
    setLoading(true)
    setError('')
    try {
      setEntries(await api('/admin/matches/' + matchId + '/liveblog'))
    } catch (e) {
      report(e.message)
    } finally {
      setLoading(false)
    }
  }, [matchId, report])

  useEffect(() => { load() }, [load])

  function resetForm() {
    setEditing(null)
    setForm(emptyEntry)
  }

  function startEdit(entry) {
    setEditing(entry.id)
    setForm({
      body: entry.body,
      kind: entry.kind,
      minute: entry.minute ?? '',
      isPinned: entry.isPinned,
    })
  }

  async function save(event) {
    event.preventDefault()
    try {
      const body = {
        body: form.body,
        kind: form.kind,
        minute: form.minute === '' ? null : Number(form.minute),
        isPinned: Boolean(form.isPinned),
      }
      if (editing) {
        await api('/admin/matches/' + matchId + '/liveblog/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      } else {
        await api('/admin/matches/' + matchId + '/liveblog', { method: 'POST', body: JSON.stringify(body) })
      }
      resetForm()
      await load()
    } catch (e) {
      report(e.message)
    }
  }

  async function remove(id) {
    try {
      await api('/admin/matches/' + matchId + '/liveblog/' + id, { method: 'DELETE' })
      if (editing === id) resetForm()
      await load()
    } catch (e) {
      report(e.message)
    }
  }

  if (!matchId) {
    return <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-slate-500">Sélectionnez un match pour gérer son live blog.</div>
  }

  return <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
    <form onSubmit={save} className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">{editing ? 'Modifier l’entrée' : 'Nouvelle entrée'}</h2>
        {editing && <button type="button" onClick={resetForm} className="text-slate-400 hover:text-jso-blue"><X size={18} /></button>}
      </div>
      <label className="block text-sm font-bold">Type
        <select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue">
          {KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
      </label>
      <label className="block text-sm font-bold">Minute
        <input type="number" min="0" max="200" value={form.minute} onChange={e => setForm({ ...form, minute: e.target.value })} placeholder="Optionnel" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue" />
      </label>
      <label className="block text-sm font-bold">Message
        <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows="5" required className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-jso-blue" />
      </label>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" checked={form.isPinned} onChange={e => setForm({ ...form, isPinned: e.target.checked })} /> Épingler en haut
      </label>
      <button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white hover:bg-jso-blue">
        {editing ? <Save size={16} /> : <Plus size={16} />} {editing ? 'Mettre à jour' : 'Publier l’entrée'}
      </button>
    </form>

    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">Fil du match</h2>
      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      {loading
        ? <p className="mt-5 text-slate-500">Chargement du fil…</p>
        : entries.length === 0
          ? <p className="mt-5 text-slate-500">Aucune entrée pour le moment.</p>
          : <div className="mt-5 space-y-2">
              {entries.map(entry => <div key={entry.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-slate-50 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-bold text-jso-blue">
                    {entry.isPinned && <Pin size={13} className="text-jso-gold" />}
                    <span className="rounded-full bg-white px-2 py-0.5">{kindLabel(entry.kind)}</span>
                    {entry.minute != null && <span>{entry.minute}&apos;</span>}
                    <span className="font-medium text-slate-400">{new Date(entry.createdAt).toLocaleString('fr-FR')}</span>
                  </div>
                  <p className="mt-2 break-words text-sm">{entry.body}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(entry)} className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-jso-blue">Modifier</button>
                  <button onClick={() => remove(entry.id)} className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-red-600"><Trash2 size={15} /></button>
                </div>
              </div>)}
            </div>}
    </div>
  </div>
}

// Note d'intégration (sans modifier AdminApp.jsx pour éviter les conflits) :
// 1. Importer le composant en haut d'AdminApp.jsx :
//        import LiveBlog from './LiveBlog'
// 2. Ajouter une entrée de navigation (ex. dans la liste des sections) et rendre le module :
//        {section === 'liveblog' && <LiveBlog matchId={selectedMatchId} onError={setError} />}
//    où `selectedMatchId` est l'identifiant du match sélectionné dans le back office.
// 3. Côté public, l'endpoint en lecture seule est GET /api/matches/{id}/liveblog
//    (interrogeable en polling léger toutes les ~15-30 s), sans authentification.
