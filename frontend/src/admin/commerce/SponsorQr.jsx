import { useEffect, useState } from 'react'
import { QrCode, RefreshCw, Link2, Copy, BarChart3 } from 'lucide-react'
import { API_BASE_URL } from '../../lib/apiConfig'

// Admin API helper scoped to this module (mirrors the one in AdminApp.jsx).
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

// Build the public, printable activation URL from a slug. API_BASE_URL may be
// relative ('/api'), so resolve it against the current origin to obtain the
// absolute URL that will be encoded in the physical QR code.
function activationUrl(slug) {
  const base = API_BASE_URL.startsWith('http') ? API_BASE_URL : window.location.origin + API_BASE_URL
  return base.replace(/\/$/, '') + '/sponsors/activation/' + slug
}

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }

// Activation sponsor via QR allo stadio (idée B5) : pour chaque sponsor, génère
// et affiche le slug d'activation et l'URL publique à imprimer sous forme de QR
// physique (bord de terrain / programme de match), puis affiche le rapport de
// scans. Le comptage est strictement anonyme : le back-end n'enregistre aucune
// donnée personnelle (ni IP, ni identifiant, ni user-agent), uniquement des
// agrégats par jour et par canal. Réservé aux rôles SuperAdmin / ClubAdmin ;
// la génération de slug est auditée côté serveur.
export default function SponsorQrModule({ onError }) {
  const [sponsors, setSponsors] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [report, setReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [copied, setCopied] = useState(null)

  async function loadSponsors() {
    setLoading(true)
    try {
      setSponsors(await api('/admin/sponsors'))
      onError('')
    } catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { loadSponsors() }, [])

  async function generate(sponsor) {
    setBusyId(sponsor.id)
    try {
      const res = await api('/admin/sponsors/' + sponsor.id + '/activation-slug', { method: 'POST' })
      setSponsors(list => (list || []).map(s => s.id === sponsor.id ? { ...s, activationSlug: res.activationSlug } : s))
      if (selected?.id === sponsor.id) setSelected(s => ({ ...s, activationSlug: res.activationSlug }))
      onError('')
    } catch (err) { onError(err.message) }
    finally { setBusyId(null) }
  }

  async function openReport(sponsor) {
    setSelected(sponsor)
    setReport(null)
    setReportLoading(true)
    try {
      setReport(await api('/admin/sponsors/' + sponsor.id + '/activations'))
      onError('')
    } catch (err) { onError(err.message) }
    finally { setReportLoading(false) }
  }

  async function copyUrl(slug) {
    const url = activationUrl(slug)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(slug)
      setTimeout(() => setCopied(c => (c === slug ? null : c)), 2000)
    } catch { /* clipboard unavailable */ }
  }

  const list = sponsors ?? []

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><QrCode className="text-jso-blue" size={20}/><h2 className="text-xl font-black">QR Sponsors</h2></div>
        <button onClick={loadSponsors} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"><RefreshCw size={14}/>Actualiser</button>
      </div>
      <p className="mt-1 text-xs text-slate-400">Génère pour chaque sponsor un lien d'activation à imprimer sous forme de QR physique (bord de terrain, programme de match). Chaque scan est comptabilisé de façon strictement anonyme : aucune donnée personnelle (ni adresse IP, ni identifiant) n'est enregistrée, uniquement des agrégats par jour et par canal.</p>
    </div>

    {loading && <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-sm text-slate-500">Chargement des sponsors…</div>}

    {!loading && list.length === 0 && <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-sm text-slate-500">Aucun sponsor enregistré. Créez d'abord un sponsor dans la section « Sponsors ».</div>}

    {!loading && list.length > 0 && <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2"><Link2 className="text-jso-blue" size={18}/><h2 className="text-lg font-black">Liens d'activation</h2></div>
        <div className="mt-4 space-y-3">
          {list.map(s => <div key={s.id} className="rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <b className="truncate">{s.name}</b>
              <span className="shrink-0 rounded-full bg-jso-gold/20 px-2 py-0.5 text-xs font-bold text-jso-navy">{s.tier}</span>
            </div>
            {s.activationSlug ? <div className="mt-2">
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-2 py-1 text-xs text-slate-600" title={activationUrl(s.activationSlug)}>{activationUrl(s.activationSlug)}</code>
                <button onClick={() => copyUrl(s.activationSlug)} className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"><Copy size={12}/>{copied === s.activationSlug ? 'Copié' : 'Copier'}</button>
              </div>
              <p className="mt-1 text-xs text-slate-400">Encodez cette URL dans un QR code à imprimer. Astuce : ajoutez <code>?c=Stadium</code> ou <code>?c=Program</code> pour distinguer le canal.</p>
            </div> : <p className="mt-2 text-xs text-slate-500">Aucun lien d'activation généré pour l'instant.</p>}
            <div className="mt-2 flex items-center gap-2">
              <button disabled={busyId === s.id} onClick={() => generate(s)} className="flex items-center gap-1 rounded-lg bg-jso-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-jso-blue disabled:opacity-50"><RefreshCw size={12}/>{s.activationSlug ? 'Régénérer' : 'Générer'}</button>
              <button onClick={() => openReport(s)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"><BarChart3 size={12}/>Rapport</button>
            </div>
          </div>)}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2"><BarChart3 className="text-jso-blue" size={18}/><h2 className="text-lg font-black">Rapport de scans</h2></div>
        {!selected && <p className="mt-4 text-sm text-slate-500">Sélectionnez un sponsor pour afficher le rapport d'activation.</p>}
        {selected && reportLoading && <p className="mt-4 text-sm text-slate-500">Chargement du rapport…</p>}
        {selected && !reportLoading && report && <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-500">{report.name}</p>
            <p className="mt-1 text-3xl font-black">{report.total}</p>
            <p className="text-xs text-slate-400">scans au total (anonymes)</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Par canal</p>
            {report.byChannel.length === 0 ? <p className="mt-1 text-sm text-slate-500">Aucun scan pour l'instant.</p>
              : <div className="mt-2 space-y-1">{report.byChannel.map(c => <div key={c.channel} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm"><span>{c.channel}</span><b>{c.count}</b></div>)}</div>}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Par jour</p>
            {report.byDay.length === 0 ? <p className="mt-1 text-sm text-slate-500">Aucun scan pour l'instant.</p>
              : <div className="mt-2 space-y-1">{report.byDay.map(d => <div key={d.date} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm"><span>{fmtDate(d.date)}</span><b>{d.count}</b></div>)}</div>}
          </div>
        </div>}
      </div>
    </div>}
  </div>
}
