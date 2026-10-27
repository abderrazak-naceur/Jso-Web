import { useEffect, useState } from 'react'
import { adminApi } from '../api'
import { useConfirm } from '../components/ui/ConfirmDialog'
import MatchStreamsModule from './MatchStreams'
import { publicApi } from '../../lib/api'

export default function MatchStreamsWithPromos({ onError }) {
  const confirm = useConfirm()
  const [matches, setMatches] = useState([])
  const [streamRows, setStreamRows] = useState([])
  const [matchId, setMatchId] = useState('')
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ code: '', discountPercent: 100, expiresAt: '', maxUses: '', isEnabled: true })
  const [busy, setBusy] = useState(false)

  async function refreshMatches() {
    try {
      const [matchData, streamData] = await Promise.all([publicApi.getMatches(), adminApi('/admin/match-streams')])
      const ms = Array.isArray(matchData) ? matchData : (matchData?.items || matchData?.matches || [])
      setMatches(ms)
      setStreamRows(Array.isArray(streamData) ? streamData : [])
      setMatchId(current => current || ms[0]?.id || '')
    } catch (e) { onError(e.message || 'Impossible de charger les matchs pour les codes promo.') }
  }
  async function refreshRows(id = matchId) {
    if (!id) { setRows([]); return }
    try { const data = await adminApi('/admin/match-streams/' + id + '/promo-codes'); setRows(Array.isArray(data) ? data : []) }
    catch (e) { setRows([]); onError(e.message || 'Impossible de charger les codes promo.') }
  }
  useEffect(() => { refreshMatches() }, [])
  useEffect(() => { refreshRows(matchId) }, [matchId])

  const label = match => {
    const opponent = match.opponentName || match.opponent || match.awayTeamName || match.homeTeamName || 'Match'
    const kick = match.kickoffAt || match.KickoffAt
    return opponent + (kick ? ' · ' + new Date(kick).toLocaleDateString('fr-FR') : '')
  }

  async function create(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await adminApi('/admin/match-streams/' + matchId + '/promo-codes', {
        method: 'POST',
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          discountPercent: Number(form.discountPercent),
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          isEnabled: form.isEnabled,
        }),
      })
      setForm({ code: '', discountPercent: 100, expiresAt: '', maxUses: '', isEnabled: true })
      await refreshRows()
      onError('')
    } catch (e) { onError(e.message || 'Impossible de créer le code promo.') }
    finally { setBusy(false) }
  }
  async function toggle(row) {
    try {
      await adminApi('/admin/match-streams/' + matchId + '/promo-codes/' + row.id, {
        method: 'PUT',
        body: JSON.stringify({ discountPercent: row.discountPercent, expiresAt: row.expiresAt, maxUses: row.maxUses, isEnabled: !row.isEnabled }),
      })
      await refreshRows()
    } catch (e) { onError(e.message || 'Impossible de modifier le code promo.') }
  }
  async function remove(row) {
    if (!await confirm(`Supprimer le code ${row.code} ?`)) return
    try { await adminApi('/admin/match-streams/' + matchId + '/promo-codes/' + row.id, { method: 'DELETE' }); await refreshRows() }
    catch (e) { onError(e.message || 'Impossible de supprimer le code promo.') }
  }

  const hasStream = streamRows.some(x => x.matchId === matchId)
  return <div className="space-y-6">
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">Codes promo par match</h2><button type="button" onClick={refreshMatches} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">Actualiser les matchs</button></div>
      <p className="mt-1 text-sm text-slate-500">Créez des remises pour une seule diffusion, fixez une date d’expiration et limitez le nombre d’utilisations. 100 % donne accès sans enregistrer de revenu de paiement.</p>
      <label className="mt-5 block text-sm font-bold">Match
        <select value={matchId} onChange={e => setMatchId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
          {matches.map(m => <option key={m.id} value={m.id}>{label(m)}</option>)}
        </select>
      </label>
      {!hasStream && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Enregistrez d’abord la configuration de la diffusion pour ce match.</p>}
      <form onSubmit={create} className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-bold">Code
          <input required minLength={3} maxLength={40} pattern="[A-Za-z0-9_-]+" value={form.code} onChange={e => setForm(v => ({ ...v, code: e.target.value.toUpperCase() }))} placeholder="JSO100" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 uppercase" />
        </label>
        <label className="text-sm font-bold">Remise (%)
          <input required type="number" min="1" max="100" value={form.discountPercent} onChange={e => setForm(v => ({ ...v, discountPercent: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="text-sm font-bold">Expiration (facultative)
          <input type="datetime-local" value={form.expiresAt} onChange={e => setForm(v => ({ ...v, expiresAt: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="text-sm font-bold">Utilisations max (facultatif)
          <input type="number" min="1" value={form.maxUses} onChange={e => setForm(v => ({ ...v, maxUses: e.target.value }))} placeholder="Illimitées" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isEnabled} onChange={e => setForm(v => ({ ...v, isEnabled: e.target.checked }))} /> Actif immédiatement</label>
        <button disabled={!matchId || !hasStream || busy} className="rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white disabled:opacity-50">{busy ? 'Enregistrement…' : 'Créer le code promo'}</button>
      </form>
      <div className="mt-6 space-y-3">
        {rows.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Aucun code promo pour ce match.</p>}
        {rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
          <div><p className="font-black">{row.code} <span className="ml-2 text-sm text-jso-blue">-{row.discountPercent}%</span></p>
            <p className="mt-1 text-xs text-slate-500">Utilisations : {row.uses}{row.maxUses ? ' / ' + row.maxUses : ' / illimitées'}{row.expiresAt ? ' · Expire ' + new Date(row.expiresAt).toLocaleString('fr-FR') : ''}</p>
            <p className="mt-1 text-xs font-bold">{row.isEnabled ? 'Actif' : 'Désactivé'}</p>
          </div>
          <div className="flex gap-2"><button type="button" onClick={() => toggle(row)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold">{row.isEnabled ? 'Désactiver' : 'Activer'}</button>
            <button type="button" onClick={() => remove(row)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700">Supprimer</button></div>
        </div>)}
      </div>
    </section>
    <MatchStreamsModule onError={onError} />
  </div>
}
