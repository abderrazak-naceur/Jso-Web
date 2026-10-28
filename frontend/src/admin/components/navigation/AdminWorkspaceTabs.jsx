import { useEffect, useRef } from 'react'
import { adminSectionUrl } from '../../adminRoutes'

export default function AdminWorkspaceTabs({ workspace, currentSection, pendingBySection, onNavigate }) {
  const activeRef = useRef(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [currentSection])

  if (!workspace || workspace.items.length <= 1) return null

  return (
    <nav aria-label={`Rubriques · ${workspace.label}`} className="admin-workspace-tabs sticky top-[76px] z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="jso-scroll mx-auto flex max-w-[96rem] gap-1 overflow-x-auto px-4 py-2 lg:px-8">
        {workspace.items.map(([id, label, Icon]) => {
          const active = id === currentSection
          const count = Number(pendingBySection[id] || 0)
          return (
            <a
              key={id}
              ref={active ? activeRef : undefined}
              href={adminSectionUrl(id)}
              onClick={(event) => onNavigate(event, id)}
              aria-current={active ? 'page' : undefined}
              className={'flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition '
                + (active ? 'bg-jso-navy text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-jso-navy')}
            >
              <Icon size={15} aria-hidden="true" />
              {label}
              {count > 0 && <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white">{count > 99 ? '99+' : count}</span>}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
