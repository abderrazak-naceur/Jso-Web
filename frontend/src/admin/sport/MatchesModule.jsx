import { useEffect, useState } from 'react'
import { ImagePlus, Link2, Pencil, Save, Trash2, X } from 'lucide-react'
import { API_BASE_URL, resolveMediaUrl } from '../../lib/apiConfig'
import Field from '../components/Field'
import { adminApi } from '../api'
import { adminEditIdFromPath, adminEditUrl, navigateAdminEdit } from '../adminRoutes'
import { sharePreviewUrl } from '../../lib/sharePreviewUrl'
export default function MatchesModule({ onError }) {
  const [matches,setMatches]=useState([]); const [refs,setRefs]=useState({seasons:[],competitions:[],teams:[]}); const [editing,setEditing]=useState(null); const [modalOpen,setModalOpen]=useState(false)
  const [form,setForm]=useState({opponentName:'',kickoffAt:'',venue:'',opponentLogoUrl:'',isHome:true,homeScore:'',awayScore:'',status:'Scheduled',isPublished:false,seasonId:'',competitionId:'',teamId:''})
  async function load(){try{const [m,r]=await Promise.all([adminApi('/admin/matches'),adminApi('/admin/matches/references')]);setMatches(m);setRefs(r);if(!form.seasonId&&r.seasons[0])setForm(f=>({...f,seasonId:r.seasons[0].id,competitionId:r.competitions[0]?.id||'',teamId:r.teams[0]?.id||''}))}catch(e){onError(e.message)}}
  useEffect(()=>{load()},[])
  useEffect(() => {
    function syncRoute() {
      const id = adminEditIdFromPath('matches')
      if (!id) { setEditing(null); setModalOpen(false); setForm((current) => ({ ...current, opponentName: '', kickoffAt: '', venue: '', opponentLogoUrl: '', homeScore: '', awayScore: '' })); return }
      const item = matches.find((match) => String(match.id) === id)
      if (item) { setSelected(item); setModalOpen(true) }
      else if (matches.length) onError('Match admin introuvable.')
    }
    syncRoute()
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [matches, onError])
  function setSelected(m){setEditing(m.id);setForm({...m,opponentLogoUrl:resolveMediaUrl(m.opponentLogoUrl||m.OpponentLogoUrl||''),kickoffAt:m.kickoffAt?.slice(0,16)||'',homeScore:m.homeScore??'',awayScore:m.awayScore??''})}
  function startCreate(){setEditing(null);setForm(f=>({...f,opponentName:'',kickoffAt:'',venue:'',opponentLogoUrl:'',homeScore:'',awayScore:'',status:'Scheduled',isPublished:false}));setModalOpen(true)}
  function closeModal(){navigateAdminEdit('matches',null);setEditing(null);setModalOpen(false)}
  async function uploadOpponentLogo(file){if(!file)return;try{const data=new FormData();data.append('file',file);data.append('title',`Logo adversaire - ${form.opponentName||'match'}`);data.append('caption','Logo de l’équipe adverse');const asset=await adminApi('/admin/media/upload',{method:'POST',body:data});setForm(current=>({...current,opponentLogoUrl:resolveMediaUrl(asset.url)}))}catch(e){onError(e.message)}}
  function startEdit(m){navigateAdminEdit('matches',m.id);setSelected(m);setModalOpen(true)}
  async function copyAdminLink(m){try{await navigator.clipboard.writeText(window.location.origin+adminEditUrl('matches',m.id))}catch{onError('Impossible de copier le lien admin.')}}
  async function copyPublicLink(m){try{await navigator.clipboard.writeText(sharePreviewUrl('match',m.id))}catch{onError('Impossible de copier le lien public.')}}
  async function save(e){e.preventDefault();try{const body={...form,opponentLogoUrl:form.opponentLogoUrl||null,kickoffAt:new Date(form.kickoffAt).toISOString(),homeScore:form.homeScore===''?null:Number(form.homeScore),awayScore:form.awayScore===''?null:Number(form.awayScore),isPublished:Boolean(form.isPublished)};if(editing)await adminApi('/admin/matches/'+editing,{method:'PUT',body:JSON.stringify(body)});else await adminApi('/admin/matches',{method:'POST',body:JSON.stringify(body)});navigateAdminEdit('matches',null);setEditing(null);setModalOpen(false);setForm(f=>({...f,opponentName:'',venue:'',opponentLogoUrl:'',homeScore:'',awayScore:''}));await load()}catch(e){onError(e.message)}}
  useEffect(() => {
    if (!modalOpen) return
    function onKeyDown(event) { if (event.key === 'Escape') closeModal() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalOpen])
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Gestion des matchs</h2><p className="mt-1 text-sm text-slate-500">Créez un match ou modifiez ses informations dans une fenêtre dédiée.</p></div><button type="button" onClick={startCreate} className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Pencil size={16}/>Créer un match</button></div>
    {modalOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" onMouseDown={e=>{if(e.target===e.currentTarget)closeModal()}}>
      <section role="dialog" aria-modal="true" aria-labelledby="match-edit-title" className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4"><div><h2 id="match-edit-title" className="text-xl font-black">{editing?'Modifier le match':'Créer un match'}</h2><p className="mt-1 text-sm text-slate-500">{editing?'Modifiez les informations puis enregistrez.':'Renseignez les informations du nouveau match.'}</p></div><button type="button" onClick={closeModal} aria-label="Fermer" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20}/></button></div>
        <form onSubmit={save} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Field label="Adversaire" value={form.opponentName} onChange={e=>setForm({...form,opponentName:e.target.value})} required/><Field label="Coup d’envoi" type="datetime-local" value={form.kickoffAt} onChange={e=>setForm({...form,kickoffAt:e.target.value})} required/><Field label="Stade" value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})}/>
      <div className="rounded-xl border border-slate-200 p-3 md:col-span-2"><label className="text-sm font-bold">Logo de l’équipe adverse</label><div className="mt-2 flex flex-wrap items-center gap-3">{form.opponentLogoUrl && <img src={resolveMediaUrl(form.opponentLogoUrl)} alt="Aperçu du logo adverse" className="h-14 w-14 rounded-xl border border-slate-200 bg-white object-contain p-1"/>}<label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"><ImagePlus size={16}/>Choisir une image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={e=>{uploadOpponentLogo(e.target.files?.[0]);e.target.value=''}}/></label>{form.opponentLogoUrl && <button type="button" onClick={()=>setForm({...form,opponentLogoUrl:''})} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold text-red-600"><Trash2 size={15}/>Retirer</button>}<span className="text-xs text-slate-500">PNG, JPG, WebP ou GIF · 10 Mo max</span></div></div>
      <label className="text-sm font-bold">Statut<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option>Scheduled</option><option>Live</option><option>Finished</option><option>Postponed</option><option>Cancelled</option></select></label>
      {!editing && <><label className="text-sm font-bold">Saison<select value={form.seasonId} onChange={e=>setForm({...form,seasonId:e.target.value})} className="mt-2 w-full rounded-xl border p-2.5">{refs.seasons.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="text-sm font-bold">Compétition<select value={form.competitionId} onChange={e=>setForm({...form,competitionId:e.target.value})} className="mt-2 w-full rounded-xl border p-2.5">{refs.competitions.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="text-sm font-bold">Équipe<select value={form.teamId} onChange={e=>setForm({...form,teamId:e.target.value})} className="mt-2 w-full rounded-xl border p-2.5">{refs.teams.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
      <Field label="Score domicile" type="number" value={form.homeScore} onChange={e=>setForm({...form,homeScore:e.target.value})}/><Field label="Score extérieur" type="number" value={form.awayScore} onChange={e=>setForm({...form,awayScore:e.target.value})}/>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isHome} onChange={e=>setForm({...form,isHome:e.target.checked})}/> JSO à domicile</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isPublished} onChange={e=>setForm({...form,isPublished:e.target.checked})}/> Publié</label>


        <div className="flex flex-wrap justify-end gap-2 md:col-span-2 xl:col-span-4"><button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-700">Annuler</button><button className="flex items-center justify-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/>{editing?'Enregistrer les modifications':'Créer le match'}</button></div>
        </form>
      </section>
    </div>}
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">Matchs</h2><div className="mt-4 space-y-2">{matches.map(m=><div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"><div><b>{m.isHome?'JSO':'Ext.'} — {m.opponentName}</b><p className="text-xs text-slate-500">{new Date(m.kickoffAt).toLocaleString('fr-FR')} · {m.status} · {m.isPublished?'Publié':'Brouillon'}</p></div><div className="flex gap-2"><button type="button" onClick={()=>startEdit(m)} className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-jso-blue"><Pencil size={15} className="mr-1 inline"/>Modifier</button><button type="button" onClick={()=>copyAdminLink(m)} title="Copier le lien admin" className="rounded-lg bg-white px-3 py-2 text-jso-blue"><Link2 size={16}/></button>{m.isPublished && <button type="button" onClick={()=>copyPublicLink(m)} title="Copier le lien public" className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-jso-blue">Public</button>}</div></div>)}</div></div>
  </div>
}
