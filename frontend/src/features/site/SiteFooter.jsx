import { useState } from 'react'
import { ArrowUp, ArrowUpRight, Check, Copy, Facebook, Instagram, Music2, Shield } from 'lucide-react'
import { newsletterApi } from '../../lib/api'
import { CLUB_FULL_NAME, CLUB_SOCIALS, CREST_SRC } from './brand'
import { useI18n } from '../../i18n/index.jsx'

const SOCIAL_ICONS = { facebook: Facebook, instagram: Instagram, tiktok: Music2 }

// Follow-us block: links to the club's official profiles, each with a "copy
// link" button. Instagram and TikTok have no web share intent that prefills a
// post, so copying the profile URL (to paste in a bio/story) is the useful,
// honest behaviour rather than a share button that would not work.
function FollowUs() {
  const { t } = useI18n()
  const [copied, setCopied] = useState(null)

  async function copy(social) {
    try {
      await navigator.clipboard.writeText(social.url)
      setCopied(social.key)
      setTimeout(() => setCopied((current) => (current === social.key ? null : current)), 2000)
    } catch { /* the user can still open the profile and copy from the address bar */ }
  }

  return (
    <div>
      <p className="text-xs font-extrabold tracking-[0.2em] text-jso-gold">{t('common.footerFollow')}</p>
      <ul className="mt-4 space-y-2">
        {CLUB_SOCIALS.map((social) => {
          const Icon = SOCIAL_ICONS[social.key] ?? ArrowUpRight
          return (
            <li key={social.key} className="flex items-center gap-2">
              <a
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${social.label} — ${t('common.externalLink')}`}
                className="inline-flex flex-1 items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold text-white/75 transition hover:border-white/40 hover:text-white"
              >
                <Icon size={16} aria-hidden="true" />
                {social.label}
              </a>
              <button
                type="button"
                onClick={() => copy(social)}
                aria-label={`${t('common.copyLink')} ${social.label}`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/15 text-white/75 transition hover:border-white/40 hover:text-white"
              >
                {copied === social.key ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function NewsletterSignup() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (status === 'loading') return
    setStatus('loading')
    try {
      const result = await newsletterApi.subscribe(email.trim())
      setMessage(result?.message || t('common.newsletterSuccess'))
      setEmail('')
      setStatus('done')
    } catch {
      setMessage(t('common.newsletterError'))
      setStatus('error')
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md">
      <label htmlFor="footer-newsletter" className="text-sm font-black">{t('common.newsletter')}</label>
      <p className="mt-1 text-xs leading-5 text-white/50">{t('common.newsletterDescription')}</p>
      {status === 'done' ? (
        <p role="status" className="mt-3 rounded-xl bg-white/10 px-4 py-3 text-sm text-white/80">{message}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input id="footer-newsletter" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t('common.emailPlaceholder')} className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white px-4 py-3 text-sm text-jso-ink outline-none focus:border-jso-blue" />
          <button type="submit" disabled={status === 'loading'} className="rounded-xl bg-jso-gold px-5 py-3 text-sm font-extrabold text-jso-navy transition hover:bg-white disabled:opacity-60">{status === 'loading' ? t('common.newsletterSending') : t('common.newsletterSubmit')}</button>
        </div>
      )}
      {status === 'error' && <p role="alert" className="mt-2 text-xs text-red-300">{message}</p>}
    </form>
  )
}

// `homeHref` prefixes the in-page anchors. On the home page it stays '' so
// links are plain #anchors; on a standalone page (e.g. /actualites) pass '/'
// so an anchor first navigates back to the home page, then scrolls.
export default function SiteFooter({ sections, extraLinks = [], homeHref = '' }) {
  const { t } = useI18n()

  return (
    <footer className="bg-jso-navy px-5 py-12 text-white lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 border-b border-white/10 pb-10 lg:grid-cols-[1fr_0.8fr_1.2fr]">
          <div>
            <a href={`${homeHref}#home`} className="inline-flex items-center gap-3 rounded-xl">
              <img src={CREST_SRC} alt="" className="h-14 w-14 object-contain" />
              <span><strong className="block text-xl font-black">JSO Oudhref</strong><span className="text-sm text-white/55">{t('common.clubTagline')}</span></span>
            </a>
            <p className="mt-5 max-w-xs text-sm leading-6 text-white/55">{t('common.officialSite')}</p>
            <div className="mt-6"><FollowUs /></div>
          </div>

          <nav aria-label={t('common.footerNavigation')}>
            <p className="text-xs font-extrabold tracking-[0.2em] text-jso-gold">{t('common.footerExplore')}</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
              {sections.map((section) => <li key={section.id}><a href={`${homeHref}#${section.id}`} className="text-sm font-semibold text-white/65 transition hover:text-white">{section.label}</a></li>)}
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
          <p>© {new Date().getFullYear()} JSO. {t('common.allRightsReserved')}</p>
          <div className="flex flex-wrap items-center gap-5">
            <a href="/admin" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 font-semibold transition hover:border-white/40 hover:text-white"><Shield size={15} aria-hidden="true" />{t('common.admin')}</a>
            <a href={`${homeHref}#home`} className="inline-flex items-center gap-2 transition hover:text-white">{t('common.backToTop')} <ArrowUp size={15} aria-hidden="true" /></a>
          </div>
        </div>
      </div>
    </footer>
  )
}
