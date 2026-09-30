import { useEffect, useState } from 'react'
import { LayoutDashboard, LogOut, Menu, ShieldCheck, Trophy, Users, Newspaper, Images, X, Plus, Pencil, Save, Eye, EyeOff, Upload, Server, Handshake, BarChart3, ShoppingBag, ClipboardList, Mail, Landmark, HeartPulse, BrickWall, CalendarClock, ListChecks, Megaphone, CalendarRange, ScanSearch, Flag, Gauge, ShieldAlert, PartyPopper, QrCode, GraduationCap, Receipt, FileText, HelpCircle, Ticket, MessageSquare, LayoutTemplate, CalendarDays, CreditCard, Radio, Link2, Facebook, Send, Wallet } from 'lucide-react'
import { API_BASE_URL, getConfiguredApiBaseUrl, getDefaultApiBaseUrl, setApiBaseUrl, resetApiBaseUrl } from '../lib/apiConfig'
import VolunteersModule from './Volunteers'
import NewsletterModule from './Newsletter'
import ArchiveModule from './Archive'
import InjuriesModule from './Injuries'
import SupportersModule from './Supporters'
import EditorialCalendarModule from './EditorialCalendar'
import ChecklistModule from './Checklist'
import ClassifiedsModule from './Classifieds'
import FanPhotosModule from './FanPhotos'
import CommunityModule from './Community'
import FacilitiesModule from './Facilities'
import ScoutingModule from './Scouting'
import FeatureFlagsModule from './FeatureFlags'
import AnniversariesModule from './Anniversaries'
import ApiUsageModule from './ApiUsage'
import GdprModule from './Gdpr'
import SponsorQrModule from './SponsorQr'
import CommunityProgramsModule from './CommunityPrograms'
import OrdersModule from './Orders'
import ClubEventsModule from './ClubEvents'
import DocumentsModule from './Documents'
import FaqModule from './Faq'
import TicketsModule from './Tickets'
import HomepageBuilderModule from './HomepageBuilder'
import SeasonsCompetitionsModule from './SeasonsCompetitions'
import MembershipsModule from './Memberships'
import MatchStreamsModule from './MatchStreams'
import FinanceModule from './Finance'
import { adminApi } from './api'
import ContentModule from './content/ContentModule'

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@jso.tn')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      const result = await adminApi('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
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
const emptySponsor = { name: '', logoUrl: '', websiteUrl: '', bannerImageUrl: '', tier: 'Partner', placement: 'Footer', startDate: '', endDate: '', isActive: true, priority: 0 }
const SPONSOR_TIERS = ['Title', 'Gold', 'Silver', 'Partner']
const SPONSOR_PLACEMENTS = ['Home', 'Footer', 'Matchday']
const emptyProduct = { name: '', slug: '', description: '', price: '', currency: 'TND', imageUrl: '', category: '', stock: 0, isActive: true }

function Field({ label, ...props }) {
  return <label className="block text-sm font-bold">{label}<input {...props} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue" /></label>
}


function ClubSettingsModule({ onError }) {
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

function SecurityModule({ onError }) {
  const [users,setUsers]=useState([]); const [logs,setLogs]=useState([])
  useEffect(()=>{ Promise.all([adminApi('/admin/security/users'),adminApi('/admin/audit?take=50')]).then(([u,l])=>{setUsers(u);setLogs(l)}).catch(e=>onError(e.message)) },[])
  return <div className="space-y-6"><div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">Utilisateurs administrateurs</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Utilisateur</th><th className="p-2">Rôle</th><th className="p-2">Statut</th><th className="p-2">Dernière connexion</th></tr></thead><tbody>{users.map(u=><tr key={u.id} className="border-b last:border-0"><td className="p-2"><b>{u.displayName}</b><div className="text-xs text-slate-500">{u.email}</div></td><td className="p-2 font-semibold">{u.role}</td><td className="p-2">{u.isActive?'Actif':'Désactivé'}</td><td className="p-2">{u.lastLoginAt?new Date(u.lastLoginAt).toLocaleString('fr-FR'):'Jamais'}</td></tr>)}</tbody></table></div></div><div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">Audit Log</h2><div className="mt-4 space-y-2">{logs.map(l=><div key={l.id} className="rounded-xl bg-slate-50 p-3 text-sm"><div className="flex justify-between gap-3"><b>{l.action} · {l.entityType}</b><span className="text-xs text-slate-400">{new Date(l.createdAt).toLocaleString('fr-FR')}</span></div><p className="mt-1 text-xs text-slate-500">{l.userEmail||'Système'}{l.entityId?' · '+l.entityId:''}</p></div>)}</div></div></div>
}

function MediaModule({ onError }) {
  const [items,setItems]=useState([]); const [file,setFile]=useState(null); const [title,setTitle]=useState(''); const [caption,setCaption]=useState('')
  const [editing,setEditing]=useState(null); const [editForm,setEditForm]=useState({title:'',caption:'',isPublished:true})
  async function load(){try{setItems(await adminApi('/admin/media'))}catch(e){onError(e.message)}} useEffect(()=>{load()},[])
  async function upload(e){e.preventDefault();if(!file)return;try{const fd=new FormData();fd.append('file',file);fd.append('title',title);fd.append('caption',caption);await adminApi('/admin/media/upload',{method:'POST',body:fd,headers:{}});setFile(null);setTitle('');setCaption('');e.target.reset();await load()}catch(e){onError(e.message)}}
  async function remove(id){if(!confirm('Supprimer ce média ?'))return;try{await adminApi('/admin/media/'+id,{method:'DELETE'});await load()}catch(e){onError(e.message)}}
  function startEdit(m){setEditing(m.id);setEditForm({title:m.title||'',caption:m.caption||'',isPublished:m.isPublished!==false})}
  function cancelEdit(){setEditing(null)}
  async function saveEdit(m){
    try{
      // The backend PUT replaces the record, so resend the unchanged url/type/thumbnail.
      const body={title:editForm.title.trim(),caption:editForm.caption.trim()||null,url:m.url,type:m.type||'Image',thumbnailUrl:m.thumbnailUrl||null,isPublished:editForm.isPublished}
      await adminApi('/admin/media/'+m.id,{method:'PUT',body:JSON.stringify(body)})
      setEditing(null);onError('');await load()
    }catch(e){onError(e.message)}
  }
  return <div className="space-y-6">
    <form onSubmit={upload} className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-black">Media Library</h2><p className="text-xs text-slate-500">Images · JPEG, PNG, WebP, GIF · maximum 10 MB</p></div></div>
      <div className="mt-5 grid gap-4 md:grid-cols-3"><Field label="Titre" value={title} onChange={e=>setTitle(e.target.value)}/><Field label="Légende" value={caption} onChange={e=>setCaption(e.target.value)}/><label className="text-sm font-bold">Image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>setFile(e.target.files?.[0]||null)} className="mt-2 block w-full rounded-xl border p-2"/></label></div>
      {file&&<p className="mt-3 text-xs text-slate-500">{file.name} · {(file.size/1024/1024).toFixed(2)} MB</p>}
      <button disabled={!file} className="mt-4 flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-3 font-bold text-white disabled:opacity-40"><Upload size={16}/>Uploader le média</button>
    </form>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{items.map(m=><div key={m.id} className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white"><div className="aspect-video bg-slate-100">{m.url&&<img src={m.url} alt={m.title} className="h-full w-full object-cover" loading="lazy"/>}</div><div className="p-4">
      {editing===m.id
        ? <div className="space-y-2">
            <input value={editForm.title} onChange={e=>setEditForm({...editForm,title:e.target.value})} placeholder="Titre" className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-jso-blue"/>
            <input value={editForm.caption} onChange={e=>setEditForm({...editForm,caption:e.target.value})} placeholder="Légende" className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-jso-blue"/>
            <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={editForm.isPublished} onChange={e=>setEditForm({...editForm,isPublished:e.target.checked})}/> Publié</label>
            <div className="flex gap-2"><button onClick={()=>saveEdit(m)} className="flex items-center gap-1 rounded-lg bg-jso-navy px-3 py-1.5 text-xs font-bold text-white"><Save size={13}/>Enregistrer</button><button onClick={cancelEdit} className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100">Annuler</button></div>
          </div>
        : <>
            <b className="block truncate">{m.title}</b>
            {m.caption&&<p className="mt-1 truncate text-xs text-slate-500">{m.caption}</p>}
            <p className="mt-1 text-xs text-slate-500">{m.fileSize?((m.fileSize/1024/1024).toFixed(2)+' MB'):m.type}{m.isPublished===false?' · Masqué':''}</p>
            <div className="mt-3 flex gap-2"><button onClick={()=>startEdit(m)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-jso-navy"><Pencil size={13}/>Modifier</button><button onClick={()=>remove(m.id)} className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700"><X size={13}/>Supprimer</button></div>
          </>}
    </div></div>)}</div>
  </div>
}

const emptyEvent = { minute: 0, type: 'Goal', playerName: '', secondaryPlayerName: '', team: '', notes: '' }
const EVENT_TEAM_LABELS = { Home: 'Domicile', Away: 'Extérieur' }

function EventsModule({ onError }) {
  const [matches,setMatches]=useState([]); const [selected,setSelected]=useState(''); const [events,setEvents]=useState([]); const [form,setForm]=useState(emptyEvent); const [editingId,setEditingId]=useState(null)
  async function load(){try{const data=await adminApi('/admin/matches');setMatches(data);if(!selected&&data[0])loadEvents(data[0].id)}catch(e){onError(e.message)}}
  async function loadEvents(id){try{setSelected(id);setEditingId(null);setForm(emptyEvent);setEvents(await adminApi('/admin/matches/'+id+'/events'))}catch(e){onError(e.message)}}
  useEffect(()=>{load()},[])
  function edit(ev){setEditingId(ev.id);setForm({minute:ev.minute??0,type:ev.type||'Goal',playerName:ev.playerName||'',secondaryPlayerName:ev.secondaryPlayerName||'',team:ev.team||'',notes:ev.notes||''})}
  function cancelEdit(){setEditingId(null);setForm(emptyEvent)}
  async function save(e){e.preventDefault();try{const body={...form,minute:Number(form.minute),secondaryPlayerName:form.secondaryPlayerName||null,team:form.team||null};if(editingId)await adminApi('/admin/matches/'+selected+'/events/'+editingId,{method:'PUT',body:JSON.stringify(body)});else await adminApi('/admin/matches/'+selected+'/events',{method:'POST',body:JSON.stringify(body)});setForm(emptyEvent);setEditingId(null);await loadEvents(selected)}catch(e){onError(e.message)}}
  async function remove(id){try{await adminApi('/admin/matches/'+selected+'/events/'+id,{method:'DELETE'});if(editingId===id)cancelEdit();await loadEvents(selected)}catch(e){onError(e.message)}}
  const showSecondary=form.type==='Goal'||form.type==='Substitution'
  return <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">Matchs</h2><div className="mt-4 space-y-2">{matches.map(m=><button key={m.id} onClick={()=>loadEvents(m.id)} className={'w-full rounded-xl p-3 text-left '+(selected===m.id?'bg-jso-navy text-white':'bg-slate-50')}><b>JSO — {m.opponentName}</b><span className="block text-xs opacity-70">{new Date(m.kickoffAt).toLocaleString('fr-FR')}</span></button>)}</div></div><div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">Événements</h2>{selected?<><form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Minute" type="number" min="0" max="200" value={form.minute} onChange={e=>setForm({...form,minute:e.target.value})} required/><label className="text-sm font-bold">Type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option>Goal</option><option>YellowCard</option><option>RedCard</option><option>Substitution</option><option>VAR</option><option>Other</option></select></label><Field label="Joueur" value={form.playerName} onChange={e=>setForm({...form,playerName:e.target.value})}/><Field label={form.type==='Substitution'?'Joueur entrant':'Passeur'} value={form.secondaryPlayerName} onChange={e=>setForm({...form,secondaryPlayerName:e.target.value})} placeholder={showSecondary?'':'Optionnel'}/><label className="text-sm font-bold">Camp<select value={form.team} onChange={e=>setForm({...form,team:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Aucun</option><option value="Home">Domicile</option><option value="Away">Extérieur</option></select></label><Field label="Note" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/><div className="sm:col-span-2 flex gap-2"><button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white">{editingId?<><Save size={16}/>Mettre à jour</>:<><Plus size={16}/>Ajouter l’événement</>}</button>{editingId&&<button type="button" onClick={cancelEdit} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}</div></form><div className="mt-6 space-y-2">{events.map(ev=><div key={ev.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><div><b>{ev.minute}' · {ev.type}</b>{ev.team&&<span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">{EVENT_TEAM_LABELS[ev.team]||ev.team}</span>}<span className="ml-2 text-sm text-slate-600">{ev.playerName||''}</span>{ev.secondaryPlayerName&&<span className="ml-1 text-sm text-slate-500">({ev.type==='Substitution'?'entrant : ':'passe : '}{ev.secondaryPlayerName})</span>}{ev.notes&&<p className="text-xs text-slate-500">{ev.notes}</p>}</div><div className="flex gap-2"><button onClick={()=>edit(ev)} className="text-jso-blue"><Pencil size={16}/></button><button onClick={()=>remove(ev.id)} className="text-red-600"><X size={16}/></button></div></div>)}{!events.length&&<p className="text-sm text-slate-500">Aucun événement enregistré.</p>}</div></>:<p className="mt-3 text-sm text-slate-500">Sélectionne un match.</p>}</div></div>
}

function FormationsModule({ onError }) {
  const [matches,setMatches]=useState([]); const [selected,setSelected]=useState(''); const [roster,setRoster]=useState([]); const [rows,setRows]=useState({}); const [loading,setLoading]=useState(false); const [saving,setSaving]=useState(false); const [saved,setSaved]=useState(false)
  async function load(){try{const data=await adminApi('/admin/matches');setMatches(data);if(!selected&&data[0])selectMatch(data[0].id)}catch(e){onError(e.message)}}
  useEffect(()=>{load()},[])
  async function selectMatch(id){
    setSelected(id);setSaved(false);setLoading(true)
    try{
      const match=matches.find(m=>m.id===id)||await adminApi('/admin/matches/'+id)
      const [lineup,players]=await Promise.all([adminApi('/admin/matches/'+id+'/lineup'),match.teamId?adminApi('/admin/teams/'+match.teamId+'/players'):Promise.resolve([])])
      setRoster(players)
      const next={}
      ;(lineup||[]).forEach(l=>{next[l.playerId]={included:true,role:l.role||'Starter',position:l.position||'',positionOrder:l.positionOrder??'',isCaptain:Boolean(l.isCaptain)}})
      setRows(next)
    }catch(e){onError(e.message)}finally{setLoading(false)}
  }
  function toggle(playerId){setSaved(false);setRows(prev=>{const next={...prev};if(next[playerId])delete next[playerId];else next[playerId]={included:true,role:'Starter',position:'',positionOrder:'',isCaptain:false};return next})}
  function update(playerId,patch){setSaved(false);setRows(prev=>({...prev,[playerId]:{...prev[playerId],...patch}}))}
  function setCaptain(playerId){setSaved(false);setRows(prev=>{const next={};Object.keys(prev).forEach(pid=>{next[pid]={...prev[pid],isCaptain:pid===playerId}});return next})}
  async function save(){
    if(!selected)return
    setSaving(true);setSaved(false)
    try{
      const items=Object.entries(rows).filter(([,r])=>r.included).map(([playerId,r])=>({playerId,role:r.role,positionOrder:r.positionOrder===''?null:Number(r.positionOrder),position:r.position||null,isCaptain:Boolean(r.isCaptain)}))
      await adminApi('/admin/matches/'+selected+'/lineup',{method:'PUT',body:JSON.stringify({items})})
      setSaved(true)
      await selectMatch(selected)
    }catch(e){onError(e.message)}finally{setSaving(false)}
  }
  const includedCount=Object.values(rows).filter(r=>r.included).length
  return <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">Matchs</h2><div className="mt-4 space-y-2">{matches.map(m=><button key={m.id} onClick={()=>selectMatch(m.id)} className={'w-full rounded-xl p-3 text-left '+(selected===m.id?'bg-jso-navy text-white':'bg-slate-50')}><b>JSO — {m.opponentName}</b><span className="block text-xs opacity-70">{new Date(m.kickoffAt).toLocaleString('fr-FR')}</span></button>)}{!matches.length&&<p className="text-sm text-slate-500">Aucun match disponible.</p>}</div></div>
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Formation</h2>{selected&&<button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white disabled:opacity-50"><Save size={16}/>{saving?'Enregistrement…':'Enregistrer'}</button>}</div>
      {!selected?<p className="mt-3 text-sm text-slate-500">Sélectionne un match.</p>
        :loading?<p className="mt-4 text-sm text-slate-400">Chargement…</p>
        :!roster.length?<p className="mt-4 text-sm text-slate-500">Aucun joueur disponible pour l’équipe de ce match. Ajoute des joueurs à l’équipe pour composer la formation.</p>
        :<><p className="mt-3 text-xs text-slate-500">{includedCount} joueur(s) sélectionné(s).</p>{saved&&<p className="mt-2 rounded-xl bg-emerald-50 p-2 text-xs font-bold text-emerald-700">Formation enregistrée.</p>}<div className="mt-4 space-y-2">{roster.map(p=>{const row=rows[p.id];const included=Boolean(row?.included);return <div key={p.id} className={'rounded-xl border p-3 '+(included?'border-jso-blue bg-slate-50':'border-slate-200')}><div className="flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={included} onChange={()=>toggle(p.id)}/>{p.shirtNumber?'#'+p.shirtNumber+' ':''}{p.firstName} {p.lastName}</label>{included&&<label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={Boolean(row.isCaptain)} onChange={()=>row.isCaptain?update(p.id,{isCaptain:false}):setCaptain(p.id)}/>Capitaine</label>}</div>{included&&<div className="mt-3 grid gap-2 sm:grid-cols-3"><label className="text-xs font-bold">Rôle<select value={row.role} onChange={e=>update(p.id,{role:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"><option value="Starter">Titulaire</option><option value="Substitute">Remplaçant</option></select></label><label className="text-xs font-bold">Position<input value={row.position} onChange={e=>update(p.id,{position:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"/></label><label className="text-xs font-bold">Ordre<input type="number" min="0" value={row.positionOrder} onChange={e=>update(p.id,{positionOrder:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"/></label></div>}</div>})}</div></>}
    </div>
  </div>
}

// Feuille de match: officiels et statistiques. Backend supports a full-replace
// PUT of each collection (AdminMatchDetailsController), and the public Match
// Center already renders both, so this closes a visible content gap.
function MatchSheetModule({ onError }) {
  const [matches, setMatches] = useState([])
  const [selected, setSelected] = useState('')
  const [officials, setOfficials] = useState([])
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(false)
  const [savingOfficials, setSavingOfficials] = useState(false)
  const [savingStats, setSavingStats] = useState(false)
  const [savedOfficials, setSavedOfficials] = useState(false)
  const [savedStats, setSavedStats] = useState(false)

  async function load() {
    try { const data = await adminApi('/admin/matches'); setMatches(data); if (!selected && data[0]) selectMatch(data[0].id) }
    catch (e) { onError(e.message) }
  }
  useEffect(() => { load() }, [])

  async function selectMatch(id) {
    setSelected(id); setLoading(true); setSavedOfficials(false); setSavedStats(false)
    try {
      const [off, st] = await Promise.all([
        adminApi('/admin/matches/' + id + '/officials'),
        adminApi('/admin/matches/' + id + '/stats'),
      ])
      setOfficials((off || []).map(o => ({ name: o.name || '', role: o.role || 'Referee' })))
      setStats((st || []).map(s => ({ name: s.name || '', homeValue: s.homeValue ?? '', awayValue: s.awayValue ?? '' })))
      onError('')
    } catch (e) { onError(e.message) } finally { setLoading(false) }
  }

  // Officials
  function addOfficial() { setSavedOfficials(false); setOfficials(prev => [...prev, { name: '', role: 'Referee' }]) }
  function updateOfficial(i, patch) { setSavedOfficials(false); setOfficials(prev => prev.map((o, idx) => idx === i ? { ...o, ...patch } : o)) }
  function removeOfficial(i) { setSavedOfficials(false); setOfficials(prev => prev.filter((_, idx) => idx !== i)) }
  async function saveOfficials() {
    if (!selected) return
    const items = officials.map(o => ({ name: o.name.trim(), role: o.role.trim() })).filter(o => o.name && o.role)
    if (items.length !== officials.length) { onError('Chaque officiel doit avoir un nom et un rôle.'); return }
    setSavingOfficials(true); setSavedOfficials(false)
    try {
      await adminApi('/admin/matches/' + selected + '/officials', { method: 'PUT', body: JSON.stringify({ items }) })
      setSavedOfficials(true); onError('')
    } catch (e) { onError(e.message) } finally { setSavingOfficials(false) }
  }

  // Stats
  function addStat() { setSavedStats(false); setStats(prev => [...prev, { name: '', homeValue: '', awayValue: '' }]) }
  function updateStat(i, patch) { setSavedStats(false); setStats(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s)) }
  function removeStat(i) { setSavedStats(false); setStats(prev => prev.filter((_, idx) => idx !== i)) }
  async function saveStats() {
    if (!selected) return
    const items = stats.map(s => ({
      name: s.name.trim(),
      homeValue: s.homeValue === '' ? null : Number(s.homeValue),
      awayValue: s.awayValue === '' ? null : Number(s.awayValue),
    })).filter(s => s.name)
    if (items.length !== stats.length) { onError('Chaque statistique doit avoir un nom.'); return }
    setSavingStats(true); setSavedStats(false)
    try {
      await adminApi('/admin/matches/' + selected + '/stats', { method: 'PUT', body: JSON.stringify({ items }) })
      setSavedStats(true); onError('')
    } catch (e) { onError(e.message) } finally { setSavingStats(false) }
  }

  return <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">Matchs</h2><div className="mt-4 space-y-2">{matches.map(m => <button key={m.id} onClick={() => selectMatch(m.id)} className={'w-full rounded-xl p-3 text-left ' + (selected === m.id ? 'bg-jso-navy text-white' : 'bg-slate-50')}><b>JSO — {m.opponentName}</b><span className="block text-xs opacity-70">{new Date(m.kickoffAt).toLocaleString('fr-FR')}</span></button>)}{!matches.length && <p className="text-sm text-slate-500">Aucun match disponible.</p>}</div></div>
    <div className="space-y-6">
      {!selected ? <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><p className="text-sm text-slate-500">Sélectionne un match.</p></div>
        : loading ? <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><p className="text-sm text-slate-400">Chargement…</p></div>
        : <>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between"><h2 className="text-xl font-black">Officiels</h2><div className="flex items-center gap-2"><button onClick={addOfficial} className="rounded-xl bg-slate-100 p-2 text-jso-navy"><Plus size={18}/></button><button onClick={saveOfficials} disabled={savingOfficials} className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white disabled:opacity-50"><Save size={16}/>{savingOfficials ? 'Enregistrement…' : 'Enregistrer'}</button></div></div>
            {savedOfficials && <p className="mt-2 rounded-xl bg-emerald-50 p-2 text-xs font-bold text-emerald-700">Officiels enregistrés.</p>}
            <div className="mt-4 space-y-2">
              {officials.length === 0 ? <p className="text-sm text-slate-500">Aucun officiel. Ajoute l’arbitre et ses assistants.</p>
                : officials.map((o, i) => <div key={i} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1.2fr_1fr_auto]"><input value={o.name} onChange={e => updateOfficial(i, { name: e.target.value })} placeholder="Nom" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-jso-blue"/><select value={o.role} onChange={e => updateOfficial(i, { role: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-jso-blue">{MATCH_OFFICIAL_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select><button onClick={() => removeOfficial(i)} className="justify-self-end p-1 text-red-600"><X size={16}/></button></div>)}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between"><h2 className="text-xl font-black">Statistiques</h2><div className="flex items-center gap-2"><button onClick={addStat} className="rounded-xl bg-slate-100 p-2 text-jso-navy"><Plus size={18}/></button><button onClick={saveStats} disabled={savingStats} className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white disabled:opacity-50"><Save size={16}/>{savingStats ? 'Enregistrement…' : 'Enregistrer'}</button></div></div>
            <p className="mt-2 text-xs text-slate-400">Valeurs domicile / extérieur (ex. Possession, Tirs, Corners). Laisse vide si non renseigné.</p>
            {savedStats && <p className="mt-2 rounded-xl bg-emerald-50 p-2 text-xs font-bold text-emerald-700">Statistiques enregistrées.</p>}
            <div className="mt-4 space-y-2">
              {stats.length === 0 ? <p className="text-sm text-slate-500">Aucune statistique.</p>
                : stats.map((s, i) => <div key={i} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1.4fr_0.8fr_0.8fr_auto]"><input value={s.name} onChange={e => updateStat(i, { name: e.target.value })} placeholder="Nom" className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-jso-blue"/><input type="number" value={s.homeValue} onChange={e => updateStat(i, { homeValue: e.target.value })} placeholder="Dom." className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-jso-blue"/><input type="number" value={s.awayValue} onChange={e => updateStat(i, { awayValue: e.target.value })} placeholder="Ext." className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-jso-blue"/><button onClick={() => removeStat(i)} className="justify-self-end p-1 text-red-600"><X size={16}/></button></div>)}
            </div>
          </div>
        </>}
    </div>
  </div>
}

const MATCH_OFFICIAL_ROLES = [
  { value: 'Referee', label: 'Arbitre principal' },
  { value: 'Assistant', label: 'Arbitre assistant' },
  { value: 'Fourth', label: 'Quatrième arbitre' },
  { value: 'VAR', label: 'VAR' },
]

function SettingsModule() {
  const [value, setValue] = useState(getConfiguredApiBaseUrl())
  const [active, setActive] = useState(API_BASE_URL)
  const [saved, setSaved] = useState(false)
  const [test, setTest] = useState(null)
  const [testing, setTesting] = useState(false)
  const buildDefault = getDefaultApiBaseUrl()

  function save(e) {
    e.preventDefault()
    const next = setApiBaseUrl(value)
    setActive(next)
    setValue(getConfiguredApiBaseUrl())
    setSaved(true)
    setTest(null)
  }
  function reset() {
    const next = resetApiBaseUrl()
    setActive(next)
    setValue('')
    setSaved(true)
    setTest(null)
  }
  async function testConnection() {
    setTesting(true); setTest(null)
    const base = value.trim().replace(/\/$/, '') || buildDefault
    // '/api' is same-origin and proxied; probe the sibling '/health' endpoint.
    const healthUrl = base === '/api' ? '/health' : base.replace(/\/api$/, '') + '/health'
    try {
      const res = await fetch(healthUrl, { headers: { Accept: 'application/json' } })
      setTest(res.ok ? { ok: true, text: 'Connexion réussie (HTTP ' + res.status + ')' } : { ok: false, text: 'Réponse HTTP ' + res.status })
    } catch (err) {
      setTest({ ok: false, text: 'Échec de connexion : ' + err.message })
    } finally { setTesting(false) }
  }

  return <div className="max-w-2xl space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">Configuration du backend</h2>
      <p className="mt-2 text-sm text-slate-500">URL de base de l’API utilisée par le site et l’administration. Laissez vide pour utiliser la valeur par défaut (<code className="rounded bg-slate-100 px-1">{buildDefault}</code>).</p>
      <form onSubmit={save} className="mt-5 space-y-4">
        <Field label="URL de l’API" value={value} onChange={e => { setValue(e.target.value); setSaved(false) }} placeholder="ex. http://localhost:8080/api" />
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/> Enregistrer</button>
          <button type="button" onClick={testConnection} disabled={testing} className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-600 disabled:opacity-60">{testing ? 'Test…' : 'Tester la connexion'}</button>
          <button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:text-red-700">Réinitialiser</button>
        </div>
      </form>
      {saved && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Enregistré. API active : <code>{active}</code></p>}
      {test && <p className={'mt-3 rounded-xl p-3 text-sm font-semibold ' + (test.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>{test.text}</p>}
      <div className="mt-6 border-t pt-4 text-xs text-slate-500">
        <p>API active actuellement : <b className="text-slate-700">{active}</b></p>
        <p className="mt-1">Ce réglage est enregistré dans ce navigateur. Rechargez la page après modification pour l’appliquer partout.</p>
      </div>
    </div>
  </div>
}

function AdminDashboard({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  // Menu items grouped into premium categories. Format:
  // [id, label, Icon, [roles], category]. The sidebar renders one section per
  // category (in CATEGORY_ORDER) with a heading, instead of a long flat list.
  // Revenue-first: "Billetterie & Abonnements" and "Boutique" sit near the top.
  // Note: the former duplicate id 'events' is split into 'match-events'
  // (match calendar) and 'club-events' (club agenda) to avoid double rendering.
  const items = [
    ['dashboard', 'Dashboard', LayoutDashboard, ['SuperAdmin','ClubAdmin','Editor','MatchManager','CommunityManager','ShopManager'], 'Tableau de bord'],

    ['tickets', 'Billetterie', Ticket, ['SuperAdmin','ClubAdmin','MatchManager'], 'Billetterie & Abonnements'],
    ['memberships', 'Abonnements', CreditCard, ['SuperAdmin','ClubAdmin'], 'Billetterie & Abonnements'],
    ['finance', 'Finances', Wallet, ['SuperAdmin','ClubAdmin','FinanceManager'], 'Billetterie & Abonnements'],

    ['shop', 'Boutique', ShoppingBag, ['SuperAdmin','ClubAdmin','ShopManager'], 'Boutique'],
    ['orders', 'Commandes', Receipt, ['SuperAdmin','ClubAdmin','ShopManager'], 'Boutique'],
    ['sponsors', 'Sponsors', Handshake, ['SuperAdmin','ClubAdmin'], 'Boutique'],
    ['sponsorqr', 'QR Sponsors', QrCode, ['SuperAdmin','ClubAdmin'], 'Boutique'],

    ['matches', 'Match Center', Trophy, ['SuperAdmin','ClubAdmin','MatchManager'], 'Équipe & Matchs'],
    ['match-events', 'Événements de match', Trophy, ['SuperAdmin','ClubAdmin','MatchManager'], 'Équipe & Matchs'],
    ['match-sheet', 'Feuille de match', ClipboardList, ['SuperAdmin','ClubAdmin','MatchManager'], 'Équipe & Matchs'],
    ['formations', 'Formations', Users, ['SuperAdmin','ClubAdmin','MatchManager'], 'Équipe & Matchs'],
    ['teams', 'Équipes & joueurs', Users, ['SuperAdmin','ClubAdmin'], 'Équipe & Matchs'],
    ['seasons-competitions', 'Saisons & compétitions', CalendarDays, ['SuperAdmin','ClubAdmin'], 'Équipe & Matchs'],
    ['match-streams', 'Diffusion en direct', Radio, ['ClubAdmin','MatchManager'], 'Équipe & Matchs'],
    ['analytics', 'Analytics joueurs', BarChart3, ['SuperAdmin','ClubAdmin','MatchManager'], 'Équipe & Matchs'],
    ['injuries', 'Infirmerie', HeartPulse, ['ClubAdmin','MatchManager'], 'Équipe & Matchs'],
    ['scouting', 'Scouting', ScanSearch, ['ClubAdmin','MatchManager'], 'Équipe & Matchs'],
    ['checklist', 'Check-list match', ListChecks, ['ClubAdmin','MatchManager'], 'Équipe & Matchs'],

    ['news', 'News CMS', Newspaper, ['SuperAdmin','ClubAdmin','Editor'], 'Contenu & Site'],
    ['editorial', 'Calendrier éditorial', CalendarClock, ['Editor','ClubAdmin'], 'Contenu & Site'],
    ['media', 'Médias', Images, ['SuperAdmin','ClubAdmin','Editor'], 'Contenu & Site'],
    ['content', 'Contenus', Pencil, ['SuperAdmin','ClubAdmin','Editor'], 'Contenu & Site'],
    ['homepage', 'Page d\u2019accueil & menus', LayoutTemplate, ['ClubAdmin','Editor'], 'Contenu & Site'],
    ['club-events', 'Agenda du club', PartyPopper, ['SuperAdmin','ClubAdmin','Editor'], 'Contenu & Site'],
    ['documents', 'Documents', FileText, ['SuperAdmin','ClubAdmin','Editor'], 'Contenu & Site'],
    ['faq', 'FAQ', HelpCircle, ['SuperAdmin','ClubAdmin','Editor'], 'Contenu & Site'],
    ['archive', 'Musée · Archives', Landmark, ['SuperAdmin','ClubAdmin','Editor'], 'Contenu & Site'],

    ['community-moderation', 'Communauté · Modération', MessageSquare, ['ClubAdmin','CommunityManager'], 'Communauté'],
    ['fan-photos', 'Photos supporters', Images, ['CommunityManager','Editor'], 'Communauté'],
    ['supporters', 'Mur des supporters', BrickWall, ['ClubAdmin','CommunityManager'], 'Communauté'],
    ['classifieds', 'Petites annonces', Megaphone, ['ClubAdmin','CommunityManager'], 'Communauté'],
    ['anniversaries', 'Anniversaires', PartyPopper, ['ClubAdmin','CommunityManager'], 'Communauté'],
    ['newsletter', 'Newsletter', Mail, ['Editor','CommunityManager'], 'Communauté'],
    ['volunteers', 'Bénévoles', ClipboardList, ['ClubAdmin','MatchManager'], 'Communauté'],
    ['community', 'Écoles & partenaires', GraduationCap, ['ClubAdmin','CommunityManager'], 'Communauté'],
    ['facilities', 'Installations', CalendarRange, ['ClubAdmin','MatchManager'], 'Communauté'],

    ['club', 'Club Settings', ShieldCheck, ['SuperAdmin','ClubAdmin'], 'Système'],
    ['security', 'Sécurité', ShieldCheck, ['SuperAdmin'], 'Système'],
    ['featureflags', 'Feature flags', Flag, ['SuperAdmin','ClubAdmin'], 'Système'],
    ['apiusage', 'Utilisation API', Gauge, ['SuperAdmin','ClubAdmin'], 'Système'],
    ['gdpr', 'RGPD', ShieldAlert, ['SuperAdmin','ClubAdmin'], 'Système'],
    ['settings', 'Configuration', Server, ['SuperAdmin','ClubAdmin'], 'Système'],
  ]
  const CATEGORY_ORDER = ['Tableau de bord', 'Billetterie & Abonnements', 'Boutique', 'Équipe & Matchs', 'Contenu & Site', 'Communauté', 'Système']
  const role = user.role ?? user.Role
  const displayName = user.displayName ?? user.DisplayName
  const visibleItems = items.filter(([, , , roles]) => roles.includes(role))
  // Group the visible items by category, preserving CATEGORY_ORDER and dropping
  // empty groups (e.g. a role with no items in a category).
  const groupedItems = CATEGORY_ORDER
    .map((category) => [category, visibleItems.filter((item) => item[4] === category)])
    .filter(([, list]) => list.length > 0)

  async function loadDashboard() {
    try { setStats(await adminApi('/admin/dashboard')); setError('') } catch (e) { setError(e.message) }
  }
  useEffect(() => { if (section === 'dashboard') loadDashboard() }, [section])

  function navigate(next) { setSection(next); setOpen(false); setError('') }

  function logout() {
    localStorage.removeItem('jso_admin_token')
    localStorage.removeItem('jso_admin_user')
    onLogout()
  }

  return <main className="min-h-screen bg-jso-paper text-jso-ink">
    <aside className={'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform ' + (open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-jso-navy font-black text-jso-gold">JSO</span><div><p className="font-black">JSO Admin</p><p className="text-xs text-slate-400">{role}</p></div></div><button className="lg:hidden" onClick={() => setOpen(false)}><X /></button></div>
      <nav className="jso-scroll flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">{groupedItems.map(([category, list]) => <div key={category} className="space-y-1"><p className="px-4 pb-1 pt-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{category}</p>{list.map(([id,label,Icon]) => <button key={id} onClick={() => navigate(id)} className={'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition-colors ' + (section === id ? 'bg-jso-navy text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100')}><Icon size={18}/>{label}</button>)}</div>)}</nav>
      <div className="border-t border-slate-100 px-4 py-4"><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700"><LogOut size={18}/>Déconnexion</button></div>
    </aside>
    <div className="lg:pl-72">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur-xl lg:px-8">
        <button className="lg:hidden" onClick={() => setOpen(true)}><Menu /></button>
        <div><p className="text-xs font-extrabold tracking-[0.2em] text-jso-blue">COMMAND CENTER</p><h1 className="text-2xl font-black">{section === 'dashboard' ? 'Bonjour, ' + displayName : visibleItems.find(x => x[0] === section)?.[1]}</h1></div>
        <span className="hidden rounded-full bg-jso-gold/20 px-3 py-2 text-xs font-extrabold text-jso-navy sm:block">{role}</span>
      </header>
      <section className="mx-auto max-w-7xl p-5 lg:p-8">
        {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</div>}
        {section === 'dashboard' && <DashboardStats stats={stats}/>}
        {section === 'club' && <ClubSettingsModule onError={setError}/>}
        {section === 'teams' && <TeamsModule onError={setError}/>}
        {section === 'matches' && <MatchesModule onError={setError}/>}
        {section === 'seasons-competitions' && <SeasonsCompetitionsModule onError={setError}/>}
        {section === 'match-events' && <EventsModule onError={setError}/>}
        {section === 'formations' && <FormationsModule onError={setError}/>}
        {section === 'match-sheet' && <MatchSheetModule onError={setError}/>}
        {section === 'news' && <NewsModule onError={setError}/>}
        {section === 'security' && <SecurityModule onError={setError}/>}
        {section === 'media' && <MediaModule onError={setError}/>}
        {section === 'content' && <ContentModule onError={setError}/>}
        {section === 'homepage' && <HomepageBuilderModule onError={setError}/>}
        {section === 'sponsors' && <SponsorsModule onError={setError}/>}
        {section === 'sponsorqr' && <SponsorQrModule onError={setError}/>}
        {section === 'shop' && <ShopModule onError={setError}/>}
        {section === 'orders' && <OrdersModule onError={setError}/>}
        {section === 'tickets' && <TicketsModule onError={setError}/>}
        {section === 'memberships' && <MembershipsModule onError={setError}/>}
        {section === 'match-streams' && <MatchStreamsModule onError={setError}/>}
        {section === 'analytics' && <AnalyticsModule onError={setError}/>}
        {section === 'finance' && <FinanceModule onError={setError}/>}
        {section === 'volunteers' && <VolunteersModule onError={setError}/>}
        {section === 'newsletter' && <NewsletterModule onError={setError}/>}
        {section === 'archive' && <ArchiveModule onError={setError}/>}
        {section === 'injuries' && <InjuriesModule onError={setError}/>}
        {section === 'supporters' && <SupportersModule onError={setError}/>}
        {section === 'anniversaries' && <AnniversariesModule onError={setError}/>}
        {section === 'editorial' && <EditorialCalendarModule onError={setError}/>}
        {section === 'checklist' && <ChecklistModule onError={setError}/>}
        {section === 'classifieds' && <ClassifiedsModule onError={setError}/>}
        {section === 'fan-photos' && <FanPhotosModule onError={setError}/>}
        {section === 'community-moderation' && <CommunityModule onError={setError}/>}
        {section === 'facilities' && <FacilitiesModule onError={setError}/>}
        {section === 'scouting' && <ScoutingModule onError={setError}/>}
        {section === 'community' && <CommunityProgramsModule onError={setError}/>}
        {section === 'featureflags' && <FeatureFlagsModule onError={setError}/>}
        {section === 'apiusage' && <ApiUsageModule onError={setError}/>}
        {section === 'gdpr' && <GdprModule onError={setError}/>}
        {section === 'club-events' && <ClubEventsModule onError={setError}/>}
        {section === 'documents' && <DocumentsModule onError={setError}/>}
        {section === 'faq' && <FaqModule onError={setError}/>}
        {section === 'settings' && <SettingsModule/>}
      </section>
    </div>
  </main>
}

// Premium admin command center: a revenue hero, three sales KPIs
// (Billetterie / Abonnements / Boutique), quick on/off toggles for the public
// home sections, plus today's activity and the recent audit feed.
function DashboardStats({ stats }) {
  const [sections, setSections] = useState([])
  const [toggleError, setToggleError] = useState('')

  useEffect(() => {
    let active = true
    adminApi('/admin/home-visibility')
      .then((v) => { if (active) setSections(v) })
      .catch(() => { if (active) setSections([]) })
    return () => { active = false }
  }, [])

  async function toggleSection(id) {
    const next = sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    setSections(next)
    try {
      await adminApi('/admin/home-visibility', { method: 'PUT', body: JSON.stringify({ hidden: next.filter((s) => !s.enabled).map((s) => s.id) }) })
      setToggleError('')
    } catch (e) {
      setToggleError(e.message)
      try { setSections(await adminApi('/admin/home-visibility')) } catch { /* keep optimistic state */ }
    }
  }

  if (!stats) return <div className="rounded-[1.5rem] bg-white p-8 text-slate-500">Chargement du dashboard…</div>

  const sales = stats.sales || { enabled: false, currency: 'TND', revenue: 0, orders: 0, activeProducts: 0, productsSold: 0 }
  const tickets = stats.tickets || { currency: 'TND', revenue: 0, orders: 0, ticketsSold: 0, pending: 0 }
  const memberships = stats.memberships || { currency: 'TND', revenue: 0, active: 0, total: 0 }
  const money = (n, c = 'TND') => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c || 'TND', maximumFractionDigits: 0 }).format(n || 0)
  const totalRevenue = (tickets.revenue || 0) + (memberships.revenue || 0) + (sales.revenue || 0)

  // The three revenue engines, revenue-first.
  const revenueCards = [
    { key: 'tickets', label: 'Billetterie', Icon: Ticket, revenue: tickets.revenue, sub: `${tickets.ticketsSold ?? 0} billets · ${tickets.pending ?? 0} en attente`, cls: 'bg-jso-navy text-white', accent: 'text-jso-gold' },
    { key: 'memberships', label: 'Abonnements', Icon: CreditCard, revenue: memberships.revenue, sub: `${memberships.active ?? 0} abonnés actifs`, cls: 'bg-jso-blue text-white', accent: 'text-white/85' },
    { key: 'shop', label: 'Boutique', Icon: ShoppingBag, revenue: sales.revenue, sub: `${sales.orders ?? 0} commandes · ${sales.productsSold ?? 0} produits`, cls: 'bg-jso-gold text-jso-navy', accent: 'text-jso-navy/70' },
  ]

  const clubCards = [
    ['Parties à venir', stats.matches.upcoming, Trophy], ['Résultats', stats.matches.finished, Trophy],
    ['News publiées', stats.news.published, Newspaper], ['Brouillons', stats.news.drafts, Newspaper],
    ['Équipes', stats.teams, Users], ['Joueurs actifs', stats.players, Users],
  ]
  const today = stats.todayActivity
  const todayFigures = today ? [
    ['News publiées', today.newsPublished], ['Matchs du jour', today.matchesToday],
    ['Médias ajoutés', today.mediaUploaded], ['Actions d’audit', today.auditActions],
  ] : []
  const recent = stats.recentActivity ?? []

  return <div className="space-y-8">
    {/* Revenue hero */}
    <div className="flex flex-col justify-between gap-4 rounded-[1.5rem] bg-jso-navy p-6 text-white sm:flex-row sm:items-center">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-jso-gold">Revenus</p>
        <p className="mt-1 text-sm text-white/60">Billetterie + Abonnements + Boutique</p>
      </div>
      <p className="text-4xl font-black">{money(totalRevenue)}</p>
    </div>

    {/* Three revenue engines */}
    <div>
      <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.15em] text-jso-blue">Analytics des ventes</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {revenueCards.map(({ key, label, Icon, revenue, sub, cls, accent }) => (
          <div key={key} className={'relative overflow-hidden rounded-[1.5rem] p-6 shadow-sm ' + cls}>
            <Icon className="absolute right-5 top-5 opacity-30" size={40} aria-hidden="true" />
            <p className="text-xs font-black uppercase tracking-[0.15em] opacity-80">{label}</p>
            <p className="mt-6 text-3xl font-black">{money(revenue)}</p>
            <p className={'mt-1 text-sm font-semibold ' + accent}>{sub}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Home section quick toggles */}
    {sections.length > 0 && (
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Sections de la page d’accueil</h2>
        <p className="mt-1 text-sm text-slate-500">Activez ou masquez chaque section du site public.</p>
        {toggleError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{toggleError}</p>}
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((s) => (
            <button key={s.id} type="button" onClick={() => toggleSection(s.id)} aria-pressed={s.enabled} className={'flex items-center justify-between rounded-xl border p-3 text-left transition ' + (s.enabled ? 'border-jso-blue/40 bg-jso-blue/5' : 'border-slate-200 bg-slate-50')}>
              <span className="flex items-center gap-2 font-bold text-jso-ink">{s.enabled ? <Eye size={16} className="text-jso-blue"/> : <EyeOff size={16} className="text-slate-400"/>}{s.label}</span>
              <span className={'relative h-6 w-11 shrink-0 rounded-full transition ' + (s.enabled ? 'bg-jso-blue' : 'bg-slate-300')}><span className={'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ' + (s.enabled ? 'left-[22px]' : 'left-0.5')} /></span>
            </button>
          ))}
        </div>
      </div>
    )}

    {/* Club figures */}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {clubCards.map(([label,value,Icon]) => <div key={label} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"><Icon className="text-jso-blue" size={22}/><p className="mt-7 text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 text-4xl font-black">{value}</p></div>)}
    </div>

    {today && <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Activité du jour</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{todayFigures.map(([label,value]) => <div key={label} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="font-semibold text-slate-500">{label}</p><p className="mt-1 text-3xl font-black">{value ?? 0}</p></div>)}</div></div>}

    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Activité récente</h2><div className="mt-4 space-y-2">{recent.length ? recent.map(a => <div key={a.id} className="rounded-xl bg-slate-50 p-3 text-sm"><div className="flex justify-between gap-3"><b>{a.action} · {a.entityType}</b><span className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString('fr-FR')}</span></div><p className="mt-1 text-xs text-slate-500">{a.userEmail || 'Système'}{a.entityId ? ' · ' + a.entityId : ''}</p></div>) : <p className="text-sm text-slate-500">Aucune activité récente.</p>}</div></div>
  </div>
}

function TeamsModule({ onError }) {
  const [teams,setTeams]=useState([]); const [team,setTeam]=useState(emptyTeam); const [editing,setEditing]=useState(null)
  const [players,setPlayers]=useState([]); const [selected,setSelected]=useState(''); const [player,setPlayer]=useState(emptyPlayer); const [editingPlayer,setEditingPlayer]=useState(null)
  const [photoFile,setPhotoFile]=useState(null); const [photoPreview,setPhotoPreview]=useState(''); const [uploadingPhoto,setUploadingPhoto]=useState(false)

  async function load() {
    try {
      const data=await adminApi('/admin/teams')
      setTeams(data)
      if (!selected && data[0]) selectTeam(data[0].id)
    } catch(e){onError(e.message)}
  }

  async function selectTeam(id) {
    setSelected(id)
    try { setPlayers(await adminApi('/admin/teams/'+id+'/players')) }
    catch(e){onError(e.message)}
  }

  useEffect(()=>{load()},[])

  function resetPlayerForm() {
    setPlayer(emptyPlayer)
    setEditingPlayer(null)
    setPhotoFile(null)
    setPhotoPreview('')
  }

  function editPlayer(p) {
    setEditingPlayer(p.id)
    setPlayer({...p,shirtNumber:p.shirtNumber??'',photoUrl:p.photoUrl||''})
    setPhotoFile(null)
    setPhotoPreview(p.photoUrl||'')
  }

  function selectPhoto(file) {
    if (!file) return
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
      onError('Photo joueur : utilisez JPG, PNG ou WebP.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      onError('Photo joueur : taille maximale 10 MB.')
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    onError('')
  }

  async function uploadPlayerPhoto(file, playerName) {
    const fd=new FormData()
    fd.append('file',file)
    fd.append('title','Portrait joueur — '+playerName)
    fd.append('caption','Portrait officiel JSO')
    const media=await adminApi('/admin/media/upload',{method:'POST',body:fd,headers:{}})
    return media?.url || ''
  }

  async function saveTeam(e){
    e.preventDefault()
    try {
      const body={name:team.name,category:team.category,isActive:team.isActive}
      if(editing) await adminApi('/admin/teams/'+editing,{method:'PUT',body:JSON.stringify(body)})
      else await adminApi('/admin/teams',{method:'POST',body:JSON.stringify(body)})
      setTeam(emptyTeam);setEditing(null);await load()
    } catch(e){onError(e.message)}
  }

  async function savePlayer(e){
    e.preventDefault()
    if(!selected) return
    try {
      let photoUrl=player.photoUrl?.trim() || null
      if(photoFile){
        setUploadingPhoto(true)
        const playerName=[player.firstName,player.lastName].filter(Boolean).join(' ') || 'Joueur JSO'
        photoUrl=await uploadPlayerPhoto(photoFile,playerName)
        if(!photoUrl) throw new Error('Le média a été envoyé mais aucune URL photo n’a été retournée.')
      }
      const body={...player,shirtNumber:player.shirtNumber ? Number(player.shirtNumber):null,photoUrl}
      if(editingPlayer) await adminApi('/admin/teams/'+selected+'/players/'+editingPlayer,{method:'PUT',body:JSON.stringify(body)})
      else await adminApi('/admin/teams/'+selected+'/players',{method:'POST',body:JSON.stringify(body)})
      resetPlayerForm()
      await selectTeam(selected)
      onError('')
    } catch(e){onError(e.message)}
    finally {setUploadingPhoto(false)}
  }

  return <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-black">Équipes</h2><p className="mt-1 text-xs text-slate-500">Effectifs, catégories et saisons.</p></div><Plus size={18}/></div>
      <div className="mt-5 space-y-2">{teams.map(t=><button key={t.id} onClick={()=>selectTeam(t.id)} className={'w-full rounded-xl p-3 text-left '+(selected===t.id?'bg-jso-navy text-white':'bg-slate-50 hover:bg-slate-100')}><b>{t.name}</b><span className="ml-2 text-xs opacity-70">{t.category}</span></button>)}</div>
      <form onSubmit={saveTeam} className="mt-6 space-y-3 border-t pt-5"><Field label="Nom" value={team.name} onChange={e=>setTeam({...team,name:e.target.value})} required/><Field label="Catégorie" value={team.category} onChange={e=>setTeam({...team,category:e.target.value})} required/><button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/> {editing?'Mettre à jour':'Créer l’équipe'}</button></form>
      <div className="mt-4 space-y-2">{teams.map(t=><button key={'edit'+t.id} onClick={()=>{setEditing(t.id);setTeam({name:t.name,category:t.category,isActive:t.isActive})}} className="mr-2 rounded-lg px-2 py-1 text-xs font-bold text-jso-blue"><Pencil size={13} className="inline"/> {t.name}</button>)}</div>
    </div>

    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-xl font-black">Joueurs {selected && '— '+(teams.find(t=>t.id===selected)?.name||'')}</h2><p className="mt-1 text-xs text-slate-500">Portraits officiels avec cadrage homogène et visage clairement visible.</p></div>
        {editingPlayer && <button type="button" onClick={resetPlayerForm} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold">Nouveau joueur</button>}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players.map(p=><button key={p.id} type="button" onClick={()=>editPlayer(p)} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:-translate-y-0.5 hover:border-jso-gold hover:shadow-lg">
          <div className="aspect-[4/3] overflow-hidden bg-slate-100">{p.photoUrl?<img src={p.photoUrl} alt="" className="h-full w-full object-cover object-[50%_18%]" loading="lazy"/>:<div className="grid h-full place-items-center text-sm font-black text-slate-300">PHOTO JSO</div>}</div>
          <div className="p-3"><div className="flex items-center justify-between gap-2"><b className="truncate">{p.firstName} {p.lastName}</b><span className="rounded-lg bg-jso-navy px-2 py-1 text-xs font-black text-jso-gold">{p.shirtNumber??'—'}</span></div><p className="mt-1 text-xs text-slate-500">{p.position||'Poste non renseigné'}</p></div>
        </button>)}
      </div>

      {selected && <form onSubmit={savePlayer} className="mt-7 grid gap-5 border-t pt-6 lg:grid-cols-[220px_1fr]">
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <div className="aspect-[4/3]">
              {photoPreview
                ? <img src={photoPreview} alt="Aperçu du portrait joueur" className="h-full w-full object-cover object-[50%_18%]"/>
                : <div className="grid h-full place-items-center text-center text-xs font-bold text-slate-400">Aucun portrait<br/>sélectionné</div>}
            </div>
            {photoPreview && <button type="button" onClick={()=>{setPhotoFile(null);setPhotoPreview('');setPlayer({...player,photoUrl:''})}} className="absolute right-2 top-2 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-extrabold text-red-600 shadow">Retirer</button>}
          </div>
          <label className="mt-3 block cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-xs font-extrabold text-jso-blue hover:bg-slate-100">
            {photoFile ? 'Remplacer la photo' : 'Choisir une photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>selectPhoto(e.target.files?.[0]||null)} className="sr-only"/>
          </label>
          <p className="mt-2 text-[11px] leading-5 text-slate-400">JPG, PNG ou WebP · max. 10 MB · visage de face · cadrage poitrine · fond visuel homogène.</p>
        </div>

        <div className="grid content-start gap-3 sm:grid-cols-2">
          <Field label="Prénom" value={player.firstName} onChange={e=>setPlayer({...player,firstName:e.target.value})} required/>
          <Field label="Nom" value={player.lastName} onChange={e=>setPlayer({...player,lastName:e.target.value})} required/>
          <Field label="Numéro" type="number" min="0" max="99" value={player.shirtNumber} onChange={e=>setPlayer({...player,shirtNumber:e.target.value})}/>
          <Field label="Poste" value={player.position} onChange={e=>setPlayer({...player,position:e.target.value})}/>
          <div className="sm:col-span-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <b className="text-slate-700">Photo URL</b>
            <span className="ml-2 break-all">{player.photoUrl || 'Une photo sera générée depuis le fichier sélectionné.'}</span>
          </div>
          <button disabled={uploadingPhoto} className="sm:col-span-2 flex items-center justify-center gap-2 rounded-xl bg-jso-navy px-4 py-3 font-bold text-white disabled:opacity-50">
            <Save size={16}/>{uploadingPhoto?'Upload du portrait…':editingPlayer?'Mettre à jour le joueur':'Ajouter le joueur'}
          </button>
        </div>
      </form>}
    </div>
  </div>
}


function MatchesModule({ onError }) {
  const [matches,setMatches]=useState([]); const [refs,setRefs]=useState({seasons:[],competitions:[],teams:[]}); const [editing,setEditing]=useState(null)
  const [form,setForm]=useState({opponentName:'',kickoffAt:'',venue:'',isHome:true,homeScore:'',awayScore:'',status:'Scheduled',isPublished:false,seasonId:'',competitionId:'',teamId:''})
  async function load(){try{const [m,r]=await Promise.all([adminApi('/admin/matches'),adminApi('/admin/matches/references')]);setMatches(m);setRefs(r);if(!form.seasonId&&r.seasons[0])setForm(f=>({...f,seasonId:r.seasons[0].id,competitionId:r.competitions[0]?.id||'',teamId:r.teams[0]?.id||''}))}catch(e){onError(e.message)}}
  useEffect(()=>{load()},[])
  function startEdit(m){setEditing(m.id);setForm({...m,kickoffAt:m.kickoffAt?.slice(0,16)||'',homeScore:m.homeScore??'',awayScore:m.awayScore??''})}
  async function save(e){e.preventDefault();try{const body={...form,kickoffAt:new Date(form.kickoffAt).toISOString(),homeScore:form.homeScore===''?null:Number(form.homeScore),awayScore:form.awayScore===''?null:Number(form.awayScore),isPublished:Boolean(form.isPublished)};if(editing)await adminApi('/admin/matches/'+editing,{method:'PUT',body:JSON.stringify(body)});else await adminApi('/admin/matches',{method:'POST',body:JSON.stringify(body)});setEditing(null);setForm(f=>({...f,opponentName:'',venue:'',homeScore:'',awayScore:''}));await load()}catch(e){onError(e.message)}}
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
  const [copiedId,setCopiedId]=useState(null); const [fbBusyId,setFbBusyId]=useState(null); const [notice,setNotice]=useState('')
  async function load(){try{setItems(await adminApi('/admin/news'))}catch(e){onError(e.message)}}
  useEffect(()=>{load()},[])
  function edit(item){setEditing(item.id);setForm({...item,publishedAt:item.publishedAt?.slice(0,16)||''})}
  async function save(e){e.preventDefault();try{const body={...form,publishedAt:form.publishedAt?new Date(form.publishedAt).toISOString():null};if(editing)await adminApi('/admin/news/'+editing,{method:'PUT',body:JSON.stringify(body)});else await adminApi('/admin/news',{method:'POST',body:JSON.stringify(body)});setEditing(null);setForm(emptyNews);await load()}catch(e){onError(e.message)}}
  async function publish(id){try{await adminApi('/admin/news/'+id+'/publish',{method:'POST'});await load()}catch(e){onError(e.message)}}
  async function unpublish(id){try{await adminApi('/admin/news/'+id+'/unpublish',{method:'POST'});await load()}catch(e){onError(e.message)}}
  async function remove(id){if(!confirm('Supprimer cet article ?'))return;try{await adminApi('/admin/news/'+id,{method:'DELETE'});if(editing===id){setEditing(null);setForm(emptyNews)}await load()}catch(e){onError(e.message)}}
  // Public shareable link for an article (opens the deep-link on the site).
  function publicUrl(slug){return window.location.origin+'/actualites/'+encodeURIComponent(slug)}
  async function copyLink(n){try{await navigator.clipboard.writeText(publicUrl(n.slug));setCopiedId(n.id);setTimeout(()=>setCopiedId(null),2000)}catch{onError('Impossible de copier le lien. Copiez-le depuis la barre d’adresse du site.')}}
  // Manual share: opens the Facebook sharer with the public link prefilled.
  function shareFacebook(n){window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(publicUrl(n.slug)),'_blank','noopener,noreferrer')}
  // Auto-post to the club's Facebook Page via the backend. If no Page token is
  // configured, the backend replies 400 with a clear message and we fall back
  // to the manual sharer so the editor is never blocked.
  async function publishToFacebook(n){setFbBusyId(n.id);setNotice('');try{const res=await adminApi('/admin/social/facebook/publish',{method:'POST',body:JSON.stringify({articleId:n.id})});setNotice(res?.message||'Publié sur Facebook.')}catch(e){onError(e.message+' — utilisez « Partager » pour publier manuellement.');shareFacebook(n)}finally{setFbBusyId(null)}}
  return <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-black">News CMS</h2><button onClick={()=>{setEditing(null);setForm(emptyNews)}} className="rounded-xl bg-jso-navy p-2 text-white"><Plus size={18}/></button></div>{notice&&<p className="mt-3 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">{notice}</p>}<div className="mt-5 space-y-2">{items.map(n=><div key={n.id} className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between gap-3"><div><b>{n.title}</b><p className="text-xs text-slate-500">{n.status} · {n.slug}</p></div><div className="flex gap-2">{n.status==='Published'?<button onClick={()=>unpublish(n.id)} title="Dépublier" className="text-amber-600"><EyeOff size={16}/></button>:<button onClick={()=>publish(n.id)} title="Publier" className="text-emerald-600"><Eye size={16}/></button>}<button onClick={()=>edit(n)} title="Modifier" className="text-jso-blue"><Pencil size={16}/></button><button onClick={()=>remove(n.id)} title="Supprimer" className="text-red-600"><X size={16}/></button></div></div>{n.status==='Published'&&<div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3"><button onClick={()=>copyLink(n)} title="Copier le lien public" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-jso-navy hover:border-jso-blue"><Link2 size={14}/>{copiedId===n.id?'Lien copié':'Copier le lien'}</button><button onClick={()=>shareFacebook(n)} title="Partager sur Facebook" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-jso-navy hover:border-jso-blue"><Facebook size={14}/>Partager</button><button onClick={()=>publishToFacebook(n)} disabled={fbBusyId===n.id} title="Publier automatiquement sur la Page Facebook du club" className="inline-flex items-center gap-1.5 rounded-full bg-jso-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-jso-blue disabled:opacity-50"><Send size={14}/>{fbBusyId===n.id?'Publication…':'Publier sur Facebook'}</button></div>}</div>)}</div></div>
    <form onSubmit={save} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 space-y-3"><h2 className="text-xl font-black">{editing?'Modifier l’article':'Nouvel article'}</h2><Field label="Titre" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required/><Field label="Slug" value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} required/><Field label="Extrait" value={form.excerpt} onChange={e=>setForm({...form,excerpt:e.target.value})}/><label className="block text-sm font-bold">Contenu<textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} rows="9" className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-jso-blue"/></label><Field label="Cover URL" value={form.coverImageUrl} onChange={e=>setForm({...form,coverImageUrl:e.target.value})}/><button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/>Enregistrer</button></form>
  </div>
}

function ShopModule({ onError }) {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyProduct)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try { setProducts(await adminApi('/admin/shop/products')); onError('') }
    catch (e) { onError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function slugify(s) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') }
  function edit(p) {
    setEditing(p.id)
    setForm({ name: p.name || '', slug: p.slug || '', description: p.description || '', price: p.price ?? '', currency: p.currency || 'TND', imageUrl: p.imageUrl || '', category: p.category || '', stock: p.stock ?? 0, isActive: p.isActive })
  }
  function reset() { setForm(emptyProduct); setEditing(null) }

  async function save(e) {
    e.preventDefault()
    try {
      const body = {
        name: form.name.trim(),
        slug: (form.slug.trim() || slugify(form.name)),
        description: form.description.trim() || null,
        price: Number(form.price) || 0,
        currency: (form.currency || 'TND').trim().toUpperCase(),
        imageUrl: form.imageUrl.trim() || null,
        category: form.category.trim() || null,
        stock: Number(form.stock) || 0,
        isActive: form.isActive,
      }
      if (editing) await adminApi('/admin/shop/products/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      else await adminApi('/admin/shop/products', { method: 'POST', body: JSON.stringify(body) })
      reset()
      await load()
    } catch (e) { onError(e.message) }
  }

  async function remove(id) {
    if (!confirm('Supprimer ce produit ?')) return
    try { await adminApi('/admin/shop/products/' + id, { method: 'DELETE' }); await load() }
    catch (e) { onError(e.message) }
  }

  const money = (n, c) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c || 'TND' }).format(n || 0)

  return <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">Boutique — Produits</h2>
      <div className="mt-5 overflow-x-auto">
        {loading ? <p className="text-sm text-slate-400">Chargement…</p>
          : products.length === 0 ? <p className="text-sm text-slate-400">Aucun produit. Créez le premier avec le formulaire.</p>
          : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Produit</th><th className="p-2">Prix</th><th className="p-2">Stock</th><th className="p-2">Actif</th><th className="p-2"></th></tr></thead><tbody>{products.map(p => <tr key={p.id} className="border-b last:border-0"><td className="p-2"><b>{p.name}</b><div className="text-xs text-slate-400">{p.category || '—'}</div></td><td className="p-2 whitespace-nowrap">{money(p.price, p.currency)}</td><td className="p-2">{p.stock}</td><td className="p-2">{p.isActive ? 'Oui' : 'Non'}</td><td className="p-2 whitespace-nowrap"><button onClick={() => edit(p)} className="mr-2 text-jso-blue"><Pencil size={16}/></button><button onClick={() => remove(p.id)} className="text-red-600"><X size={16}/></button></td></tr>)}</tbody></table>}
      </div>
    </div>
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">{editing ? 'Modifier le produit' : 'Nouveau produit'}</h2>
      <form onSubmit={save} className="mt-5 space-y-3">
        <Field label="Nom" value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })} required/>
        <Field label="Slug" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} required/>
        <label className="block text-sm font-bold">Description<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows="3" className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-jso-blue"/></label>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prix" type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required/>
          <Field label="Devise" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stock" type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}/>
          <Field label="Catégorie" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}/>
        </div>
        <Field label="Image URL" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })}/>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })}/> Actif (visible dans la boutique)</label>
        <div className="flex gap-2 pt-2"><button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/> {editing ? 'Mettre à jour' : 'Créer'}</button>{editing && <button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}</div>
      </form>
    </div>
  </div>
}

function SponsorsModule({ onError }) {
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


function AnalyticsModule({ onError }) {
  const [teams, setTeams] = useState([])
  const [teamId, setTeamId] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  async function loadTeams() {
    try { const data = await adminApi('/admin/teams'); setTeams(data); if (data[0]) select(data[0].id) }
    catch (e) { onError(e.message) }
  }
  async function select(id) {
    setTeamId(id)
    setLoading(true)
    try { const data = await adminApi('/admin/teams/' + id + '/analytics'); setRows(data.players || []); onError('') }
    catch (e) { onError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { loadTeams() }, [])

  return <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="text-xl font-black">Analytics joueurs</h2>
      <select value={teamId} onChange={e => select(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-jso-blue">
        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </div>
    <p className="mt-2 text-xs text-slate-400">Statistiche derivate da presenze (compositions) ed eventi partita.</p>
    <div className="mt-5 overflow-x-auto">
      {loading ? <p className="text-sm text-slate-400">Chargement…</p>
        : rows.length === 0 ? <p className="text-sm text-slate-400">Aucune donnée de match pour cette équipe.</p>
        : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">#</th><th className="p-2">Joueur</th><th className="p-2">Présences</th><th className="p-2">Buts</th><th className="p-2">🟨</th><th className="p-2">🟥</th></tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-b last:border-0"><td className="p-2 font-black">{r.shirtNumber ?? '—'}</td><td className="p-2 font-bold">{r.name}</td><td className="p-2">{r.appearances}</td><td className="p-2 font-bold text-jso-blue">{r.goals}</td><td className="p-2">{r.yellowCards}</td><td className="p-2">{r.redCards}</td></tr>)}</tbody></table>}
    </div>
  </div>
}


export default function AdminApp() {
  const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('jso_admin_user')||'null')}catch{return null}})
  return user ? <AdminDashboard user={user} onLogout={()=>setUser(null)}/> : <Login onLogin={setUser}/>
}

