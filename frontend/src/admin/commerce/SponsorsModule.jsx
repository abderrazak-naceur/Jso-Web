import { useEffect, useState } from 'react'
import { adminApi } from '../api'
export default function SponsorsModule({ onError }) {
  const [sponsors, setSponsors] = useState([])
  const [form, setForm] = useState(emptySponsor)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try { setSponsors(await adminApi('/admin/sponsors')); onError('') }
    catch (e) { onError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function edit(s) {
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
  function reset() { setForm(emptySponsor); setEditing(null) }

  async function save(e) {
    e.preventDefault()
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
  }

  async function remove(id) {
    try { await adminApi('/admin/sponsors/' + id, { method: 'DELETE' }); await load() }
    catch (e) { onError(e.message) }
  }

  return <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">Sponsors</h2>
      <div className="mt-5 overflow-x-auto">
        {loading ? <p className="text-sm text-slate-400">Chargement…</p>
          : sponsors.length === 0 ? <p className="text-sm text-slate-400">Aucun sponsor pour le moment.</p>
          : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Nom</th><th className="p-2">Tier</th><th className="p-2">Emplacement</th><th className="p-2">Actif</th><th className="p-2"></th></tr></thead><tbody>{sponsors.map(s => <tr key={s.id} className="border-b last:border-0"><td className="p-2 font-bold">{s.name}</td><td className="p-2">{s.tier}</td><td className="p-2">{s.placement}</td><td className="p-2">{s.isActive ? 'Oui' : 'Non'}</td><td className="p-2 whitespace-nowrap"><button onClick={() => edit(s)} className="mr-2 text-jso-blue"><Pencil size={16}/></button><button onClick={() => remove(s.id)} className="text-red-600"><X size={16}/></button></td></tr>)}</tbody></table>}
      </div>
    </div>
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">{editing ? 'Modifier le sponsor' : 'Nouveau sponsor'}</h2>
      <form onSubmit={save} className="mt-5 space-y-3">
        <Field label="Nom" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required/>
        <Field label="Logo URL" value={form.logoUrl} onChange={e => setForm({ ...form, logoUrl: e.target.value })}/>
        <Field label="Site web" value={form.websiteUrl} onChange={e => setForm({ ...form, websiteUrl: e.target.value })}/>
        <Field label="Banner publicitaire (image large) URL" value={form.bannerImageUrl} onChange={e => setForm({ ...form, bannerImageUrl: e.target.value })}/>
        <label className="block text-sm font-bold">Tier<select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue">{SPONSOR_TIERS.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
        <label className="block text-sm font-bold">Emplacement<select value={form.placement} onChange={e => setForm({ ...form, placement: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue">{SPONSOR_PLACEMENTS.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
        <Field label="Début" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}/>
        <Field label="Fin" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}/>
        <Field label="Priorité" type="number" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}/>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })}/> Actif</label>
        <div className="flex gap-2 pt-2"><button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/> {editing ? 'Mettre à jour' : 'Créer'}</button>{editing && <button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}</div>
      </form>
    </div>
  </div>
}
