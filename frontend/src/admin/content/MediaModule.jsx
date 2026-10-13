import { useEffect, useState } from 'react'
import { X, Pencil, Save, Upload } from 'lucide-react'
import Field from '../components/Field'
import { adminApi } from '../api'
export default function MediaModule({ onError }) {
  const [items,setItems]=useState([]); const [file,setFile]=useState(null); const [title,setTitle]=useState(''); const [caption,setCaption]=useState('')
  const [editing,setEditing]=useState(null); const [editForm,setEditForm]=useState({title:'',caption:'',isPublished:true}); const [editModalOpen,setEditModalOpen]=useState(false)
  async function load(){try{setItems(await adminApi('/admin/media'))}catch(e){onError(e.message)}} useEffect(()=>{load()},[])
  useEffect(() => { if (!editModalOpen) return; const onKeyDown = event => { if (event.key === 'Escape') cancelEdit() }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown) }, [editModalOpen])
  async function upload(e){e.preventDefault();if(!file)return;try{const fd=new FormData();fd.append('file',file);fd.append('title',title);fd.append('caption',caption);await adminApi('/admin/media/upload',{method:'POST',body:fd,headers:{}});setFile(null);setTitle('');setCaption('');e.target.reset();await load()}catch(e){onError(e.message)}}
  async function remove(id){if(!confirm('Supprimer ce média ?'))return;try{await adminApi('/admin/media/'+id,{method:'DELETE'});await load()}catch(e){onError(e.message)}}
  function startEdit(m){setEditing(m.id);setEditForm({title:m.title||'',caption:m.caption||'',isPublished:m.isPublished!==false});setEditModalOpen(true)}
  function cancelEdit(){setEditing(null);setEditModalOpen(false)}
  async function saveEdit(m){
    try{
      // The backend PUT replaces the record, so resend the unchanged url/type/thumbnail.
      const body={title:editForm.title.trim(),caption:editForm.caption.trim()||null,url:m.url,type:m.type||'Image',thumbnailUrl:m.thumbnailUrl||null,isPublished:editForm.isPublished}
      await adminApi('/admin/media/'+m.id,{method:'PUT',body:JSON.stringify(body)})
      setEditing(null);setEditModalOpen(false);onError('');await load()
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
      <b className="block truncate">{m.title}</b>
      {m.caption&&<p className="mt-1 truncate text-xs text-slate-500">{m.caption}</p>}
      <p className="mt-1 text-xs text-slate-500">{m.fileSize?((m.fileSize/1024/1024).toFixed(2)+' MB'):m.type}{m.isPublished===false?' · Masqué':''}</p>
      <div className="mt-3 flex gap-2"><button type="button" onClick={()=>startEdit(m)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-jso-navy"><Pencil size={13}/>Modifier</button><button type="button" onClick={()=>remove(m.id)} className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700"><X size={13}/>Supprimer</button></div>
    </div></div>)}</div>
    {editModalOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" onMouseDown={e=>{if(e.target===e.currentTarget)cancelEdit()}}>
      <section role="dialog" aria-modal="true" aria-labelledby="media-edit-title" className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between border-b border-slate-100 pb-4"><div><h2 id="media-edit-title" className="text-xl font-black">Modifier le média</h2><p className="mt-1 text-sm text-slate-500">Modifier le titre, la légende ou la visibilité.</p></div><button type="button" aria-label="Fermer" onClick={cancelEdit} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20}/></button></div>
        <form onSubmit={e=>{e.preventDefault();const item=items.find(x=>x.id===editing);if(item)saveEdit(item)}} className="space-y-3">
          <Field label="Titre" value={editForm.title} onChange={e=>setEditForm({...editForm,title:e.target.value})} required/>
          <Field label="Légende" value={editForm.caption} onChange={e=>setEditForm({...editForm,caption:e.target.value})}/>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={editForm.isPublished} onChange={e=>setEditForm({...editForm,isPublished:e.target.checked})}/> Publié</label>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={cancelEdit} className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-600">Annuler</button><button type="submit" className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/>Enregistrer</button></div>
        </form>
      </section>
    </div>}
  </div>
}
