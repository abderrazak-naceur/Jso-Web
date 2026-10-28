import { Copy, ExternalLink, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun, X } from 'lucide-react'
import { adminSectionUrl } from '../../adminRoutes'

function initials(value) {
  return String(value || 'Admin')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export default function AdminSidebar({
  open,
  collapsed,
  dark,
  role,
  displayName,
  currentSection,
  activeWorkspaceId,
  workspaces,
  pendingBySection,
  copied,
  publicPath,
  onClose,
  onNavigate,
  onOpenPalette,
  onToggleCollapsed,
  onToggleTheme,
  onCopyCurrentLink,
  onLogout,
}) {
  const homeTarget = workspaces.find((workspace) => workspace.id === 'home')?.items[0]?.[0]
    || workspaces[0]?.items[0]?.[0]
    || 'dashboard'
  const workspaceBadge = (workspace) => workspace.items.reduce(
    (total, [section]) => total + Number(pendingBySection[section] || 0),
    0,
  )

  return (
    <aside
      id="admin-sidebar"
      className={'admin-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-all duration-200 '
        + (open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')
        + (collapsed ? ' lg:w-20' : '')}
    >
      <div className={'flex h-[76px] items-center justify-between border-b border-slate-100 px-4 ' + (collapsed ? 'lg:justify-center lg:px-2' : 'lg:px-5')}>
        <a href={adminSectionUrl(homeTarget)} onClick={(event) => onNavigate(event, homeTarget)} className="flex min-w-0 items-center gap-3 rounded-xl" title="JSO Admin">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-jso-gold text-sm font-black text-jso-navy">JSO</span>
          <span className={'min-w-0 ' + (collapsed ? 'lg:hidden' : '')}>
            <strong className="block truncate text-sm font-black text-slate-900">JSO Admin</strong>
            <span className="block truncate text-xs font-semibold text-slate-400">{role}</span>
          </span>
        </a>
        <button type="button" onClick={onClose} aria-label="Fermer le menu" className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 lg:hidden">
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className={'border-b border-slate-100 p-3 ' + (collapsed ? 'lg:px-2' : '')}>
        <button
          type="button"
          onClick={onOpenPalette}
          title="Rechercher une rubrique ou une action"
          className={'flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm font-semibold text-slate-500 transition hover:border-jso-blue '
            + (collapsed ? 'lg:justify-center lg:px-2' : '')}
        >
          <Search size={17} className="shrink-0" aria-hidden="true" />
          <span className={'min-w-0 flex-1 truncate ' + (collapsed ? 'lg:hidden' : '')}>Rechercher…</span>
          <kbd className={'rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-black text-slate-400 ' + (collapsed ? 'lg:hidden' : '')}>Ctrl K</kbd>
        </button>
      </div>

      <nav aria-label="Espaces d’administration" className="jso-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
        <p className={'mb-2 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 ' + (collapsed ? 'lg:sr-only' : '')}>Espaces</p>
        <div className="space-y-1.5">
          {workspaces.map((workspace) => {
            const [firstSection] = workspace.items[0]
            const target = workspace.id === activeWorkspaceId && workspace.items.some(([id]) => id === currentSection)
              ? currentSection : firstSection
            const active = workspace.id === activeWorkspaceId
            const count = workspaceBadge(workspace)
            const Icon = workspace.Icon
            return (
              <a
                key={workspace.id}
                href={adminSectionUrl(target)}
                onClick={(event) => onNavigate(event, target)}
                title={workspace.label}
                aria-current={active ? 'page' : undefined}
                className={'group relative flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition '
                  + (active ? 'bg-jso-navy text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-jso-navy')
                  + (collapsed ? ' lg:justify-center lg:px-2' : '')}
              >
                <span className={'grid h-8 w-8 shrink-0 place-items-center rounded-lg '
                  + (active ? 'bg-white/10 text-jso-gold' : 'bg-slate-100 text-slate-500 group-hover:text-jso-blue')}>
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className={'min-w-0 flex-1 truncate ' + (collapsed ? 'lg:hidden' : '')}>{workspace.label}</span>
                {count > 0 && <span className={'rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-black text-white ' + (collapsed ? 'lg:absolute lg:ml-7 lg:-mt-7 lg:min-w-5 lg:px-1 lg:text-center' : '')}>{count > 99 ? '99+' : count}</span>}
              </a>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-slate-100 p-3">
        <div className={'mb-2 flex items-center gap-3 rounded-xl bg-slate-50 p-3 ' + (collapsed ? 'lg:justify-center lg:p-2' : '')}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-jso-blue text-xs font-black text-white">{initials(displayName)}</span>
          <span className={'min-w-0 flex-1 ' + (collapsed ? 'lg:hidden' : '')}>
            <strong className="block truncate text-xs font-black text-slate-800">{displayName}</strong>
            <span className="block truncate text-[11px] font-semibold text-slate-400">{role}</span>
          </span>
        </div>

        <div className={'grid grid-cols-2 gap-2 ' + (collapsed ? 'lg:grid-cols-1' : '')}>
          <button type="button" onClick={onToggleTheme} title={dark ? 'Mode clair' : 'Mode sombre'} aria-label={dark ? 'Mode clair' : 'Mode sombre'} className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:border-jso-blue">
            {dark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
            <span className={collapsed ? 'lg:hidden' : ''}>{dark ? 'Clair' : 'Sombre'}</span>
          </button>
          <button type="button" onClick={onToggleCollapsed} title={collapsed ? 'Développer le menu' : 'Réduire le menu'} aria-label={collapsed ? 'Développer le menu' : 'Réduire le menu'} className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:border-jso-blue">
            {collapsed ? <PanelLeftOpen size={16} aria-hidden="true" /> : <PanelLeftClose size={16} aria-hidden="true" />}
            <span className={collapsed ? 'lg:hidden' : ''}>{collapsed ? 'Ouvrir' : 'Réduire'}</span>
          </button>
        </div>

        <div className="mt-2 grid gap-1">
          <button type="button" onClick={onCopyCurrentLink} title="Copier le lien" className={'flex min-h-10 items-center gap-3 rounded-xl px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 ' + (collapsed ? 'lg:justify-center lg:px-2' : '')}>
            <Copy size={16} aria-hidden="true" /><span className={collapsed ? 'lg:hidden' : ''}>{copied ? 'Lien copié' : 'Copier le lien'}</span>
          </button>
          <a href={publicPath} title="Voir sur le site" className={'flex min-h-10 items-center gap-3 rounded-xl px-3 text-xs font-bold text-jso-blue hover:bg-slate-100 ' + (collapsed ? 'lg:justify-center lg:px-2' : '')}>
            <ExternalLink size={16} aria-hidden="true" /><span className={collapsed ? 'lg:hidden' : ''}>Voir sur le site</span>
          </a>
          <button type="button" onClick={onLogout} title="Déconnexion" className={'flex min-h-10 items-center gap-3 rounded-xl px-3 text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-red-700 ' + (collapsed ? 'lg:justify-center lg:px-2' : '')}>
            <LogOut size={16} aria-hidden="true" /><span className={collapsed ? 'lg:hidden' : ''}>Déconnexion</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
