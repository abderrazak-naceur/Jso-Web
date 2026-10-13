import { useEffect, useRef, useState } from 'react'
import { Pencil, X, Save, Plus, ImagePlus, Trash2 } from 'lucide-react'
import { API_BASE_URL } from '../../lib/apiConfig'
import Field from '../components/Field'
import { adminApi } from '../api'
import { emptySponsor, SPONSOR_TIERS, SPONSOR_PLACEMENTS } from '../constants'
export default function SponsorsModule({ onError }) {
  const [sponsors, setSponsors] = useState([])
  const [form, setForm] = useState(emptySponsor)
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState('')
  const [saving, setSaving] = useState(false)
  const dialogRef = useRef(null)
  const returnFocusRef = useRef(null)

  async function uploadImage(file, field) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      onError('Choisissez une image JPEG, PNG, WebP ou GIF de 10 Mo maximum.')
      return
    }
    setUploading(field)
    try {
      const data = new FormData()
      data.append('file', file)
      data.append('title', `${field === 'logoUrl' ? 'Logo' : 'Bannière'} sponsor ${form.name || ''}`.trim())
      data.append('caption', form.name || 'Sponsor JSO')
      const asset = await adminApi('/admin/media/upload', { method: 'POST', body: data })
      const origin = API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL
      setForm(current => ({ ...current, [field]: asset.url?.startsWith('http') ? asset.url : origin + asset.url }))
      onError('')
    } catch (e) { onError(e.message) }
    finally { setUploading('') }
  }

  async function load() {
    setLoading(true)
    try { setSponsors(await adminApi('/admin/sponsors')); onError('') }
    catch (e) { onError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function edit(s) { setModalOpen(true);
    setEditing(s.id)
    setForm({
      name: s.name || '', logoUrl: s.logoUrl || '', websiteUrl: s.websiteUrl || '',
      bannerImageUrl: s.bannerImageUrl || '',
      tier: s.tier || 'Partner', placement: s.placement || 'Footer',
      startDate: s.startDate ? s.startDate.slice(0, 10) : '',
      endDate: s.endDate ? s.endDate.slice(0, 10) : '',
      isActive: s.isActive, priority: s.priority ?? 0,
    })
  }
  function reset() { setForm(emptySponsor); setEditing(null); setModalOpen(false) }

  async function save(e) {
    e.preventDefault()
    if (saving || uploading) return
    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        logoUrl: form.logoUrl.trim() || null,
        websiteUrl: form.websiteUrl.trim() || null,
        bannerImageUrl: form.bannerImageUrl.trim() || null,
        tier: form.tier,
        placement: form.placement,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        isActive: form.isActive,
        priority: Number(form.priority) || 0,
      }
      if (editing) await adminApi('/admin/sponsors/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      else await adminApi('/admin/sponsors', { method: 'POST', body: JSON.stringify(body) })
      reset()
      await load()
    } catch (e) { onError(e.message) }
    finally { setSaving(false) }
  }

  async function remove(id) {
    const sponsor = sponsors.find(item => item.id === id)
    if (!window.confirm(`Supprimer le sponsor « ${sponsor?.name || ''} » ?`)) return
    try { await adminApi('/admin/sponsors/' + id, { method: 'DELETE' }); await load() }
    catch (e) { onError(e.message) }
  }

  useEffect(() => {
    if (!modalOpen) return
    returnFocusRef.current = document.activeElement
    dialogRef.current?.querySelector('input:not([type="checkbox"]), select, button')?.focus()
    const manageDialogKeys = event => {
      if (event.key === 'Escape') { reset(); return }
      if (event.key !== 'Tab') return
      const focusable = [...(dialogRef.current?.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])') || [])]
        .filter(element => element.getAttribute('aria-hidden') !== 'true')
      if (!focusable.length) { event.preventDefault(); return }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault(); first.focus()
      }
    }
    window.addEventListener('keydown', manageDialogKeys)
    return () => {
      window.removeEventListener('keydown', manageDialogKeys)
      returnFocusRef.current?.focus?.()
    }
  }, [modalOpen])
  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Sponsors et publicité</h2><p className="mt-1 max-w-2xl text-sm text-slate-500">Ajoutez le logo et, si prévu, une bannière publicitaire. Les sponsors actifs placés sur Accueil ou Pied de page apparaissent sur le site public.</p></div><button type="button" onClick={() => { setForm(emptySponsor); setEditing(null); setModalOpen(true) }} className="rounded-xl bg-jso-navy px-3 py-2 font-bold text-white"><Plus size={16} className="inline mr-1"/>Nouveau sponsor</button></div>
      <div className="mt-5 overflow-x-auto">
        {loading ? <p role="status" className="text-sm text-slate-400">Chargement…</p>
          : sponsors.length === 0 ? <p className="text-sm text-slate-400">Aucun sponsor pour le moment.</p>
          : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Nom</th><th className="p-2">Tier</th><th className="p-2">Emplacement</th><th className="p-2">Actif</th><th className="p-2"><span className="sr-only">Actions</span></th></tr></thead><tbody>{sponsors.map(s => <tr key={s.id} className="border-b last:border-0"><td className="p-2 font-bold">{s.name}</td><td className="p-2">{s.tier}</td><td className="p-2">{s.placement}</td><td className="p-2">{s.isActive ? 'Oui' : 'Non'}</td><td className="p-2 whitespace-nowrap"><button type="button" aria-label={`Modifier ${s.name}`} onClick={() => edit(s)} className="mr-2 text-jso-blue"><Pencil size={16}/></button><button type="button" aria-label={`Supprimer ${s.name}`} onClick={() => remove(s.id)} className="text-red-600"><X size={16}/></button></td></tr>)}</tbody></table>}
      </div>
    </div>
{modalOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" onMouseDown={e => { if(e.target===e.currentTarget) reset() }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="admin-form-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <h2 id="admin-form-title" className="text-xl font-black">{editing ? 'Modifier' : 'Créer'} · sponsor</h2>
          <button type="button" aria-label="Fermer" onClick={reset} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20}/></button>
        </div>
        <form onSubmit={save} className="mt-5 space-y-3">
        <Field label="Nom" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required/>
        <ImageField label="Logo du sponsor" hint="Image carrée ou horizontale avec fond transparent conseillé." field="logoUrl" value={form.logoUrl} onChange={value => setForm({ ...form, logoUrl: value })} uploading={uploading === 'logoUrl'} onFile={file => uploadImage(file, 'logoUrl')} onRemove={() => setForm({ ...form, logoUrl: ''})}/>
        <Field label="Site web" value={form.websiteUrl} onChange={e => setForm({ ...form, websiteUrl: e.target.value })}/>
        <ImageField label="Bannière publicitaire (format large)" hint="Utilisée comme visuel grand format sur l’accueil. Format paysage recommandé." field="bannerImageUrl" value={form.bannerImageUrl} onChange={value => setForm({ ...form, bannerImageUrl: value })} uploading={uploading === 'bannerImageUrl'} onFile={file => uploadImage(file, 'bannerImageUrl')} onRemove={() => setForm({ ...form, bannerImageUrl: ''})}/>
        <label className="block text-sm font-bold">Tier<select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue">{SPONSOR_TIERS.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
        <label className="block text-sm font-bold">Emplacement<select value={form.placement} onChange={e => setForm({ ...form, placement: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue">{SPONSOR_PLACEMENTS.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
        <Field label="Début" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}/>
        <Field label="Fin" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}/>
        <Field label="Priorité" type="number" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}/>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })}/> Actif</label>
        <div className="flex gap-2 pt-2"><button disabled={saving || Boolean(uploading)} className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white disabled:cursor-wait disabled:opacity-50"><Save size={16}/> {uploading ? 'Téléversement en cours…' : saving ? 'Enregistrement…' : editing ? 'Mettre à jour' : 'Créer'}</button>{editing && <button type="button" onClick={reset} disabled={saving} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50">Annuler</button>}</div>
      </form>
      </section>
    </div>}
  </div>
}

function ImageField({ label, hint, field, value, onChange, uploading, onFile, onRemove }) {
  return <div className="rounded-xl border border-slate-200 p-3">
    <label className="block text-sm font-bold">{label}</label>
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    <div className="mt-2 flex flex-wrap items-center gap-3">
      {value && <img src={value} alt={`Aperçu · ${label}`} className={field === 'logoUrl' ? 'h-16 w-28 rounded-lg border border-slate-200 bg-white object-contain p-2' : 'h-16 w-40 rounded-lg border border-slate-200 bg-white object-cover'} />}
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"><ImagePlus size={16}/>{uploading ? 'Envoi…' : 'Choisir une image'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" disabled={uploading} onChange={e => { onFile(e.target.files?.[0]); e.target.value = '' }} /></label>
      {value && <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-red-600"><Trash2 size={15}/>Retirer</button>}
      <span className="text-xs text-slate-500">PNG, JPG, WebP ou GIF · 10 Mo max</span>
    </div>
    <label className="mt-3 block text-xs font-semibold text-slate-500">Ou coller une URL<input value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-800" placeholder="https://…" /></label>
  </div>
}
