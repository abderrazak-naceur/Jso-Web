import { useEffect, useState } from 'react'
import { Plus, Trash2, X, TicketPercent, Copy, Check, RefreshCw } from 'lucide-react'
import MatchStreamsModule from './MatchStreams'
import { publicApi } from '../../lib/api'
import { API_BASE_URL } from '../../lib/apiConfig'

async function adminApi(path, options = {}) {
  const token = localStorage.getItem('jso_admin_token')
  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...options.headers },
  })
  if (!response.ok) {
    let message = 'Richiesta non riuscita (' + response.status + ')'
    try { message = (await response.json()).message || message } catch {}
    const error = new Error(message)
    error.status = response.status
    throw error
  }
  if (response.status === 204) return null
  return response.json()
}

const emptyForm = { code: '', discountPercent: 100, expiresAt: '', maxUses: '', isEnabled: true }

export default function MatchStreamsWithPromos({ onError }) {
  const [matches, setMatches] = useState([])
  const [streamRows, setStreamRows] = useState([])
  const [matchId, setMatchId] = useState('')
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [loadingRows, setLoadingRows] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [copiedId, setCopiedId] = useState('')

  async function refreshMatches() {
    try {
      const [matchData, streamData] = await Promise.all([publicApi.getMatches(), adminApi('/admin/match-streams')])
      const ms = Array.isArray(matchData) ? matchData : (matchData?.items || matchData?.matches || [])
      setMatches(ms)
      setStreamRows(Array.isArray(streamData) ? streamData : [])
      setMatchId(current => current && ms.some(m => m.id === current) ? current : (ms[0]?.id || ''))
    } catch (e) { onError(e.message || 'Impossibile caricare le partite per i codici promo.') }
  }

  async function refreshRows(id = matchId) {
    if (!id) { setRows([]); return }
    setLoadingRows(true)
    try {
      const data = await adminApi('/admin/match-streams/' + id + '/promo-codes')
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      setRows([])
      onError(e.message || 'Impossibile caricare i codici promo.')
    } finally { setLoadingRows(false) }
  }

  useEffect(() => { refreshMatches() }, [])
  useEffect(() => { refreshRows(matchId) }, [matchId])

  const label = match => {
    const opponent = match.opponentName || match.opponent || match.awayTeamName || match.homeTeamName || 'Partita'
    const kick = match.kickoffAt || match.KickoffAt
    return opponent + (kick ? ' · ' + new Date(kick).toLocaleDateString('it-IT') : '')
  }

  async function create(event) {
    event.preventDefault()
    if (!matchId) return
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
      setForm({ ...emptyForm })
      setModalOpen(false)
      await refreshRows()
      onError('')
    } catch (e) { onError(e.message || 'Impossibile creare il codice promo.') }
    finally { setBusy(false) }
  }

  async function toggle(row) {
    try {
      await adminApi('/admin/match-streams/' + matchId + '/promo-codes/' + row.id, {
        method: 'PUT',
        body: JSON.stringify({ discountPercent: row.discountPercent, expiresAt: row.expiresAt, maxUses: row.maxUses, isEnabled: !row.isEnabled }),
      })
      await refreshRows()
      onError('')
    } catch (e) { onError(e.message || 'Impossibile modificare il codice promo.') }
  }

  async function remove(row) {
    setDeletingId(row.id)
    try {
      await adminApi('/admin/match-streams/' + matchId + '/promo-codes/' + row.id, { method: 'DELETE' })
      setRows(current => current.filter(item => item.id !== row.id))
      onError('')
      await refreshRows()
    } catch (e) {
      const message = e.status === 401 || e.status === 403
        ? 'Eliminazione non autorizzata: la sessione admin potrebbe essere scaduta. Esci e accedi di nuovo, poi riprova.'
        : e.message || 'Impossibile eliminare il codice promo.'
      onError(message)
    } finally { setDeletingId('') }
  }

  async function copyCode(row) {
    try {
      await navigator.clipboard.writeText(row.code)
      setCopiedId(row.id)
      window.setTimeout(() => setCopiedId(current => current === row.id ? '' : current), 1600)
    } catch { onError('Impossibile copiare il codice. Selezionalo e copialo manualmente.') }
  }

  const hasStream = streamRows.some(x => x.matchId === matchId)
  const activeCount = rows.filter(row => row.isEnabled && (!row.expiresAt || new Date(row.expiresAt) > new Date()) && (!row.maxUses || row.uses < row.maxUses)).length

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-jso-navy p-3 text-white"><TicketPercent size={22} /></span>
            <div><h2 className="text-xl font-black text-slate-950">Codici sconto delle dirette</h2><p className="mt-1 max-w-2xl text-sm text-slate-500">Crea e gestisci i codici promozionali per una singola partita. I codici disponibili saranno elencati qui sotto.</p></div>
          </div>
          <button type="button" onClick={() => { setForm({ ...emptyForm }); setModalOpen(true) }} disabled={!matchId || !hasStream} className="inline-flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"><Plus size={17} /> Nuovo codice sconto</button>
        </div>
      </div>
      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className="block text-sm font-bold text-slate-700">Partita
            <select value={matchId} onChange={e => setMatchId(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100">
              {matches.map(m => <option key={m.id} value={m.id}>{label(m)}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => { refreshMatches(); refreshRows() }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><RefreshCw size={15} /> Aggiorna</button>
        </div>

        {!hasStream && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Per creare codici sconto, prima salva la configurazione della diretta nella sezione sottostante per questa partita.</div>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-extrabold text-slate-900">Codici disponibili</h3><p className="mt-1 text-xs text-slate-500">I codici sono validi solo per la partita selezionata.</p></div>
          <div className="flex gap-2"><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">{rows.length} totali</span><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">{activeCount} disponibili</span></div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          {loadingRows ? <div className="space-y-3 p-5"><div className="h-5 animate-pulse rounded bg-slate-100" /><div className="h-5 animate-pulse rounded bg-slate-100" /><div className="h-5 animate-pulse rounded bg-slate-100" /></div>
          : rows.length === 0 ? <div className="px-5 py-12 text-center"><TicketPercent className="mx-auto text-slate-300" size={34} /><p className="mt-3 font-bold text-slate-700">Nessun codice sconto</p><p className="mt-1 text-sm text-slate-500">Crea il primo codice con il pulsante “Nuovo codice sconto”.</p></div>
          : <div className="divide-y divide-slate-100">
            {rows.map(row => {
              const expired = row.expiresAt && new Date(row.expiresAt) <= new Date()
              const exhausted = row.maxUses && row.uses >= row.maxUses
              const available = row.isEnabled && !expired && !exhausted
              return <div key={row.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`rounded-xl p-3 ${available ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}><TicketPercent size={20} /></span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><span className="break-all font-mono text-base font-black tracking-wide text-slate-950">{row.code}</span><span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-extrabold text-sky-800">-{row.discountPercent}%</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${available ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{available ? 'Disponibile' : expired ? 'Scaduto' : exhausted ? 'Esaurito' : 'Disattivato'}</span></div>
                    <p className="mt-1.5 text-xs text-slate-500">Utilizzi: {row.uses}{row.maxUses ? ' / ' + row.maxUses : ' / illimitati'}{row.expiresAt ? ' · Scade ' + new Date(row.expiresAt).toLocaleString('it-IT') : ' · Nessuna scadenza'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  <button type="button" onClick={() => copyCode(row)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">{copiedId === row.id ? <Check size={15} /> : <Copy size={15} />}{copiedId === row.id ? 'Copiato' : 'Copia'}</button>
                  <button type="button" onClick={() => toggle(row)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">{row.isEnabled ? 'Disattiva' : 'Attiva'}</button>
                  <button type="button" disabled={deletingId === row.id} onClick={() => remove(row)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 size={15} />{deletingId === row.id ? 'Eliminazione…' : 'Elimina'}</button>
                </div>
              </div>
            })}
          </div>}
        </div>
      </div>
    </section>

    {modalOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setModalOpen(false) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="promo-modal-title" className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6"><div><h2 id="promo-modal-title" className="text-xl font-black text-slate-950">Nuovo codice sconto</h2><p className="mt-1 text-sm text-slate-500">{matches.find(m => m.id === matchId) ? label(matches.find(m => m.id === matchId)) : 'Partita selezionata'}</p></div><button type="button" aria-label="Chiudi" disabled={busy} onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={20} /></button></div>
        <form onSubmit={create} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <label className="text-sm font-bold text-slate-700 sm:col-span-2">Codice promozionale
            <input autoFocus required minLength={3} maxLength={40} pattern="[A-Za-z0-9_-]+" value={form.code} onChange={e => setForm(v => ({ ...v, code: e.target.value.toUpperCase() }))} placeholder="JSO100" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono uppercase outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
            <span className="mt-1 block text-xs font-normal text-slate-500">3–40 caratteri: lettere, numeri, trattino o underscore.</span>
          </label>
          <label className="text-sm font-bold text-slate-700">Sconto (%)
            <input required type="number" min="1" max="100" value={form.discountPercent} onChange={e => setForm(v => ({ ...v, discountPercent: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </label>
          <label className="text-sm font-bold text-slate-700">Utilizzi massimi
            <input type="number" min="1" value={form.maxUses} onChange={e => setForm(v => ({ ...v, maxUses: e.target.value }))} placeholder="Illimitati" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </label>
          <label className="text-sm font-bold text-slate-700 sm:col-span-2">Scadenza (facoltativa)
            <input type="datetime-local" value={form.expiresAt} onChange={e => setForm(v => ({ ...v, expiresAt: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 sm:col-span-2"><input type="checkbox" checked={form.isEnabled} onChange={e => setForm(v => ({ ...v, isEnabled: e.target.checked }))} /> Attiva subito</label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 sm:col-span-2"><button type="button" disabled={busy} onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Annulla</button><button disabled={!matchId || !hasStream || busy} className="rounded-xl bg-jso-navy px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Salvataggio…' : 'Crea codice sconto'}</button></div>
        </form>
      </section>
    </div>}

    <MatchStreamsModule onError={onError} />
  </div>
}
