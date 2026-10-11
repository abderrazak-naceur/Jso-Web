import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Radio, Save, ShieldCheck, Video } from 'lucide-react'
import { publicApi } from '../../lib/api'
import { API_BASE_URL } from '../../lib/apiConfig'

const emptyForm = {
  streamUrl: '',
  isPaid: true,
  price: 5,
  currency: 'TND',
  startsAt: '',
  endsAt: '',
  isPublished: false,
}

function toLocalInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function matchLabel(match) {
  const opponent = match.opponentName || match.opponent || match.awayTeamName || match.homeTeamName || 'Partita'
  const date = match.kickoffAt ? new Date(match.kickoffAt).toLocaleString() : ''
  return [opponent, date].filter(Boolean).join(' — ')
}

export default function AdminLiveStreamsPage({ token, onBack, onLogin }) {
  const [matches, setMatches] = useState([])
  const [streams, setStreams] = useState([])
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const selectedMatch = matches.find((match) => match.id === selectedMatchId)
  const existing = streams.find((stream) => stream.matchId === selectedMatchId)

  async function adminRequest(path, method = 'GET', body) {
    const response = await fetch(API_BASE_URL + path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!response.ok) {
      let message = 'Richiesta non riuscita (' + response.status + ').'
      try { message = (await response.json()).message || message } catch {}
      throw new Error(message)
    }
    return response.status === 204 ? null : response.json()
  }

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const [matchData, streamData] = await Promise.all([
        publicApi.getMatches(),
        adminRequest('/admin/match-streams'),
      ])
      const matchRows = Array.isArray(matchData) ? matchData : (matchData.items || matchData.matches || [])
      const streamRows = Array.isArray(streamData) ? streamData : []
      setMatches(matchRows)
      setStreams(streamRows)
      setSelectedMatchId((current) => current || matchRows[0]?.id || '')
    } catch (e) {
      setError(e.message || 'Impossibile caricare le dirette. Verifica di aver effettuato l’accesso con un ruolo Admin.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    refresh()
    // Load once when the authenticated session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    const stream = streams.find((item) => item.matchId === selectedMatchId)
    setForm(stream ? {
      streamUrl: stream.streamUrl || '',
      isPaid: Boolean(stream.isPaid),
      price: Number(stream.price ?? 5),
      currency: stream.currency === 'EUR' ? 'EUR' : 'TND',
      startsAt: toLocalInput(stream.startsAt),
      endsAt: toLocalInput(stream.endsAt),
      isPublished: Boolean(stream.isPublished),
    } : { ...emptyForm })
    setError('')
    setNotice('')
  }, [selectedMatchId, streams])

  const playerUrlHelp = useMemo(() => 'https://player.mux.com/IL_TUO_PLAYBACK_ID', [])

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function togglePublished(stream) {
    setError('')
    setNotice('')
    try {
      const saved = await adminRequest('/admin/match-streams/' + stream.matchId, 'PUT', {
        provider: stream.provider || 'Mux',
        streamUrl: stream.streamUrl || null,
        isPaid: Boolean(stream.isPaid),
        price: Number(stream.price ?? 0),
        currency: stream.currency === 'EUR' ? 'EUR' : 'TND',
        startsAt: stream.startsAt || null,
        endsAt: stream.endsAt || null,
        isPublished: !stream.isPublished,
      })
      setStreams((current) => current.map((item) => item.matchId === saved.matchId ? saved : item))
      setNotice(saved.isPublished ? 'Diretta attivata e pubblicata.' : 'Diretta disattivata. La configurazione è stata conservata.')
    } catch (e) {
      setError(e.message || 'Impossibile modificare lo stato della diretta.')
    }
  }

  async function save(event) {
    event.preventDefault()
    if (!selectedMatchId) {
      setError('Seleziona prima una partita.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        provider: 'Mux',
        streamUrl: form.streamUrl.trim() || null,
        isPaid: form.isPaid,
        price: Number(form.price) || 0,
        currency: form.currency,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        isPublished: form.isPublished,
      }
      const saved = await adminRequest('/admin/match-streams/' + selectedMatchId, 'PUT', payload)
      setStreams((current) => [...current.filter((item) => item.matchId !== selectedMatchId), saved])
      setNotice(form.isPublished ? 'Diretta salvata e pubblicata. Apri il dettaglio della partita per provarla.' : 'Configurazione salvata come bozza.')
    } catch (e) {
      setError(e.message || 'Non è stato possibile salvare la configurazione.')
    } finally {
      setSaving(false)
    }
  }

  if (!token) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <ShieldCheck className="mb-4 text-blue-700" size={34} />
          <h1 className="text-2xl font-black text-slate-900">Gestione dirette</h1>
          <p className="mt-2 text-slate-600">Accedi con il tuo account amministratore per configurare una diretta.</p>
          <button onClick={onLogin} className="mt-5 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white">Accedi</button>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900">
        <ArrowLeft size={16} /> Torna al sito
      </button>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-blue-800"><Radio size={14} /> JSO Live</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Gestione dirette</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Associa il player Mux a una partita, configura il prezzo e pubblica l’anteprima. Non inserire qui la Stream Key RTMP: serve soltanto il Playback URL.</p>
        </div>
        <button onClick={refresh} disabled={loading} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50">Aggiorna</button>
      </div>

      {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>}
      {notice && <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{notice}</div>}

      {!loading && (
        <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-black text-slate-900">Dirette configurate</h2>
            <p className="mt-1 text-sm text-slate-500">Attiva o disattiva la pubblicazione senza cancellare il Playback URL.</p>
          </div>
          {streams.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500 sm:px-6">Nessuna diretta salvata. Seleziona una partita qui sotto e salva la configurazione.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-5 py-3 font-bold">Partita</th><th className="px-5 py-3 font-bold">Playback URL</th><th className="px-5 py-3 font-bold">Accesso</th><th className="px-5 py-3 font-bold">Stato</th><th className="px-5 py-3 text-right font-bold">Azione</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {streams.map((stream) => {
                    const match = matches.find((item) => item.id === stream.matchId)
                    return (
                      <tr key={stream.matchId}>
                        <td className="px-5 py-4 font-semibold text-slate-900">{match ? matchLabel(match) : 'Partita'}</td>
                        <td className="max-w-xs px-5 py-4 text-slate-500"><span className="block truncate" title={stream.streamUrl || ''}>{stream.streamUrl || 'URL non impostato'}</span></td>
                        <td className="px-5 py-4 text-slate-600">{stream.isPaid ? 'Pagamento' : 'Gratuita'}</td>
                        <td className="px-5 py-4"><span className={stream.isPublished ? 'inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700' : 'inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700'}>{stream.isPublished ? 'Attiva' : 'Bozza / disattiva'}</span></td>
                        <td className="px-5 py-4 text-right"><button type="button" onClick={() => togglePublished(stream)} disabled={!stream.streamUrl || saving} className={stream.isPublished ? 'rounded-lg border border-red-200 px-3 py-2 text-xs font-extrabold text-red-700 hover:bg-red-50 disabled:opacity-50' : 'rounded-lg bg-emerald-700 px-3 py-2 text-xs font-extrabold text-white hover:bg-emerald-800 disabled:opacity-50'}>{stream.isPublished ? 'Disattiva' : 'Attiva'}</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">Caricamento partite e dirette…</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form onSubmit={save} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div>
              <label htmlFor="stream-match" className="mb-2 block text-sm font-bold text-slate-800">Partita</label>
              <select id="stream-match" value={selectedMatchId} onChange={(event) => setSelectedMatchId(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm" required>
                <option value="">Seleziona una partita…</option>
                {matches.map((match) => <option key={match.id} value={match.id}>{matchLabel(match)}</option>)}
              </select>
              {matches.length === 0 && <p className="mt-2 text-sm text-amber-700">Non risultano partite disponibili. Crea prima una partita nel calendario.</p>}
            </div>

            <div>
              <label htmlFor="mux-url" className="mb-2 block text-sm font-bold text-slate-800">Mux Playback URL</label>
              <input id="mux-url" type="url" value={form.streamUrl} onChange={(event) => change('streamUrl', event.target.value)} placeholder={playerUrlHelp} className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" />
              <p className="mt-2 text-xs leading-5 text-slate-500">In Mux, usa l’URL del player, ad esempio {playerUrlHelp}. Non incollare la chiave RTMP né una chiave API.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="stream-start" className="mb-2 block text-sm font-bold text-slate-800">Inizio previsto</label>
                <input id="stream-start" type="datetime-local" value={form.startsAt} onChange={(event) => change('startsAt', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" />
              </div>
              <div>
                <label htmlFor="stream-end" className="mb-2 block text-sm font-bold text-slate-800">Fine prevista</label>
                <input id="stream-end" type="datetime-local" value={form.endsAt} onChange={(event) => change('endsAt', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" />
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <label className="flex items-center gap-3 text-sm font-bold text-slate-800">
                <input type="checkbox" checked={form.isPaid} onChange={(event) => change('isPaid', event.target.checked)} className="h-4 w-4 accent-blue-700" />
                Diretta a pagamento
              </label>
              {form.isPaid && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="stream-price" className="mb-2 block text-sm font-bold text-slate-700">Prezzo</label>
                    <input id="stream-price" type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => change('price', event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm" required />
                  </div>
                  <div>
                    <label htmlFor="stream-currency" className="mb-2 block text-sm font-bold text-slate-700">Valuta</label>
                    <select id="stream-currency" value={form.currency} onChange={(event) => change('currency', event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm">
                      <option value="TND">TND — Tunisia</option>
                      <option value="EUR">EUR — Europa</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
              <input type="checkbox" checked={form.isPublished} onChange={(event) => change('isPublished', event.target.checked)} className="mt-0.5 h-4 w-4 accent-blue-700" />
              <span><strong className="block text-slate-900">Pubblica la diretta</strong><span className="mt-1 block text-slate-500">Selezionando questa opzione il riquadro apparirà nel dettaglio della partita. Verifica prima che il flusso Mux sia attivo.</span></span>
            </label>

            <button type="submit" disabled={saving || !selectedMatchId} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 font-extrabold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
              <Save size={17} /> {saving ? 'Salvataggio…' : 'Salva configurazione'}
            </button>
          </form>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-700"><Video size={22} /></div><div><h2 className="font-extrabold text-slate-900">Stato della diretta</h2><p className="text-xs text-slate-500">Partita selezionata</p></div></div>
              <p className="font-bold text-slate-900">{selectedMatch ? matchLabel(selectedMatch) : 'Nessuna partita selezionata'}</p>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm"><span className="text-slate-500">Configurazione</span><strong>{existing ? 'Presente' : 'Nuova'}</strong></div>
              <div className="mt-3 flex items-center justify-between text-sm"><span className="text-slate-500">Pubblicazione</span><strong className={form.isPublished ? 'text-emerald-700' : 'text-amber-700'}>{form.isPublished ? 'Pubblicata' : 'Bozza'}</strong></div>
              <div className="mt-3 flex items-center justify-between text-sm"><span className="text-slate-500">Accesso</span><strong>{form.isPaid ? 'Pay-per-view' : 'Gratuito'}</strong></div>
            </section>
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
              <strong className="block">Prima di pubblicare</strong>
              Il Playback URL deve corrispondere a un playback Mux valido. Questa schermata non crea una sorgente Live Mux e non avvia la trasmissione dal telefono: configura soltanto il collegamento della partita.
            </section>
          </aside>
        </div>
      )}
    </main>
  )
}
