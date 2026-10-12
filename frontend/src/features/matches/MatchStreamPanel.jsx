import { useCallback, useEffect, useState } from 'react'
import { Radio, PlayCircle, ShieldCheck } from 'lucide-react'
import { matchStreamApi } from '../../lib/api'
import PayOnlineButton from '../shop/PayOnlineButton'

// Pay-per-view stream panel. The API reveals the playback URL only after
// server-side entitlement checks (paid fan, free stream, or trusted preview role).
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
    } catch (err) {
      if (!signal?.aborted) {
        setStream(null)
        setError(err?.message || 'Impossible de charger la diffusion. Réessayez plus tard.')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [matchId, token])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

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
      try { sessionStorage.setItem('jso_stream_access_' + matchId, res.accessId) } catch { /* ignore */ }
    }
    return res
  }

  useEffect(() => {
    let stored = null
    try { stored = sessionStorage.getItem('jso_stream_access_' + matchId) } catch { /* ignore */ }
    if (stored && token && stream && stream.isPaid && !stream.hasAccess) pollAfterPay(stored)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, token, matchId])

  const money = (n, c) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c || 'TND' }).format(n || 0)

  if (loading) {
    return <section aria-labelledby="stream-title" className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="text-sm text-slate-500">Chargement de la diffusion…</p></section>
  }
  if (!stream) {
    return (
      <section aria-labelledby="stream-title" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <Radio size={20} className="text-jso-blue" aria-hidden="true" />
          <h3 id="stream-title" className="text-xl font-black text-slate-900">Diretta della partita</h3>
        </div>
        <div className="flex items-start gap-3 p-5">
          <div className="rounded-xl bg-slate-100 p-3 text-slate-500"><PlayCircle size={22} aria-hidden="true" /></div>
          <div>
            <p className="font-bold text-slate-900">{error ? 'Impossible de charger la diffusion' : 'La diretta non è ancora disponibile'}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{error || 'Il video comparirà qui quando la diretta sarà configurata e pubblicata dall’amministratore per questa partita.'}</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="stream-title" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h3 id="stream-title" className="flex items-center gap-2 text-xl font-black text-slate-900"><Radio size={20} className="text-jso-blue" aria-hidden="true" /> Regarder en direct</h3>
        {stream.isPreviewAccess && <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800"><ShieldCheck size={14} /> Aperçu développeur</span>}
      </div>
      <div className="p-5">
        {stream.startsAt && <p className="mb-3 text-sm text-slate-500">Diffusion prévue le {new Date(stream.startsAt).toLocaleString('fr-FR')}</p>}

        {stream.hasAccess && stream.streamUrl ? (
          <div>
            <div className="aspect-video overflow-hidden rounded-2xl bg-slate-950">
              {stream.provider?.toLowerCase() === 'mux' && stream.streamUrl.includes('mux.com') ? (
                <iframe title="Diffusion en direct JSO" src={stream.streamUrl} className="h-full w-full border-0" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white">
                  <PlayCircle size={42} className="text-sky-400" />
                  <p className="font-bold">La diffusion è autorizzata</p>
                  <a href={stream.streamUrl} target="_blank" rel="noopener noreferrer" className="rounded-full bg-jso-blue px-6 py-3 font-extrabold text-white hover:opacity-90">Ouvrir la diffusion</a>
                </div>
              )}
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-700"><ShieldCheck size={16} /> Accès actif{stream.isPreviewAccess ? ' — aperçu gratuit réservé au développement' : ''}</p>
            <p className="mt-1 text-xs text-slate-400">Ne partagez pas le lien de diffusion.</p>
          </div>
        ) : stream.isPaid ? (
          <div className="rounded-2xl bg-slate-50 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-3 text-jso-blue"><Radio size={22} /></div>
              <div><p className="font-bold text-slate-900">Cette diffusion est payante</p><p className="text-sm text-slate-500">Achetez l’accès pour regarder le match sur JSO Web.</p></div>
            </div>
            <p className="text-lg font-black text-slate-900">{money(stream.price, stream.currency)}</p>
            {polling && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Vérification du paiement en cours…</p>}
            <div className="mt-3"><PayOnlineButton pay={pay} label="Payer pour regarder" /></div>
            <p className="mt-2 text-xs text-slate-400">Le flux n’est accessible qu’après confirmation du paiement.</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Diffusion gratuite. Le lien apparaîtra ici lorsqu’il sera disponible.</p>
        )}
        {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      </div>
    </section>
  )
}
