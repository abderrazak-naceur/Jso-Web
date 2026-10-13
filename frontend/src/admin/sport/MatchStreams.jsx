import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { publicApi } from '../../lib/api'
import { API_BASE_URL } from '../../lib/apiConfig'

async function api(path, options = {}) {
  const token = localStorage.getItem('jso_admin_token')
  const response = await fetch(API_BASE_URL + path, { ...options, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...options.headers } })
  if (!response.ok) {
    let message = 'Request failed: ' + response.status
    try { message = (await response.json()).message || message } catch { /* ignore */ }
    throw new Error(message)
  }
  if (response.status === 204) return null
  return response.json()
}
const emptyStream = { provider: 'Livepeer', streamUrl: '', isPaid: true, price: '5', currency: 'TND', startsAt: '', endsAt: '', isPublished: false }
function toLocalInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
function toIsoOrNull(local) { return local ? new Date(local).toISOString() : null }

export default function MatchStreamsModule({ onError }) {
  const [matches, setMatches] = useState([])
  const [streams, setStreams] = useState([])
  const [matchId, setMatchId] = useState('')
  const [form, setForm] = useState(emptyStream)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  async function refresh() {
    setLoading(true)
    try {
      const [matchData, streamData] = await Promise.all([publicApi.getMatches(), api('/admin/match-streams')])
      const matchRows = Array.isArray(matchData) ? matchData : (matchData?.items || matchData?.matches || [])
      setMatches(matchRows); setStreams(Array.isArray(streamData) ? streamData : [])
      setMatchId(current => current || matchRows[0]?.id || ''); onError('')
    } catch (error) { onError(error.message || 'Impossibile caricare le dirette.') }
    finally { setLoading(false) }
  }
  useEffect(() => { refresh() }, [])
  useEffect(() => {
    const stream = streams.find(item => item.matchId === matchId)
    setForm(stream ? { provider: stream.provider || 'Livepeer', streamUrl: stream.streamUrl || '', isPaid: Boolean(stream.isPaid), price: String(stream.price ?? 5), currency: stream.currency || 'TND', startsAt: toLocalInput(stream.startsAt), endsAt: toLocalInput(stream.endsAt), isPublished: Boolean(stream.isPublished) } : { ...emptyStream })
    setSaved(false)
  }, [matchId, streams])
  async function save(event) {
    event.preventDefault()
    if (!matchId) { onError('Seleziona prima una partita.'); return }
    setSaved(false)
    try {
      const body = { provider: form.provider, streamUrl: form.streamUrl.trim() || null, isPaid: form.isPaid, price: form.isPaid ? (Number(form.price) || 0) : 0, currency: form.currency === 'EUR' ? 'EUR' : 'TND', startsAt: toIsoOrNull(form.startsAt), endsAt: toIsoOrNull(form.endsAt), isPublished: form.isPublished }
      const savedStream = await api('/admin/match-streams/' + matchId, { method: 'PUT', body: JSON.stringify(body) })
      setStreams(current => [...current.filter(item => item.matchId !== matchId), savedStream]); setSaved(true); onError('')
    } catch (error) { onError(error.message || 'Impossibile salvare la diretta.') }
  }
  const matchLabel = match => {
    const opponent = match.opponentName || match.opponent || match.awayTeamName || match.homeTeamName || 'Partita'
    const kickoff = match.kickoffAt || match.KickoffAt
    return (match.isHome ? 'JSO' : 'Partita') + ' — ' + opponent + (kickoff ? ' · ' + new Date(kickoff).toLocaleDateString('it-IT') : '')
  }
  const livepeer = form.provider === 'Livepeer'
  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Gestione dirette</h2><p className="mt-1 text-sm text-slate-500">Configura il player, il prezzo e la pubblicazione della partita.</p></div><button type="button" onClick={refresh} disabled={loading} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-50">{loading ? 'Caricamento…' : 'Aggiorna'}</button></div>
      <label className="mt-5 block text-sm font-bold">Partita<select value={matchId} onChange={event => setMatchId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">{matches.map(match => <option key={match.id} value={match.id}>{matchLabel(match)}</option>)}</select></label>
      {!loading && matches.length === 0 && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Non risultano partite disponibili da configurare.</p>}
      <div className="mt-4 rounded-xl bg-sky-50 p-4 text-sm leading-6 text-sky-950"><p className="font-extrabold">Flusso Swish Live → Livepeer → JSO Web</p><ol className="mt-2 list-decimal space-y-1 pl-5"><li>Crea una diretta nel pannello Livepeer Studio e copia l'RTMP ingest URL e la Stream Key.</li><li>In Swish Live scegli destinazione RTMP personalizzata e incolla URL e key. Configura squadre e tabellone nell'app: il punteggio sarà incorporato nel video.</li><li>Copia il Playback ID Livepeer e inserisci il playback URL qui sotto. Non inserire la Stream Key in questo campo.</li></ol><p className="mt-2">La Stream Key è una credenziale di trasmissione: condividila solo con chi produce la partita e non inserirla nelle pagine pubbliche.</p></div>
      <form onSubmit={save} className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-bold">Provider video<select value={form.provider} onChange={event => setForm(current => ({ ...current, provider: event.target.value, streamUrl: '' }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"><option value="Livepeer">Livepeer (Swish Live)</option><option value="Mux">Mux (legacy)</option></select></label>
        <label className="text-sm font-bold">{livepeer ? 'Playback URL Livepeer' : 'Playback URL Mux'}<input required={form.isPublished} value={form.streamUrl} onChange={event => setForm(current => ({ ...current, streamUrl: event.target.value }))} placeholder={livepeer ? 'https://lvpr.tv/?v=PLAYBACK_ID' : 'https://player.mux.com/PLAYBACK_ID'} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label>
        <label className="text-sm font-bold">Prezzo<input type="number" min="0" step="0.01" value={form.price} disabled={!form.isPaid} onChange={event => setForm(current => ({ ...current, price: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 disabled:bg-slate-100" /></label>
        <label className="text-sm font-bold">Valuta<select value={form.currency} onChange={event => setForm(current => ({ ...current, currency: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"><option value="TND">TND</option><option value="EUR">EUR</option></select></label>
        <label className="text-sm font-bold">Inizio<input type="datetime-local" value={form.startsAt} onChange={event => setForm(current => ({ ...current, startsAt: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label>
        <label className="text-sm font-bold">Fine<input type="datetime-local" value={form.endsAt} onChange={event => setForm(current => ({ ...current, endsAt: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isPaid} onChange={event => setForm(current => ({ ...current, isPaid: event.target.checked }))} /> Accesso a pagamento</label>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isPublished} onChange={event => setForm(current => ({ ...current, isPublished: event.target.checked }))} /> Pubblica la diretta</label>
        <div className="md:col-span-2 flex flex-wrap items-center gap-3"><button disabled={!matchId || loading} className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white disabled:opacity-50"><Save size={16} /> Salva configurazione</button>{saved && <span role="status" className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700">Salvato</span>}</div>
      </form>
    </div>
  </div>
}
