import { useEffect, useState } from 'react'
import { Plus, Pencil, Save, X, HeartPulse } from 'lucide-react'
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

const emptyInjury = { type: '', startDate: '', expectedReturn: '', status: 'Active', notes: '' }
const STATUSES = ['Active', 'Recovering', 'Fit']
const STATUS_LABELS = { Active: 'Indisponible', Recovering: 'En récupération', Fit: 'Apte' }
const STATUS_STYLES = {
  Active: 'bg-red-100 text-red-700',
  Recovering: 'bg-amber-100 text-amber-700',
  Fit: 'bg-emerald-100 text-emerald-700',
}

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }

// Infirmerie: injury & availability register. Health data is a special GDPR
// category, so this section is admin-only (MatchManager / ClubAdmin) and never
// exposed publicly. Notes stay optional to keep data minimised.
export default function InjuriesModule({ onError }) {
  const [teams, setTeams] = useState([])
  const [teamId, setTeamId] = useState('')
  const [players, setPlayers] = useState([])
  const [playerId, setPlayerId] = useState('')
  const [injuries, setInjuries] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(emptyInjury)
  const [editing, setEditing] = useState(null)

  async function loadTeams() {
    try { const data = await api('/admin/teams'); setTeams(data); if (!teamId && data[0]) selectTeam(data[0].id); onError('') }
    catch (err) { onError(err.message) }
  }
  async function selectTeam(id) {
    setTeamId(id); setPlayerId(''); setInjuries([]); reset()
    try { setPlayers(await api('/admin/teams/' + id + '/players')); onError('') }
    catch (err) { onError(err.message) }
  }
  async function selectPlayer(id) {
    setPlayerId(id); reset(); setLoading(true)
    try { setInjuries(await api('/admin/players/' + id + '/injuries')); onError('') }
    catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { loadTeams() }, [])

  function edit(injury) {
    setEditing(injury.id)
    setForm({
      type: injury.type || '',
      startDate: injury.startDate || '',
      expectedReturn: injury.expectedReturn || '',
      status: injury.status || 'Active',
      notes: injury.notes || '',
    })
  }
  function reset() { setForm(emptyInjury); setEditing(null) }

  async function save(e) {
    e.preventDefault()
    if (!playerId) return
    try {
      const body = {
        type: form.type.trim(),
        startDate: form.startDate,
        expectedReturn: form.expectedReturn || null,
        status: form.status,
        notes: form.notes.trim() || null,
      }
      if (editing) await api('/admin/players/' + playerId + '/injuries/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/players/' + playerId + '/injuries', { method: 'POST', body: JSON.stringify(body) })
      reset()
      await selectPlayer(playerId)
    } catch (err) { onError(err.message) }
  }

  async function remove(id) {
    if (!confirm('Supprimer cet enregistrement de blessure ?')) return
    try { await api('/admin/players/' + playerId + '/injuries/' + id, { method: 'DELETE' }); if (editing === id) reset(); await selectPlayer(playerId) }
    catch (err) { onError(err.message) }
  }

  const selectedPlayer = players.find(p => p.id === playerId)

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2"><HeartPulse className="text-jso-blue" size={20}/><h2 className="text-xl font-black">Infirmerie</h2></div>
      <p className="mt-1 text-xs text-slate-400">Données de santé (catégorie particulière RGPD) : accès réservé aux rôles MatchManager / ClubAdmin, écritures auditées, aucune donnée publiée. Notes facultatives, sans détail clinique inutile.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold">Équipe
          <select value={teamId} onChange={e => selectTeam(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue">
            <option value="">— Choisir —</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">Joueur
          <select value={playerId} onChange={e => selectPlayer(e.target.value)} disabled={!teamId} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue disabled:bg-slate-50">
            <option value="">— Choisir —</option>
            {players.map(p => <option key={p.id} value={p.id}>{(p.shirtNumber != null ? '#' + p.shirtNumber + ' ' : '') + p.firstName + ' ' + p.lastName}</option>)}
          </select>
        </label>
      </div>
      {teamId && players.length === 0 && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-700">Aucun joueur dans cette équipe. Ajoute des joueurs dans la section Équipes &amp; joueurs.</p>}
    </div>

    {playerId && <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Blessures {selectedPlayer && '— ' + selectedPlayer.firstName + ' ' + selectedPlayer.lastName}</h2>
        <div className="mt-5 space-y-2">
          {loading ? <p className="text-sm text-slate-400">Chargement…</p>
            : injuries.length === 0 ? <p className="text-sm text-slate-500">Aucune blessure enregistrée pour ce joueur.</p>
            : injuries.map(i => <div key={i.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3">
                <div>
                  <b>{i.type}</b>
                  <span className={'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ' + (STATUS_STYLES[i.status] || 'bg-slate-200 text-slate-600')}>{STATUS_LABELS[i.status] || i.status}</span>
                  <p className="mt-1 text-xs text-slate-500">Début : {fmtDate(i.startDate)} · Retour prévu : {fmtDate(i.expectedReturn)}</p>
                  {i.notes && <p className="mt-1 text-xs text-slate-500">{i.notes}</p>}
                </div>
                <div className="flex gap-2"><button onClick={() => edit(i)} className="text-jso-blue"><Pencil size={16}/></button><button onClick={() => remove(i.id)} className="text-red-600"><X size={16}/></button></div>
              </div>)}
        </div>
      </div>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">{editing ? 'Modifier la blessure' : 'Nouvelle blessure'}</h2>
        <form onSubmit={save} className="mt-5 space-y-3">
          <label className="block text-sm font-bold">Type
            <input value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} required maxLength="160" placeholder="ex. Entorse cheville, Déchirure musculaire" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
          </label>
          <label className="block text-sm font-bold">Date de début
            <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
          </label>
          <label className="block text-sm font-bold">Retour prévu (optionnel)
            <input type="date" value={form.expectedReturn} min={form.startDate || undefined} onChange={e => setForm({ ...form, expectedReturn: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
          </label>
          <label className="block text-sm font-bold">Statut
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue">
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold">Notes (facultatif)
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} maxLength="500" rows="3" placeholder="Information non clinique utile au staff (minimisation RGPD)" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
          </label>
          <div className="flex gap-2 pt-2">
            <button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white">{editing ? <><Save size={16}/> Mettre à jour</> : <><Plus size={16}/> Enregistrer</>}</button>
            {editing && <button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}
          </div>
        </form>
      </div>
    </div>}
  </div>
}
