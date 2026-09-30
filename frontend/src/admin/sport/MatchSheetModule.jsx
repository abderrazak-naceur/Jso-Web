import { useEffect, useState } from 'react'
import { adminApi } from '../api'
export default function MatchSheetModule({ onError }) {
  const [matches, setMatches] = useState([])
  const [selected, setSelected] = useState('')
  const [officials, setOfficials] = useState([])
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(false)
  const [savingOfficials, setSavingOfficials] = useState(false)
  const [savingStats, setSavingStats] = useState(false)
  const [savedOfficials, setSavedOfficials] = useState(false)
  const [savedStats, setSavedStats] = useState(false)

  async function load() {
    try { const data = await adminApi('/admin/matches'); setMatches(data); if (!selected && data[0]) selectMatch(data[0].id) }
    catch (e) { onError(e.message) }
  }
  useEffect(() => { load() }, [])

  async function selectMatch(id) {
    setSelected(id); setLoading(true); setSavedOfficials(false); setSavedStats(false)
    try {
      const [off, st] = await Promise.all([
        adminApi('/admin/matches/' + id + '/officials'),
        adminApi('/admin/matches/' + id + '/stats'),
      ])
      setOfficials((off || []).map(o => ({ name: o.name || '', role: o.role || 'Referee' })))
      setStats((st || []).map(s => ({ name: s.name || '', homeValue: s.homeValue ?? '', awayValue: s.awayValue ?? '' })))
      onError('')
    } catch (e) { onError(e.message) } finally { setLoading(false) }
  }

  // Officials
  function addOfficial() { setSavedOfficials(false); setOfficials(prev => [...prev, { name: '', role: 'Referee' }]) }
  function updateOfficial(i, patch) { setSavedOfficials(false); setOfficials(prev => prev.map((o, idx) => idx === i ? { ...o, ...patch } : o)) }
  function removeOfficial(i) { setSavedOfficials(false); setOfficials(prev => prev.filter((_, idx) => idx !== i)) }
  async function saveOfficials() {
    if (!selected) return
    const items = officials.map(o => ({ name: o.name.trim(), role: o.role.trim() })).filter(o => o.name && o.role)
    if (items.length !== officials.length) { onError('Chaque officiel doit avoir un nom et un rôle.'); return }
    setSavingOfficials(true); setSavedOfficials(false)
    try {
      await adminApi('/admin/matches/' + selected + '/officials', { method: 'PUT', body: JSON.stringify({ items }) })
      setSavedOfficials(true); onError('')
    } catch (e) { onError(e.message) } finally { setSavingOfficials(false) }
  }

  // Stats
  function addStat() { setSavedStats(false); setStats(prev => [...prev, { name: '', homeValue: '', awayValue: '' }]) }
  function updateStat(i, patch) { setSavedStats(false); setStats(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s)) }
  function removeStat(i) { setSavedStats(false); setStats(prev => prev.filter((_, idx) => idx !== i)) }
  async function saveStats() {
    if (!selected) return
    const items = stats.map(s => ({
      name: s.name.trim(),
      homeValue: s.homeValue === '' ? null : Number(s.homeValue),
      awayValue: s.awayValue === '' ? null : Number(s.awayValue),
    })).filter(s => s.name)
    if (items.length !== stats.length) { onError('Chaque statistique doit avoir un nom.'); return }
    setSavingStats(true); setSavedStats(false)
    try {
      await adminApi('/admin/matches/' + selected + '/stats', { method: 'PUT', body: JSON.stringify({ items }) })
      setSavedStats(true); onError('')
    } catch (e) { onError(e.message) } finally { setSavingStats(false) }
  }

  return <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">Matchs</h2><div className="mt-4 space-y-2">{matches.map(m => <button key={m.id} onClick={() => selectMatch(m.id)} className={'w-full rounded-xl p-3 text-left ' + (selected === m.id ? 'bg-jso-navy text-white' : 'bg-slate-50')}><b>JSO — {m.opponentName}</b><span className="block text-xs opacity-70">{new Date(m.kickoffAt).toLocaleString('fr-FR')}</span></button>)}{!matches.length && <p className="text-sm text-slate-500">Aucun match disponible.</p>}</div></div>
    <div className="space-y-6">
      {!selected ? <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><p className="text-sm text-slate-500">Sélectionne un match.</p></div>
        : loading ? <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><p className="text-sm text-slate-400">Chargement…</p></div>
        : <>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between"><h2 className="text-xl font-black">Officiels</h2><div className="flex items-center gap-2"><button onClick={addOfficial} className="rounded-xl bg-slate-100 p-2 text-jso-navy"><Plus size={18}/></button><button onClick={saveOfficials} disabled={savingOfficials} className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white disabled:opacity-50"><Save size={16}/>{savingOfficials ? 'Enregistrement…' : 'Enregistrer'}</button></div></div>
            {savedOfficials && <p className="mt-2 rounded-xl bg-emerald-50 p-2 text-xs font-bold text-emerald-700">Officiels enregistrés.</p>}
            <div className="mt-4 space-y-2">
              {officials.length === 0 ? <p className="text-sm text-slate-500">Aucun officiel. Ajoute l’arbitre et ses assistants.</p>
                : officials.map((o, i) => <div key={i} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1.2fr_1fr_auto]"><input value={o.name} onChange={e => updateOfficial(i, { name: e.target.value })} placeholder="Nom" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-jso-blue"/><select value={o.role} onChange={e => updateOfficial(i, { role: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-jso-blue">{MATCH_OFFICIAL_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select><button onClick={() => removeOfficial(i)} className="justify-self-end p-1 text-red-600"><X size={16}/></button></div>)}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between"><h2 className="text-xl font-black">Statistiques</h2><div className="flex items-center gap-2"><button onClick={addStat} className="rounded-xl bg-slate-100 p-2 text-jso-navy"><Plus size={18}/></button><button onClick={saveStats} disabled={savingStats} className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white disabled:opacity-50"><Save size={16}/>{savingStats ? 'Enregistrement…' : 'Enregistrer'}</button></div></div>
            <p className="mt-2 text-xs text-slate-400">Valeurs domicile / extérieur (ex. Possession, Tirs, Corners). Laisse vide si non renseigné.</p>
            {savedStats && <p className="mt-2 rounded-xl bg-emerald-50 p-2 text-xs font-bold text-emerald-700">Statistiques enregistrées.</p>}
            <div className="mt-4 space-y-2">
              {stats.length === 0 ? <p className="text-sm text-slate-500">Aucune statistique.</p>
                : stats.map((s, i) => <div key={i} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1.4fr_0.8fr_0.8fr_auto]"><input value={s.name} onChange={e => updateStat(i, { name: e.target.value })} placeholder="Nom" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-jso-blue"/><input type="number" value={s.homeValue} onChange={e => updateStat(i, { homeValue: e.target.value })} placeholder="Dom." className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-jso-blue"/><input type="number" value={s.awayValue} onChange={e => updateStat(i, { awayValue: e.target.value })} placeholder="Ext." className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-jso-blue"/><button onClick={() => removeStat(i)} className="justify-self-end p-1 text-red-600"><X size={16}/></button></div>)}
            </div>
          </div>
        </>}
    </div>
  </div>
}

const MATCH_OFFICIAL_ROLES = [
  { value: 'Referee', label: 'Arbitre principal' },
  { value: 'Assistant', label: 'Arbitre assistant' },
  { value: 'Fourth', label: 'Quatrième arbitre' },
  { value: 'VAR', label: 'VAR' },
]
