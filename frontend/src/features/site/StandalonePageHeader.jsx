import { useState } from 'react'
import { ArrowLeft, Home, Menu, Newspaper, Ticket, UserRound, X } from 'lucide-react'
import { CREST_SRC } from './brand'

const links = [
  { href: '/#matches', label: 'Partite', icon: Home },
  { href: '/actualites', label: 'Attualità', icon: Newspaper },
  { href: '/billetterie', label: 'Biglietteria e pagamenti', icon: Ticket },
  { href: '/account', label: 'Il mio spazio', icon: UserRound },
]

export default function StandalonePageHeader({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-jso-navy/95 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-3 px-5 lg:px-8">
        <a href="/" onClick={closeMenu} aria-label="JSO Oudhref — accueil" className="flex shrink-0 items-center gap-3 rounded-xl">
          <img src={CREST_SRC} alt="" className="h-11 w-11 object-contain" />
          <span className="leading-none">
            <span className="block text-lg font-black tracking-tight">JSO</span>
            <span className="mt-1 block whitespace-nowrap text-[10px] font-bold tracking-[0.2em] text-white/55">OUDHREF · TUNISIE</span>
          </span>
        </a>

        <nav aria-label="Navigation principale" className="ml-5 hidden items-center gap-1 lg:flex">
          {links.map(({ href, label, icon: Icon }) => (
            <a key={href} href={href} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white">
              <Icon size={16} aria-hidden="true" />{label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {children}
          <a href="/" className="hidden items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-white/10 sm:inline-flex">
            <ArrowLeft size={16} aria-hidden="true" /> Accueil
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="jso-standalone-menu"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10 lg:hidden"
          >
            {menuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="jso-standalone-menu" className="absolute inset-x-0 top-full max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-white/10 bg-jso-navy shadow-2xl lg:hidden">
          <nav aria-label="Navigation principale mobile" className="mx-auto max-w-3xl px-5 py-3">
            {links.map(({ href, label, icon: Icon }) => (
              <a key={href} href={href} onClick={closeMenu} className="flex items-center gap-3 border-b border-white/10 py-4 text-base font-extrabold text-white transition hover:text-jso-gold">
                <Icon size={19} aria-hidden="true" className="text-jso-gold" />{label}
              </a>
            ))}
            <a href="/" onClick={closeMenu} className="flex items-center gap-3 py-4 text-base font-extrabold text-white">
              <ArrowLeft size={19} aria-hidden="true" className="text-jso-gold" /> Torna alla home
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
