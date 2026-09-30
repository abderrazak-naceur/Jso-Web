import { useEffect, useState } from 'react'
import { Plus, Pencil, Save, Upload } from 'lucide-react'
import Field from '../components/Field'
import { adminApi } from '../api'
import { emptyTeam, emptyPlayer } from '../constants'
export default function TeamsModule({ onError }) {
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
          <div className="aspect-[4/3] overflow-hidden bg-slate-100">{p.photoUrl?<img src={p.photoUrl} alt="" className={`h-full w-full ${String(p.photoUrl).startsWith('/players/')?'object-contain object-bottom':'object-cover object-[50%_18%]'}`} loading="lazy"/>:<div className="grid h-full place-items-center text-sm font-black text-slate-300">PHOTO JSO</div>}</div>
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
