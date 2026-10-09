import { useEffect, useState } from 'react'
import { Images, Check, Ban, X } from 'lucide-react'
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

const STATUS_LABELS = { Pending: 'En attente', Approved: 'Approuvée', Rejected: 'Refusée' }
const STATUS_STYLES = {
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
}
const FILTERS = ['Pending', 'Approved', 'Rejected', '']

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }
function mediaSrc(url) { return url && url.startsWith('/') ? API_BASE_URL.replace(/\/api\/?$/, '') + url : url }

// Photos supporters (idée A2) : file de modération des photos envoyées par les
// tifosi. La modération est OBLIGATOIRE avant publication : une photo reste
// « En attente » jusqu'à ce qu'un CommunityManager / Editor l'approuve, et
// seules les photos approuvées apparaissent dans la galerie publique.
// Vie privée / RGPD : l'envoi vaut consentement à la publication, le tifoso
// peut demander le retrait. Attention aux visages de mineurs : refuser toute
// photo douteuse. La galerie publique n'expose aucune donnée personnelle.
export default function FanPhotosModule({ onError }) {
  const [photos, setPhotos] = useState([])
  const [filter, setFilter] = useState('Pending')
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const q = filter ? '?status=' + encodeURIComponent(filter) : ''
      setPhotos(await api('/admin/fan-photos' + q))
      onError('')
    } catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [filter])

  async function moderate(id, action) {
    try { await api('/admin/fan-photos/' + id + '/' + action, { method: 'POST' }); await load() }
    catch (err) { onError(err.message) }
  }

  async function remove(id) {
    if (!confirm('Supprimer définitivement cette photo ? Le fichier stocké sera aussi effacé.')) return
    try { await api('/admin/fan-photos/' + id, { method: 'DELETE' }); await load() }
    catch (err) { onError(err.message) }
  }

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2"><Images className="text-jso-blue" size={20}/><h2 className="text-xl font-black">Photos supporters</h2></div>
      <p className="mt-1 text-xs text-slate-400">Modération obligatoire avant publication : seules les photos approuvées apparaissent dans la galerie communautaire publique. L'envoi vaut consentement à la publication ; refuser toute photo douteuse, en particulier les visages de mineurs sans consentement. La galerie publique n'expose aucune donnée personnelle du tifoso.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map(f => <button key={f || 'all'} onClick={() => setFilter(f)} className={'rounded-full px-3 py-1.5 text-xs font-bold transition-colors ' + (filter === f ? 'bg-jso-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>{f ? STATUS_LABELS[f] : 'Toutes'}</button>)}
      </div>
    </div>

    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">Photos {filter && '— ' + STATUS_LABELS[filter]}</h2>
      {loading ? <p className="mt-5 text-sm text-slate-400">Chargement…</p>
        : photos.length === 0 ? <p className="mt-5 text-sm text-slate-500">Aucune photo dans cette file.</p>
        : <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {photos.map(p => <div key={p.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <div className="aspect-video w-full overflow-hidden bg-slate-200">
                <img src={mediaSrc(p.url)} alt={p.caption || 'Photo supporter'} loading="lazy" className="h-full w-full object-cover"/>
              </div>
              <div className="p-3">
                <span className={'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ' + (STATUS_STYLES[p.status] || 'bg-slate-200 text-slate-600')}>{STATUS_LABELS[p.status] || p.status}</span>
                {p.caption && <p className="mt-2 text-sm text-slate-700">{p.caption}</p>}
                <p className="mt-1 text-xs text-slate-400">Envoyée le {fmtDate(p.submittedAt)}</p>
                <div className="mt-3 flex items-center gap-3">
                  {p.status !== 'Approved' && <button onClick={() => moderate(p.id, 'approve')} title="Approuver" className="flex items-center gap-1 text-sm font-bold text-emerald-600"><Check size={16}/> Approuver</button>}
                  {p.status !== 'Rejected' && <button onClick={() => moderate(p.id, 'reject')} title="Refuser" className="flex items-center gap-1 text-sm font-bold text-amber-600"><Ban size={16}/> Refuser</button>}
                  <button onClick={() => remove(p.id)} title="Supprimer" className="ml-auto flex items-center gap-1 text-sm font-bold text-red-600"><X size={16}/> Supprimer</button>
                </div>
              </div>
            </div>)}
          </div>}
    </div>
  </div>
}
