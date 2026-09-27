import { useEffect, useState } from 'react'
import { Plus, Pencil, Save, X, ListChecks, Sparkles } from 'lucide-react'
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

// Check-list match (idée D14) : standardise les opérations de la journée de match.
// Réservé aux rôles MatchManager / ClubAdmin, écritures auditées, aucune donnée
// personnelle. Deux volets : modèles réutilisables et check-list par match.
export default function ChecklistModule({ onError }) {
  return <div className="space-y-6">
    <TemplatesPanel onError={onError} />
    <MatchChecklistPanel onError={onError} />
  </div>
}

const emptyTemplate = { label: '', displayOrder: 0, isActive: true }

// Volet modèles : voci di template riutilizzabili qui gestite comme une liste CRUD.
function TemplatesPanel({ onError }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(emptyTemplate)
  const [editing, setEditing] = useState(null)

  async function load() {
    setLoading(true)
    try { setTemplates(await api('/admin/checklist-templates')); onError('') }
    catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function edit(t) {
    setEditing(t.id)
    setForm({ label: t.label || '', displayOrder: t.displayOrder ?? 0, isActive: t.isActive })
  }
  function reset() { setForm(emptyTemplate); setEditing(null) }

  async function save(e) {
    e.preventDefault()
    try {
      const body = { label: form.label.trim(), displayOrder: Number(form.displayOrder) || 0, isActive: form.isActive }
      if (editing) await api('/admin/checklist-templates/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/checklist-templates', { method: 'POST', body: JSON.stringify(body) })
      reset()
      await load()
    } catch (err) { onError(err.message) }
  }

  async function remove(id) {
    if (!confirm('Supprimer cette entrée de modèle ?')) return
    try { await api('/admin/checklist-templates/' + id, { method: 'DELETE' }); if (editing === id) reset(); await load() }
    catch (err) { onError(err.message) }
  }

  return <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
    <div className="flex items-center gap-2"><ListChecks className="text-jso-blue" size={20}/><h2 className="text-xl font-black">Modèles de check-list</h2></div>
    <p className="mt-1 text-xs text-slate-400">Entrées réutilisables (ex. Terrain prêt, Billetterie ouverte, Live blog actif, Publications sociales programmées) qui servent à générer la check-list de chaque match.</p>
    <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-2">
        {loading ? <p className="text-sm text-slate-400">Chargement…</p>
          : templates.length === 0 ? <p className="text-sm text-slate-500">Aucun modèle. Ajoute des entrées standard pour les réutiliser sur chaque match.</p>
          : templates.map(t => <div key={t.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3">
              <div>
                <b>{t.label}</b>
                <span className={'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ' + (t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600')}>{t.isActive ? 'Actif' : 'Inactif'}</span>
                <p className="mt-1 text-xs text-slate-500">Ordre : {t.displayOrder}</p>
              </div>
              <div className="flex gap-2"><button onClick={() => edit(t)} className="text-jso-blue"><Pencil size={16}/></button><button onClick={() => remove(t.id)} className="text-red-600"><X size={16}/></button></div>
            </div>)}
      </div>
      <form onSubmit={save} className="space-y-3 rounded-xl border border-slate-100 p-4">
        <h3 className="font-black">{editing ? 'Modifier le modèle' : 'Nouvelle entrée de modèle'}</h3>
        <label className="block text-sm font-bold">Libellé
          <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} required maxLength="160" placeholder="ex. Billetterie ouverte" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
        </label>
        <label className="block text-sm font-bold">Ordre d'affichage
          <input type="number" value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
        </label>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })}/> Actif (inclus dans la génération)</label>
        <div className="flex gap-2 pt-2">
          <button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white">{editing ? <><Save size={16}/> Mettre à jour</> : <><Plus size={16}/> Ajouter</>}</button>
          {editing && <button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}
        </div>
      </form>
    </div>
  </div>
}

const emptyItem = { label: '', assigneeAdminId: '', displayOrder: 0 }

// Volet par match : sélection du match puis liste d'items avec cases à cocher,
// affectation d'un responsable et génération depuis les modèles actifs.
function MatchChecklistPanel({ onError }) {
  const [matches, setMatches] = useState([])
  const [selected, setSelected] = useState('')
  const [items, setItems] = useState([])
  const [assignees, setAssignees] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(emptyItem)
  const [editing, setEditing] = useState(null)

  async function loadMatches() {
    try { const data = await api('/admin/matches'); setMatches(data); if (!selected && data[0]) selectMatch(data[0].id); onError('') }
    catch (err) { onError(err.message) }
  }
  async function selectMatch(id) {
    setSelected(id); reset(); setLoading(true)
    try {
      const [list, admins] = await Promise.all([
        api('/admin/matches/' + id + '/checklist'),
        api('/admin/matches/' + id + '/checklist/assignees'),
      ])
      setItems(list); setAssignees(admins); onError('')
    } catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { loadMatches() }, [])

  function reset() { setForm(emptyItem); setEditing(null) }
  function edit(i) {
    setEditing(i.id)
    setForm({ label: i.label || '', assigneeAdminId: i.assigneeAdminId || '', displayOrder: i.displayOrder ?? 0 })
  }

  function itemBody(base, overrides = {}) {
    return {
      label: (overrides.label ?? base.label ?? '').toString().trim(),
      done: overrides.done ?? base.done ?? false,
      assigneeAdminId: (overrides.assigneeAdminId ?? base.assigneeAdminId) || null,
      displayOrder: Number(overrides.displayOrder ?? base.displayOrder) || 0,
    }
  }

  async function save(e) {
    e.preventDefault()
    if (!selected) return
    try {
      const body = itemBody(form)
      if (editing) await api('/admin/matches/' + selected + '/checklist/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/matches/' + selected + '/checklist', { method: 'POST', body: JSON.stringify(body) })
      reset()
      await selectMatch(selected)
    } catch (err) { onError(err.message) }
  }

  async function toggle(i) {
    try {
      await api('/admin/matches/' + selected + '/checklist/' + i.id, { method: 'PUT', body: JSON.stringify(itemBody(i, { done: !i.done })) })
      await selectMatch(selected)
    } catch (err) { onError(err.message) }
  }

  async function assign(i, assigneeAdminId) {
    try {
      await api('/admin/matches/' + selected + '/checklist/' + i.id, { method: 'PUT', body: JSON.stringify(itemBody(i, { assigneeAdminId })) })
      await selectMatch(selected)
    } catch (err) { onError(err.message) }
  }

  async function remove(id) {
    if (!confirm('Supprimer cet item de check-list ?')) return
    try { await api('/admin/matches/' + selected + '/checklist/' + id, { method: 'DELETE' }); if (editing === id) reset(); await selectMatch(selected) }
    catch (err) { onError(err.message) }
  }

  async function generate() {
    if (!selected) return
    try { await api('/admin/matches/' + selected + '/checklist/generate', { method: 'POST' }); await selectMatch(selected) }
    catch (err) { onError(err.message) }
  }

  const doneCount = items.filter(i => i.done).length
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0

  return <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">Matchs</h2>
      <div className="mt-4 space-y-2">
        {matches.map(m => <button key={m.id} onClick={() => selectMatch(m.id)} className={'w-full rounded-xl p-3 text-left ' + (selected === m.id ? 'bg-jso-navy text-white' : 'bg-slate-50 hover:bg-slate-100')}><b>{m.isHome ? 'JSO' : 'Ext.'} — {m.opponentName}</b><span className="block text-xs opacity-70">{new Date(m.kickoffAt).toLocaleString('fr-FR')}</span></button>)}
        {!matches.length && <p className="text-sm text-slate-500">Aucun match disponible.</p>}
      </div>
    </div>

    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">Check-list du match</h2>
        <button onClick={generate} disabled={!selected} className="flex items-center gap-2 rounded-xl bg-jso-gold px-4 py-2.5 font-bold text-jso-navy disabled:opacity-50"><Sparkles size={16}/> Générer depuis le modèle</button>
      </div>

      {selected && <div className="mt-4">
        <div className="flex items-center justify-between text-sm font-bold"><span>Progression</span><span>{doneCount}/{items.length} faits ({progress}%)</span></div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: progress + '%' }}/></div>
      </div>}

      <div className="mt-5 space-y-2">
        {loading ? <p className="text-sm text-slate-400">Chargement…</p>
          : !selected ? <p className="text-sm text-slate-500">Choisis un match pour gérer sa check-list.</p>
          : items.length === 0 ? <p className="text-sm text-slate-500">Aucun item. Clique sur « Générer depuis le modèle » ou ajoute un item ci-dessous.</p>
          : items.map(i => <div key={i.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3">
              <label className="flex flex-1 items-start gap-3">
                <input type="checkbox" checked={i.done} onChange={() => toggle(i)} className="mt-1"/>
                <span>
                  <b className={i.done ? 'text-slate-400 line-through' : ''}>{i.label}</b>
                  <span className="mt-2 block">
                    <select value={i.assigneeAdminId || ''} onChange={e => assign(i, e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-jso-blue">
                      <option value="">— Responsable —</option>
                      {assignees.map(a => <option key={a.id} value={a.id}>{a.displayName} ({a.role})</option>)}
                    </select>
                  </span>
                </span>
              </label>
              <div className="flex gap-2"><button onClick={() => edit(i)} className="text-jso-blue"><Pencil size={16}/></button><button onClick={() => remove(i.id)} className="text-red-600"><X size={16}/></button></div>
            </div>)}
      </div>

      {selected && <form onSubmit={save} className="mt-5 space-y-3 rounded-xl border border-slate-100 p-4">
        <h3 className="font-black">{editing ? 'Modifier l\'item' : 'Nouvel item'}</h3>
        <label className="block text-sm font-bold">Libellé
          <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} required maxLength="160" placeholder="ex. Sonorisation testée" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold">Responsable (facultatif)
            <select value={form.assigneeAdminId} onChange={e => setForm({ ...form, assigneeAdminId: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue">
              <option value="">— Aucun —</option>
              {assignees.map(a => <option key={a.id} value={a.id}>{a.displayName} ({a.role})</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold">Ordre d'affichage
            <input type="number" value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
          </label>
        </div>
        <div className="flex gap-2 pt-2">
          <button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white">{editing ? <><Save size={16}/> Mettre à jour</> : <><Plus size={16}/> Ajouter</>}</button>
          {editing && <button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}
        </div>
      </form>}
    </div>
  </div>
}
