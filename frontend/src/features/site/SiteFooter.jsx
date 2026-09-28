import { useState } from 'react'
import { ArrowUp, ArrowUpRight, Shield } from 'lucide-react'
import { newsletterApi } from '../../lib/api'
import { CLUB_FULL_NAME, CREST_SRC } from './brand'

function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (status === 'loading') return
    setStatus('loading')
    try {
      const result = await newsletterApi.subscribe(email.trim())
      setMessage(result?.message || 'Vérifiez votre boîte mail pour confirmer votre inscription.')
      setEmail('')
      setStatus('done')
    } catch {
      setMessage('Inscription impossible pour le moment. Réessayez plus tard.')
      setStatus('error')
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md">
      <label htmlFor="footer-newsletter" className="text-sm font-black">Newsletter du club</label>
      <p className="mt-1 text-xs leading-5 text-white/50">Résultats, matchs et actualités. Désinscription à tout moment.</p>
      {status === 'done' ? (
        <p role="status" className="mt-3 rounded-xl bg-white/10 px-4 py-3 text-sm text-white/80">{message}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input id="footer-newsletter" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="votre@email.com" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white px-4 py-3 text-sm text-jso-ink outline-none focus:border-jso-blue" />
          <button type="submit" disabled={status === 'loading'} className="rounded-xl bg-jso-gold px-5 py-3 text-sm font-extrabold text-jso-navy transition hover:bg-white disabled:opacity-60">{status === 'loading' ? 'Envoi…' : 'S’inscrire'}</button>
        </div>
      )}
      {status === 'error' && <p role="alert" className="mt-2 text-xs text-red-300">{message}</p>}
    </form>
  )
}

export default function SiteFooter({ sections, extraLinks = [] }) {
  return (
    <footer className="bg-jso-navy px-5 py-12 text-white lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 border-b border-white/10 pb-10 lg:grid-cols-[1fr_0.8fr_1.2fr]">
          <div>
            <a href="#home" className="inline-flex items-center gap-3 rounded-xl">
              <img src={CREST_SRC} alt="" className="h-14 w-14 object-contain" />
              <span><strong className="block text-xl font-black">JSO Oudhref</strong><span className="text-sm text-white/55">Plus qu’un club. Une identité.</span></span>
            </a>
            <p className="mt-5 max-w-xs text-sm leading-6 text-white/55">Le site officiel de la {CLUB_FULL_NAME}.</p>
          </div>

          <nav aria-label="Navigation de pied de page">
            <p className="text-xs font-extrabold tracking-[0.2em] text-jso-gold">EXPLORER</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
              {sections.map((section) => <li key={section.id}><a href={`#${section.id}`} className="text-sm font-semibold text-white/65 transition hover:text-white">{section.label}</a></li>)}
              {extraLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.url}
                    target={link.opensInNewTab ? '_blank' : undefined}
                    rel={link.opensInNewTab ? 'noopener noreferrer' : undefined}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-white/65 transition hover:text-white"
                  >
                    {link.label}
                    {link.opensInNewTab && <ArrowUpRight size={13} aria-hidden="true" />}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <NewsletterSignup />
        </div>

        <div className="flex flex-col justify-between gap-4 pt-6 text-sm text-white/45 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} JSO. Tous droits réservés.</p>
          <div className="flex flex-wrap items-center gap-5">
            <a href="/admin" className="inline-flex items-center gap-2 transition hover:text-white"><Shield size={15} aria-hidden="true" />Administration</a>
            <a href="#home" className="inline-flex items-center gap-2 transition hover:text-white">Retour en haut <ArrowUp size={15} aria-hidden="true" /></a>
          </div>
        </div>
      </div>
    </footer>
  )
}
