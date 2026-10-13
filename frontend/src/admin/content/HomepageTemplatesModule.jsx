import { useEffect, useState } from 'react'
import { Check, Eye, Save, Sparkles } from 'lucide-react'
import { adminApi } from '../api'

const TEMPLATES = [
  { id: 'classic', name: 'Classique JSO', badge: 'Actuel', description: 'Conserve la homepage actuelle et ses couleurs.', preview: 'bg-slate-100', hero: 'bg-jso-navy', accent: 'bg-jso-gold', layout: 'grid' },
  { id: 'modern-2026', name: 'Modern 2026', badge: 'Recommandé', description: 'Design premium et lumineux : hiérarchie nette, cartes soignées et palette officielle bleu, jaune et blanc.', preview: 'bg-white', hero: 'bg-jso-navy', accent: 'bg-jso-gold', layout: 'modern' },
  { id: 'stadium', name: 'Stadium', badge: 'Matchday', description: 'Ambiance stade, tableau de match et priorité aux résultats, aux vidéos et à la journée de championnat.', preview: 'bg-jso-navy', hero: 'bg-jso-navy', accent: 'bg-jso-gold', layout: 'stadium' },
  { id: 'magazine', name: 'Club Magazine', badge: 'Editorial', description: 'Mise en page éditoriale claire : grands titres, actualités, photos et archives au premier plan.', preview: 'bg-white', hero: 'bg-white', accent: 'bg-jso-blue', layout: 'magazine' },
]

export default function HomepageTemplatesModule({ onError = () => {} }) {
  const [current, setCurrent] = useState('modern-2026')
  const [draft, setDraft] = useState('modern-2026')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    adminApi('/admin/content').then(items => {
      const saved = items?.find(item => item.key === 'home_template')?.value
      const selected = TEMPLATES.some(template => template.id === saved) ? saved : 'modern-2026'
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
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-jso-gold"><Sparkles size={16}/> Design de la homepage</div>
      <h2 className="mt-3 text-2xl font-black sm:text-3xl">Choisissez l’identité de votre club</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Comparez les modèles sans perdre le design actuel. Le choix enregistré s’applique à tous les visiteurs. Vous pouvez revenir au template classique à tout moment.</p>
      <div className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold"><Check size={14} className="mr-1.5"/> Actif : {TEMPLATES.find(item => item.id === current)?.name}</div>
    </header>
    {loading ? <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">Chargement des templates…</p> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {TEMPLATES.map(template => <article key={template.id} className={'overflow-hidden rounded-3xl border bg-white transition ' + (draft === template.id ? 'border-jso-blue ring-2 ring-yellow-100' : 'border-slate-200')}>
        <button type="button" onClick={() => { setDraft(template.id); setMessage('') }} aria-pressed={draft === template.id} className="block w-full text-left">
          <div className={'relative aspect-[4/3] overflow-hidden p-3 ' + template.preview}>
            {template.layout === 'classic' && <div className="h-full rounded-xl bg-slate-100 p-2">
              <div className="h-[48%] rounded-lg bg-jso-navy p-3"><div className="h-1.5 w-1/3 rounded-full bg-jso-gold"/><div className="mt-3 h-3 w-4/5 rounded bg-white/90"/><div className="mt-2 h-2 w-1/2 rounded bg-white/40"/></div>
              <div className="mt-2 grid grid-cols-3 gap-2">{[0,1,2].map(i => <div key={i} className="rounded-md bg-white p-2"><div className="h-2 rounded bg-jso-gold"/><div className="mt-2 h-2 rounded bg-slate-200"/></div>)}</div>
            </div>}
            {template.layout === 'modern' && <div className="h-full rounded-xl bg-white p-2 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2"><div className="h-2 w-1/4 rounded bg-jso-navy"/><div className="flex gap-1"><i className="h-1.5 w-4 rounded bg-jso-blue"/><i className="h-1.5 w-4 rounded bg-jso-gold"/></div></div>
              <div className="mt-2 grid h-[48%] grid-cols-[1.2fr_.8fr] gap-2"><div className="rounded-lg bg-jso-navy p-2"><div className="h-2 w-1/3 rounded bg-jso-gold"/><div className="mt-2 h-3 w-full rounded bg-white"/><div className="mt-1 h-2 w-3/4 rounded bg-white/50"/><div className="mt-3 h-4 w-1/2 rounded bg-jso-blue"/></div><div className="rounded-lg bg-blue-50 p-2"><div className="mx-auto mt-2 h-9 w-9 rounded-full border-4 border-jso-gold bg-jso-navy"/><div className="mx-auto mt-2 h-2 w-2/3 rounded bg-jso-blue"/></div></div>
              <div className="mt-2 grid grid-cols-2 gap-2"><div className="h-7 rounded-lg bg-slate-50 ring-1 ring-slate-100"/><div className="h-7 rounded-lg bg-slate-50 ring-1 ring-slate-100"/></div>
            </div>}
            {template.layout === 'stadium' && <div className="h-full rounded-xl bg-jso-navy p-2 text-white">
              <div className="flex items-center justify-between"><div className="h-2 w-1/3 rounded bg-jso-gold"/><div className="h-2 w-1/5 rounded bg-white/30"/></div>
              <div className="mt-2 flex h-[48%] items-center justify-around rounded-lg border border-white/15 bg-blue-950 p-2"><div className="h-8 w-8 rounded-full border-2 border-jso-gold bg-white/10"/><div className="text-center"><div className="text-[9px] font-black text-jso-gold">MATCHDAY</div><div className="mt-1 h-3 w-10 rounded bg-white"/></div><div className="h-8 w-8 rounded-full border-2 border-jso-blue bg-white/10"/></div>
              <div className="mt-2 grid grid-cols-3 gap-2">{[0,1,2].map(i => <div key={i} className="rounded-md bg-white/10 p-2"><div className="h-2 rounded bg-jso-gold"/><div className="mt-2 h-2 rounded bg-white/30"/></div>)}</div>
            </div>}
            {template.layout === 'magazine' && <div className="h-full rounded-xl bg-white p-2">
              <div className="border-b-2 border-jso-gold pb-2"><div className="h-1.5 w-1/3 rounded bg-jso-blue"/><div className="mt-2 h-4 w-4/5 rounded-sm bg-jso-navy"/><div className="mt-1 h-2 w-1/2 rounded-sm bg-slate-300"/></div>
              <div className="mt-2 grid h-[45%] grid-cols-[1.2fr_.8fr] gap-2"><div className="rounded-lg bg-blue-50 p-2"><div className="h-full rounded-md bg-jso-navy"/></div><div className="space-y-2 pt-1"><div className="h-2 rounded bg-jso-blue"/><div className="h-2 rounded bg-slate-200"/><div className="h-2 w-2/3 rounded bg-slate-200"/><div className="h-2 rounded bg-jso-gold"/></div></div>
              <div className="mt-2 grid grid-cols-3 gap-2">{[0,1,2].map(i => <div key={i} className="h-4 rounded-sm bg-slate-100"/> )}</div>
            </div>}
            <span className="absolute right-5 top-5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black text-slate-700 shadow">{template.badge}</span>
            {draft === template.id && <span className="absolute left-5 top-5 grid h-7 w-7 place-items-center rounded-full bg-jso-gold text-jso-navy"><Check size={16}/></span>}
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between gap-2"><h3 className="font-black text-slate-900">{template.name}</h3>{current === template.id && <span className="text-[10px] font-black uppercase text-jso-blue">Actif</span>}</div>
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
      <button type="button" disabled={loading || saving || draft === current} onClick={save} className="inline-flex items-center justify-center gap-2 rounded-xl bg-jso-blue px-5 py-3 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"><Save size={16}/>{saving ? 'Enregistrement…' : 'Enregistrer le template'}</button>
    </div>
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p>}
  </div>
}
