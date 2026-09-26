import { useEffect, useState } from 'react'
import { LayoutDashboard, LogOut, Menu, ShieldCheck, Trophy, Users, Newspaper, Images, X, Plus, Pencil, Save, Eye, Upload } from 'lucide-react'
import { API_BASE_URL } from '../lib/apiConfig'

async function api(path, options = {}) {
  const token = localStorage.getItem('jso_admin_token')
  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers,
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

function EventsModule({ onError }) {
  const [matches,setMatches]=useState([]); const [selected,setSelected]=useState(''); const [events,setEvents]=useState([]); const [form,setForm]=useState({minute:0,type:'Goal',playerName:'',notes:''})
  async function load(){try{const data=await api('/admin/matches');setMatches(data);if(!selected&&data[0])loadEvents(data[0].id)}catch(e){onError(e.message)}}
  async function loadEvents(id){try{setSelected(id);setEvents(await api('/admin/matches/'+id+'/events'))}catch(e){onError(e.message)}}
  useEffect(()=>{load()},[])
  async function add(e){e.preventDefault();try{await api('/admin/matches/'+selected+'/events',{method:'POST',body:JSON.stringify({...form,minute:Number(form.minute)})});setForm({minute:0,type:'Goal',playerName:'',notes:''});await loadEvents(selected)}catch(e){onError(e.message)}}
  async function remove(id){try{await api('/admin/matches/'+selected+'/events/'+id,{method:'DELETE'});await loadEvents(selected)}catch(e){onError(e.message)}}
  return <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">Matchs</h2><div className="mt-4 space-y-2">{matches.map(m=><button key={m.id} onClick={()=>loadEvents(m.id)} className={'w-full rounded-xl p-3 text-left '+(selected===m.id?'bg-jso-navy text-white':'bg-slate-50')}><b>JSO — {m.opponentName}</b><span className="block text-xs opacity-70">{new Date(m.kickoffAt).toLocaleString('fr-FR')}</span></button>)}</div></div><div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">Événements</h2>{selected?<><form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Minute" type="number" min="0" max="200" value={form.minute} onChange={e=>setForm({...form,minute:e.target.value})} required/><label className="text-sm font-bold">Type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option>Goal</option><option>YellowCard</option><option>RedCard</option><option>Substitution</option><option>VAR</option><option>Other</option></select></label><Field label="Joueur" value={form.playerName} onChange={e=>setForm({...form,playerName:e.target.value})}/><Field label="Note" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/><button className="sm:col-span-2 flex items-center justify-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Plus size={16}/>Ajouter l’événement</button></form><div className="mt-6 space-y-2">{events.map(ev=><div key={ev.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><div><b>{ev.minute}' · {ev.type}</b><span className="ml-2 text-sm text-slate-600">{ev.playerName||''}</span>{ev.notes&&<p className="text-xs text-slate-500">{ev.notes}</p>}</div><button onClick={()=>remove(ev.id)} className="text-red-600"><X size={16}/></button></div>)}{!events.length&&<p className="text-sm text-slate-500">Aucun événement enregistré.</p>}</div></>:<p className="mt-3 text-sm text-slate-500">Sélectionne un match.</p>}</div></div>
}

function AdminDashboard({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  const items = [
    ['dashboard', 'Dashboard', LayoutDashboard, ['SuperAdmin','ClubAdmin','Editor','MatchManager','CommunityManager','ShopManager']],
    ['club', 'Club Settings', ShieldCheck, ['SuperAdmin','ClubAdmin']],
    ['matches', 'Match Center', Trophy, ['SuperAdmin','ClubAdmin','MatchManager']],
    ['events', 'Événements', Trophy, ['SuperAdmin','ClubAdmin','MatchManager']],
    ['teams', 'Équipes & joueurs', Users, ['SuperAdmin','ClubAdmin']],
    ['news', 'News CMS', Newspaper, ['SuperAdmin','ClubAdmin','Editor']],
    ['security', 'Sécurité', ShieldCheck, ['SuperAdmin']],
    ['media', 'Médias', Images, ['SuperAdmin','ClubAdmin','Editor']],
    ['content', 'Contenus', Pencil, ['SuperAdmin','ClubAdmin','Editor']],
  ]
  const visibleItems = items.filter(([, , , roles]) => roles.includes(user.Role))

  async function loadDashboard() {
    try { setStats(await api('/admin/dashboard')); setError('') } catch (e) { setError(e.message) }
  }
  useEffect(() => { if (section === 'dashboard') loadDashboard() }, [section])

  function navigate(next) { setSection(next); setOpen(false); setError('') }

  function logout() {
    localStorage.removeItem('jso_admin_token')
    localStorage.removeItem('jso_admin_user')
    onLogout()
  }

  return <main className="min-h-screen bg-jso-paper text-jso-ink">
    <aside className={'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white p-6 transition-transform ' + (open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')}>
      <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-jso-navy font-black text-jso-gold">JSO</span><div><p className="font-black">JSO Admin</p><p className="text-xs text-slate-400">{user.Role}</p></div></div><button className="lg:hidden" onClick={() => setOpen(false)}><X /></button></div>
      <nav className="mt-10 flex-1 space-y-2">{visibleItems.map(([id,label,Icon]) => <button key={id} onClick={() => navigate(id)} className={'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold ' + (section === id ? 'bg-jso-navy text-white' : 'text-slate-600 hover:bg-slate-100')}><Icon size={18}/>{label}</button>)}</nav>
      <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-red-50 hover:text-red-700"><LogOut size={18}/>Déconnexion</button>
    </aside>
    <div className="lg:pl-72">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur-xl lg:px-8">
        <button className="lg:hidden" onClick={() => setOpen(true)}><Menu /></button>
        <div><p className="text-xs font-extrabold tracking-[0.2em] text-jso-blue">COMMAND CENTER</p><h1 className="text-2xl font-black">{section === 'dashboard' ? 'Bonjour, ' + user.DisplayName : visibleItems.find(x => x[0] === section)?.[1]}</h1></div>
        <span className="hidden rounded-full bg-jso-gold/20 px-3 py-2 text-xs font-extrabold text-jso-navy sm:block">{user.Role}</span>
      </header>
      <section className="mx-auto max-w-7xl p-5 lg:p-8">
        {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</div>}
        {section === 'dashboard' && <DashboardStats stats={stats}/>}
        {section === 'club' && <ClubSettingsModule onError={setError}/>}
        {section === 'teams' && <TeamsModule onError={setError}/>}
        {section === 'matches' && <MatchesModule onError={setError}/>}
        {section === 'events' && <EventsModule onError={setError}/>}
        {section === 'news' && <NewsModule onError={setError}/>}
        {section === 'security' && <SecurityModule onError={setError}/>}
        {section === 'media' && <MediaModule onError={setError}/>}
        {section === 'content' && <ContentModule onError={setError}/>}
      </section>
    </div>
  </main>
}

function DashboardStats({ stats }) {
  const cards = stats ? [
    ['Parties à venir', stats.matches.upcoming, Trophy], ['Résultats', stats.matches.finished, Trophy],
    ['News publiées', stats.news.published, Newspaper], ['Brouillons', stats.news.drafts, Newspaper],
    ['Équipes', stats.teams, Users], ['Joueurs actifs', stats.players, Users],
  ] : []
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.length ? cards.map(([label,value,Icon]) => <div key={label} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"><Icon className="text-jso-blue" size={22}/><p className="mt-7 text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 text-4xl font-black">{value}</p></div>) : <div className="rounded-[1.5rem] bg-white p-8 text-slate-500">Chargement du dashboard…</div>}</div>
}

function TeamsModule({ onError }) {
  const [teams,setTeams]=useState([]); const [team,setTeam]=useState(emptyTeam); const [editing,setEditing]=useState(null)
  const [players,setPlayers]=useState([]); const [selected,setSelected]=useState(''); const [player,setPlayer]=useState(emptyPlayer); const [editingPlayer,setEditingPlayer]=useState(null)

  async function load() { try { const data=await api('/admin/teams'); setTeams(data); if (!selected && data[0]) selectTeam(data[0].id) } catch(e){onError(e.message)} }
  async function selectTeam(id) { setSelected(id); setPlayers(await api('/admin/teams/'+id+'/players')) }
  useEffect(()=>{load()},[])
  async function saveTeam(e){e.preventDefault(); try { const body={name:team.name,category:team.category,isActive:team.isActive}; if(editing) await api('/admin/teams/'+editing,{method:'PUT',body:JSON.stringify(body)}); else await api('/admin/teams',{method:'POST',body:JSON.stringify(body)}); setTeam(emptyTeam);setEditing(null);await load()}catch(e){onError(e.message)}}
  async function savePlayer(e){e.preventDefault(); try { const body={...player,shirtNumber:player.shirtNumber ? Number(player.shirtNumber):null}; if(editingPlayer) await api('/admin/teams/'+selected+'/players/'+editingPlayer,{method:'PUT',body:JSON.stringify(body)}); else await api('/admin/teams/'+selected+'/players',{method:'POST',body:JSON.stringify(body)});setPlayer(emptyPlayer);setEditingPlayer(null);await selectTeam(selected)}catch(e){onError(e.message)}}
  return <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between"><h2 className="text-xl font-black">Équipes</h2><Plus size={18}/></div>
      <div className="mt-5 space-y-2">{teams.map(t=><button key={t.id} onClick={()=>selectTeam(t.id)} className={'w-full rounded-xl p-3 text-left '+(selected===t.id?'bg-jso-navy text-white':'bg-slate-50')}><b>{t.name}</b><span className="ml-2 text-xs opacity-70">{t.category}</span></button>)}</div>
      <form onSubmit={saveTeam} className="mt-6 space-y-3 border-t pt-5"><Field label="Nom" value={team.name} onChange={e=>setTeam({...team,name:e.target.value})} required/><Field label="Catégorie" value={team.category} onChange={e=>setTeam({...team,category:e.target.value})} required/><button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/> {editing?'Mettre à jour':'Créer l’équipe'}</button></form>
      <div className="mt-4 space-y-2">{teams.map(t=><button key={'edit'+t.id} onClick={()=>{setEditing(t.id);setTeam({name:t.name,category:t.category,isActive:t.isActive})}} className="mr-2 rounded-lg px-2 py-1 text-xs font-bold text-jso-blue"><Pencil size={13} className="inline"/> {t.name}</button>)}</div>
    </div>
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">Joueurs {selected && '— '+(teams.find(t=>t.id===selected)?.name||'')}</h2>
      <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">#</th><th className="p-2">Joueur</th><th className="p-2">Poste</th><th className="p-2"></th></tr></thead><tbody>{players.map(p=><tr key={p.id} className="border-b last:border-0"><td className="p-2 font-black">{p.shirtNumber??'—'}</td><td className="p-2 font-bold">{p.firstName} {p.lastName}</td><td className="p-2">{p.position||'—'}</td><td className="p-2"><button onClick={()=>{setEditingPlayer(p.id);setPlayer({...p,shirtNumber:p.shirtNumber??''})}} className="text-jso-blue"><Pencil size={16}/></button></td></tr>)}</tbody></table></div>
      {selected && <form onSubmit={savePlayer} className="mt-6 grid gap-3 border-t pt-5 sm:grid-cols-2"><Field label="Prénom" value={player.firstName} onChange={e=>setPlayer({...player,firstName:e.target.value})} required/><Field label="Nom" value={player.lastName} onChange={e=>setPlayer({...player,lastName:e.target.value})} required/><Field label="Numéro" type="number" value={player.shirtNumber} onChange={e=>setPlayer({...player,shirtNumber:e.target.value})}/><Field label="Poste" value={player.position} onChange={e=>setPlayer({...player,position:e.target.value})}/><Field label="Photo URL" value={player.photoUrl} onChange={e=>setPlayer({...player,photoUrl:e.target.value})}/><button className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/>{editingPlayer?'Mettre à jour':'Ajouter le joueur'}</button></form>}
    </div>
  </div>
}

function MatchesModule({ onError }) {
  const [matches,setMatches]=useState([]); const [refs,setRefs]=useState({seasons:[],competitions:[],teams:[]}); const [editing,setEditing]=useState(null)
  const [form,setForm]=useState({opponentName:'',kickoffAt:'',venue:'',isHome:true,homeScore:'',awayScore:'',status:'Scheduled',isPublished:false,seasonId:'',competitionId:'',teamId:''})
  async function load(){try{const [m,r]=await Promise.all([api('/admin/matches'),api('/admin/matches/references')]);setMatches(m);setRefs(r);if(!form.seasonId&&r.seasons[0])setForm(f=>({...f,seasonId:r.seasons[0].id,competitionId:r.competitions[0]?.id||'',teamId:r.teams[0]?.id||''}))}catch(e){onError(e.message)}}
  useEffect(()=>{load()},[])
  function startEdit(m){setEditing(m.id);setForm({...m,kickoffAt:m.kickoffAt?.slice(0,16)||'',homeScore:m.homeScore??'',awayScore:m.awayScore??''})}
  async function save(e){e.preventDefault();try{const body={...form,kickoffAt:new Date(form.kickoffAt).toISOString(),homeScore:form.homeScore===''?null:Number(form.homeScore),awayScore:form.awayScore===''?null:Number(form.awayScore),isPublished:Boolean(form.isPublished)};if(editing)await api('/admin/matches/'+editing,{method:'PUT',body:JSON.stringify(body)});else await api('/admin/matches',{method:'POST',body:JSON.stringify(body)});setEditing(null);setForm(f=>({...f,opponentName:'',venue:'',homeScore:'',awayScore:''}));await load()}catch(e){onError(e.message)}}
  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">{editing?'Modifier le match':'Créer un match'}</h2><form onSubmit={save} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Field label="Adversaire" value={form.opponentName} onChange={e=>setForm({...form,opponentName:e.target.value})} required/><Field label="Coup d’envoi" type="datetime-local" value={form.kickoffAt} onChange={e=>setForm({...form,kickoffAt:e.target.value})} required/><Field label="Stade" value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})}/>
      <label className="text-sm font-bold">Statut<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option>Scheduled</option><option>Live</option><option>Finished</option><option>Postponed</option><option>Cancelled</option></select></label>
      {!editing && <><label className="text-sm font-bold">Saison<select value={form.seasonId} onChange={e=>setForm({...form,seasonId:e.target.value})} className="mt-2 w-full rounded-xl border p-2.5">{refs.seasons.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="text-sm font-bold">Compétition<select value={form.competitionId} onChange={e=>setForm({...form,competitionId:e.target.value})} className="mt-2 w-full rounded-xl border p-2.5">{refs.competitions.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="text-sm font-bold">Équipe<select value={form.teamId} onChange={e=>setForm({...form,teamId:e.target.value})} className="mt-2 w-full rounded-xl border p-2.5">{refs.teams.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label></>}
      <Field label="Score domicile" type="number" value={form.homeScore} onChange={e=>setForm({...form,homeScore:e.target.value})}/><Field label="Score extérieur" type="number" value={form.awayScore} onChange={e=>setForm({...form,awayScore:e.target.value})}/>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isHome} onChange={e=>setForm({...form,isHome:e.target.checked})}/> JSO à domicile</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isPublished} onChange={e=>setForm({...form,isPublished:e.target.checked})}/> Publié</label>
      <button className="flex items-center justify-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/>Enregistrer</button>
    </form></div>
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">Matchs</h2><div className="mt-4 space-y-2">{matches.map(m=><div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"><div><b>{m.isHome?'JSO':'Ext.'} — {m.opponentName}</b><p className="text-xs text-slate-500">{new Date(m.kickoffAt).toLocaleString('fr-FR')} · {m.status} · {m.isPublished?'Publié':'Brouillon'}</p></div><button onClick={()=>startEdit(m)} className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-jso-blue"><Pencil size={15} className="mr-1 inline"/>Modifier</button></div>)}</div></div>
  </div>
}

function NewsModule({ onError }) {
  const [items,setItems]=useState([]); const [editing,setEditing]=useState(null); const [form,setForm]=useState(emptyNews)
  async function load(){try{setItems(await api('/admin/news'))}catch(e){onError(e.message)}}
  useEffect(()=>{load()},[])
  function edit(item){setEditing(item.id);setForm({...item,publishedAt:item.publishedAt?.slice(0,16)||''})}
  async function save(e){e.preventDefault();try{const body={...form,publishedAt:form.publishedAt?new Date(form.publishedAt).toISOString():null};if(editing)await api('/admin/news/'+editing,{method:'PUT',body:JSON.stringify(body)});else await api('/admin/news',{method:'POST',body:JSON.stringify(body)});setEditing(null);setForm(emptyNews);await load()}catch(e){onError(e.message)}}
  async function publish(id){try{await api('/admin/news/'+id+'/publish',{method:'POST'});await load()}catch(e){onError(e.message)}}
  return <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-black">News CMS</h2><button onClick={()=>{setEditing(null);setForm(emptyNews)}} className="rounded-xl bg-jso-navy p-2 text-white"><Plus size={18}/></button></div><div className="mt-5 space-y-2">{items.map(n=><div key={n.id} className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between gap-3"><div><b>{n.title}</b><p className="text-xs text-slate-500">{n.status} · {n.slug}</p></div><div className="flex gap-2"><button onClick={()=>edit(n)} className="text-jso-blue"><Pencil size={16}/></button>{n.status!=='Published'&&<button onClick={()=>publish(n.id)} className="text-emerald-600"><Eye size={16}/></button>}</div></div></div>)}</div></div>
    <form onSubmit={save} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 space-y-3"><h2 className="text-xl font-black">{editing?'Modifier l’article':'Nouvel article'}</h2><Field label="Titre" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required/><Field label="Slug" value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} required/><Field label="Extrait" value={form.excerpt} onChange={e=>setForm({...form,excerpt:e.target.value})}/><label className="block text-sm font-bold">Contenu<textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} rows="9" className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-jso-blue"/></label><Field label="Cover URL" value={form.coverImageUrl} onChange={e=>setForm({...form,coverImageUrl:e.target.value})}/><button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/>Enregistrer</button></form>
  </div>
}

export default function AdminApp() {
  const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('jso_admin_user')||'null')}catch{return null}})
  return user ? <AdminDashboard user={user} onLogout={()=>setUser(null)}/> : <Login onLogin={setUser}/>
}

