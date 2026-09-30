import { useEffect, useState } from 'react'
import { adminApi } from '../api'
export default function MediaModule({ onError }) {
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
