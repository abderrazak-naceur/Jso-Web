import { useEffect, useState } from 'react'
import { adminApi } from '../api'
export default function ClubSettingsModule({ onError }) {
  const [form, setForm] = useState({ name: '', shortName: '', country: '', city: '', description: '', logoUrl: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  async function load() {
    try {
      setLoading(true)
      const club = await adminApi('/admin/club')
      setForm({ name: club.name || '', shortName: club.shortName || '', country: club.country || '', city: club.city || '', description: club.description || '', logoUrl: club.logoUrl || '' })
    } catch (e) { onError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  async function save(e) {
    e.preventDefault(); setSaved(false)
    try { setSaving(true); await adminApi('/admin/club', { method: 'PUT', body: JSON.stringify(form) }); setSaved(true) }
    catch (e) { onError(e.message) } finally { setSaving(false) }
  }
  if (loading) return <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-slate-500">Chargement des informations du club…</div>
  return <form onSubmit={save} className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-3xl bg-jso-navy text-2xl font-black text-jso-gold">{form.logoUrl ? <img src={form.logoUrl} alt={form.name} className="h-full w-full object-cover" /> : 'JSO'}</div>
        <div><h2 className="text-xl font-black">Identité du club</h2><p className="mt-1 text-sm text-slate-500">Informations officielles utilisées par le site public.</p></div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="Nom complet" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required maxLength="160" />
        <Field label="Nom court" value={form.shortName} onChange={e=>setForm({...form,shortName:e.target.value})} required maxLength="20" />
        <Field label="Pays" value={form.country} onChange={e=>setForm({...form,country:e.target.value})} required maxLength="80" />
        <Field label="Ville" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} required maxLength="100" />
        <Field label="Logo URL" value={form.logoUrl} onChange={e=>setForm({...form,logoUrl:e.target.value})} maxLength="1000" />
      </div>
      <label className="mt-4 block text-sm font-bold">Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} maxLength="2000" rows="7" className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-jso-blue" /></label>
      <div className="mt-5 flex flex-wrap items-center gap-3"><button disabled={saving} className="rounded-xl bg-jso-navy px-5 py-3 font-extrabold text-white hover:bg-jso-blue disabled:opacity-50"><Save size={16} className="mr-2 inline"/>{saving ? 'Enregistrement…' : 'Enregistrer'}</button><button type="button" onClick={load} className="rounded-xl border border-slate-200 px-5 py-3 font-bold">Actualiser</button>{saved && <span className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700">Modifiche salvate</span>}</div>
    </div>
  </form>
}
