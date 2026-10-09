import { useEffect, useState } from 'react'
import { Plus, Pencil, Save, X, ScanSearch, Star } from 'lucide-react'
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

const emptyNote = { subject: '', subjectType: 'Opponent', matchId: '', rating: '', body: '' }
const SUBJECT_TYPES = ['Opponent', 'Player']
const SUBJECT_LABELS = { Opponent: 'Adversaire', Player: 'Joueur' }
const SUBJECT_STYLES = {
  Opponent: 'bg-indigo-100 text-indigo-700',
  Player: 'bg-emerald-100 text-emerald-700',
}
const FILTERS = [['', 'Tous'], ['Opponent', 'Adversaires'], ['Player', 'Joueurs']]

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }
function ratingStars(r) { return r ? '★'.repeat(r) + '☆'.repeat(5 - r) : '—' }

// Scouting: notes on opposing teams and observed players (idea C9). Internal
// technical-staff tool restricted to MatchManager / ClubAdmin, writes audited,
// never exposed publicly. Notes on youth-sector minors stay within these roles.
export default function ScoutingModule({ onError }) {
  const [notes, setNotes] = useState([])
  const [matches, setMatches] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyNote)
  const [editing, setEditing] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const path = '/admin/scouting-notes' + (filter ? '?subjectType=' + filter : '')
      setNotes(await api(path))
      onError('')
    } catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }
  async function loadMatches() {
    try { setMatches(await api('/admin/matches')); onError('') }
    catch (err) { onError(err.message) }
  }
  useEffect(() => { loadMatches() }, [])
  useEffect(() => { load() }, [filter])

  function edit(note) {
    setEditing(note.id)
    setForm({
      subject: note.subject || '',
      subjectType: note.subjectType || 'Opponent',
      matchId: note.matchId || '',
      rating: note.rating ?? '',
      body: note.body || '',
    })
  }
  function reset() { setForm(emptyNote); setEditing(null) }

  async function save(e) {
    e.preventDefault()
    try {
      const body = {
        subject: form.subject.trim(),
        subjectType: form.subjectType,
        matchId: form.matchId || null,
        rating: form.rating === '' ? null : Number(form.rating),
        body: form.body.trim() || null,
      }
      if (editing) await api('/admin/scouting-notes/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/scouting-notes', { method: 'POST', body: JSON.stringify(body) })
      reset()
      await load()
    } catch (err) { onError(err.message) }
  }

  async function remove(id) {
    if (!confirm('Supprimer cette note de scouting ?')) return
    try { await api('/admin/scouting-notes/' + id, { method: 'DELETE' }); if (editing === id) reset(); await load() }
    catch (err) { onError(err.message) }
  }

  function matchLabel(id) {
    const m = matches.find(x => x.id === id)
    return m ? 'JSO — ' + m.opponentName + ' · ' + new Date(m.kickoffAt).toLocaleDateString('fr-FR') : '—'
  }

  return <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2"><ScanSearch className="text-jso-blue" size={20}/><h2 className="text-xl font-black">Scouting</h2></div>
      <p className="mt-1 text-xs text-slate-400">Notes internes sur les adversaires et les joueurs observés (vivier ou marché local). Accès réservé aux rôles MatchManager / ClubAdmin, écritures auditées, aucune publication. Les notes concernant des mineurs du vivier restent limitées à ces rôles.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => <button key={value || 'all'} onClick={() => setFilter(value)} className={'rounded-xl px-3 py-1.5 text-sm font-bold ' + (filter === value ? 'bg-jso-navy text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100')}>{label}</button>)}
      </div>
      <div className="mt-5 space-y-2">
        {loading ? <p className="text-sm text-slate-400">Chargement…</p>
          : notes.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Aucune note de scouting enregistrée.</p>
          : notes.map(n => <div key={n.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="truncate">{n.subject}</b>
                  <span className={'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ' + (SUBJECT_STYLES[n.subjectType] || 'bg-slate-200 text-slate-600')}>{SUBJECT_LABELS[n.subjectType] || n.subjectType}</span>
                  {n.rating != null && <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500"><Star size={13}/>{ratingStars(n.rating)}</span>}
                </div>
                <p className="mt-1 text-xs text-slate-500">{n.matchId ? 'Match : ' + matchLabel(n.matchId) + ' · ' : ''}Créée le {fmtDate(n.createdAt)}</p>
                {n.body && <p className="mt-1 text-sm text-slate-600">{n.body}</p>}
              </div>
              <div className="flex gap-2"><button onClick={() => edit(n)} className="text-jso-blue"><Pencil size={16}/></button><button onClick={() => remove(n.id)} className="text-red-600"><X size={16}/></button></div>
            </div>)}
      </div>
    </div>
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">{editing ? 'Modifier la note' : 'Nouvelle note'}</h2>
      <form onSubmit={save} className="mt-5 space-y-3">
        <label className="block text-sm font-bold">Sujet
          <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required maxLength="200" placeholder="ex. ES Zarzis, ou nom du joueur observé" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
        </label>
        <label className="block text-sm font-bold">Type
          <select value={form.subjectType} onChange={e => setForm({ ...form, subjectType: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue">
            {SUBJECT_TYPES.map(t => <option key={t} value={t}>{SUBJECT_LABELS[t]}</option>)}
          </select>
        </label>
        <label className="block text-sm font-bold">Match lié (facultatif)
          <select value={form.matchId} onChange={e => setForm({ ...form, matchId: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue">
            <option value="">— Aucun —</option>
            {matches.map(m => <option key={m.id} value={m.id}>JSO — {m.opponentName} · {new Date(m.kickoffAt).toLocaleDateString('fr-FR')}</option>)}
          </select>
        </label>
        <label className="block text-sm font-bold">Évaluation (facultatif)
          <select value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue">
            <option value="">— Aucune —</option>
            {[1, 2, 3, 4, 5].map(r => <option key={r} value={r}>{r} / 5</option>)}
          </select>
        </label>
        <label className="block text-sm font-bold">Notes (facultatif)
          <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} maxLength="4000" rows="5" placeholder="Observations utiles au staff technique" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
        </label>
        <div className="flex gap-2 pt-2">
          <button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white">{editing ? <><Save size={16}/> Mettre à jour</> : <><Plus size={16}/> Enregistrer</>}</button>
          {editing && <button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}
        </div>
      </form>
    </div>
  </div>
}
