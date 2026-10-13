import { useCallback, useEffect, useState } from 'react'
import { Check, Monitor, Save, Smartphone, Sparkles } from 'lucide-react'
import { adminApi } from '../api'
import { HOME_TEMPLATES, HOME_TEMPLATE_IDS } from '../../features/home/homeTemplates'

const DEFAULT_TEMPLATE = 'modern-2026'
const noop = () => {}

export default function HomepageTemplatesModule({ onError = noop }) {
  const [current, setCurrent] = useState(null)
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [viewport, setViewport] = useState('desktop')

  const loadCurrent = useCallback(async (signal) => {
    setLoading(true)
    setLoadError('')
    try {
      const items = await adminApi('/admin/content')
      if (signal?.aborted) return
      const saved = items?.find(item => item.key === 'home_template')?.value
      const selected = HOME_TEMPLATE_IDS.has(saved) ? saved : DEFAULT_TEMPLATE
      setCurrent(selected)
      setDraft(selected)
      onError('')
    } catch (error) {
      if (signal?.aborted) return
      const text = error.message || 'Impossible de charger le modèle actif.'
      setLoadError(text)
      onError(text)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [onError])

  useEffect(() => {
    const controller = new AbortController()
    loadCurrent(controller.signal)
    return () => controller.abort()
  }, [loadCurrent])

  async function save() {
    if (!HOME_TEMPLATE_IDS.has(draft) || !HOME_TEMPLATE_IDS.has(current) || loading || loadError) return
    setSaving(true)
    setMessage('')
    try {
      await adminApi('/admin/content/home_template', { method: 'PUT', body: JSON.stringify({ value: draft }) })
      setCurrent(draft)
      setMessage({ kind: 'success', text: 'Modèle publié sur la page d’accueil. Actualisez le site public pour vérifier le résultat.' })
      onError('')
    } catch (error) {
      const text = error.message || 'Impossible de publier le modèle.'
      setMessage({ kind: 'error', text })
      onError(text)
    } finally {
      setSaving(false)
    }
  }

  const currentTemplate = HOME_TEMPLATES.find(item => item.id === current)
  const draftTemplate = HOME_TEMPLATES.find(item => item.id === draft)
  const previewUrl = draft ? `/?templatePreview=${encodeURIComponent(draft)}` : '/'

  return <div className="space-y-6">
    <header className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-jso-gold"><Sparkles size={16}/> Design de la homepage</div>
      <h2 className="mt-3 text-2xl font-black sm:text-3xl">Choisissez l’identité de votre club</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Sélectionnez un modèle et vérifiez la page d’accueil réelle sur ordinateur ou mobile. La sélection reste en aperçu jusqu’à sa publication.</p>
      <div className="mt-5 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold"><Check size={14} className="mr-1.5"/> Actif : {loading ? 'Chargement…' : currentTemplate?.name || 'Indisponible'}</div>
    </header>

    {loadError && <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
      <p><strong>Le modèle actif n’a pas pu être chargé.</strong> Le choix et la publication sont bloqués pour éviter de remplacer une configuration inconnue. {loadError}</p>
      <button type="button" onClick={() => loadCurrent()} className="shrink-0 rounded-xl bg-red-800 px-4 py-2 font-bold text-white hover:bg-red-900">Réessayer</button>
    </div>}

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {HOME_TEMPLATES.map(template => <button
        key={template.id}
        type="button"
        disabled={loading || Boolean(loadError)}
        onClick={() => { setDraft(template.id); setMessage('') }}
        aria-pressed={draft === template.id}
        className={'overflow-hidden rounded-3xl border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 ' + (draft === template.id ? 'border-jso-blue ring-2 ring-yellow-100' : 'border-slate-200')}
      >
        <div className={`home-template-mini home-template-mini-${template.preview} relative aspect-[4/3] min-h-[190px] p-4`} aria-label={`Aperçu indicatif du modèle ${template.name}`}>
          <div className="flex items-center justify-between border-b border-current/15 pb-2 text-[9px] font-black uppercase tracking-wider"><span>JSO · Club</span><span>•••</span></div>
          <div className="mt-3 grid grid-cols-[1.25fr_.75fr] gap-2">
            <div className="home-template-mini-hero rounded-xl p-3">
              <span className="block h-1.5 w-1/3 rounded bg-jso-gold" />
              <span className="mt-3 block h-3 w-4/5 rounded bg-current/80" />
              <span className="mt-2 block h-2 w-1/2 rounded bg-current/35" />
            </div>
            <div className="home-template-mini-side grid place-items-center rounded-xl"><span className="grid h-9 w-9 place-items-center rounded-full border-2 border-jso-gold text-[8px] font-black">JSO</span></div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[0, 1, 2].map(item => <span key={item} className="home-template-mini-card h-9 rounded-lg p-2"><i className="block h-1.5 rounded bg-jso-gold"/><i className="mt-2 block h-1.5 rounded bg-current/20"/></span>)}
          </div>
          <span className="absolute right-5 top-5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black text-slate-700 shadow">{template.badge}</span>
          {draft === template.id && <span className="absolute left-5 top-5 grid h-7 w-7 place-items-center rounded-full bg-jso-gold text-jso-navy"><Check size={16}/></span>}
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between gap-2"><span className="font-black text-slate-900">{template.name}</span>{current === template.id && <span className="text-[10px] font-black uppercase text-jso-blue">Actif</span>}</div>
          <span className="mt-2 block min-h-[48px] text-sm leading-5 text-slate-500">{template.description}</span>
        </div>
      </button>)}
    </div>

    <section aria-labelledby="homepage-preview-title" className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div><h3 id="homepage-preview-title" className="font-black text-slate-900">Aperçu réel : {draftTemplate?.name || '—'}</h3><p className="mt-1 text-xs text-slate-500">L’aperçu utilise les données publiques actuelles et ne modifie pas le site.</p></div>
        <div className="inline-flex self-start rounded-xl bg-slate-100 p-1" aria-label="Format de l’aperçu">
          <button type="button" onClick={() => setViewport('desktop')} aria-pressed={viewport === 'desktop'} className={'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ' + (viewport === 'desktop' ? 'bg-white text-jso-navy shadow-sm' : 'text-slate-500')}><Monitor size={16}/> Ordinateur</button>
          <button type="button" onClick={() => setViewport('mobile')} aria-pressed={viewport === 'mobile'} className={'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ' + (viewport === 'mobile' ? 'bg-white text-jso-navy shadow-sm' : 'text-slate-500')}><Smartphone size={16}/> Mobile</button>
        </div>
      </div>
      <div className="overflow-auto bg-slate-100 p-3 sm:p-5">
        <iframe
          key={`${draft}-${viewport}`}
          title={`Aperçu de la page d’accueil ${draftTemplate?.name || ''} ${viewport}`}
          src={previewUrl}
          loading="lazy"
          className={'mx-auto block h-[min(76vh,760px)] min-h-[520px] rounded-xl border border-slate-300 bg-white shadow-sm ' + (viewport === 'mobile' ? 'w-[390px] max-w-full' : 'w-full')}
        />
      </div>
    </section>

    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="font-black text-slate-900">Modèle sélectionné : {draftTemplate?.name || '—'}</p><p className="mt-1 text-sm text-slate-500">La publication remplace le modèle visible par tous les visiteurs.</p></div>
      <button type="button" disabled={loading || Boolean(loadError) || saving || !current || draft === current} onClick={save} className="inline-flex items-center justify-center gap-2 rounded-xl bg-jso-blue px-5 py-3 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"><Save size={16}/>{saving ? 'Publication…' : 'Publier le modèle'}</button>
    </div>
    {message && <p role={message.kind === 'error' ? 'alert' : 'status'} className={'rounded-xl p-4 text-sm font-semibold ' + (message.kind === 'error' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800')}>{message.text}</p>}
  </div>
}
