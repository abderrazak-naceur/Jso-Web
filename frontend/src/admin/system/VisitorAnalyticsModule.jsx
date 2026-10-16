import { useEffect, useState } from 'react'
import { Activity, Users, Eye, RefreshCw, ShieldAlert, ExternalLink } from 'lucide-react'
import { API_BASE_URL } from '../../lib/apiConfig'

const WINDOWS = [[7, '7 jours'], [30, '30 jours'], [90, '90 jours']]

async function api(path) {
  const token = localStorage.getItem('jso_admin_token')
  const response = await fetch(API_BASE_URL + path, {
    headers: { Accept: 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
  })
  if (!response.ok) throw new Error(response.status === 403 ? 'Accès réservé au SuperAdmin.' : 'Impossible de charger les statistiques (' + response.status + ').')
  return response.json()
}

function number(value) { return new Intl.NumberFormat('fr-FR').format(value || 0) }

export default function VisitorAnalyticsModule({ onError = () => {} }) {
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const result = await api('/admin/visitor-analytics?days=' + days)
      setData(result)
      onError('')
    } catch (error) { onError(error.message || 'Erreur de chargement.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [days])

  const maxDay = Math.max(1, ...(data?.byDay || []).map(x => x.views))
  const metrics = [
    ['Pages vues', number(data?.pageViews), Eye],
    ['Visiteurs uniques estimés', number(data?.uniqueVisitors), Users],
    ['Période', days + ' jours', Activity],
  ]

  return <div className="space-y-6">
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-jso-blue">Mesure respectueuse de la vie privée</p>
          <h2 className="mt-2 text-2xl font-black text-jso-ink">Visiteurs & protection</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Statistiques du site collectées uniquement après consentement explicite. Les pages sensibles, les paramètres d’URL et les adresses IP ne sont pas enregistrés dans les événements analytiques.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {WINDOWS.map(([value, label]) => <button key={value} onClick={() => setDays(value)} className={'rounded-xl px-3 py-2 text-sm font-bold ' + (days === value ? 'bg-jso-navy text-white' : 'border border-slate-200 text-slate-600')}>{label}</button>)}
          <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"><RefreshCw size={15}/>Actualiser</button>
        </div>
      </div>
    </section>

    {loading && !data ? <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">Chargement des statistiques…</div> : <>
      <div className="grid gap-4 sm:grid-cols-3">
        {metrics.map(([label, value, Icon]) => <article key={label} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"><Icon size={22} className="text-jso-blue"/><p className="mt-5 text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 text-3xl font-black text-jso-ink">{value}</p></article>)}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-black">Évolution quotidienne</h3>
          {!data?.byDay?.length ? <p className="mt-5 text-sm text-slate-500">Aucune visite consentie sur cette période. Les statistiques apparaîtront après l’activation du suivi par les visiteurs.</p> : <div className="mt-5 space-y-3">{data.byDay.map(day => <div key={day.date} className="flex items-center gap-3 text-sm"><span className="w-24 shrink-0 text-xs text-slate-500">{new Date(day.date + 'T00:00:00Z').toLocaleDateString('fr-FR', {day:'2-digit',month:'2-digit'})}</span><div className="h-6 flex-1 overflow-hidden rounded-md bg-slate-100"><div className="h-full rounded-md bg-jso-blue" style={{width:(day.views/maxDay*100)+'%'}}/></div><span className="w-12 text-right font-bold">{number(day.views)}</span></div>)}</div>}
        </section>
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-black">Pagine più visitate</h3>
          {!data?.topPages?.length ? <p className="mt-5 text-sm text-slate-500">Non sono ancora disponibili dati aggregati.</p> : <div className="mt-4 divide-y divide-slate-100">{data.topPages.map(item => <div key={item.path} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="min-w-0 break-all font-medium text-slate-700">{item.path}</span><span className="shrink-0 font-extrabold">{number(item.views)}</span></div>)}</div>}
        </section>
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-black">Provenienza</h3>
          {!data?.referrers?.length ? <p className="mt-4 text-sm text-slate-500">Nessun dominio di provenienza rilevato per ora.</p> : data.referrers.map(item => <div key={item.host} className="flex justify-between gap-4 border-b border-slate-100 py-3 text-sm"><span>{item.host}</span><strong>{number(item.views)}</strong></div>)}
        </section>
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-black">Dispositivi</h3>
          {!data?.devices?.length ? <p className="mt-4 text-sm text-slate-500">Nessun dato disponibile.</p> : data.devices.map(item => <div key={item.device} className="flex justify-between gap-4 border-b border-slate-100 py-3 text-sm"><span className="capitalize">{item.device}</span><strong>{number(item.views)}</strong></div>)}
        </section>
      </div>
    </>}

    <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-6">
      <div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 text-amber-700" size={22}/><div><h3 className="font-black text-amber-950">Protezione bot e blocco IP</h3><p className="mt-2 text-sm leading-6 text-amber-900">I limiti di frequenza API esistenti continuano a funzionare. La gestione amministrativa dei blocchi IP/CIDR e il rilevamento avanzato dei bot richiedono ancora la verifica dell’indirizzo client affidabile dietro il proxy Render; non attiviamo blocchi automatici finché questa verifica non è completata.</p><a href="/admin/security" className="mt-3 inline-flex items-center gap-2 font-bold text-amber-950 underline">Apri sicurezza esistente <ExternalLink size={15}/></a></div></div>
    </section>
  </div>
}
