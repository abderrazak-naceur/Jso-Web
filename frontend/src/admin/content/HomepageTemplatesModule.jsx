import { useEffect, useState } from 'react'
import { Check, Eye, Save, Sparkles } from 'lucide-react'
import { adminApi } from '../api'

const TEMPLATES = [
  { id: 'classic', name: 'Classique JSO', badge: 'Actuel', description: 'Conserve la homepage actuelle et ses couleurs.', preview: 'bg-slate-100', hero: 'bg-jso-navy', accent: 'bg-jso-gold', layout: 'grid' },
  { id: 'modern-2026', name: 'Modern 2026', badge: 'Recommandé', description: 'Style des grands clubs : typographie forte, espace généreux, cartes premium et accent bleu.', preview: 'bg-white', hero: 'bg-slate-900', accent: 'bg-blue-500', layout: 'modern' },
  { id: 'stadium', name: 'Stadium', badge: 'Matchday', description: 'Une expérience centrée sur le prochain match, le score et l’ambiance du stade.', preview: 'bg-slate-950', hero: 'bg-slate-800', accent: 'bg-amber-400', layout: 'stadium' },
  { id: 'magazine', name: 'Club Magazine', badge: 'Editorial', description: 'Actualités, photos, vidéos et histoires du club au premier plan.', preview: 'bg-stone-50', hero: 'bg-stone-200', accent: 'bg-rose-500', layout: 'magazine' },
]

export default function HomepageTemplatesModule({ onError = () => {} }) {
  const [current, setCurrent] = useState('classic')
  const [draft, setDraft] = useState('classic')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    adminApi('/admin/content').then(items => {
      const saved = items?.find(item => item.key === 'home_template')?.value
      const selected = TEMPLATES.some(template => template.id === saved) ? saved : 'classic'
      if (active) { setCurrent(selected); setDraft(selected) }
    }).catch(error => onError(error.message || 'Impossible de charger les modèles.'))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function save() {
    setSaving(true); setMessage('')
    try {
      await adminApi('/admin/content/home_template', { method: 'PUT', body: JSON.stringify({ value: draft }) })
      setCurrent(draft)
      setMessage('Template enregistré. Il sera utilisé par la homepage publique après actualisation.')
    } catch (error) { onError(error.message || 'Impossible d’enregistrer le template.') }
    finally { setSaving(false) }
  }

  return <div className="space-y-6">
    <header className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-sky-300"><Sparkles size={16}/> Design de la homepage</div>
      <h2 className="mt-3 text-2xl font-black sm:text-3xl">Choisissez l’identité de votre club</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Comparez les modèles sans perdre le design actuel. Le choix enregistré s’applique à tous les visiteurs. Vous pouvez revenir au template classique à tout moment.</p>
      <div className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold"><Check size={14} className="mr-1.5"/> Actif : {TEMPLATES.find(item => item.id === current)?.name}</div>
    </header>
    {loading ? <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">Chargement des templates…</p> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {TEMPLATES.map(template => <article key={template.id} className={'overflow-hidden rounded-3xl border bg-white transition ' + (draft === template.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200')}>
        <button type="button" onClick={() => { setDraft(template.id); setMessage('') }} aria-pressed={draft === template.id} className="block w-full text-left">
          <div className={'relative aspect-[4/3] overflow-hidden p-3 ' + template.preview}>
            <div className={'h-[58%] rounded-xl p-3 ' + template.hero}>
              <div className={'h-1.5 w-1/3 rounded-full ' + template.accent}/>
              <div className="mt-3 h-3 w-4/5 rounded bg-white/80"/>
              <div className="mt-2 h-2 w-1/2 rounded bg-white/35"/>
              <div className="mt-4 flex gap-2"><div className={'h-7 w-12 rounded ' + template.accent}/><div className="h-7 w-12 rounded border border-white/30"/></div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">{[0,1,2].map(i => <div key={i} className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm"><div className={'h-2 rounded ' + template.accent}/><div className="mt-2 h-2 rounded bg-slate-200"/><div className="mt-1 h-2 w-2/3 rounded bg-slate-100"/></div>)}</div>
            <span className="absolute right-5 top-5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black text-slate-700 shadow">{template.badge}</span>
            {draft === template.id && <span className="absolute left-5 top-5 grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-white"><Check size={16}/></span>}
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between gap-2"><h3 className="font-black text-slate-900">{template.name}</h3>{current === template.id && <span className="text-[10px] font-black uppercase text-emerald-700">Actif</span>}</div>
            <p className="mt-2 min-h-[60px] text-sm leading-5 text-slate-500">{template.description}</p>
          </div>
        </button>
        <div className="flex gap-2 px-4 pb-4">
          <button type="button" onClick={() => { setDraft(template.id); setMessage('Aperçu sélectionné : ' + template.name + '. Enregistrez pour l’appliquer au site public.') }} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><Eye size={15}/> Choisir</button>
        </div>
      </article>)}
    </div>}
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="font-black text-slate-900">Modèle sélectionné : {TEMPLATES.find(item => item.id === draft)?.name}</p><p className="mt-1 text-sm text-slate-500">La modification ne sera publique qu’après avoir cliqué sur Enregistrer.</p></div>
      <button type="button" disabled={loading || saving || draft === current} onClick={save} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"><Save size={16}/>{saving ? 'Enregistrement…' : 'Enregistrer le template'}</button>
    </div>
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p>}
  </div>
}
