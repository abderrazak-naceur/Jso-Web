import { useEffect, useState } from 'react'
import { Cake, Gift, PartyPopper, RefreshCw } from 'lucide-react'
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

// Aujourd'hui au format YYYY-MM-DD (UTC) pour préremplir le sélecteur de date.
function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

const KIND_LABELS = { Birthday: 'Anniversaire', Membership: 'Anniversaire d’inscription' }

// Touchpoints anniversaires & compleanni (idée A3).
// Cette vue liste, pour un jour donné, les supporters dont l'anniversaire ou
// l'anniversaire d'inscription tombe ce jour-là, afin que l'équipe communauté
// puisse les féliciter.
//
// Confidentialité / RGPD : seuls les supporters ayant explicitement donné leur
// consentement (opt-in) sont pris en compte ; la vue n'affiche que le strict
// nécessaire (nom affiché, type de récurrence, nombre d'années), jamais la date
// de naissance ni l'e-mail (minimisation des données).
//
// Envoi d'e-mail HORS PÉRIMÈTRE cette itération : aucune notification n'est
// envoyée depuis ici. TODO(A3) : brancher un prestataire d'envoi certifié.
export default function AnniversariesModule({ onError }) {
  const [date, setDate] = useState(todayIso())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const q = date ? '?date=' + encodeURIComponent(date) : ''
      setData(await api('/admin/anniversaries/today' + q))
      onError('')
    } catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [date])

  const counts = data?.counts
  const touchpoints = data?.touchpoints ?? []

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2"><PartyPopper className="text-jso-blue" size={20}/><h2 className="text-xl font-black">Anniversaires</h2></div>
      <p className="mt-1 text-xs text-slate-400">Seuls les supporters ayant donné leur consentement (opt-in) sont listés. Aucune donnée personnelle affichée hormis le nom, le type de récurrence et le nombre d’années (minimisation). Envoi d’e-mail hors périmètre — aucune notification n’est envoyée depuis cette page (TODO : prestataire certifié).</p>
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="text-sm font-bold">Date
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-2 block rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
        </label>
        <button type="button" onClick={() => setDate(todayIso())} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold hover:bg-slate-50">Aujourd’hui</button>
        <button type="button" onClick={load} className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-jso-blue"><RefreshCw size={16}/> Actualiser</button>
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><p className="text-xs font-extrabold tracking-[0.15em] text-slate-400">TOTAL</p><p className="mt-1 text-3xl font-black text-jso-navy">{counts?.total ?? 0}</p></div>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><p className="flex items-center gap-1.5 text-xs font-extrabold tracking-[0.15em] text-slate-400"><Cake size={14}/> ANNIVERSAIRES</p><p className="mt-1 text-3xl font-black text-jso-navy">{counts?.birthdays ?? 0}</p></div>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><p className="flex items-center gap-1.5 text-xs font-extrabold tracking-[0.15em] text-slate-400"><Gift size={14}/> INSCRIPTIONS</p><p className="mt-1 text-3xl font-black text-jso-navy">{counts?.memberships ?? 0}</p></div>
    </div>

    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">Touchpoints du jour</h2>
      <div className="mt-5 space-y-2">
        {loading ? <p className="text-sm text-slate-400">Chargement…</p>
          : touchpoints.length === 0 ? <p className="text-sm text-slate-500">Aucun touchpoint pour cette date.</p>
          : touchpoints.map(t => <div key={t.fanUserId + '-' + t.kind} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-3">
                {t.kind === 'Birthday' ? <Cake size={18} className="text-jso-blue"/> : <Gift size={18} className="text-jso-blue"/>}
                <div>
                  <b>{t.displayName}</b>
                  <span className="ml-2 inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">{KIND_LABELS[t.kind] || t.kind}</span>
                </div>
              </div>
              {t.years != null && <span className="shrink-0 text-sm font-bold text-jso-blue">{t.years} an{t.years > 1 ? 's' : ''}</span>}
            </div>)}
      </div>
    </div>
  </div>
}
