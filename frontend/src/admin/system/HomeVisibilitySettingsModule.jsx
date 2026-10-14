import { useCallback, useEffect, useState } from 'react'
import { Eye, EyeOff, RefreshCw } from 'lucide-react'
import { adminApi } from '../api'

export default function HomeVisibilitySettingsModule({ onError = () => {} }) {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [loadError, setLoadError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const result = await adminApi('/admin/home-visibility')
      setSections(Array.isArray(result) ? result : [])
      onError('')
    } catch (error) {
      const message = error.message || 'Impossible de charger les sections de la page d’accueil.'
      setLoadError(message)
      onError(message)
    } finally {
      setLoading(false)
    }
  }, [onError])

  useEffect(() => { load() }, [load])

  async function toggle(section) {
    const next = sections.map(item => item.id === section.id ? { ...item, enabled: !item.enabled } : item)
    setSections(next)
    setSavingId(section.id)
    try {
      const hidden = next.filter(item => !item.enabled).map(item => item.id)
      await adminApi('/admin/home-visibility', {
        method: 'PUT',
        body: JSON.stringify({ hidden }),
      })
      onError('')
    } catch (error) {
      onError(error.message || 'Impossible d’enregistrer la visibilité des sections.')
      await load()
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section className="space-y-6">
      <header className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Visibilité de la page d’accueil</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Activez ou masquez les sections du site public. Votre choix est enregistré automatiquement et s’applique aussi aux liens du menu concernés.
            </p>
          </div>
          <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
        </div>
      </header>

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <span>{loadError}</span>
          <button type="button" onClick={load} className="font-bold underline">Réessayer</button>
        </div>
      )}

      {loading && sections.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Chargement des sections…</div>
      ) : (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="font-black">Sections disponibles</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{sections.filter(item => item.enabled).length} / {sections.length} actives</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {sections.map(section => (
              <button
                key={section.id}
                type="button"
                onClick={() => toggle(section)}
                disabled={savingId !== null}
                aria-pressed={section.enabled}
                className={'flex min-h-16 items-center justify-between gap-4 rounded-xl border p-4 text-left transition disabled:cursor-wait disabled:opacity-70 ' +
                  (section.enabled ? 'border-jso-blue/30 bg-jso-blue/5' : 'border-slate-200 bg-slate-50')}
              >
                <span className="flex min-w-0 items-center gap-3">
                  {section.enabled
                    ? <Eye size={18} className="shrink-0 text-jso-blue" />
                    : <EyeOff size={18} className="shrink-0 text-slate-400" />}
                  <span className="min-w-0">
                    <span className="block font-bold text-jso-ink">{section.label}</span>
                    <span className={'mt-1 block text-xs font-semibold ' + (section.enabled ? 'text-emerald-700' : 'text-slate-500')}>
                      {savingId === section.id ? 'Enregistrement…' : section.enabled ? 'Activée' : 'Masquée'}
                    </span>
                  </span>
                </span>
                <span className={'relative h-6 w-11 shrink-0 rounded-full transition ' + (section.enabled ? 'bg-jso-blue' : 'bg-slate-300')}>
                  <span className={'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ' + (section.enabled ? 'left-[22px]' : 'left-0.5')} />
                </span>
              </button>
            ))}
          </div>
          {!loadError && sections.length === 0 && !loading && <p className="text-sm text-slate-500">Aucune section disponible.</p>}
        </div>
      )}
    </section>
  )
}
