import { useEffect, useState } from 'react'
import { Languages, Save, Trash2 } from 'lucide-react'
import { adminApi } from '../api'

const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'it', label: 'Italiano' },
  { code: 'ar', label: 'العربية' },
]

const ENTITY_TYPES = ['Article', 'Club', 'ClubEvent', 'FaqEntry', 'HomeSection', 'MembershipPlan', 'NavigationItem', 'Product', 'Sponsor', 'SiteContent', 'TicketType']

export default function TranslationsModule({ onError = () => {} }) {
  const [filters, setFilters] = useState({ entityType: 'Article', entityId: '', language: 'en' })
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ entityType: 'Article', entityId: '', language: 'en', field: 'title', value: '' })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.entityType) params.set('entityType', filters.entityType)
      if (filters.entityId) params.set('entityId', filters.entityId)
      if (filters.language) params.set('language', filters.language)
      const data = await adminApi('/admin/translations?' + params.toString())
      setRows(data)
      onError('')
    } catch (e) {
      onError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function editRow(row) {
    const parts = row.key.split(':')
    if (parts.length !== 5) return
    setForm({
      entityType: parts[1],
      entityId: parts[2],
      language: parts[3],
      field: parts[4],
      value: row.value || '',
    })
  }

  async function save(e) {
    e.preventDefault()
    if (!form.entityId.trim()) {
      onError('L’identifiant de l’entité est requis.')
      return
    }
    setSaving(true)
    try {
      await adminApi(
        '/admin/translations/' + encodeURIComponent(form.entityType)
          + '/' + encodeURIComponent(form.entityId.trim())
          + '/' + encodeURIComponent(form.language)
          + '/' + encodeURIComponent(form.field.trim()),
        { method: 'PUT', body: JSON.stringify({ value: form.value }) },
      )
      setFilters({ entityType: form.entityType, entityId: form.entityId.trim(), language: form.language })
      await load()
      onError('')
    } catch (e) {
      onError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(row) {
    const parts = row.key.split(':')
    if (parts.length !== 5) return
    try {
      await adminApi(
        '/admin/translations/' + encodeURIComponent(parts[1])
          + '/' + encodeURIComponent(parts[2])
          + '/' + encodeURIComponent(parts[3])
          + '/' + encodeURIComponent(parts[4]),
        { method: 'DELETE' },
      )
      await load()
    } catch (e) {
      onError(e.message)
    }
  }

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-jso-blue/10 text-jso-blue">
          <Languages size={20} />
        </div>
        <div>
          <h2 className="text-xl font-black">Traductions des contenus</h2>
          <p className="mt-1 text-sm text-slate-500">
            Gérez les textes multilingues des articles, événements, FAQ, boutique, navigation et autres contenus publics.
            Le fallback est toujours Français puis le texte source.
          </p>
        </div>
      </div>
    </div>

    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={save} className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-black">Nouvelle traduction</h3>
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-bold">Type d’entité
            <select value={form.entityType} onChange={e => setForm({ ...form, entityType: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3">
              {ENTITY_TYPES.map(type => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold">ID de l’entité
            <input value={form.entityId} onChange={e => setForm({ ...form, entityId: e.target.value })} placeholder="GUID de l’élément" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-xs" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-bold">Langue
              <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3">
                {LANGUAGES.map(language => <option key={language.code} value={language.code}>{language.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold">Champ
              <input value={form.field} onChange={e => setForm({ ...form, field: e.target.value })} placeholder="title, description…" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" />
            </label>
          </div>
          <label className="block text-sm font-bold">Texte
            <textarea value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} rows="8" className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-jso-blue" />
          </label>
          <button disabled={saving} className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-3 font-bold text-white disabled:opacity-60">
            <Save size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-40 text-sm font-bold">Type<select value={filters.entityType} onChange={e => setFilters({ ...filters, entityType: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5">{ENTITY_TYPES.map(type => <option key={type}>{type}</option>)}</select></label>
          <label className="block min-w-56 text-sm font-bold">ID<input value={filters.entityId} onChange={e => setFilters({ ...filters, entityId: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-xs" /></label>
          <label className="block min-w-32 text-sm font-bold">Langue<select value={filters.language} onChange={e => setFilters({ ...filters, language: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5">{LANGUAGES.map(language => <option key={language.code} value={language.code}>{language.code.toUpperCase()}</option>)}</select></label>
          <button type="button" onClick={load} className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-600">Actualiser</button>
        </div>

        <div className="mt-5 overflow-x-auto">
          {loading ? <p className="text-sm text-slate-400">Chargement…</p>
            : rows.length === 0 ? <p className="text-sm text-slate-400">Aucune traduction enregistrée pour ce filtre.</p>
            : <table className="w-full text-left text-sm">
              <thead><tr className="border-b text-xs uppercase tracking-wide text-slate-400"><th className="p-2">Entité</th><th className="p-2">Langue</th><th className="p-2">Champ</th><th className="p-2">Texte</th><th className="p-2 text-right">Actions</th></tr></thead>
              <tbody>
                {rows.map(row => {
                  const parts = row.key.split(':')
                  return <tr key={row.id} className="border-b last:border-0 align-top">
                    <td className="p-2 font-semibold">{parts[1] || '—'}</td>
                    <td className="p-2 font-black">{parts[3] || '—'}</td>
                    <td className="p-2 font-semibold">{parts[4] || '—'}</td>
                    <td className="max-w-sm p-2 text-slate-600">{row.value}</td>
                    <td className="p-2 text-right">
                      <button type="button" onClick={() => editRow(row)} className="mr-2 rounded-lg px-2 py-1 font-bold text-jso-blue hover:bg-slate-50">Modifier</button>
                      <button type="button" onClick={() => remove(row)} title="Supprimer" className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                })}
              </tbody>
            </table>}
        </div>
      </section>
    </div>
  </div>
}
