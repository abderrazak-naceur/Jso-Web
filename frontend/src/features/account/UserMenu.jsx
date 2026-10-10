import { useState, useEffect, useRef } from 'react'
import { User, Settings, LogOut, LayoutDashboard, Crown } from 'lucide-react'
import { getProfilePhoto, subscribeProfilePhoto } from './profilePhoto'

function initials(name) {
  return (name || 'JS').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
}

function VipAvatar({ photo, name, size = 'h-9 w-9' }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [photo])
  return (
    <span className={`relative grid ${size} shrink-0 place-items-center rounded-full border-2 border-amber-300 bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 p-[2px] shadow-md shadow-amber-500/20`}>
      <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-jso-navy text-xs font-black text-white">
        {photo && !failed ? <img src={photo} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover" /> : initials(name)}
      </span>
      <Crown size={11} className="absolute -bottom-1 -right-1 rounded-full bg-amber-300 p-[1px] text-jso-navy" aria-hidden="true" />
    </span>
  )
}

export default function UserMenu({ user, onOpenProfile, onOpenSettings, onLogout }) {
  const [open, setOpen] = useState(false)
  const [photo, setPhoto] = useState(getProfilePhoto)
  const wrapperRef = useRef(null)

  useEffect(() => subscribeProfilePhoto(setPhoto), [])
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false)
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

  function handleProfile() { setOpen(false); onOpenProfile() }
  function handleSettings() { setOpen(false); onOpenSettings() }
  function handleLogout() { setOpen(false); onLogout() }

  return (
    <div ref={wrapperRef} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={`Mon compte (${user.displayName})`} onClick={() => setOpen((value) => !value)} className="flex h-11 items-center gap-2 rounded-full bg-white/10 px-3 text-sm font-bold text-white transition hover:bg-white/20 xl:px-4">
        <VipAvatar photo={photo} name={user.displayName} />
        <span className="hidden max-w-[8rem] truncate xl:inline">{user.displayName}</span>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-[90] mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 text-jso-ink shadow-2xl">
          <div className="border-b border-slate-200 px-3 py-3">
            <div className="flex items-center gap-3">
              <VipAvatar photo={photo} name={user.displayName} size="h-12 w-12" />
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{user.displayName}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800"><Crown size={11} /> Profil VIP</span>
              </div>
            </div>
          </div>
          <a href="/account" role="menuitem" onClick={() => setOpen(false)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-extrabold text-jso-blue transition hover:bg-blue-50"><LayoutDashboard className="h-4 w-4" />Mon espace</a>
          <button type="button" role="menuitem" onClick={handleProfile} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition hover:bg-slate-100"><User className="h-4 w-4" />Mon profil</button>
          <button type="button" role="menuitem" onClick={handleSettings} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition hover:bg-slate-100"><Settings className="h-4 w-4" />Paramètres</button>
          <div className="my-1 border-t border-slate-200" />
          <button type="button" role="menuitem" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50"><LogOut className="h-4 w-4" />Se déconnecter</button>
        </div>
      )}
    </div>
  )
}
