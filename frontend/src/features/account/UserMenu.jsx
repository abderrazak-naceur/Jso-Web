import { useState, useEffect, useRef } from 'react'
import { UserCircle, User, Settings, LogOut } from 'lucide-react'

export default function UserMenu({ user, onOpenProfile, onOpenSettings, onLogout }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function handleProfile() {
    setOpen(false)
    onOpenProfile()
  }

  function handleSettings() {
    setOpen(false)
    onOpenSettings()
  }

  function handleLogout() {
    setOpen(false)
    onLogout()
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Mon compte (${user.displayName})`}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 items-center gap-2 rounded-full bg-white/10 px-3 text-sm font-bold text-white transition hover:bg-white/20 xl:px-4"
      >
        <UserCircle className="h-5 w-5" aria-hidden="true" />
        {/* Icon only on narrow desktops so the header never wraps; long names are truncated. */}
        <span className="hidden max-w-[8rem] truncate xl:inline">{user.displayName}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 text-jso-ink shadow-2xl z-[90]"
        >
          <div className="border-b border-slate-200 px-3 py-2.5">
            <p className="text-sm font-bold">{user.displayName}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={handleProfile}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-slate-100 transition"
          >
            <User className="h-4 w-4" />
            Mon profil
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={handleSettings}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-slate-100 transition"
          >
            <Settings className="h-4 w-4" />
            Paramètres
          </button>

          <div className="my-1 border-t border-slate-200" />

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}
