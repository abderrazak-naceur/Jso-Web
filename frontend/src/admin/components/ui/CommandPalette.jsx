import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, CornerDownLeft, Search, Zap } from 'lucide-react'
import { adminSectionUrl } from '../../adminRoutes'
import { adminWorkspaceLabelForSection } from '../../navigation'

// Quick-create / navigation shortcuts offered on top of the section search.
const ACTIONS = [
  { label: 'Ouvrir les actualités', hint: 'Gérer et rédiger les articles', section: 'news' },
  { label: 'Ouvrir le calendrier', hint: 'Gérer les rencontres', section: 'matches' },
  { label: 'Designer un billet', hint: 'Composer le visuel d’un match', section: 'ticket-designer' },
  { label: 'Ouvrir la billetterie', hint: 'Billets et réservations par match', section: 'tickets' },
  { label: 'Ouvrir les annonces', hint: 'Gérer les petites annonces', section: 'classifieds' },
  { label: 'Ouvrir la boutique', hint: 'Gérer les produits', section: 'shop' },
  { label: 'Ouvrir les collectes', hint: 'Gérer les projets de dons', section: 'fundraising-projects' },
  { label: 'Voir le site public', hint: 'Ouvrir jsoudhref.com', href: '/' },
]

// Ctrl+K command palette: fuzzy search across admin sections AND quick actions.
// Keyboard-driven: ↑/↓ to move, Enter to open, Escape to close.
export default function CommandPalette({ open, onClose, items, onNavigate }) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    setQuery('')
    setIndex(0)
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('fr')
    const visibleIds = new Set(items.map(([id]) => id))
    const sections = items
      .filter(([id, label]) => !q || `${label} ${adminWorkspaceLabelForSection(id)} ${id}`.toLocaleLowerCase('fr').includes(q))
      .map(([id, label, Icon]) => ({ kind: 'section', id, label, hint: adminWorkspaceLabelForSection(id), Icon }))
    const actions = ACTIONS
      .filter((action) => !action.section || visibleIds.has(action.section))
      .filter((action) => !q || `${action.label} ${action.hint}`.toLocaleLowerCase('fr').includes(q))
      .map((action) => ({ kind: 'action', ...action, Icon: Zap }))
    return [...actions, ...sections].slice(0, 12)
  }, [items, query])

  useEffect(() => { setIndex(0) }, [results.length])

  useEffect(() => {
    if (!open) return undefined
    function onKeyDown(event) {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
      else if (event.key === 'ArrowDown') { event.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)) }
      else if (event.key === 'ArrowUp') { event.preventDefault(); setIndex((i) => Math.max(i - 1, 0)) }
      else if (event.key === 'Enter') {
        event.preventDefault()
        const target = results[index]
        if (target) choose(target)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  function choose(target) {
    onClose()
    if (target.href) { window.location.href = target.href; return }
    const url = adminSectionUrl(target.section ?? target.id)
    if (window.location.pathname !== url || window.location.search) window.history.pushState({}, '', url)
    onNavigate(target.section ?? target.id)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[280] flex items-start justify-center bg-slate-950/50 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-label="Palette de commandes" className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
          <Search size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Chercher une rubrique ou une action…"
            aria-label="Chercher une rubrique ou une action"
            className="w-full bg-transparent py-4 text-sm outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 sm:block">ESC</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {results.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">Aucun résultat pour « {query} ».</p>}
          {results.map((item, i) => (
            <button
              key={`${item.kind}-${item.section ?? item.id ?? item.href}`}
              type="button"
              role="option"
              aria-selected={i === index}
              onMouseEnter={() => setIndex(i)}
              onClick={() => choose(item)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${i === index ? 'bg-jso-navy text-white' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${i === index ? 'bg-white/15' : 'bg-slate-100 text-jso-blue'}`}>
                <item.Icon size={16} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{item.label}</span>
                <span className={`block truncate text-xs ${i === index ? 'text-white/60' : 'text-slate-400'}`}>{item.kind === 'action' ? 'Action rapide · ' : ''}{item.hint}</span>
              </span>
              {i === index && <CornerDownLeft size={15} className="shrink-0 text-white/60" aria-hidden="true" />}
              {i !== index && <ArrowUpRight size={15} className="shrink-0 text-slate-300" aria-hidden="true" />}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t border-slate-100 px-4 py-2.5 text-[11px] font-semibold text-slate-400">
          <span><kbd className="rounded border border-slate-200 bg-slate-50 px-1">↑↓</kbd> naviguer</span>
          <span><kbd className="rounded border border-slate-200 bg-slate-50 px-1">Enter</kbd> ouvrir</span>
          <span><kbd className="rounded border border-slate-200 bg-slate-50 px-1">Esc</kbd> fermer</span>
          <span className="ml-auto">Ctrl+K</span>
        </div>
      </section>
    </div>
  )
}
