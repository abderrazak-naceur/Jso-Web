import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronDown, LogIn, LogOut, Menu, Newspaper, Settings, ShoppingBag, Ticket, User, UserPlus, X } from 'lucide-react'
import UserMenu from '../account/UserMenu'
import { NEWS_LIST_PATH } from '../news/articleUrl'
import { BILLETTERIE_PATH } from '../tickets/ticketsUrl'
import { CREST_SRC } from './brand'
import { useI18n } from '../../i18n/index.jsx'

const desktopLinkClass = (active) =>
  `rounded-full px-3 py-2 text-sm font-bold transition ${active ? 'bg-white/10 text-jso-gold' : 'text-white/75 hover:bg-white/10 hover:text-white'}`

const panelButtonClass = 'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-white/85 transition hover:bg-white/10'

// Public site header. Primary sections are always visible on desktop, the others
// are grouped under "Plus"; below 1024px everything (account included) lives in
// the mobile panel. `sections` comes from visibleSections(), so every link
// points to a section that is actually rendered.
export default function SiteHeader({
  sections,
  extraLinks = [],
  activeId,
  cartCount,
  onOpenCart,
  user,
  onLogin,
  onRegister,
  onOpenProfile,
  onOpenSettings,
  onLogout,
}) {
  const { t, language, setLanguage, languages } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)
  const moreButtonRef = useRef(null)
  const menuButtonRef = useRef(null)

  const primary = sections.filter((section) => section.primary)
  const secondary = sections.filter((section) => !section.primary)
  const moreActive = secondary.some((section) => section.id === activeId)

  // Escape closes whichever menu is open (and gives focus back to its button);
  // a click outside closes the "Plus" dropdown.
  useEffect(() => {
    if (!menuOpen && !moreOpen) return undefined
    function onKeyDown(event) {
      if (event.key !== 'Escape') return
      if (moreOpen) moreButtonRef.current?.focus()
      if (menuOpen) menuButtonRef.current?.focus()
      setMoreOpen(false)
      setMenuOpen(false)
    }
    function onPointerDown(event) {
      if (moreRef.current && !moreRef.current.contains(event.target)) setMoreOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [menuOpen, moreOpen])

  // The mobile panel only exists below the lg breakpoint: close it if the window grows.
  useEffect(() => {
    if (!menuOpen) return undefined
    const query = window.matchMedia('(min-width: 64rem)')
    const onChange = (event) => {
      if (event.matches) setMenuOpen(false)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [menuOpen])

  const closeMenus = () => {
    setMenuOpen(false)
    setMoreOpen(false)
  }
  const closeThen = (action) => () => {
    closeMenus()
    action?.()
  }
  const current = (id) => (activeId === id ? 'true' : undefined)
  const currentLanguage = languages.find((item) => item.code === language)

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-jso-navy/95 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-3 px-5 lg:px-8">
        <a href="#home" onClick={closeMenus} aria-label="JSO Oudhref — accueil" className="flex shrink-0 items-center gap-3 rounded-xl">
          <img src={CREST_SRC} alt="" className="h-11 w-11 object-contain" />
          <span className="leading-none">
            <span className="block text-lg font-black tracking-tight">JSO</span>
            <span className="mt-1 block whitespace-nowrap text-[10px] font-bold tracking-[0.2em] text-white/55">OUDHREF · TUNISIE</span>
          </span>
        </a>

        <nav aria-label={t('common.home')} className="ml-4 hidden items-center gap-1 lg:flex xl:ml-8">
          {primary.map((section) => (
            <a key={section.id} href={`#${section.id}`} onClick={closeMenus} aria-current={current(section.id)} className={desktopLinkClass(activeId === section.id)}>
              {section.label}
            </a>
          ))}

          {(secondary.length > 0 || extraLinks.length > 0) && (
            <div ref={moreRef} className="relative">
              <button
                ref={moreButtonRef}
                type="button"
                aria-expanded={moreOpen}
                aria-controls="jso-more-menu"
                onClick={() => setMoreOpen((open) => !open)}
                className={`inline-flex items-center gap-1 ${desktopLinkClass(moreActive || moreOpen)}`}
              >
                {t('common.more')}\n                <ChevronDown size={15} aria-hidden="true" className={`transition ${moreOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreOpen && (
                <div id="jso-more-menu" className="absolute left-0 top-full mt-3 w-64 rounded-2xl border border-slate-200 bg-white p-2 text-jso-ink shadow-2xl">
                  <ul>
                    <li>
                      <a
                        href={BILLETTERIE_PATH}
                        onClick={closeMenus}
                        className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold text-jso-ink transition hover:bg-slate-100"
                      >
                        {t('common.ticketing')}\n                        <Ticket size={15} aria-hidden="true" className="text-slate-300" />
                      </a>
                    </li>
                    <li>
                      <a
                        href={NEWS_LIST_PATH}
                        onClick={closeMenus}
                        className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold text-jso-ink transition hover:bg-slate-100"
                      >
                        {t('common.news')}\n                        <Newspaper size={15} aria-hidden="true" className="text-slate-300" />
                      </a>
                    </li>
                    {secondary.map((section) => (
                      <li key={section.id}>
                        <a
                          href={`#${section.id}`}
                          onClick={closeMenus}
                          aria-current={current(section.id)}
                          className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold transition hover:bg-slate-100 ${activeId === section.id ? 'text-jso-blue' : 'text-jso-ink'}`}
                        >
                          {section.label}
                          <span className="text-xs font-extrabold text-slate-300" aria-hidden="true">{section.number}</span>
                        </a>
                      </li>
                    ))}
                    {extraLinks.map((link) => (
                      <li key={link.id}>
                        <a
                          href={link.url}
                          onClick={closeMenus}
                          target={link.opensInNewTab ? '_blank' : undefined}
                          rel={link.opensInNewTab ? 'noopener noreferrer' : undefined}
                          className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold text-jso-ink transition hover:bg-slate-100"
                        >
                          {link.label}
                          {link.opensInNewTab && <ArrowUpRight size={14} aria-hidden="true" className="text-slate-300" />}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              closeMenus()
              onOpenCart()
            }}
            aria-label={cartCount > 0 ? `${t('common.cart')} (${cartCount})` : t('common.cart')}
            className="relative grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10"
          >
            <ShoppingBag size={18} aria-hidden="true" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-jso-gold px-1 text-[11px] font-black text-jso-navy" aria-hidden="true">
                {cartCount}
              </span>
            )}
          </button>

          <div className="hidden lg:block">
            {user ? (
              <UserMenu user={user} onOpenProfile={onOpenProfile} onOpenSettings={onOpenSettings} onLogout={onLogout} />
            ) : (
              <button
                type="button"
                onClick={onLogin}
                title={t('common.login')}
                className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-white/20 px-3 text-sm font-extrabold text-white transition hover:bg-white/10 xl:px-4"
              >
                <LogIn size={17} aria-hidden="true" />
                <span className="sr-only xl:not-sr-only">{t('common.login')}</span>
              </button>
            )}
          </div>

          <a
            href="#matches"
            onClick={closeMenus}
            className="hidden h-11 items-center gap-2 rounded-full bg-jso-gold px-5 text-sm font-extrabold text-jso-navy transition hover:-translate-y-0.5 hover:bg-white xl:inline-flex"
          >
            {t('common.matchCenter')} <ArrowUpRight size={16} aria-hidden="true" />
          </a>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => {
              setMoreOpen(false)
              setMenuOpen((open) => !open)
            }}
            aria-expanded={menuOpen}
            aria-controls="jso-mobile-menu"
            aria-label={menuOpen ? t('common.closeMenu') : t('common.openMenu')}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10 lg:hidden"
          >
            {menuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="jso-mobile-menu" className="absolute inset-x-0 top-full h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain border-t border-white/10 bg-jso-navy lg:hidden">
          <div className="mx-auto max-w-3xl px-5 pb-12 pt-2">
            <nav aria-label={t('common.home')}>
              <ul className="divide-y divide-white/10">
                <li>
                  <a href="#home" onClick={closeMenus} aria-current={current('home')} className={`flex items-center justify-between py-4 text-xl font-black ${activeId === 'home' ? 'text-jso-gold' : 'text-white'}`}>
                    {t('common.home')}\n                  </a>
                </li>
                {primary.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      onClick={closeMenus}
                      aria-current={current(section.id)}
                      className={`flex items-center justify-between py-4 text-xl font-black ${activeId === section.id ? 'text-jso-gold' : 'text-white'}`}
                    >
                      {section.label}
                      <span className="text-xs font-extrabold text-white/45" aria-hidden="true">{section.number}</span>
                    </a>
                  </li>
                ))}
                <li>
                  <a
                    href={BILLETTERIE_PATH}
                    onClick={closeMenus}
                    className="flex items-center justify-between py-4 text-xl font-black text-white"
                  >
                    {t('common.ticketing')}\n                    <Ticket size={18} aria-hidden="true" className="text-white/45" />
                  </a>
                </li>
                <li>
                  <a
                    href={NEWS_LIST_PATH}
                    onClick={closeMenus}
                    className="flex items-center justify-between py-4 text-xl font-black text-white"
                  >
                    {t('common.news')}\n                    <Newspaper size={18} aria-hidden="true" className="text-white/45" />
                  </a>
                </li>
              </ul>

              {(secondary.length > 0 || extraLinks.length > 0) && (
                <>
                  <p className="mt-6 text-xs font-extrabold tracking-[0.2em] text-white/45">{t('common.more').toUpperCase()}</p>
                  <ul className="mt-3 grid grid-cols-2 gap-2">
                    {secondary.map((section) => (
                      <li key={section.id}>
                        <a
                          href={`#${section.id}`}
                          onClick={closeMenus}
                          aria-current={current(section.id)}
                          className={`block rounded-xl px-4 py-3 text-sm font-bold transition hover:bg-white/10 ${activeId === section.id ? 'bg-white/10 text-jso-gold' : 'bg-white/5 text-white/85'}`}
                        >
                          {section.label}
                        </a>
                      </li>
                    ))}
                    {extraLinks.map((link) => (
                      <li key={link.id}>
                        <a
                          href={link.url}
                          onClick={closeMenus}
                          target={link.opensInNewTab ? '_blank' : undefined}
                          rel={link.opensInNewTab ? 'noopener noreferrer' : undefined}
                          className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm font-bold text-white/85 transition hover:bg-white/10"
                        >
                          {link.label}
                          {link.opensInNewTab && <ArrowUpRight size={14} aria-hidden="true" />}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </nav>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-extrabold tracking-[0.2em] text-jso-gold">{t('common.supporterSpace')}</p>
              {user ? (
                <>
                  <p className="mt-2 truncate font-black">{user.displayName}</p>
                  {user.email && <p className="truncate text-sm text-white/55">{user.email}</p>}
                  <div className="mt-3 grid gap-1">
                    <button type="button" onClick={closeThen(onOpenProfile)} className={panelButtonClass}>
                      <User size={16} aria-hidden="true" /> {t('common.profile')}
                    </button>
                    <button type="button" onClick={closeThen(onOpenSettings)} className={panelButtonClass}>
                      <Settings size={16} aria-hidden="true" /> {t('common.settings')}
                    </button>
                    <button type="button" onClick={closeThen(onLogout)} className={`${panelButtonClass} text-red-300`}>
                      <LogOut size={16} aria-hidden="true" /> {t('common.logout')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm leading-6 text-white/65">{t('common.supporterDescription')}</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button type="button" onClick={closeThen(onLogin)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-jso-navy transition hover:bg-jso-gold">
                      <LogIn size={16} aria-hidden="true" /> {t('common.login')}
                    </button>
                    <button type="button" onClick={closeThen(onRegister)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-white/10">
                      <UserPlus size={16} aria-hidden="true" /> {t('common.register')}
                    </button>
                  </div>
                </>
              )}
            </div>

            <a href="#matches" onClick={closeMenus} className="mt-4 flex items-center justify-center gap-2 rounded-full bg-jso-gold px-6 py-4 font-extrabold text-jso-navy transition hover:bg-white">
              Match Center <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
