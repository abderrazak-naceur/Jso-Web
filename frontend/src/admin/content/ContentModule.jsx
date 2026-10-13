import { useEffect, useState } from 'react'
import { Save, LayoutDashboard, HeartHandshake } from 'lucide-react'
import { adminApi } from '../api'

export default function ContentModule({ onError }) {
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      setLoading(true)
      const data = await adminApi('/admin/content')
      setItems(Array.isArray(data) ? data : [])
      if (selected) {
        const current = data.find(x => x.key === selected.key)
        if (current) setValue(current.value)
        else { setSelected(null); setValue('') }
      }
      onError('')
    } catch (e) { onError(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function select(item) {
    setSelected(item)
    setValue(item.value)
  }

  async function save(e) {
    e.preventDefault()
    if (!selected) return
    try {
      await adminApi('/admin/content/' + encodeURIComponent(selected.key), {
        method: 'PUT',
        body: JSON.stringify({ value }),
      })
      await load()
    } catch (e) { onError(e.message) }
  }

  return <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="text-xl font-black">Contenus du site</h2><p className="mt-1 text-sm text-slate-500">Textes éditables du site.</p></div>
        <button type="button" onClick={load} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold">Actualiser</button>
      </div>
      <div className="mt-5 space-y-2">
        {loading ? <p role="status" className="text-sm text-slate-400">Chargement…</p> : items.map(item => <button type="button" key={item.key} onClick={() => select(item)} className={'w-full rounded-xl p-3 text-left ' + (selected?.key === item.key ? 'bg-jso-navy text-white' : 'bg-slate-50 hover:bg-slate-100')}><b>{item.key}</b><span className="mt-1 block truncate text-xs opacity-70">{item.value}</span></button>)}
        {!loading && !items.length && <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="font-bold text-slate-800">Nessun testo modificabile disponibile</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Le voci che vedevi erano configurazioni tecniche (template, donazioni e pagamenti), non testi della homepage. Ora sono escluse da questa lista per evitare modifiche accidentali.</p>
          <p className="mt-3 text-sm text-slate-600">Per modificare la homepage usa le sezioni dedicate:</p>
          <a href="/admin/homepage-templates" className="mt-3 flex items-center gap-2 rounded-xl bg-jso-navy px-3 py-2.5 text-sm font-bold text-white"><LayoutDashboard size={16}/> Template homepage</a>
          <a href="/admin/donations" className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-jso-navy"><HeartHandshake size={16}/> Dons & collecte</a>
        </div>}
      </div>
    </div>
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">{selected ? selected.key : 'Seleziona un contenuto'}</h2>
      {selected ? <form onSubmit={save} className="mt-5">
        <label className="block text-sm font-bold">Valore<textarea value={value} onChange={e => setValue(e.target.value)} rows="14" className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-jso-blue" /></label>
        <button type="submit" className="mt-4 flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/>Salva modifiche</button>
      </form> : <p className="mt-3 text-sm text-slate-500">Seleziona un testo dalla lista per modificarlo.</p>}
    </div>
  </div>
}
