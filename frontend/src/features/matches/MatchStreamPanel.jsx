import { useCallback, useEffect, useState } from 'react'
import { Radio, PlayCircle } from 'lucide-react'
import { matchStreamApi } from '../../lib/api'
import PayOnlineButton from '../shop/PayOnlineButton'

// "Regarder en direct" panel for the public match view (idea B24, pay-per-view).
//
// SECURITY: the streamUrl is NEVER derived client-side. We only ever show what
// the server returns: it includes streamUrl ONLY when the viewer is entitled
// (free stream, or the signed-in fan has a Paid access). For a paid, not-yet
// purchased stream we show PayOnlineButton; after payment we poll the access
// status and, once Paid, refetch the metadata so the server reveals the link.
export default function MatchStreamPanel({ matchId, token, onRequireLogin }) {
  const [stream, setStream] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [polling, setPolling] = useState(false)

  const load = useCallback(async (signal) => {
    setLoading(true)
    try {
      const s = await matchStreamApi.get(matchId, token)
      if (!signal?.aborted) { setStream(s); setError('') }
    } catch {
      // 404 simply means no published stream for this match: stay silent.
      if (!signal?.aborted) { setStream(null); setError('') }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [matchId, token])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  // After returning from payment (or when the fan just paid), poll the access a
  // few times, then refetch the metadata so an entitled viewer gets the link.
  async function pollAfterPay(accessId) {
    setPolling(true)
    let attempts = 0
    async function tick() {
      attempts += 1
      try {
        const row = await matchStreamApi.access(accessId, token)
        if (row?.status === 'Paid') {
          await load()
          setPolling(false)
          return
        }
      } catch { /* ignore transient */ }
      if (attempts < 6) setTimeout(tick, 2500)
      else setPolling(false)
    }
    tick()
  }

  async function pay(country) {
    if (!token) { onRequireLogin?.(); return {} }
    const res = await matchStreamApi.startAccess(matchId, country, token)
    if (res?.accessId) {
      // Persist so a return to this page can resume polling if needed.
      try { sessionStorage.setItem('jso_stream_access_' + matchId, res.accessId) } catch { /* ignore */ }
    }
    return res
  }

  // Resume polling if we came back from the provider for this match.
  useEffect(() => {
    let stored = null
    try { stored = sessionStorage.getItem('jso_stream_access_' + matchId) } catch { /* ignore */ }
    if (stored && token && stream && stream.isPaid && !stream.hasAccess) pollAfterPay(stored)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, token, matchId])

  const money = (n, c) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c || 'TND' }).format(n || 0)

  if (loading) {
    return <section aria-labelledby="stream-title" className="rounded-2xl bg-slate-50 p-5"><p className="text-sm text-slate-500">Chargement de la diffusion…</p></section>
  }
  if (!stream) return null

  return (
    <section aria-labelledby="stream-title" className="rounded-2xl border border-slate-200 p-5">
      <h3 id="stream-title" className="flex items-center gap-2 text-xl font-black"><Radio size={20} className="text-jso-blue" aria-hidden="true" /> Regarder en direct</h3>
      {stream.startsAt && <p className="mt-1 text-sm text-slate-500">Diffusion prévue le {new Date(stream.startsAt).toLocaleString('fr-FR')}</p>}

      {stream.hasAccess && stream.streamUrl ? (
        <div className="mt-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-700"><PlayCircle size={16} /> Accès actif</p>
          <a href={stream.streamUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-jso-navy px-6 py-3 font-extrabold text-white hover:bg-jso-blue">
            <PlayCircle size={18} /> Ouvrir la diffusion
          </a>
          <p className="mt-2 text-xs text-slate-400">Lien personnel. Merci de ne pas le partager.</p>
        </div>
      ) : stream.isPaid ? (
        <div className="mt-4">
          <p className="text-sm text-slate-600">Accès payant : <b>{money(stream.price, stream.currency)}</b></p>
          {polling && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Vérification du paiement en cours…</p>}
          <div className="mt-3"><PayOnlineButton pay={pay} label="Payer pour regarder" /></div>
          <p className="mt-2 text-xs text-slate-400">Le lien de diffusion n’est révélé qu’après confirmation du paiement.</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Diffusion gratuite. Le lien apparaîtra ici lorsqu’il sera disponible.</p>
      )}
      {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
    </section>
  )
}
