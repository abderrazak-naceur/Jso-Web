import { useEffect, useState } from 'react'
import { Plus, Pencil, Save, X, Flag, ToggleLeft, ToggleRight } from 'lucide-react'
import { API_BASE_URL } from '../lib/apiConfig'

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

const emptyFlag = { key: '', enabled: false, variant: '', rolloutPercent: '', description: '' }

function fmtDate(d) { return d ? new Date(d).toLocaleString('fr-FR') : '—' }

// Feature flags et test A/B (idée E18) : activer/désactiver des fonctions ou
// des variantes de contenu sans publier de version, avec un déploiement
// progressif optionnel (pourcentage de trafic). L'API publique n'expose que
// les flags actifs ; la gestion est réservée aux rôles SuperAdmin / ClubAdmin
// et chaque écriture est auditée. Aucune profilation personnelle : le
// pourcentage est un tirage local côté client, sans donnée personnelle.
export default function FeatureFlagsModule({ onError }) {
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(emptyFlag)
  const [editing, setEditing] = useState(null)

  async function load() {
    setLoading(true)
    try {
      setFlags(await api('/admin/feature-flags'))
      onError('')
    } catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function edit(flag) {
    setEditing(flag.id)
    setForm({
      key: flag.key || '',
      enabled: !!flag.enabled,
      variant: flag.variant || '',
      rolloutPercent: flag.rolloutPercent != null ? String(flag.rolloutPercent) : '',
      description: flag.description || '',
    })
  }
  function reset() { setForm(emptyFlag); setEditing(null) }

  async function save(e) {
    e.preventDefault()
    try {
      const body = {
        key: form.key.trim(),
        enabled: form.enabled,
        variant: form.variant.trim() || null,
        rolloutPercent: form.rolloutPercent === '' ? null : Number(form.rolloutPercent),
        description: form.description.trim() || null,
      }
      if (editing) await api('/admin/feature-flags/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/feature-flags', { method: 'POST', body: JSON.stringify(body) })
      reset()
      await load()
    } catch (err) { onError(err.message) }
  }

  async function toggle(id) {
    try { await api('/admin/feature-flags/' + id + '/toggle', { method: 'POST' }); await load() }
    catch (err) { onError(err.message) }
  }

  async function remove(id) {
    if (!confirm('Supprimer définitivement ce feature flag ?')) return
    try { await api('/admin/feature-flags/' + id, { method: 'DELETE' }); if (editing === id) reset(); await load() }
    catch (err) { onError(err.message) }
  }

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2"><Flag className="text-jso-blue" size={20}/><h2 className="text-xl font-black">Feature flags</h2></div>
      <p className="mt-1 text-xs text-slate-400">Activez ou désactivez des fonctions et des variantes de contenu sans publier de version. Seuls les flags actifs sont exposés à l'API publique. Le pourcentage de déploiement est un tirage local côté client : aucune profilation ni donnée personnelle n'est stockée.</p>
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Flags configurés</h2>
        <div className="mt-5 space-y-2">
          {loading ? <p className="text-sm text-slate-400">Chargement…</p>
            : flags.length === 0 ? <p className="text-sm text-slate-500">Aucun feature flag pour le moment. Créez le premier avec le formulaire.</p>
            : flags.map(f => <div key={f.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3">
                <div>
                  <b className="font-mono">{f.key}</b>
                  <span className={'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ' + (f.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600')}>{f.enabled ? 'Actif' : 'Inactif'}</span>
                  {f.variant && <span className="ml-2 rounded-full bg-jso-navy px-2 py-0.5 text-xs font-bold text-white">Variante : {f.variant}</span>}
                  {f.rolloutPercent != null && <span className="ml-2 text-xs font-bold text-jso-blue">{f.rolloutPercent} %</span>}
                  {f.description && <p className="mt-1 text-xs text-slate-500">{f.description}</p>}
                  <p className="mt-1 text-xs text-slate-400">Mis à jour le {fmtDate(f.updatedAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => toggle(f.id)} title={f.enabled ? 'Désactiver' : 'Activer'} className={f.enabled ? 'text-emerald-600' : 'text-slate-400'}>{f.enabled ? <ToggleRight size={20}/> : <ToggleLeft size={20}/>}</button>
                  <button onClick={() => edit(f)} title="Modifier" className="text-jso-blue"><Pencil size={16}/></button>
                  <button onClick={() => remove(f.id)} title="Supprimer" className="text-red-600"><X size={16}/></button>
                </div>
              </div>)}
        </div>
      </div>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">{editing ? 'Modifier le flag' : 'Nouveau flag'}</h2>
        <form onSubmit={save} className="mt-5 space-y-3">
          <label className="block text-sm font-bold">Clé
            <input value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} required maxLength="120" placeholder="ex. new-home-hero" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono outline-none focus:border-jso-blue"/>
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} className="h-4 w-4 rounded border-slate-300"/>
            Actif (exposé à l'API publique)
          </label>
          <label className="block text-sm font-bold">Variante A/B (facultatif)
            <input value={form.variant} onChange={e => setForm({ ...form, variant: e.target.value })} maxLength="60" placeholder="ex. A, B, control" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
          </label>
          <label className="block text-sm font-bold">Déploiement progressif (%, facultatif)
            <input type="number" min="0" max="100" value={form.rolloutPercent} onChange={e => setForm({ ...form, rolloutPercent: e.target.value })} placeholder="0 à 100" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
          </label>
          <label className="block text-sm font-bold">Description (facultatif)
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength="500" rows="3" placeholder="Ce que contrôle ce flag" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/>
          </label>
          <div className="flex gap-2 pt-2">
            <button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white">{editing ? <><Save size={16}/> Mettre à jour</> : <><Plus size={16}/> Enregistrer</>}</button>
            {editing && <button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}
          </div>
        </form>
      </div>
    </div>
  </div>
}
