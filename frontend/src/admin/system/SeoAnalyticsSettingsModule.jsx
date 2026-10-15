import { useEffect, useState } from 'react'
import { ExternalLink, Save, Search, ChartNoAxesCombined } from 'lucide-react'
import { adminApi } from '../api'

const FIELDS = [
  { key: 'seo_title', label: 'Titolo SEO', hint: 'Titolo principale mostrato nei risultati di ricerca.', maxLength: 70 },
  { key: 'seo_description', label: 'Meta description', hint: 'Descrizione breve e specifica del club (circa 150–160 caratteri).', maxLength: 320 },
  { key: 'seo_keywords', label: 'Parole chiave (facoltativo)', hint: 'Google non usa il meta tag keywords per il posizionamento.', maxLength: 500 },
  { key: 'seo_search_console_verification', label: 'Google Search Console — codice di verifica', hint: 'Inserisci solo il valore content del meta tag google-site-verification, non l’intero tag.', maxLength: 200 },
]

const DEFAULTS = {
  seo_title: 'JSO — Jeunesse Sportive de Oudhref',
  seo_description: 'Plateforme digitale officielle de la Jeunesse Sportive de Oudhref : actualités, calendrier et résultats, effectif, médias et boutique du club.',
  seo_keywords: '',
  seo_search_console_verification: '',
  analytics_ga4_id: '',
}

export default function SeoAnalyticsSettingsModule({ onError = () => {} }) {
  const [values, setValues] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    adminApi('/admin/content')
      .then(rows => {
        if (cancelled) return
        const next = { ...DEFAULTS }
        for (const row of Array.isArray(rows) ? rows : []) {
          if (Object.hasOwn(next, row.key)) next[row.key] = row.value || ''
        }
        setValues(next)
      })
      .catch(error => onError(error.message || 'Impossible de charger la configuration SEO.'))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [onError])

  function change(key, value) {
    setValues(current => ({ ...current, [key]: value }))
    setNotice('')
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setNotice('')
    try {
      for (const key of Object.keys(DEFAULTS)) {
        await adminApi('/admin/content/' + encodeURIComponent(key), {
          method: 'PUT',
          body: JSON.stringify({ value: values[key].trim() }),
        })
      }
      setNotice('Configuration enregistrée. Les métadonnées SEO sont appliquées aux pages publiques après actualisation.')
      onError('')
    } catch (error) {
      onError(error.message || 'Impossible d’enregistrer la configuration.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="space-y-6">
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Search size={21}/></span>
        <div><h2 className="text-xl font-black">SEO et Google</h2><p className="mt-1 text-sm leading-6 text-slate-500">Gérez les informations principales présentées aux moteurs de recherche et vérifiez le site dans Google Search Console.</p></div>
      </div>
      {loading ? <p role="status" className="mt-6 text-sm text-slate-500">Chargement…</p> : <form onSubmit={save} className="mt-6 space-y-5">
        {FIELDS.map(field => <label key={field.key} className="block">
          <span className="text-sm font-bold text-slate-800">{field.label}</span>
          {field.key === 'seo_description' ? <textarea value={values[field.key]} maxLength={field.maxLength} rows={3} onChange={e => change(field.key, e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-jso-blue"/> : <input value={values[field.key]} maxLength={field.maxLength} onChange={e => change(field.key, e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-jso-blue"/>}
          <span className="mt-1 block text-xs leading-5 text-slate-500">{field.hint}{field.maxLength ? ` ${values[field.key].length}/${field.maxLength}` : ''}</span>
        </label>)}
        <label className="block"><span className="text-sm font-bold text-slate-800">Google Analytics 4 — Measurement ID</span><input value={values.analytics_ga4_id} maxLength={32} placeholder="G-XXXXXXXXXX" onChange={e => change('analytics_ga4_id', e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-jso-blue"/><span className="mt-1 block text-xs leading-5 text-slate-500">ID de mesure de votre flux Web GA4. L’enregistrement de l’ID seul n’active pas le suivi : le chargement doit être raccordé au mécanisme de consentement cookies conforme au RGPD avant de collecter des visites.</span></label>
        <div className="flex flex-wrap items-center gap-3"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-3 font-bold text-white disabled:opacity-60"><Save size={16}/>{saving ? 'Enregistrement…' : 'Enregistrer la configuration'}</button><a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Search Console <ExternalLink size={15}/></a><a href="https://analytics.google.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Google Analytics <ExternalLink size={15}/></a></div>
        {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</p>}
      </form>}
    </section>
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><ChartNoAxesCombined size={21}/></span><div><h2 className="text-xl font-black">Visitatori e provenienza geografica</h2><p className="mt-2 text-sm leading-6 text-slate-600">Per visualizzare utenti attivi, Paesi stimati, pagine visitate, dispositivi e canali di provenienza, apri i report di Google Analytics 4. Il Paese è una stima geografica, non la nazionalità verificata della persona.</p><p className="mt-2 text-sm leading-6 text-amber-800">Prima di attivare il tracciamento occorre collegarlo al consenso cookie del sito. Questo pannello salva l’ID GA4 ma non avvia ancora il tracking, per evitare raccolte non autorizzate.</p><a href="https://analytics.google.com/" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-3 text-sm font-bold text-white">Apri report visitatori <ExternalLink size={15}/></a></div></div>
    </section>
  </div>
}
