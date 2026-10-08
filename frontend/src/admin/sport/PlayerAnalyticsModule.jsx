import { useEffect, useState } from 'react'
import { adminApi } from '../api'

export default function PlayerAnalyticsModule({ onError }) {
  const [teams, setTeams] = useState([])
  const [teamId, setTeamId] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  async function loadTeams() {
    try { const data = await adminApi('/admin/teams'); setTeams(data); if (data[0]) select(data[0].id) }
    catch (e) { onError(e.message) }
  }
  async function select(id) {
    setTeamId(id)
    setLoading(true)
    try { const data = await adminApi('/admin/teams/' + id + '/analytics'); setRows(data.players || []); onError('') }
    catch (e) { onError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { loadTeams() }, [])

  return <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="text-xl font-black">Analytics joueurs</h2>
      <select value={teamId} onChange={e => select(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-jso-blue">
        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </div>
    <p className="mt-2 text-xs text-slate-400">Statistiche derivate da presenze (compositions) ed eventi partita.</p>
    <div className="mt-5 overflow-x-auto">
      {loading ? <p className="text-sm text-slate-400">Chargement…</p>
        : rows.length === 0 ? <p className="text-sm text-slate-400">Aucune donnée de match pour cette équipe.</p>
        : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">#</th><th className="p-2">Joueur</th><th className="p-2">Présences</th><th className="p-2">Buts</th><th className="p-2">🟨</th><th className="p-2">🟥</th></tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-b last:border-0"><td className="p-2 font-black">{r.shirtNumber ?? '—'}</td><td className="p-2 font-bold">{r.name}</td><td className="p-2">{r.appearances}</td><td className="p-2 font-bold text-jso-blue">{r.goals}</td><td className="p-2">{r.yellowCards}</td><td className="p-2">{r.redCards}</td></tr>)}</tbody></table>}
    </div>
  </div>
}
