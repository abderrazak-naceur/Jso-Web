import { useEffect, useState } from 'react'
import { Save, LayoutTemplate } from 'lucide-react'
import Field from '../components/Field'
import { API_BASE_URL, getConfiguredApiBaseUrl, getDefaultApiBaseUrl, setApiBaseUrl, resetApiBaseUrl } from '../../lib/apiConfig'
import HomepageBuilderModule from '../HomepageBuilder'
export default function SettingsModule({ onError = () => {} }) {
  const [value, setValue] = useState(getConfiguredApiBaseUrl())
  const [active, setActive] = useState(API_BASE_URL)
  const [saved, setSaved] = useState(false)
  const [test, setTest] = useState(null)
  const [testing, setTesting] = useState(false)
  const buildDefault = getDefaultApiBaseUrl()

  function save(e) {
    e.preventDefault()
    const next = setApiBaseUrl(value)
    setActive(next)
    setValue(getConfiguredApiBaseUrl())
    setSaved(true)
    setTest(null)
  }
  function reset() {
    const next = resetApiBaseUrl()
    setActive(next)
    setValue('')
    setSaved(true)
    setTest(null)
  }
  async function testConnection() {
    setTesting(true); setTest(null)
    const base = value.trim().replace(/\/$/, '') || buildDefault
    // '/api' is same-origin and proxied; probe the sibling '/health' endpoint.
    const healthUrl = base === '/api' ? '/health' : base.replace(/\/api$/, '') + '/health'
    try {
      const res = await fetch(healthUrl, { headers: { Accept: 'application/json' } })
      setTest(res.ok ? { ok: true, text: 'Connexion réussie (HTTP ' + res.status + ')' } : { ok: false, text: 'Réponse HTTP ' + res.status })
    } catch (err) {
      setTest({ ok: false, text: 'Échec de connexion : ' + err.message })
    } finally { setTesting(false) }
  }

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">Configuration du backend</h2>
      <p className="mt-2 text-sm text-slate-500">URL de base de l’API utilisée par le site et l’administration. Laissez vide pour utiliser la valeur par défaut (<code className="rounded bg-slate-100 px-1">{buildDefault}</code>).</p>
      <form onSubmit={save} className="mt-5 space-y-4">
        <Field label="URL de l’API" value={value} onChange={e => { setValue(e.target.value); setSaved(false) }} placeholder="ex. http://localhost:8080/api" />
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/> Enregistrer</button>
          <button type="button" onClick={testConnection} disabled={testing} className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-600 disabled:opacity-60">{testing ? 'Test…' : 'Tester la connexion'}</button>
          <button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:text-red-700">Réinitialiser</button>
        </div>
      </form>
      {saved && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Enregistré. API active : <code>{active}</code></p>}
      {test && <p className={'mt-3 rounded-xl p-3 text-sm font-semibold ' + (test.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>{test.text}</p>}
      <div className="mt-6 border-t pt-4 text-xs text-slate-500">
        <p>API active actuellement : <b className="text-slate-700">{active}</b></p>
        <p className="mt-1">Ce réglage est enregistré dans ce navigateur. Rechargez la page après modification pour l’appliquer partout.</p>
      </div>
    </div>
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-jso-blue/10 text-jso-blue"><LayoutTemplate size={20}/></div>
        <div><h2 className="text-xl font-black">Sections de la page d’accueil</h2><p className="mt-1 text-sm text-slate-500">Configurez l’ordre, la publication, la visibilité et le menu/pied de page de la page d’accueil.</p></div>
      </div>
      <div className="mt-6"><HomepageBuilderModule onError={onError} /></div>
    </div>
  </div>
}
