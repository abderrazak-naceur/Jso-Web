import { useEffect, useState } from 'react'
import { Plus, Pencil, Save, X, CalendarRange, Wrench } from 'lucide-react'
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

const emptyFacility = { name: '', type: '', isActive: true }
const emptyBooking = { startsAt: '', endsAt: '', purpose: '' }
const emptyMaintenance = { date: '', type: 'Irrigation', notes: '' }
const MAINTENANCE_TYPES = ['Irrigation', 'Tonte', 'Réparation', 'Nettoyage', 'Autre']

// Converts an ISO/offset date to the value expected by <input datetime-local>.
function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fmtDateTime(iso) { return iso ? new Date(iso).toLocaleString('fr-FR') : '—' }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }

// Installations: facility booking & pitch maintenance (idea D15). Admin only
// (ClubAdmin / MatchManager), writes audited, no public endpoint and no sensitive
// personal data. Overlapping bookings are rejected server-side (HTTP 409), so the
// list here can never contain conflicts; the error surfaces in the form banner.
export default function FacilitiesModule({ onError }) {
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')

  const [facForm, setFacForm] = useState(emptyFacility)
  const [editingFac, setEditingFac] = useState(null)

  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingForm, setBookingForm] = useState(emptyBooking)
  const [editingBooking, setEditingBooking] = useState(null)
  const [bookingError, setBookingError] = useState('')

  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logForm, setLogForm] = useState(emptyMaintenance)
  const [editingLog, setEditingLog] = useState(null)

  async function loadFacilities() {
    setLoading(true)
    try { setFacilities(await api('/admin/facilities')); onError('') }
    catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { loadFacilities() }, [])

  async function loadBookings(id) {
    setBookingsLoading(true)
    try { setBookings(await api('/admin/facilities/' + id + '/bookings')); onError('') }
    catch (err) { onError(err.message) }
    finally { setBookingsLoading(false) }
  }
  async function loadLogs(id) {
    setLogsLoading(true)
    try { setLogs(await api('/admin/facilities/' + id + '/maintenance')); onError('') }
    catch (err) { onError(err.message) }
    finally { setLogsLoading(false) }
  }

  function selectFacility(id) {
    setSelectedId(id)
    setBookingForm(emptyBooking); setEditingBooking(null); setBookingError('')
    setLogForm(emptyMaintenance); setEditingLog(null)
    if (id) { loadBookings(id); loadLogs(id) } else { setBookings([]); setLogs([]) }
  }

  // ---- Facilities ----
  function editFacility(f) { setEditingFac(f.id); setFacForm({ name: f.name || '', type: f.type || '', isActive: f.isActive }) }
  function resetFacility() { setFacForm(emptyFacility); setEditingFac(null) }
  async function saveFacility(e) {
    e.preventDefault()
    try {
      const body = { name: facForm.name.trim(), type: facForm.type.trim() || null, isActive: facForm.isActive }
      if (editingFac) await api('/admin/facilities/' + editingFac, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/facilities', { method: 'POST', body: JSON.stringify(body) })
      resetFacility()
      await loadFacilities()
    } catch (err) { onError(err.message) }
  }
  async function removeFacility(id) {
    if (!confirm('Supprimer cette installation ? Les réservations et l’historique de maintenance associés seront aussi supprimés.')) return
    try {
      await api('/admin/facilities/' + id, { method: 'DELETE' })
      if (selectedId === id) selectFacility('')
      if (editingFac === id) resetFacility()
      await loadFacilities()
    } catch (err) { onError(err.message) }
  }

  // ---- Bookings ----
  function editBooking(b) {
    setEditingBooking(b.id); setBookingError('')
    setBookingForm({ startsAt: toLocalInput(b.startsAt), endsAt: toLocalInput(b.endsAt), purpose: b.purpose || '' })
  }
  function resetBooking() { setBookingForm(emptyBooking); setEditingBooking(null); setBookingError('') }
  async function saveBooking(e) {
    e.preventDefault()
    if (!selectedId) return
    setBookingError('')
    if (bookingForm.endsAt && bookingForm.startsAt && new Date(bookingForm.endsAt) <= new Date(bookingForm.startsAt)) {
      setBookingError('La fin doit être postérieure au début.'); return
    }
    try {
      const body = {
        startsAt: new Date(bookingForm.startsAt).toISOString(),
        endsAt: new Date(bookingForm.endsAt).toISOString(),
        purpose: bookingForm.purpose.trim(),
      }
      if (editingBooking) await api('/admin/facilities/' + selectedId + '/bookings/' + editingBooking, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/facilities/' + selectedId + '/bookings', { method: 'POST', body: JSON.stringify(body) })
      resetBooking()
      await loadBookings(selectedId)
    } catch (err) { setBookingError(err.message) }
  }
  async function removeBooking(id) {
    if (!confirm('Supprimer cette réservation ?')) return
    try { await api('/admin/facilities/' + selectedId + '/bookings/' + id, { method: 'DELETE' }); if (editingBooking === id) resetBooking(); await loadBookings(selectedId) }
    catch (err) { onError(err.message) }
  }

  // ---- Maintenance ----
  function editLog(l) { setEditingLog(l.id); setLogForm({ date: l.date || '', type: l.type || 'Irrigation', notes: l.notes || '' }) }
  function resetLog() { setLogForm(emptyMaintenance); setEditingLog(null) }
  async function saveLog(e) {
    e.preventDefault()
    if (!selectedId) return
    try {
      const body = { date: logForm.date, type: logForm.type.trim(), notes: logForm.notes.trim() || null }
      if (editingLog) await api('/admin/facilities/' + selectedId + '/maintenance/' + editingLog, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/facilities/' + selectedId + '/maintenance', { method: 'POST', body: JSON.stringify(body) })
      resetLog()
      await loadLogs(selectedId)
    } catch (err) { onError(err.message) }
  }
  async function removeLog(id) {
    if (!confirm('Supprimer cet enregistrement de maintenance ?')) return
    try { await api('/admin/facilities/' + selectedId + '/maintenance/' + id, { method: 'DELETE' }); if (editingLog === id) resetLog(); await loadLogs(selectedId) }
    catch (err) { onError(err.message) }
  }

  const selected = facilities.find(f => f.id === selectedId)

  return <div className="space-y-6">
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2"><CalendarRange className="text-jso-blue" size={20}/><h2 className="text-xl font-black">Installations</h2></div>
        <p className="mt-1 text-xs text-slate-400">Réservation de terrain/salle et registre de maintenance. Accès réservé aux rôles ClubAdmin / MatchManager, écritures auditées. Les créneaux qui se chevauchent sont refusés automatiquement.</p>
        <div className="mt-5 space-y-2">
          {loading ? <p className="text-sm text-slate-400">Chargement…</p>
            : facilities.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Aucune installation. Créez la première avec le formulaire.</p>
            : facilities.map(f => <div key={f.id} className={'flex items-center justify-between gap-3 rounded-xl p-3 ' + (selectedId === f.id ? 'bg-jso-navy text-white' : 'bg-slate-50')}>
                <button onClick={() => selectFacility(f.id)} className="flex-1 text-left">
                  <b>{f.name}</b>
                  <span className={'ml-2 text-xs ' + (selectedId === f.id ? 'opacity-80' : 'text-slate-500')}>{f.type || '—'} · {f.isActive ? 'Active' : 'Inactive'}</span>
                </button>
                <div className="flex gap-2">
                  <button onClick={() => editFacility(f)} className={selectedId === f.id ? 'text-white' : 'text-jso-blue'}><Pencil size={16}/></button>
                  <button onClick={() => removeFacility(f.id)} className={selectedId === f.id ? 'text-white' : 'text-red-600'}><X size={16}/></button>
                </div>
              </div>)}
        </div>
      </div>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">{editingFac ? 'Modifier l’installation' : 'Nouvelle installation'}</h2>
        <form onSubmit={saveFacility} className="mt-5 space-y-3">
          <label className="block text-sm font-bold">Nom
            <input value={facForm.name} onChange={e => setFacForm({ ...facForm, name: e.target.value })} required maxLength="160" placeholder="ex. Terrain principal, Salle de réunion" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
          </label>
          <label className="block text-sm font-bold">Type (facultatif)
            <input value={facForm.type} onChange={e => setFacForm({ ...facForm, type: e.target.value })} maxLength="80" placeholder="Terrain, Salle, …" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
          </label>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={facForm.isActive} onChange={e => setFacForm({ ...facForm, isActive: e.target.checked })}/> Active</label>
          <div className="flex gap-2 pt-2">
            <button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white">{editingFac ? <><Save size={16}/> Mettre à jour</> : <><Plus size={16}/> Créer</>}</button>
            {editingFac && <button type="button" onClick={resetFacility} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}
          </div>
        </form>
      </div>
    </div>

    {!selectedId ? <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Sélectionne une installation pour gérer ses réservations et sa maintenance.</div>
      : <div className="grid gap-6 xl:grid-cols-2">
        {/* Bookings */}
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2"><CalendarRange className="text-jso-blue" size={18}/><h2 className="text-lg font-black">Réservations — {selected?.name}</h2></div>
          <div className="mt-4 space-y-2">
            {bookingsLoading ? <p className="text-sm text-slate-400">Chargement…</p>
              : bookings.length === 0 ? <p className="text-sm text-slate-500">Aucune réservation pour cette installation.</p>
              : bookings.map(b => <div key={b.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3">
                  <div>
                    <b>{b.purpose}</b>
                    <p className="mt-1 text-xs text-slate-500">{fmtDateTime(b.startsAt)} → {fmtDateTime(b.endsAt)}</p>
                    {b.bookedByName && <p className="text-xs text-slate-400">Réservé par {b.bookedByName}</p>}
                  </div>
                  <div className="flex gap-2"><button onClick={() => editBooking(b)} className="text-jso-blue"><Pencil size={16}/></button><button onClick={() => removeBooking(b.id)} className="text-red-600"><X size={16}/></button></div>
                </div>)}
          </div>
          <form onSubmit={saveBooking} className="mt-5 space-y-3 border-t pt-5">
            <h3 className="text-sm font-black">{editingBooking ? 'Modifier la réservation' : 'Nouvelle réservation'}</h3>
            <label className="block text-sm font-bold">Début
              <input type="datetime-local" value={bookingForm.startsAt} onChange={e => setBookingForm({ ...bookingForm, startsAt: e.target.value })} required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
            </label>
            <label className="block text-sm font-bold">Fin
              <input type="datetime-local" value={bookingForm.endsAt} onChange={e => setBookingForm({ ...bookingForm, endsAt: e.target.value })} required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
            </label>
            <label className="block text-sm font-bold">Objet
              <input value={bookingForm.purpose} onChange={e => setBookingForm({ ...bookingForm, purpose: e.target.value })} required maxLength="200" placeholder="ex. Entraînement U19, Match amical" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
            </label>
            {bookingError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{bookingError}</p>}
            <div className="flex gap-2">
              <button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white">{editingBooking ? <><Save size={16}/> Mettre à jour</> : <><Plus size={16}/> Réserver</>}</button>
              {editingBooking && <button type="button" onClick={resetBooking} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}
            </div>
          </form>
        </div>

        {/* Maintenance */}
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2"><Wrench className="text-jso-blue" size={18}/><h2 className="text-lg font-black">Maintenance — {selected?.name}</h2></div>
          <div className="mt-4 space-y-2">
            {logsLoading ? <p className="text-sm text-slate-400">Chargement…</p>
              : logs.length === 0 ? <p className="text-sm text-slate-500">Aucun enregistrement de maintenance.</p>
              : logs.map(l => <div key={l.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3">
                  <div>
                    <b>{l.type}</b>
                    <p className="mt-1 text-xs text-slate-500">{fmtDate(l.date)}</p>
                    {l.notes && <p className="mt-1 text-xs text-slate-500">{l.notes}</p>}
                  </div>
                  <div className="flex gap-2"><button onClick={() => editLog(l)} className="text-jso-blue"><Pencil size={16}/></button><button onClick={() => removeLog(l.id)} className="text-red-600"><X size={16}/></button></div>
                </div>)}
          </div>
          <form onSubmit={saveLog} className="mt-5 space-y-3 border-t pt-5">
            <h3 className="text-sm font-black">{editingLog ? 'Modifier l’enregistrement' : 'Nouvel enregistrement'}</h3>
            <label className="block text-sm font-bold">Date
              <input type="date" value={logForm.date} onChange={e => setLogForm({ ...logForm, date: e.target.value })} required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
            </label>
            <label className="block text-sm font-bold">Type
              <select value={logForm.type} onChange={e => setLogForm({ ...logForm, type: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue">
                {MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold">Notes (facultatif)
              <textarea value={logForm.notes} onChange={e => setLogForm({ ...logForm, notes: e.target.value })} maxLength="500" rows="3" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
            </label>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white">{editingLog ? <><Save size={16}/> Mettre à jour</> : <><Plus size={16}/> Enregistrer</>}</button>
              {editingLog && <button type="button" onClick={resetLog} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}
            </div>
          </form>
        </div>
      </div>}
  </div>
}
