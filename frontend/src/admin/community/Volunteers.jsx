import { useEffect, useState } from 'react'
import { Plus, Pencil, Save, X, Check } from 'lucide-react'
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

const emptyVolunteer = { name: '', role: '', contact: '', contactConsent: false, isActive: true }
const emptyAssignment = { volunteerId: '', task: '', status: 'Proposed', notes: '' }
const ASSIGNMENT_STATUSES = ['Proposed', 'Confirmed']
const STATUS_LABELS = { Proposed: 'Proposé', Confirmed: 'Confirmé' }

function Field({ label, ...props }) {
  return <label className="block text-sm font-bold">{label}<input {...props} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue" /></label>
}

// Volunteer directory: personal contact data is minimised and only kept when the
// volunteer consents. Nothing here is exposed on the public site.
function VolunteerDirectory({ volunteers, loading, onSaved, onError }) {
  const [form, setForm] = useState(emptyVolunteer)
  const [editing, setEditing] = useState(null)

  function edit(v) {
    setEditing(v.id)
    setForm({ name: v.name || '', role: v.role || '', contact: v.contact || '', contactConsent: Boolean(v.contactConsent), isActive: Boolean(v.isActive) })
  }
  function reset() { setForm(emptyVolunteer); setEditing(null) }

  async function save(e) {
    e.preventDefault()
    try {
      const body = {
        name: form.name.trim(),
        role: form.role.trim(),
        contact: form.contact.trim() || null,
        contactConsent: form.contactConsent,
        isActive: form.isActive,
      }
      if (editing) await api('/admin/volunteers/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/volunteers', { method: 'POST', body: JSON.stringify(body) })
      reset()
      await onSaved()
    } catch (err) { onError(err.message) }
  }

  async function remove(id) {
    if (!confirm('Supprimer ce bénévole ? Ses affectations seront également supprimées.')) return
    try { await api('/admin/volunteers/' + id, { method: 'DELETE' }); if (editing === id) reset(); await onSaved() }
    catch (err) { onError(err.message) }
  }

  return <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">Bénévoles</h2>
      <p className="mt-1 text-xs text-slate-400">Coordonnées conservées uniquement avec le consentement du bénévole (minimisation RGPD). Données jamais publiées.</p>
      <div className="mt-5 overflow-x-auto">
        {loading ? <p className="text-sm text-slate-400">Chargement…</p>
          : volunteers.length === 0 ? <p className="text-sm text-slate-400">Aucun bénévole enregistré.</p>
          : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Nom</th><th className="p-2">Rôle</th><th className="p-2">Contact</th><th className="p-2">Actif</th><th className="p-2"></th></tr></thead><tbody>{volunteers.map(v => <tr key={v.id} className="border-b last:border-0"><td className="p-2 font-bold">{v.name}</td><td className="p-2">{v.role}</td><td className="p-2 text-slate-500">{v.contact || '—'}</td><td className="p-2">{v.isActive ? 'Oui' : 'Non'}</td><td className="p-2 whitespace-nowrap"><button onClick={() => edit(v)} className="mr-2 text-jso-blue"><Pencil size={16}/></button><button onClick={() => remove(v.id)} className="text-red-600"><X size={16}/></button></td></tr>)}</tbody></table>}
      </div>
    </div>
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">{editing ? 'Modifier le bénévole' : 'Nouveau bénévole'}</h2>
      <form onSubmit={save} className="mt-5 space-y-3">
        <Field label="Nom" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required maxLength="160"/>
        <Field label="Rôle" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="ex. Billetterie, Accueil, Photo, Sécurité" required maxLength="120"/>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.contactConsent} onChange={e => setForm({ ...form, contactConsent: e.target.checked })}/> Consentement pour conserver un contact</label>
        <Field label="Contact (téléphone / email)" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} disabled={!form.contactConsent} placeholder={form.contactConsent ? '' : 'Consentement requis'} maxLength="200"/>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })}/> Actif</label>
        <div className="flex gap-2 pt-2"><button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/> {editing ? 'Mettre à jour' : 'Créer'}</button>{editing && <button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}</div>
      </form>
    </div>
  </div>
}

// Matchday shift grid: which volunteer does which task, proposed or confirmed.
function AssignmentGrid({ volunteers, onError }) {
  const [matches, setMatches] = useState([])
  const [selected, setSelected] = useState('')
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(emptyAssignment)
  const [editing, setEditing] = useState(null)

  async function loadMatches() {
    try { const data = await api('/admin/matches'); setMatches(data); if (!selected && data[0]) selectMatch(data[0].id) }
    catch (err) { onError(err.message) }
  }
  async function selectMatch(id) {
    setSelected(id); setEditing(null); setForm(emptyAssignment); setLoading(true)
    try { setAssignments(await api('/admin/matches/' + id + '/assignments')); onError('') }
    catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { loadMatches() }, [])

  function edit(a) {
    setEditing(a.id)
    setForm({ volunteerId: a.volunteerId, task: a.task || '', status: a.status || 'Proposed', notes: a.notes || '' })
  }
  function cancelEdit() { setEditing(null); setForm(emptyAssignment) }

  async function save(e) {
    e.preventDefault()
    if (!selected) return
    try {
      const body = { volunteerId: form.volunteerId, task: form.task.trim(), status: form.status, notes: form.notes.trim() || null }
      if (editing) await api('/admin/matches/' + selected + '/assignments/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/matches/' + selected + '/assignments', { method: 'POST', body: JSON.stringify(body) })
      cancelEdit()
      await selectMatch(selected)
    } catch (err) { onError(err.message) }
  }

  async function remove(id) {
    try { await api('/admin/matches/' + selected + '/assignments/' + id, { method: 'DELETE' }); if (editing === id) cancelEdit(); await selectMatch(selected) }
    catch (err) { onError(err.message) }
  }

  const activeVolunteers = volunteers.filter(v => v.isActive)

  return <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">Matchs</h2>
      <div className="mt-4 space-y-2">
        {matches.map(m => <button key={m.id} onClick={() => selectMatch(m.id)} className={'w-full rounded-xl p-3 text-left ' + (selected === m.id ? 'bg-jso-navy text-white' : 'bg-slate-50 hover:bg-slate-100')}><b>{m.isHome ? 'JSO' : 'Ext.'} — {m.opponentName}</b><span className="block text-xs opacity-70">{new Date(m.kickoffAt).toLocaleString('fr-FR')}</span></button>)}
        {!matches.length && <p className="text-sm text-slate-500">Aucun match disponible.</p>}
      </div>
    </div>
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">Grille des postes</h2>
      {!selected ? <p className="mt-3 text-sm text-slate-500">Sélectionne un match.</p>
        : <>
          <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold">Bénévole
              <select value={form.volunteerId} onChange={e => setForm({ ...form, volunteerId: e.target.value })} required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue">
                <option value="">— Choisir —</option>
                {activeVolunteers.map(v => <option key={v.id} value={v.id}>{v.name} ({v.role})</option>)}
              </select>
            </label>
            <Field label="Poste / tâche" value={form.task} onChange={e => setForm({ ...form, task: e.target.value })} placeholder="ex. Billetterie, Accueil, Photo, Sécurité" required maxLength="160"/>
            <label className="text-sm font-bold">Statut
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue">
                {ASSIGNMENT_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </label>
            <Field label="Note" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} maxLength="500"/>
            <div className="sm:col-span-2 flex gap-2">
              <button disabled={!activeVolunteers.length} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white disabled:opacity-50">{editing ? <><Save size={16}/>Mettre à jour</> : <><Plus size={16}/>Ajouter à la grille</>}</button>
              {editing && <button type="button" onClick={cancelEdit} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}
            </div>
          </form>
          {!activeVolunteers.length && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-700">Aucun bénévole actif. Ajoute d’abord des bénévoles dans l’onglet Bénévoles.</p>}
          <div className="mt-6 space-y-2">
            {loading ? <p className="text-sm text-slate-400">Chargement…</p>
              : assignments.length === 0 ? <p className="text-sm text-slate-500">Aucun poste attribué pour ce match.</p>
              : assignments.map(a => <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                  <div>
                    <b>{a.task}</b>
                    <span className={'ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ' + (a.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600')}>{a.status === 'Confirmed' && <Check size={12}/>}{STATUS_LABELS[a.status] || a.status}</span>
                    <span className="ml-2 text-sm text-slate-600">{a.volunteerName}{a.volunteerRole ? ' · ' + a.volunteerRole : ''}</span>
                    {a.notes && <p className="text-xs text-slate-500">{a.notes}</p>}
                  </div>
                  <div className="flex gap-2"><button onClick={() => edit(a)} className="text-jso-blue"><Pencil size={16}/></button><button onClick={() => remove(a.id)} className="text-red-600"><X size={16}/></button></div>
                </div>)}
          </div>
        </>}
    </div>
  </div>
}

export default function VolunteersModule({ onError }) {
  const [tab, setTab] = useState('grid')
  const [volunteers, setVolunteers] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadVolunteers() {
    setLoading(true)
    try { setVolunteers(await api('/admin/volunteers')); onError('') }
    catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { loadVolunteers() }, [])

  return <div className="space-y-6">
    <div className="flex gap-2">
      <button onClick={() => setTab('grid')} className={'rounded-xl px-4 py-2.5 text-sm font-bold ' + (tab === 'grid' ? 'bg-jso-navy text-white' : 'bg-white text-slate-600 border border-slate-200')}>Grille par match</button>
      <button onClick={() => setTab('directory')} className={'rounded-xl px-4 py-2.5 text-sm font-bold ' + (tab === 'directory' ? 'bg-jso-navy text-white' : 'bg-white text-slate-600 border border-slate-200')}>Bénévoles</button>
    </div>
    {tab === 'grid'
      ? <AssignmentGrid volunteers={volunteers} onError={onError}/>
      : <VolunteerDirectory volunteers={volunteers} loading={loading} onSaved={loadVolunteers} onError={onError}/>}
  </div>
}
