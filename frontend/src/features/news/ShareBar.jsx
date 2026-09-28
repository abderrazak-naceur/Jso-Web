import { useState } from 'react'
import { Facebook, Link2, Linkedin, Check, MessageCircle, Share2 } from 'lucide-react'

// Social share bar. Uses each network's official web-intent/sharer URL, so it
// needs no API keys, no app review and no personal data — the same approach
// used by most CMS/news sites. "Copier le lien" falls back to a manual copy
// when the async Clipboard API is unavailable (e.g. non-secure contexts).
//
// Props:
//   url   — absolute, shareable URL (required)
//   title — text used as the share caption where the network supports it
export default function ShareBar({ url, title = '' }) {
  const [copied, setCopied] = useState(false)
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const targets = [
    {
      key: 'facebook',
      label: 'Partager sur Facebook',
      Icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      key: 'x',
      label: 'Partager sur X',
      Icon: Share2,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      key: 'whatsapp',
      label: 'Partager sur WhatsApp',
      Icon: MessageCircle,
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      key: 'linkedin',
      label: 'Partager sur LinkedIn',
      Icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
  ]

  async function copyLink() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const field = document.createElement('textarea')
        field.value = url
        field.setAttribute('readonly', '')
        field.style.position = 'absolute'
        field.style.left = '-9999px'
        document.body.appendChild(field)
        field.select()
        document.execCommand('copy')
        document.body.removeChild(field)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore: the user can still copy from the address bar */ }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm font-bold text-slate-600">Partager :</span>
      {targets.map(({ key, label, Icon, href }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label} (nouvel onglet)`}
          className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-jso-navy transition hover:border-jso-blue hover:text-jso-blue"
        >
          <Icon size={18} aria-hidden="true" />
        </a>
      ))}
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-jso-navy transition hover:border-jso-blue hover:text-jso-blue"
      >
        {copied ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
        {copied ? 'Lien copié' : 'Copier le lien'}
      </button>
    </div>
  )
}
