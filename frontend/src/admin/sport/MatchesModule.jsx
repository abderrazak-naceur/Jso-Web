import { useEffect, useState } from 'react'
import { Link2, Pencil, Save } from 'lucide-react'
import Field from '../components/Field'
import { adminApi } from '../api'
import { adminEditIdFromPath, adminEditUrl, navigateAdminEdit } from '../adminRoutes'
import { sharePreviewUrl } from '../../lib/sharePreviewUrl'
export default function MatchesModule({ onError }) {
  const [matches,setMatches]=useState([]); const [refs,setRefs]=useState({seasons:[],competitions:[],teams:[]}); const [editing,setEditing]=useState(null)
  const [form,setForm]=useState({opponentName:'',kickoffAt:'',venue:'',isHome:true,homeScore:'',awayScore:'',status:'Scheduled',isPublished:false,seasonId:'',competitionId:'',teamId:''})
  async function load(){try{const [m,r]=await Promise.all([adminApi('/admin/matches'),adminApi('/admin/matches/references')]);setMatches(m);setRefs(r);if(!form.seasonId&&r.seasons[0])setForm(f=>({...f,seasonId:r.seasons[0].id,competitionId:r.competitions[0]?.id||'',teamId:r.teams[0]?.id||''}))}catch(e){onError(e.message)}}
  useEffect(()=>{load()},[])
  useEffect(() => {
    function syncRoute() {
      const id = adminEditIdFromPath('matches')
      if (!id) { setEditing(null); setForm((current) => ({ ...current, opponentName: '', kickoffAt: '', venue: '', homeScore: '', awayScore: '' })); return }
      const item = matches.find((match) => String(match.id) === id)
      if (item) setSelected(item)
      else if (matches.length) onError('Match admin introuvable.')
    }
    syncRoute()
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [matches, onError])
  function setSelected(m){setEditing(m.id);setForm({...m,kickoffAt:m.kickoffAt?.slice(0,16)||'',homeScore:m.homeScore??'',awayScore:m.awayScore??''})}
  function startEdit(m){navigateAdminEdit('matches',m.id);setSelected(m)}
  async function copyAdminLink(m){try{await navigator.clipboard.writeText(window.location.origin+adminEditUrl('matches',m.id))}catch{onError('Impossible de copier le lien admin.')}}
  async function copyPublicLink(m){try{await navigator.clipboard.writeText(sharePreviewUrl('match',m.id))}catch{onError('Impossible de copier le lien public.')}}
  async function save(e){e.preventDefault();try{const body={...form,kickoffAt:new Date(form.kickoffAt).toISOString(),homeScore:form.homeScore===''?null:Number(form.homeScore),awayScore:form.awayScore===''?null:Number(form.awayScore),isPublished:Boolean(form.isPublished)};if(editing)await adminApi('/admin/matches/'+editing,{method:'PUT',body:JSON.stringify(body)});else await adminApi('/admin/matches',{method:'POST',body:JSON.stringify(body)});navigateAdminEdit('matches',null);setEditing(null);setForm(f=>({...f,opponentName:'',venue:'',homeScore:'',awayScore:''}));await load()}catch(e){onError(e.message)}}
  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">{editing?'Modifier le match':'Créer un match'}</h2><form onSubmit={save} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Field label="Adversaire" value={form.opponentName} onChange={e=>setForm({...form,opponentName:e.target.value})} required/><Field label="Coup d’envoi" type="datetime-local" value={form.kickoffAt} onChange={e=>setForm({...form,kickoffAt:e.target.value})} required/><Field label="Stade" value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})}/>
      <label className="text-sm font-bold">Statut<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option>Scheduled</option><option>Live</option><option>Finished</option><option>Postponed</option><option>Cancelled</option></select></label>
      {!editing && <><label className="text-sm font-bold">Saison<select value={form.seasonId} onChange={e=>setForm({...form,seasonId:e.target.value})} className="mt-2 w-full rounded-xl border p-2.5">{refs.seasons.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="text-sm font-bold">Compétition<select value={form.competitionId} onChange={e=>setForm({...form,competitionId:e.target.value})} className="mt-2 w-full rounded-xl border p-2.5">{refs.competitions.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="text-sm font-bold">Équipe<select value={form.teamId} onChange={e=>setForm({...form,teamId:e.target.value})} className="mt-2 w-full rounded-xl border p-2.5">{refs.teams.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label></>}
      <Field label="Score domicile" type="number" value={form.homeScore} onChange={e=>setForm({...form,homeScore:e.target.value})}/><Field label="Score extérieur" type="number" value={form.awayScore} onChange={e=>setForm({...form,awayScore:e.target.value})}/>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isHome} onChange={e=>setForm({...form,isHome:e.target.checked})}/> JSO à domicile</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isPublished} onChange={e=>setForm({...form,isPublished:e.target.checked})}/> Publié</label>
      <button className="flex items-center justify-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/>Enregistrer</button>
    </form></div>
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">Matchs</h2><div className="mt-4 space-y-2">{matches.map(m=><div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"><div><b>{m.isHome?'JSO':'Ext.'} — {m.opponentName}</b><p className="text-xs text-slate-500">{new Date(m.kickoffAt).toLocaleString('fr-FR')} · {m.status} · {m.isPublished?'Publié':'Brouillon'}</p></div><div className="flex gap-2"><button onClick={()=>startEdit(m)} className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-jso-blue"><Pencil size={15} className="mr-1 inline"/>Modifier</button><button onClick={()=>copyAdminLink(m)} title="Copier le lien admin" className="rounded-lg bg-white px-3 py-2 text-jso-blue"><Link2 size={16}/></button>{m.isPublished && <button onClick={()=>copyPublicLink(m)} title="Copier le lien public" className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-jso-blue">Public</button>}</div></div>)}</div></div>
  </div>
}
