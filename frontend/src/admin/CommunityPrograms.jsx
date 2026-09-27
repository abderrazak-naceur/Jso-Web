import { useEffect, useState } from 'react'
import { Plus, Pencil, Save, X, GraduationCap, Eye, EyeOff } from 'lucide-react'
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

const emptyProgram = {
  title: '', partnerName: '', description: '',
  startDate: '', endDate: '', contactEmail: '', isPublished: false,
}

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }
// The API returns ISO datetimes; the <input type="date"> needs YYYY-MM-DD.
function toDateInput(d) { return d ? new Date(d).toISOString().slice(0, 10) : '' }

// Community programs with local schools and partner clubs (idea G23). Manage
// territorial initiatives (open days, neighbourhood tournaments) run with local
// schools and associations. Restricted to ClubAdmin / CommunityManager, writes
// audited. Privacy: the partner contact e-mail is stored with consent for
// organisation only and is never exposed on the public feed. No data about
// minors is kept here (consent is handled on the school side).
export default function CommunityProgramsModule({ onError }) {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyProgram)
  const [editing, setEditing] = useState(null)

  async function load() {
    setLoading(true)
    try {
      setPrograms(await api('/admin/community-programs'))
      onError('')
    } catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function edit(program) {
    setEditing(program.id)
    setForm({
      title: program.title || '',
      partnerName: program.partnerName || '',
      description: program.description || '',
      startDate: toDateInput(program.startDate),
      endDate: toDateInput(program.endDate),
      contactEmail: program.contactEmail || '',
      isPublished: !!program.isPublished,
    })
  }
  function reset() { setForm(emptyProgram); setEditing(null) }

  async function save(e) {
    e.preventDefault()
    try {
      const body = {
        title: form.title.trim(),
        partnerName: form.partnerName.trim(),
        description: form.description.trim(),
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        contactEmail: form.contactEmail.trim() || null,
        isPublished: form.isPublished,
      }
      if (editing) await api('/admin/community-programs/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/community-programs', { method: 'POST', body: JSON.stringify(body) })
      reset()
      await load()
    } catch (err) { onError(err.message) }
  }

  async function remove(id) {
    if (!confirm('Supprimer ce programme communauté ?')) return
    try { await api('/admin/community-programs/' + id, { method: 'DELETE' }); if (editing === id) reset(); await load() }
    catch (err) { onError(err.message) }
  }

  return <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2"><GraduationCap className="text-jso-blue" size={20}/><h2 className="text-xl font-black">Écoles &amp; partenaires</h2></div>
      <p className="mt-1 text-xs text-slate-400">Initiatives avec les écoles et les associations locales (journées portes ouvertes, tournois de quartier) pour renforcer l’ancrage territorial. Accès réservé aux rôles ClubAdmin / CommunityManager, écritures auditées. Le courriel de contact du partenaire est conservé avec son consentement et n’est jamais publié. Aucune donnée de mineur n’est enregistrée ici.</p>
      <div className="mt-5 space-y-2">
        {loading ? <p className="text-sm text-slate-400">Chargement…</p>
          : programs.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Aucun programme enregistré.</p>
          : programs.map(p => <div key={p.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="truncate">{p.title}</b>
                  <span className={'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ' + (p.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600')}>{p.isPublished ? <><Eye size={12}/> Publié</> : <><EyeOff size={12}/> Brouillon</>}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Partenaire : {p.partnerName} · Du {fmtDate(p.startDate)}{p.endDate ? ' au ' + fmtDate(p.endDate) : ''}</p>
                {p.contactEmail && <p className="mt-0.5 text-xs text-slate-400">Contact (privé) : {p.contactEmail}</p>}
                {p.description && <p className="mt-1 text-sm text-slate-600">{p.description}</p>}
              </div>
              <div className="flex gap-2"><button onClick={() => edit(p)} className="text-jso-blue"><Pencil size={16}/></button><button onClick={() => remove(p.id)} className="text-red-600"><X size={16}/></button></div>
            </div>)}
      </div>
    </div>
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">{editing ? 'Modifier le programme' : 'Nouveau programme'}</h2>
      <form onSubmit={save} className="mt-5 space-y-3">
        <label className="block text-sm font-bold">Titre
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required maxLength="200" placeholder="ex. Journée portes ouvertes au collège" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
        </label>
        <label className="block text-sm font-bold">Partenaire
          <input value={form.partnerName} onChange={e => setForm({ ...form, partnerName: e.target.value })} required maxLength="200" placeholder="ex. École primaire d’Oudhref" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
        </label>
        <label className="block text-sm font-bold">Description
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required maxLength="4000" rows="4" placeholder="Objectif et déroulé de l’initiative" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold">Date de début
            <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
          </label>
          <label className="block text-sm font-bold">Date de fin (facultatif)
            <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
          </label>
        </div>
        <label className="block text-sm font-bold">Courriel de contact (facultatif, non public)
          <input type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} maxLength="200" placeholder="contact@partenaire.tn" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
        </label>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} className="h-4 w-4 rounded border-slate-300"/>
          Publié (visible publiquement, sans le courriel)
        </label>
        <div className="flex gap-2 pt-2">
          <button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white">{editing ? <><Save size={16}/> Mettre à jour</> : <><Plus size={16}/> Enregistrer</>}</button>
          {editing && <button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}
        </div>
      </form>
    </div>
  </div>
}
