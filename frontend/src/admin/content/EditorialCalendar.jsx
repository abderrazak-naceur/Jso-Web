import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, RefreshCw, Save, Send, X } from 'lucide-react'
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

const STATUSES = ['Draft', 'Scheduled', 'Published']
const STATUS_LABELS = { Draft: 'Brouillon', Scheduled: 'Programmé', Published: 'Publié' }
const STATUS_STYLES = {
  Draft: 'bg-slate-200 text-slate-600',
  Scheduled: 'bg-amber-100 text-amber-700',
  Published: 'bg-emerald-100 text-emerald-700',
}

function fmtDateTime(d) { return d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—' }

// Convert an ISO instant into the value expected by <input type="datetime-local">
// (local time, no timezone suffix, minute precision).
function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Calendrier éditorial (idée D13) : planifier la publication des news avec un
// statut brouillon / programmé / publié. La publication programmée est déclenchée
// par le bouton « Publier les articles dus » (endpoint idempotent publish-due).
export default function EditorialCalendarModule({ onError }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ editorialStatus: 'Draft', scheduledAt: '' })

  async function load() {
    setLoading(true)
    try { setItems(await api('/admin/editorial-calendar')); onError('') }
    catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function edit(item) {
    setEditing(item.id)
    setForm({ editorialStatus: item.editorialStatus || 'Draft', scheduledAt: toLocalInput(item.scheduledAt) })
  }
  function reset() { setEditing(null); setForm({ editorialStatus: 'Draft', scheduledAt: '' }) }

  async function save(e) {
    e.preventDefault()
    if (!editing) return
    if (form.editorialStatus === 'Scheduled' && !form.scheduledAt) {
      onError('Une date de programmation est requise pour le statut « Programmé ».')
      return
    }
    try {
      const body = {
        editorialStatus: form.editorialStatus,
        scheduledAt: form.editorialStatus === 'Scheduled' && form.scheduledAt
          ? new Date(form.scheduledAt).toISOString()
          : null,
      }
      await api('/admin/editorial-calendar/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      reset()
      await load()
    } catch (err) { onError(err.message) }
  }

  async function publishDue() {
    setPublishing(true)
    try {
      const result = await api('/admin/editorial-calendar/publish-due', { method: 'POST' })
      onError('')
      await load()
      alert(result.published > 0 ? `${result.published} article(s) publié(s).` : 'Aucun article à publier pour le moment.')
    } catch (err) { onError(err.message) }
    finally { setPublishing(false) }
  }

  const counts = useMemo(() => ({
    draft: items.filter(i => i.editorialStatus === 'Draft').length,
    scheduled: items.filter(i => i.editorialStatus === 'Scheduled').length,
    published: items.filter(i => i.editorialStatus === 'Published').length,
  }), [items])

  const now = Date.now()
  const editingItem = items.find(i => i.id === editing)

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><CalendarClock className="text-jso-blue" size={20}/><h2 className="text-xl font-black">Calendrier éditorial</h2></div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"><RefreshCw size={16}/> Actualiser</button>
          <button onClick={publishDue} disabled={publishing} className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"><Send size={16}/> {publishing ? 'Publication…' : 'Publier les articles dus'}</button>
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-400">Planifiez la sortie des news : brouillon, programmé (avec date/heure) ou publié. « Publier les articles dus » publie les articles programmés dont l'échéance est atteinte (idempotent).</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-wide text-slate-400">Brouillons</p><p className="mt-1 text-2xl font-black">{loading ? '…' : counts.draft}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-wide text-slate-400">Programmés</p><p className="mt-1 text-2xl font-black">{loading ? '…' : counts.scheduled}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-wide text-slate-400">Publiés</p><p className="mt-1 text-2xl font-black">{loading ? '…' : counts.published}</p></div>
      </div>
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-black">Articles</h3>
        <div className="mt-5 space-y-2">
          {loading ? <p className="text-sm text-slate-400">Chargement…</p>
            : items.length === 0 ? <p className="text-sm text-slate-500">Aucun article pour le moment. Créez des news dans la section News CMS.</p>
            : items.map(i => {
                const overdue = i.editorialStatus === 'Scheduled' && i.scheduledAt && new Date(i.scheduledAt).getTime() <= now
                return <div key={i.id} className={'flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3 ' + (editing === i.id ? 'ring-2 ring-jso-blue' : '')}>
                  <div>
                    <b>{i.title}</b>
                    <span className={'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ' + (STATUS_STYLES[i.editorialStatus] || 'bg-slate-200 text-slate-600')}>{STATUS_LABELS[i.editorialStatus] || i.editorialStatus}</span>
                    {overdue && <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">À publier</span>}
                    <p className="mt-1 text-xs text-slate-500">Programmé : {fmtDateTime(i.scheduledAt)} · Publié : {fmtDateTime(i.publishedAt)}</p>
                  </div>
                  <button onClick={() => edit(i)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-jso-blue hover:bg-white">Programmer</button>
                </div>
              })}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-black">{editing ? 'Programmer / déplacer' : 'Sélectionnez un article'}</h3>
        {!editing ? <p className="mt-3 text-sm text-slate-400">Choisissez un article dans la liste pour définir son statut éditorial et sa date de programmation.</p>
          : <form onSubmit={save} className="mt-5 space-y-3">
              <p className="rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-700">{editingItem?.title}</p>
              <label className="block text-sm font-bold">Statut éditorial
                <select value={form.editorialStatus} onChange={e => setForm({ ...form, editorialStatus: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue">
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </label>
              {form.editorialStatus === 'Scheduled' && <label className="block text-sm font-bold">Date de programmation
                <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
              </label>}
              <div className="flex gap-2 pt-2">
                <button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/> Enregistrer</button>
                <button type="button" onClick={reset} className="flex items-center gap-2 rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100"><X size={16}/> Annuler</button>
              </div>
            </form>}
      </div>
    </div>
  </div>
}
