import { useEffect, useState } from 'react'
import { CalendarDays, Copy, MapPin } from 'lucide-react'
import { publicApi } from '../../lib/api'
import { formatDate, formatTime, pick } from '../../lib/format'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { sharePreviewUrl } from '../../lib/sharePreviewUrl'

export default function EventDetail({ slug }) {
  const [state, setState] = useState({ status: 'loading', event: null })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading', event: null })
    publicApi.getEvent(slug, controller.signal)
      .then((event) => setState({ status: 'ready', event }))
      .catch((error) => {
        if (!controller.signal.aborted) setState({ status: error.message?.includes('404') ? 'not-found' : 'error', event: null })
      })
    return () => controller.abort()
  }, [slug])

  const event = state.event
  useDocumentTitle(pick(event, 'title', 'Title') || 'Agenda')

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(sharePreviewUrl('event', slug))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { setCopied(false) }
  }

  return <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8">
    <a href="/agenda" className="text-sm font-bold text-jso-blue underline">← Agenda</a>
    {state.status === 'loading' && <p role="status" className="mt-8 rounded-2xl bg-white p-8">Chargement de l'événement…</p>}
    {state.status === 'not-found' && <p role="alert" className="mt-8 rounded-2xl bg-white p-8">Cet événement n'est plus disponible.</p>}
    {state.status === 'error' && <p role="alert" className="mt-8 rounded-2xl bg-white p-8">Impossible de charger cet événement pour le moment.</p>}
    {event && <article className="mt-8 rounded-[2rem] bg-white p-7 shadow-xl sm:p-10">
      <p className="flex items-center gap-2 text-sm font-bold text-jso-blue"><CalendarDays size={18} />{formatDate(pick(event, 'startAt', 'StartAt'), { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <h1 className="mt-4 text-3xl font-black text-jso-navy sm:text-5xl">{pick(event, 'title', 'Title')}</h1>
      <p className="mt-5 font-bold text-slate-600">{formatTime(pick(event, 'startAt', 'StartAt'))}{pick(event, 'endAt', 'EndAt') ? ` → ${formatTime(pick(event, 'endAt', 'EndAt'))}` : ''}</p>
      {pick(event, 'location', 'Location') && <p className="mt-3 flex items-center gap-2 text-slate-600"><MapPin size={17} />{pick(event, 'location', 'Location')}</p>}
      <p className="mt-8 whitespace-pre-line leading-8 text-slate-700">{pick(event, 'description', 'Description')}</p>
      <button type="button" onClick={copyLink} className="mt-8 inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-bold"><Copy size={16} />{copied ? 'Lien copié' : 'Copier le lien'}</button>
    </article>}
  </section>
}
