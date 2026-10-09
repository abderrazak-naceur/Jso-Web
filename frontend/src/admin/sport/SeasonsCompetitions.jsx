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

const emptySeason = { name: '', isActive: false }
const emptyCompetition = { name: '', country: '' }

function Field({ label, ...props }) {
  return <label className="block text-sm font-bold">{label}<input {...props} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue" /></label>
}

// Référentiel des saisons et compétitions rattachées aux parties.
// Les endpoints CRUD existent déjà sous /api/admin/seasons et /api/admin/competitions.
// Le backend refuse la suppression d'une saison ou compétition encore référencée
// par une partie (409) : on affiche le message renvoyé sans faire planter l'UI.
export default function SeasonsCompetitionsModule({ onError }) {
  const [seasons, setSeasons] = useState([])
  const [competitions, setCompetitions] = useState([])
  const [loading, setLoading] = useState(true)

  const [seasonForm, setSeasonForm] = useState(emptySeason)
  const [editingSeason, setEditingSeason] = useState(null)

  const [competitionForm, setCompetitionForm] = useState(emptyCompetition)
  const [editingCompetition, setEditingCompetition] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const [seasonList, competitionList] = await Promise.all([
        api('/admin/seasons'),
        api('/admin/competitions'),
      ])
      setSeasons(seasonList)
      setCompetitions(competitionList)
      onError('')
    } catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  // ----- Saisons -----
  function editSeason(s) {
    setEditingSeason(s.id)
    setSeasonForm({ name: s.name || '', isActive: Boolean(s.isActive) })
  }
  function resetSeason() { setSeasonForm(emptySeason); setEditingSeason(null) }

  async function saveSeason(e) {
    e.preventDefault()
    try {
      const body = { name: seasonForm.name.trim(), isActive: seasonForm.isActive }
      if (editingSeason) await api('/admin/seasons/' + editingSeason, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/seasons', { method: 'POST', body: JSON.stringify(body) })
      resetSeason()
      await load()
    } catch (err) { onError(err.message) }
  }

  async function removeSeason(id) {
    if (!confirm('Supprimer cette saison ?')) return
    try {
      await api('/admin/seasons/' + id, { method: 'DELETE' })
      if (editingSeason === id) resetSeason()
      await load()
    } catch (err) { onError(err.message) }
  }

  // ----- Compétitions -----
  function editCompetition(c) {
    setEditingCompetition(c.id)
    setCompetitionForm({ name: c.name || '', country: c.country || '' })
  }
  function resetCompetition() { setCompetitionForm(emptyCompetition); setEditingCompetition(null) }

  async function saveCompetition(e) {
    e.preventDefault()
    try {
      const body = {
        name: competitionForm.name.trim(),
        country: competitionForm.country.trim() === '' ? null : competitionForm.country.trim(),
      }
      if (editingCompetition) await api('/admin/competitions/' + editingCompetition, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/competitions', { method: 'POST', body: JSON.stringify(body) })
      resetCompetition()
      await load()
    } catch (err) { onError(err.message) }
  }

  async function removeCompetition(id) {
    if (!confirm('Supprimer cette compétition ?')) return
    try {
      await api('/admin/competitions/' + id, { method: 'DELETE' })
      if (editingCompetition === id) resetCompetition()
      await load()
    } catch (err) { onError(err.message) }
  }

  return <div className="space-y-8">
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Saisons</h2>
        <p className="mt-1 text-xs text-slate-400">Saisons sportives rattachées aux parties. La saison active est affichée en premier. Une saison référencée par une partie ne peut pas être supprimée.</p>
        <div className="mt-5 overflow-x-auto">
          {loading ? <p className="text-sm text-slate-400">Chargement…</p>
            : seasons.length === 0 ? <p className="text-sm text-slate-400">Aucune saison. Crée la première saison du club.</p>
            : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Nom</th><th className="p-2">Active</th><th className="p-2"></th></tr></thead><tbody>{seasons.map(s => <tr key={s.id} className="border-b last:border-0"><td className="p-2 font-bold">{s.name}</td><td className="p-2">{s.isActive ? <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">Active</span> : <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">Inactive</span>}</td><td className="p-2 whitespace-nowrap"><button onClick={() => editSeason(s)} className="mr-2 text-jso-blue"><Pencil size={16}/></button><button onClick={() => removeSeason(s.id)} className="text-red-600"><X size={16}/></button></td></tr>)}</tbody></table>}
        </div>
      </div>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">{editingSeason ? 'Modifier la saison' : 'Nouvelle saison'}</h2>
        <form onSubmit={saveSeason} className="mt-5 space-y-3">
          <Field label="Nom" value={seasonForm.name} onChange={e => setSeasonForm({ ...seasonForm, name: e.target.value })} required maxLength="120" placeholder="ex. 2024-2025"/>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={seasonForm.isActive} onChange={e => setSeasonForm({ ...seasonForm, isActive: e.target.checked })}/> Saison active</label>
          <div className="flex gap-2 pt-2"><button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white">{editingSeason ? <><Save size={16}/> Mettre à jour</> : <><Plus size={16}/> Créer</>}</button>{editingSeason && <button type="button" onClick={resetSeason} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}</div>
        </form>
      </div>
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Compétitions</h2>
        <p className="mt-1 text-xs text-slate-400">Compétitions disputées par le club (championnat, coupes…). Le pays est optionnel. Une compétition référencée par une partie ne peut pas être supprimée.</p>
        <div className="mt-5 overflow-x-auto">
          {loading ? <p className="text-sm text-slate-400">Chargement…</p>
            : competitions.length === 0 ? <p className="text-sm text-slate-400">Aucune compétition. Ajoute la première compétition.</p>
            : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Nom</th><th className="p-2">Pays</th><th className="p-2"></th></tr></thead><tbody>{competitions.map(c => <tr key={c.id} className="border-b last:border-0"><td className="p-2 font-bold">{c.name}</td><td className="p-2">{c.country || '—'}</td><td className="p-2 whitespace-nowrap"><button onClick={() => editCompetition(c)} className="mr-2 text-jso-blue"><Pencil size={16}/></button><button onClick={() => removeCompetition(c.id)} className="text-red-600"><X size={16}/></button></td></tr>)}</tbody></table>}
        </div>
      </div>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">{editingCompetition ? 'Modifier la compétition' : 'Nouvelle compétition'}</h2>
        <form onSubmit={saveCompetition} className="mt-5 space-y-3">
          <Field label="Nom" value={competitionForm.name} onChange={e => setCompetitionForm({ ...competitionForm, name: e.target.value })} required maxLength="120" placeholder="ex. Championnat National"/>
          <Field label="Pays (optionnel)" value={competitionForm.country} onChange={e => setCompetitionForm({ ...competitionForm, country: e.target.value })} maxLength="80" placeholder="ex. Tunisie"/>
          <div className="flex gap-2 pt-2"><button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white">{editingCompetition ? <><Save size={16}/> Mettre à jour</> : <><Plus size={16}/> Créer</>}</button>{editingCompetition && <button type="button" onClick={resetCompetition} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}</div>
        </form>
      </div>
    </div>
  </div>
}
