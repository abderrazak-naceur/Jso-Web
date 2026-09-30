import { useEffect, useState } from 'react'
import { adminApi } from '../api'
export default function FormationsModule({ onError }) {
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
