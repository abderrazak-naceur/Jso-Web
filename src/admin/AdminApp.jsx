import { useEffect, useMemo, useState } from 'react'
import { LayoutDashboard, LogOut, Menu, ShieldCheck, Trophy, Users, Newspaper, Images, X, Plus, Pencil, Save, Eye, EyeOff, Upload } from 'lucide-react'

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5080/api').replace(/\/$/, '')

async function api(path, options = {}) {
  const token = localStorage.getItem('jso_admin_token')
  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(options.headers || {}),
    },
  })
  if (!response.ok) {
    let message = 'Request failed: ' + response.status
    try { message = (await response.json()).message || message } catch {}
    throw new Error(message)
  }
  if (response.status === 204) return null
  return response.json()
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@jso.tn')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      localStorage.setItem('jso_admin_token', result.accessToken)
      localStorage.setItem('jso_admin_user', JSON.stringify(result.user))
      onLogin(result.user)
    } catch (e) { setError(e.message || 'Identifiants invalides ou API indisponible.') }
  }

  return <main className="grid min-h-screen place-items-center bg-jso-navy px-5 py-10">
    <form onSubmit={submit} className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-jso-navy text-xl font-black text-jso-gold">JSO</div>
      <p className="mt-8 text-xs font-extrabold tracking-[0.2em] text-jso-blue">ADMINISTRATION</p>
      <h1 className="mt-2 text-4xl font-black text-jso-ink">Connexion</h1>
      <p className="mt-2 text-sm text-slate-500">Accès sécurisé au back office JSO.</p>
      <label className="mt-7 block text-sm font-bold">Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" /></label>
      <label className="mt-4 block text-sm font-bold">Mot de passe<input value={password} onChange={e => setPassword(e.target.value)} type="password" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" /></label>
      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      <button className="mt-6 w-full rounded-xl bg-jso-navy px-4 py-3 font-extrabold text-white hover:bg-jso-blue">Se connecter</button>
    </form>
  </main>
}

const emptyTeam = { name: '', category: 'Équipe première', isActive: true }
const emptyPlayer = { firstName: '', lastName: '', shirtNumber: '', position: '', photoUrl: '', isActive: true }
const emptyNews = { title: '', slug: '', excerpt: '', body: '', status: 'Draft', publishedAt: '', coverImageUrl: '' }

function Field({ label, ...props }) {
  return <label className="block text-sm font-bold">{label}<input {...props} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue" /></label>
}

const emptyContent = { key: '', value: '' }

function ContentModule({ onError }) {
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      setLoading(true)
      const data = await api('/admin/content')
      setItems(data)
      if (selected) {
        const current = data.find(x => x.key === selected.key)
        if (current) setValue(current.value)
      }
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
      await api('/admin/content/' + encodeURIComponent(selected.key), {
        method: 'PUT',
        body: JSON.stringify({ value }),
      })
      await load()
    } catch (e) { onError(e.message) }
  }

  return <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-black">Contenus du site</h2><p className="mt-1 text-sm text-slate-500">Textes éditables de la homepage.</p></div>
        <button onClick={load} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold">Actualiser</button>
      </div>
      <div className="mt-5 space-y-2">
        {loading ? <p className="text-sm text-slate-400">Chargement…</p> : items.map(item => <button key={item.key} onClick={() => select(item)} className={'w-full rounded-xl p-3 text-left ' + (selected?.key === item.key ? 'bg-jso-navy text-white' : 'bg-slate-50 hover:bg-slate-100')}><b>{item.key}</b><span className="mt-1 block truncate text-xs opacity-70">{item.value}</span></button>)}
        {!loading && !items.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Aucun contenu enregistré.</p>}
      </div>
    </div>
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">{selected ? selected.key : 'Sélectionner un contenu'}</h2>
      {selected ? <form onSubmit={save} className="mt-5">
        <label className="block text-sm font-bold">Valeur<textarea value={value} onChange={e => setValue(e.target.value)} rows="14" className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-jso-blue" /></label>
        <button className="mt-4 flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/>Enregistrer</button>
      </form> : <p className="mt-3 text-sm text-slate-500">Choisis un champ à modifier.</p>}
    </div>
  </div>
}

function ClubSettingsModule({ onError }) {
  const [form, setForm] = useState({ name: '', shortName: '', country: '', city: '', description: '', logoUrl: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  async function load() {
    try {
      setLoading(true)
      const club = await api('/admin/club')
      setForm({ name: club.name || '', shortName: club.shortName || '', country: club.country || '', city: club.city || '', description: club.description || '', logoUrl: club.logoUrl || '' })
    } catch (e) { onError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  async function save(e) {
    e.preventDefault(); setSaved(false)
    try { setSaving(true); await api('/admin/club', { method: 'PUT', body: JSON.stringify(form) }); setSaved(true) }
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

function SecurityModule({ onError }) {
  const [users,setUsers]=useState([]); const [logs,setLogs]=useState([])
  useEffect(()=>{ Promise.all([api('/admin/security/users'),api('/admin/audit?take=50')]).then(([u,l])=>{setUsers(u);setLogs(l)}).catch(e=>onError(e.message)) },[])
  return <div className="space-y-6"><div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">Utilisateurs administrateurs</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Utilisateur</th><th className="p-2">Rôle</th><th className="p-2">Statut</th><th className="p-2">Dernière connexion</th></tr></thead><tbody>{users.map(u=><tr key={u.id} className="border-b last:border-0"><td className="p-2"><b>{u.displayName}</b><div className="text-xs text-slate-500">{u.email}</div></td><td className="p-2 font-semibold">{u.role}</td><td className="p-2">{u.isActive?'Actif':'Désactivé'}</td><td className="p-2">{u.lastLoginAt?new Date(u.lastLoginAt).toLocaleString('fr-FR'):'Jamais'}</td></tr>)}</tbody></table></div></div><div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">Audit Log</h2><div className="mt-4 space-y-2">{logs.map(l=><div key={l.id} className="rounded-xl bg-slate-50 p-3 text-sm"><div className="flex justify-between gap-3"><b>{l.action} · {l.entityType}</b><span className="text-xs text-slate-400">{new Date(l.createdAt).toLocaleString('fr-FR')}</span></div><p className="mt-1 text-xs text-slate-500">{l.userEmail||'Système'}{l.entityId?' · '+l.entityId:''}</p></div>)}</div></div></div>
}

function MediaModule({ onError }) {
  const [items,setItems]=useState([]); const [file,setFile]=useState(null); const [title,setTitle]=useState(''); const [caption,setCaption]=useState('')
  async function load(){try{setItems(await api('/admin/media'))}catch(e){onError(e.message)}} useEffect(()=>{load()},[])
  async function upload(e){e.preventDefault();if(!file)return;try{const fd=new FormData();fd.append('file',file);fd.append('title',title);fd.append('caption',caption);await api('/admin/media/upload',{method:'POST',body:fd,headers:{}});setFile(null);setTitle('');setCaption('');e.target.reset();await load()}catch(e){onError(e.message)}}
  async function remove(id){if(!confirm('Supprimer ce média ?'))return;try{await api('/admin/media/'+id,{method:'DELETE'});await load()}catch(e){onError(e.message)}}
  return <div className="space-y-6">
    <form onSubmit={upload} className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-black">Media Library</h2><p className="text-xs text-slate-500">Images · JPEG, PNG, WebP, GIF · maximum 10 MB</p></div></div>
      <div className="mt-5 grid gap-4 md:grid-cols-3"><Field label="Titre" value={title} onChange={e=>setTitle(e.target.value)}/><Field label="Légende" value={caption} onChange={e=>setCaption(e.target.value)}/><label className="text-sm font-bold">Image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>setFile(e.target.files?.[0]||null)} className="mt-2 block w-full rounded-xl border p-2"/></label></div>
      {file&&<p className="mt-3 text-xs text-slate-500">{file.name} · {(file.size/1024/1024).toFixed(2)} MB</p>}
      <button disabled={!file} className="mt-4 flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-3 font-bold text-white disabled:opacity-40"><Upload size={16}/>Uploader le média</button>
    </form>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{items.map(m=><div key={m.id} className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white"><div className="aspect-video bg-slate-100">{m.url&&<img src={m.url} alt={m.title} className="h-full w-full object-cover" loading="lazy"/>}</div><div className="p-4"><b className="block truncate">{m.title}</b><p className="mt-1 text-xs text-slate-500">{m.fileSize?((m.fileSize/1024/1024).toFixed(2)+' MB'):m.type}</p><button onClick={()=>remove(m.id)} className="mt-3 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700"><X size={13} className="mr-1 inline"/>Supprimer</button></div></div>)}</div>
  </div>
}

