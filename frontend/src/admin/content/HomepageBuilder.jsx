import { useEffect, useState } from 'react'
import { Save, Pencil, X, Plus, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react'
import { API_BASE_URL } from '../../lib/apiConfig'

async function api(path, options = {}) {
  const token = localStorage.getItem('jso_admin_token')
  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers,
    },
  })
  if (!response.ok) {
    let message = 'Request failed: ' + response.status
    try { message = (await response.json()).message || message } catch { /* ignore */ }
    throw new Error(message)
  }
  if (response.status === 204) return null
  return response.json()
}

const SECTION_TYPES = ['Hero', 'News', 'Matches', 'Media', 'Sponsors', 'CustomHtml', 'Text']
const POSITIONS = ['Header', 'Footer']

const emptySection = { type: 'Hero', title: '', payloadJson: '', displayOrder: 0, isPublished: false }
const emptyNav = { label: '', url: '', position: 'Header', displayOrder: 0, isActive: true, opensInNewTab: false }

// French admin module for the Homepage Builder + editable menu/footer.
// Sections and navigation items are managed with simple ordering (move up/down
// persisted via /reorder), publish/visibility toggles, and JSON payload editing.
// PayloadJson is stored/validated as opaque JSON: it is never rendered as raw
// HTML by the public site, which mitigates XSS for CustomHtml/Text sections.
export default function HomepageBuilderModule({ onError }) {
  const [sections, setSections] = useState([])
  const [navItems, setNavItems] = useState([])
  const [visibility, setVisibility] = useState([])
  const [sectionForm, setSectionForm] = useState(emptySection)
  const [navForm, setNavForm] = useState(emptyNav)
  const [editingSection, setEditingSection] = useState(null)
  const [editingNav, setEditingNav] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const [s, n, v] = await Promise.all([
        api('/admin/home-sections'),
        api('/admin/navigation'),
        api('/admin/home-visibility'),
      ])
      setSections(s)
      setNavItems(n)
      setVisibility(v)
      onError('')
    } catch (e) { onError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  // --- Section visibility toggles (on/off) ---
  // Optimistic flip, then persist the full hidden-id list. On failure we reload
  // to resync with the server.
  async function toggleVisibility(id) {
    const next = visibility.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    setVisibility(next)
    try {
      const hidden = next.filter((s) => !s.enabled).map((s) => s.id)
      await api('/admin/home-visibility', { method: 'PUT', body: JSON.stringify({ hidden }) })
      onError('')
    } catch (e) { onError(e.message); await load() }
  }

  // --- Home sections ---
  function resetSection() { setSectionForm(emptySection); setEditingSection(null) }
  function editSection(x) {
    setEditingSection(x.id)
    setSectionForm({ type: x.type || 'Hero', title: x.title || '', payloadJson: x.payloadJson || '', displayOrder: x.displayOrder ?? 0, isPublished: x.isPublished })
  }

  async function saveSection(e) {
    e.preventDefault()
    const payload = sectionForm.payloadJson.trim()
    if (payload) {
      try { JSON.parse(payload) } catch { onError('Le contenu JSON n\u2019est pas valide.'); return }
    }
    try {
      const body = {
        type: sectionForm.type,
        title: sectionForm.title.trim() || null,
        payloadJson: payload || null,
        displayOrder: Number(sectionForm.displayOrder) || 0,
        isPublished: sectionForm.isPublished,
      }
      if (editingSection) await api('/admin/home-sections/' + editingSection, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/home-sections', { method: 'POST', body: JSON.stringify(body) })
      resetSection()
      await load()
    } catch (e) { onError(e.message) }
  }

  async function removeSection(id) {
    if (!confirm('Supprimer cette section ?')) return
    try { await api('/admin/home-sections/' + id, { method: 'DELETE' }); await load() }
    catch (e) { onError(e.message) }
  }

  async function togglePublish(x) {
    try {
      await api('/admin/home-sections/' + x.id, {
        method: 'PUT',
        body: JSON.stringify({ type: x.type, title: x.title, payloadJson: x.payloadJson, displayOrder: x.displayOrder, isPublished: !x.isPublished }),
      })
      await load()
    } catch (e) { onError(e.message) }
  }

  async function moveSection(index, delta) {
    const next = [...sections]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    const tmp = next[index]; next[index] = next[target]; next[target] = tmp
    setSections(next)
    try { await api('/admin/home-sections/reorder', { method: 'POST', body: JSON.stringify({ ids: next.map(s => s.id) }) }) }
    catch (e) { onError(e.message); await load() }
  }

  // --- Navigation ---
  function resetNav() { setNavForm(emptyNav); setEditingNav(null) }
  function editNav(x) {
    setEditingNav(x.id)
    setNavForm({ label: x.label || '', url: x.url || '', position: x.position || 'Header', displayOrder: x.displayOrder ?? 0, isActive: x.isActive, opensInNewTab: x.opensInNewTab })
  }

  async function saveNav(e) {
    e.preventDefault()
    try {
      const body = {
        label: navForm.label.trim(),
        url: navForm.url.trim(),
        position: navForm.position,
        displayOrder: Number(navForm.displayOrder) || 0,
        isActive: navForm.isActive,
        opensInNewTab: navForm.opensInNewTab,
      }
      if (editingNav) await api('/admin/navigation/' + editingNav, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/navigation', { method: 'POST', body: JSON.stringify(body) })
      resetNav()
      await load()
    } catch (e) { onError(e.message) }
  }

  async function removeNav(id) {
    if (!confirm('Supprimer cette entr\u00e9e de menu ?')) return
    try { await api('/admin/navigation/' + id, { method: 'DELETE' }); await load() }
    catch (e) { onError(e.message) }
  }

  async function moveNav(list, index, delta) {
    const positionItems = navItems.filter(n => n.position === list)
    const target = index + delta
    if (target < 0 || target >= positionItems.length) return
    const reordered = [...positionItems]
    const tmp = reordered[index]; reordered[index] = reordered[target]; reordered[target] = tmp
    try {
      await api('/admin/navigation/reorder', { method: 'POST', body: JSON.stringify({ ids: reordered.map(n => n.id) }) })
      await load()
    } catch (e) { onError(e.message) }
  }

  const headerItems = navItems.filter(n => n.position === 'Header')
  const footerItems = navItems.filter(n => n.position === 'Footer')

  if (loading) return <p className="text-sm text-slate-400">Chargement\u2026</p>

  return <div className="space-y-6">
    {/* Section visibility on/off */}
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">Sections visibles</h2>
      <p className="mt-2 text-xs text-slate-400">Activez ou masquez chaque section de la page d\u2019accueil. Les sections masqu\u00e9es disparaissent aussi du menu.</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {visibility.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => toggleVisibility(s.id)}
            aria-pressed={s.enabled}
            className={`flex items-center justify-between rounded-xl border p-3 text-left transition ${s.enabled ? 'border-jso-blue/40 bg-jso-blue/5' : 'border-slate-200 bg-slate-50'}`}
          >
            <span className="flex items-center gap-2 font-bold text-jso-ink">
              {s.enabled ? <Eye size={16} className="text-jso-blue"/> : <EyeOff size={16} className="text-slate-400"/>}
              {s.label}
            </span>
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${s.enabled ? 'bg-jso-blue' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${s.enabled ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
          </button>
        ))}
      </div>
    </div>

    {/* Home sections */}
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between"><h2 className="text-xl font-black">Sections de la page d\u2019accueil</h2><button onClick={resetSection} className="rounded-xl bg-jso-navy p-2 text-white"><Plus size={18}/></button></div>
        <p className="mt-2 text-xs text-slate-400">Le contenu JSON est stock\u00e9 tel quel et n\u2019est jamais affich\u00e9 en HTML brut (protection anti-XSS).</p>
        <div className="mt-5 space-y-2">
          {sections.length === 0 ? <p className="text-sm text-slate-400">Aucune section pour le moment.</p>
            : sections.map((x, i) => <div key={x.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <div className="min-w-0">
                <b>{x.title || x.type}</b>
                <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">{x.type}</span>
                {!x.isPublished && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">Masqu\u00e9</span>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button title="Monter" disabled={i === 0} onClick={() => moveSection(i, -1)} className="p-1 text-slate-500 disabled:opacity-30"><ArrowUp size={16}/></button>
                <button title="Descendre" disabled={i === sections.length - 1} onClick={() => moveSection(i, 1)} className="p-1 text-slate-500 disabled:opacity-30"><ArrowDown size={16}/></button>
                <button title={x.isPublished ? 'Masquer' : 'Publier'} onClick={() => togglePublish(x)} className="p-1 text-jso-blue">{x.isPublished ? <Eye size={16}/> : <EyeOff size={16}/>}</button>
                <button onClick={() => editSection(x)} className="p-1 text-jso-blue"><Pencil size={16}/></button>
                <button onClick={() => removeSection(x.id)} className="p-1 text-red-600"><X size={16}/></button>
              </div>
            </div>)}
        </div>
      </div>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">{editingSection ? 'Modifier la section' : 'Nouvelle section'}</h2>
        <form onSubmit={saveSection} className="mt-5 space-y-3">
          <label className="block text-sm font-bold">Type<select value={sectionForm.type} onChange={e => setSectionForm({ ...sectionForm, type: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue">{SECTION_TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
          <label className="block text-sm font-bold">Titre<input value={sectionForm.title} onChange={e => setSectionForm({ ...sectionForm, title: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"/></label>
          <label className="block text-sm font-bold">Contenu (JSON)<textarea value={sectionForm.payloadJson} onChange={e => setSectionForm({ ...sectionForm, payloadJson: e.target.value })} rows="5" placeholder='{"key":"value"}' className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-mono text-xs outline-none focus:border-jso-blue"/></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-bold">Ordre<input type="number" value={sectionForm.displayOrder} onChange={e => setSectionForm({ ...sectionForm, displayOrder: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"/></label>
            <label className="flex items-center gap-2 pt-8 text-sm font-bold"><input type="checkbox" checked={sectionForm.isPublished} onChange={e => setSectionForm({ ...sectionForm, isPublished: e.target.checked })}/> Publi\u00e9</label>
          </div>
          <div className="flex gap-2 pt-2"><button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/> {editingSection ? 'Mettre \u00e0 jour' : 'Cr\u00e9er'}</button>{editingSection && <button type="button" onClick={resetSection} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}</div>
        </form>
      </div>
    </div>

    {/* Navigation */}
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Menu &amp; pied de page</h2>
        {[['Header', 'En-t\u00eate', headerItems], ['Footer', 'Pied de page', footerItems]].map(([pos, label, list]) =>
          <div key={pos} className="mt-5">
            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">{label}</p>
            <div className="mt-2 space-y-2">
              {list.length === 0 ? <p className="text-sm text-slate-400">Aucune entr\u00e9e.</p>
                : list.map((x, i) => <div key={x.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <div className="min-w-0">
                    <b>{x.label}</b>
                    <span className="ml-2 truncate text-xs text-slate-500">{x.url}</span>
                    {!x.isActive && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">Inactif</span>}
                    {x.opensInNewTab && <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">Nouvel onglet</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button title="Monter" disabled={i === 0} onClick={() => moveNav(pos, i, -1)} className="p-1 text-slate-500 disabled:opacity-30"><ArrowUp size={16}/></button>
                    <button title="Descendre" disabled={i === list.length - 1} onClick={() => moveNav(pos, i, 1)} className="p-1 text-slate-500 disabled:opacity-30"><ArrowDown size={16}/></button>
                    <button onClick={() => editNav(x)} className="p-1 text-jso-blue"><Pencil size={16}/></button>
                    <button onClick={() => removeNav(x.id)} className="p-1 text-red-600"><X size={16}/></button>
                  </div>
                </div>)}
            </div>
          </div>)}
      </div>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">{editingNav ? 'Modifier l\u2019entr\u00e9e' : 'Nouvelle entr\u00e9e'}</h2>
        <form onSubmit={saveNav} className="mt-5 space-y-3">
          <label className="block text-sm font-bold">Libell\u00e9<input value={navForm.label} onChange={e => setNavForm({ ...navForm, label: e.target.value })} required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"/></label>
          <label className="block text-sm font-bold">URL / Route<input value={navForm.url} onChange={e => setNavForm({ ...navForm, url: e.target.value })} required placeholder="/club" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"/></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-bold">Position<select value={navForm.position} onChange={e => setNavForm({ ...navForm, position: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue">{POSITIONS.map(p => <option key={p} value={p}>{p === 'Header' ? 'En-t\u00eate' : 'Pied de page'}</option>)}</select></label>
            <label className="block text-sm font-bold">Ordre<input type="number" value={navForm.displayOrder} onChange={e => setNavForm({ ...navForm, displayOrder: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"/></label>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={navForm.isActive} onChange={e => setNavForm({ ...navForm, isActive: e.target.checked })}/> Actif</label>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={navForm.opensInNewTab} onChange={e => setNavForm({ ...navForm, opensInNewTab: e.target.checked })}/> Ouvrir dans un nouvel onglet</label>
          <div className="flex gap-2 pt-2"><button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/> {editingNav ? 'Mettre \u00e0 jour' : 'Cr\u00e9er'}</button>{editingNav && <button type="button" onClick={resetNav} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}</div>
        </form>
      </div>
    </div>
  </div>
}
