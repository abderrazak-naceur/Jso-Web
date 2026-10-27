import { useEffect, useRef, useState } from 'react'
import { Plus, EyeOff, Eye, Pencil, X, Link2, Facebook, Send, Save, ImagePlus, Images, Bold, Italic, List, Quote, Eye as PreviewIcon, ChevronLeft, Search, Upload } from 'lucide-react'
import Field from '../components/Field'
import { adminApi } from '../api'
import { emptyNews } from '../constants'
import { adminEditIdFromPath, adminEditUrl, navigateAdminEdit } from '../adminRoutes'
import { articleShareUrl } from '../../features/news/articleUrl'
import { sharePreviewUrl } from '../../lib/sharePreviewUrl'
import { getAssetUrl } from '../../lib/apiConfig'
import { useToast } from '../components/ui/Toast'
import { useConfirm } from '../components/ui/ConfirmDialog'

const slugify = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const insertAtCursor = (textarea, current, insertion) => {
  if (!textarea) return current ? current + '\n\n' + insertion : insertion
  const start = textarea.selectionStart ?? current.length
  const end = textarea.selectionEnd ?? current.length
  return current.slice(0, start) + insertion + current.slice(end)
}

export default function NewsModule({ onError }) {
  const toast=useToast()
  const confirm=useConfirm()
  const [items,setItems]=useState([])
  const [editing,setEditing]=useState(null)
  const [form,setForm]=useState(emptyNews)
  const [modalOpen,setModalOpen]=useState(Boolean(adminEditIdFromPath('news')))
  const [copiedId,setCopiedId]=useState(null)
  const [copiedAdminId,setCopiedAdminId]=useState(null)
  const [fbBusyId,setFbBusyId]=useState(null)
  const [notice,setNotice]=useState('')
  const [media,setMedia]=useState([])
  const [mediaOpen,setMediaOpen]=useState(false)
  const [mediaMode,setMediaMode]=useState('body')
  const [mediaQuery,setMediaQuery]=useState('')
  const [uploadFile,setUploadFile]=useState(null)
  const [uploadTitle,setUploadTitle]=useState('')
  const [addUploadToMedia,setAddUploadToMedia]=useState(false)
  const [uploadBusy,setUploadBusy]=useState(false)
  const [selectedMedia,setSelectedMedia]=useState([])
  const [preview,setPreview]=useState(false)
  const [slugTouched,setSlugTouched]=useState(false)
  const bodyRef=useRef(null)

  async function load(){try{setItems(await adminApi('/admin/news'))}catch(e){onError(e.message)}}
  async function loadMedia(){try{setMedia(await adminApi('/admin/media'))}catch(e){onError(e.message)}}
  useEffect(()=>{load();loadMedia()},[])
  useEffect(() => {
    function syncRoute() {
      const id = adminEditIdFromPath('news')
      if (!id) { setEditing(null); setModalOpen(false); setForm(emptyNews); return }
      const item = items.find((entry) => String(entry.id) === id)
      if (item) { setEditing(item.id); setModalOpen(true); setForm({ ...emptyNews, ...item, publishedAt: item.publishedAt?.slice(0, 16) || '' }); setSlugTouched(true) }
      else if (items.length) onError('Article introuvable.')
    }
    syncRoute()
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [items, onError])
  function edit(item){navigateAdminEdit('news',item.id);setEditing(item.id);setForm({...emptyNews,...item,publishedAt:item.publishedAt?.slice(0,16)||''});setModalOpen(true);setPreview(false);setSlugTouched(true)}
  function startNew(){navigateAdminEdit('news',null);setEditing(null);setForm(emptyNews);setModalOpen(true);setPreview(false);setSlugTouched(false);setMediaOpen(false)}
  function reset(){navigateAdminEdit('news',null);setEditing(null);setForm(emptyNews);setModalOpen(false);setPreview(false);setMediaOpen(false)}
  async function copyAdminLink(item){try{await navigator.clipboard.writeText(window.location.origin+adminEditUrl('news',item.id));setCopiedAdminId(item.id);setTimeout(()=>setCopiedAdminId(null),2000)}catch{onError('Impossible de copier le lien admin.')}}
  async function save(e){e.preventDefault();try{const body={...form,publishedAt:form.publishedAt?new Date(form.publishedAt).toISOString():null,status:form.status||'Draft'};if(editing)await adminApi('/admin/news/'+editing,{method:'PUT',body:JSON.stringify(body)});else await adminApi('/admin/news',{method:'POST',body:JSON.stringify(body)});reset();await load()}catch(e){onError(e.message)}}
  async function publish(id){try{await adminApi('/admin/news/'+id+'/publish',{method:'POST'});await load()}catch(e){onError(e.message)}}
  async function unpublish(id){try{await adminApi('/admin/news/'+id+'/unpublish',{method:'POST'});await load()}catch(e){onError(e.message)}}
  async function remove(id){if(!await confirm({title:'Supprimer cet article ?',message:'L’article sera supprimé définitivement.',confirmLabel:'Supprimer',danger:true}))return;try{await adminApi('/admin/news/'+id,{method:'DELETE'});if(editing===id)reset();await load();toast.success('Article supprimé.')}catch(e){onError(e.message)}}
  // Public, readable article URL (the SPA opens the article at this path). This
  // is the link we COPY: it always resolves, unlike the /api/share Open-Graph
  // endpoint which 404s for drafts and is not a frontend route.
  function publicUrl(slug){return articleShareUrl(slug)}
  // For Facebook sharing we use the /api/share endpoint instead: it serves the
  // Open-Graph tags (title, description, cover image) that Facebook's crawler
  // reads for a rich preview, then redirects a human to /actualites/{slug}.
  function facebookShareUrl(slug){return sharePreviewUrl('article',slug)}
  async function copyLink(n){try{await navigator.clipboard.writeText(publicUrl(n.slug));setCopiedId(n.id);setTimeout(()=>setCopiedId(null),2000)}catch{onError('Impossible de copier le lien.')}}
  function shareFacebook(n){window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(facebookShareUrl(n.slug)),'_blank','noopener,noreferrer')}
  async function publishToFacebook(n){setFbBusyId(n.id);setNotice('');try{const res=await adminApi('/admin/social/facebook/publish',{method:'POST',body:JSON.stringify({articleId:n.id})});setNotice(res?.message||'Publié sur Facebook.')}catch(e){onError(e.message+' — utilisez « Partager » pour publier manuellement.');shareFacebook(n)}finally{setFbBusyId(null)}}
  useEffect(() => { if (!modalOpen) return; const closeOnEscape = event => { if (event.key === 'Escape') { if(mediaOpen)setMediaOpen(false);else reset() } }; window.addEventListener('keydown', closeOnEscape); return () => window.removeEventListener('keydown', closeOnEscape) }, [modalOpen,mediaOpen])
  function openMedia(mode){setMediaMode(mode);setSelectedMedia([]);setMediaQuery('');setUploadFile(null);setUploadTitle('');setAddUploadToMedia(false);setMediaOpen(true);loadMedia()}
  function resolveUploadedImageUrl(value){ return getAssetUrl(value) }
  async function uploadImageFromCms(event){
    event.preventDefault()
    if(!uploadFile||uploadBusy)return
    setUploadBusy(true)
    try{
      const data=new FormData()
      data.append('file',uploadFile)
      data.append('title',uploadTitle.trim()||uploadFile.name.replace(/\.[^.]+$/,''))
      data.append('caption','')
      data.append('addToMedia',String(addUploadToMedia))
      const uploaded=await adminApi('/admin/media/upload',{method:'POST',body:data})
      const url=resolveUploadedImageUrl(uploaded.url)
      if(mediaMode==='cover')setForm(current=>({...current,coverImageUrl:url}))
      else {
        const markdown='!['+(uploaded.title||uploadFile.name)+']('+url+')'
        setForm(current=>({...current,body:insertAtCursor(bodyRef.current,current.body||'',markdown)}))
      }
      setUploadFile(null);setUploadTitle('')
      await loadMedia()
    }catch(e){onError(e.message)}
    finally{setUploadBusy(false)}
  }
  function chooseCover(item){setForm(current=>({...current,coverImageUrl:getAssetUrl(item.url)}));setMediaOpen(false)}
  function insertImages(){
    const selected=media.filter(m=>selectedMedia.includes(m.id))
    if(!selected.length)return
    if(mediaMode==='cover'){chooseCover(selected[0]);return}
    const markdown=selected.map(m=>'!['+(m.caption||m.title||'Foto')+']('+getAssetUrl(m.url)+')').join('\n\n')
    setForm(current=>({...current,body:insertAtCursor(bodyRef.current,current.body||'',markdown)}))
    setMediaOpen(false)
  }
  function formatBody(prefix,suffix=prefix){
    const textarea=bodyRef.current
    if(!textarea)return
    const start=textarea.selectionStart,end=textarea.selectionEnd
    const selected=(form.body||'').slice(start,end)
    const next=(form.body||'').slice(0,start)+prefix+(selected||'testo')+suffix+(form.body||'').slice(end)
    setForm(current=>({...current,body:next}))
    requestAnimationFrame(()=>{textarea.focus();textarea.setSelectionRange(start+prefix.length,start+prefix.length+(selected||'testo').length)})
  }
  const filteredMedia=media.filter(m=>m.isPublished!==false&&(!mediaQuery||[m.title,m.caption,m.fileName].some(v=>String(v||'').toLowerCase().includes(mediaQuery.toLowerCase()))))
  const bodyLines=String(form.body||'').split(/\n+/).filter(Boolean)
  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">Articoli</h2><p className="mt-1 text-sm text-slate-500">Gestisci notizie, foto e pubblicazione come in un CMS editoriale.</p></div><button type="button" onClick={startNew} className="flex items-center gap-2 rounded-xl bg-jso-navy px-3 py-2 font-bold text-white"><Plus size={18}/>Nuovo articolo</button></div>
      {notice&&<p className="mt-3 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">{notice}</p>}
      <div className="mt-5 space-y-2">{items.map(n=><div key={n.id} className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between gap-3"><div className="flex min-w-0 gap-3">{n.coverImageUrl&&<img src={getAssetUrl(n.coverImageUrl)} alt="" className="h-16 w-20 rounded-lg object-cover"/>}<div className="min-w-0"><b className="block truncate">{n.title}</b><p className="text-xs text-slate-500">{n.status} · {n.slug}</p><p className="mt-1 line-clamp-2 text-sm text-slate-600">{n.excerpt}</p></div></div><div className="flex shrink-0 gap-2">{n.status==='Published'?<button type="button" onClick={()=>unpublish(n.id)} title="Ritira" className="text-amber-600"><EyeOff size={16}/></button>:<button type="button" onClick={()=>publish(n.id)} title="Pubblica" className="text-emerald-600"><Eye size={16}/></button>}<button type="button" onClick={()=>edit(n)} title="Modifica" className="text-jso-blue"><Pencil size={16}/></button><button type="button" onClick={()=>copyAdminLink(n)} title="Copia link admin" className="text-jso-blue"><Link2 size={16}/>{copiedAdminId===n.id&&<span className="sr-only">Copiato</span>}</button><button type="button" onClick={()=>remove(n.id)} title="Elimina" className="text-red-600"><X size={16}/></button></div></div>{n.status==='Published'&&<div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3"><button type="button" onClick={()=>copyLink(n)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-jso-navy"><Link2 size={14}/>{copiedId===n.id?'Link copiato':'Copia link'}</button><button type="button" onClick={()=>shareFacebook(n)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-jso-navy"><Facebook size={14}/>Condividi</button><button type="button" onClick={()=>publishToFacebook(n)} disabled={fbBusyId===n.id} className="inline-flex items-center gap-1.5 rounded-full bg-jso-navy px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"><Send size={14}/>{fbBusyId===n.id?'Pubblicazione…':'Pubblica su Facebook'}</button></div>}</div>)}</div>
    </div>
    {modalOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-2 sm:p-5" onMouseDown={e => { if(e.target===e.currentTarget) reset() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="admin-form-title" className="max-h-[96vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-slate-50 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-7"><div className="flex items-center gap-3"><button type="button" onClick={reset} aria-label="Indietro" className="rounded-lg p-2 hover:bg-slate-100"><ChevronLeft size={20}/></button><div><h2 id="admin-form-title" className="text-xl font-black">{editing?'Modifica articolo':'Nuovo articolo'}</h2><p className="text-xs text-slate-500">Bozza · CMS editoriale JSO</p></div></div><div className="flex items-center gap-2"><button type="button" onClick={()=>setPreview(!preview)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"><PreviewIcon size={16}/>{preview?'Modifica':'Anteprima'}</button><button type="button" onClick={reset} aria-label="Chiudi" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20}/></button></div></div>
        {preview ? <div className="mx-auto my-8 max-w-3xl overflow-hidden rounded-2xl bg-white shadow-sm">{form.coverImageUrl&&<img src={getAssetUrl(form.coverImageUrl)} alt="" className="max-h-[26rem] w-full object-cover"/>}<div className="p-7 sm:p-10"><p className="text-xs font-black uppercase tracking-widest text-jso-blue">Anteprima articolo</p><h1 className="mt-3 text-3xl font-black sm:text-5xl">{form.title||'Titolo articolo'}</h1>{form.excerpt&&<p className="mt-5 text-xl font-semibold text-slate-600">{form.excerpt}</p>}<div className="mt-7 space-y-5 text-base leading-8 text-slate-700">{bodyLines.map((line,i)=>{const match=line.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)$/);return match?<figure key={i}><img src={getAssetUrl(match[2])} alt={match[1]} className="max-h-[36rem] w-full rounded-xl object-contain"/>{match[1]&&<figcaption className="mt-2 text-sm text-slate-500">{match[1]}</figcaption>}</figure>:<p key={i}>{line}</p>})}</div></div></div> : <form onSubmit={save} className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            <section className="rounded-xl border border-slate-200 bg-white p-5"><Field label="Titolo" value={form.title} onChange={e=>setForm(c=>({...c,title:e.target.value,...(!slugTouched?{slug:slugify(e.target.value)}:{})}))} required/><div className="mt-4"><Field label="URL / slug" value={form.slug} onChange={e=>{setSlugTouched(true);setForm(c=>({...c,slug:slugify(e.target.value)}))}} required/><p className="mt-1 text-xs text-slate-400">Indirizzo leggibile dell’articolo.</p></div><div className="mt-4"><Field label="Sommario" value={form.excerpt} onChange={e=>setForm({...form,excerpt:e.target.value})}/></div></section>
            <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="mb-3 flex items-center justify-between"><h3 className="font-black">Contenuto</h3><button type="button" onClick={()=>openMedia('body')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:border-jso-blue"><Images size={15}/>Inserisci foto / galleria</button></div><div className="flex flex-wrap gap-1 rounded-t-xl border border-b-0 border-slate-200 bg-slate-50 p-2"><button type="button" title="Grassetto Markdown" onClick={()=>formatBody('**')} className="rounded-lg p-2 hover:bg-white"><Bold size={16}/></button><button type="button" title="Corsivo Markdown" onClick={()=>formatBody('*')} className="rounded-lg p-2 hover:bg-white"><Italic size={16}/></button><button type="button" title="Elenco" onClick={()=>formatBody('\n- ','')} className="rounded-lg p-2 hover:bg-white"><List size={16}/></button><button type="button" title="Citazione" onClick={()=>formatBody('> ','')} className="rounded-lg p-2 hover:bg-white"><Quote size={16}/></button><span className="ml-auto self-center text-xs text-slate-400">Testo e immagini · Markdown semplice</span></div><textarea ref={bodyRef} value={form.body||''} onChange={e=>setForm({...form,body:e.target.value})} rows={17} required placeholder={'Scrivi qui il testo dell’articolo…\n\nPuoi inserire foto dalla Media Library e creare una galleria.'} className="w-full rounded-b-xl border border-slate-200 p-4 leading-7 outline-none focus:border-jso-blue"/><p className="mt-2 text-xs text-slate-500">Le foto inserite vengono visualizzate nel corpo dell’articolo, non solo come copertina.</p></section>
          </div>
          <aside className="space-y-4"><section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-black">Pubblicazione</h3><label className="mt-4 block text-sm font-bold">Stato<select value={form.status||'Draft'} onChange={e=>setForm({...form,status:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3"><option value="Draft">Bozza</option><option value="Published">Pubblicato</option></select></label><label className="mt-4 block text-sm font-bold">Data di pubblicazione<input type="datetime-local" value={form.publishedAt||''} onChange={e=>setForm({...form,publishedAt:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 p-3"/></label><button type="submit" className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-jso-navy px-4 py-3 font-bold text-white"><Save size={16}/>{form.status==='Published'?'Salva e pubblica':'Salva bozza'}</button><button type="button" onClick={()=>setPreview(true)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-bold">Anteprima articolo</button></section>
            <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-black">Immagine in evidenza</h3><button type="button" onClick={()=>openMedia('cover')} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold"><ImagePlus size={14}/>Scegli</button></div>{form.coverImageUrl?<div className="mt-3"><img src={form.coverImageUrl} alt="Copertina" className="aspect-video w-full rounded-lg object-cover"/><button type="button" onClick={()=>setForm({...form,coverImageUrl:''})} className="mt-2 text-xs font-bold text-red-600">Rimuovi copertina</button></div>:<button type="button" onClick={()=>openMedia('cover')} className="mt-3 grid aspect-video w-full place-items-center rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-500 hover:border-jso-blue"><ImagePlus size={22}/>Aggiungi copertina</button>}</section>
            <section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-black">Suggerimenti</h3><p className="mt-2 text-sm leading-6 text-slate-500">Usa un titolo chiaro, un breve sommario e una foto orizzontale. Puoi salvare in bozza e pubblicare quando sei pronto.</p></section>
          </aside>
        </form>}
      </section>
      {mediaOpen&&<div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6" onMouseDown={e=>{if(e.target===e.currentTarget)setMediaOpen(false)}}><section role="dialog" aria-modal="true" aria-labelledby="media-picker-title" className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-5"><div><h3 id="media-picker-title" className="text-lg font-black">Media Library</h3><p className="text-sm text-slate-500">{mediaMode==='cover'?'Scegli la copertina':'Seleziona una o più foto da inserire nell’articolo'}</p></div><button type="button" onClick={()=>setMediaOpen(false)} aria-label="Chiudi media library" className="rounded-lg p-2 hover:bg-slate-100"><X size={20}/></button></header><div className="border-b border-slate-100 p-4">
<form onSubmit={uploadImageFromCms} className="mb-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
<label className="text-xs font-bold text-slate-600">Carica dal computer<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>{const file=e.target.files?.[0]||null;setUploadFile(file);if(file&&!uploadTitle)setUploadTitle(file.name.replace(/\.[^.]+$/,''))}} className="mt-1 block w-full text-xs font-normal"/></label>
<label className="text-xs font-bold text-slate-600">Titolo immagine<input value={uploadTitle} onChange={e=>setUploadTitle(e.target.value)} placeholder="Titolo facoltativo" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"/></label>
<button type="submit" disabled={!uploadFile||uploadBusy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-jso-navy px-3 py-2 text-sm font-bold text-white disabled:opacity-40"><Upload size={15}/>{uploadBusy?'Caricamento…':'Carica immagine'}</button>
</div>
<label className="mt-3 flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" checked={addUploadToMedia} onChange={e=>setAddUploadToMedia(e.target.checked)} className="mt-0.5"/><span><span className="font-bold">Aggiungi anche a Media House</span><span className="block text-slate-500">Disattivato per impostazione predefinita: l’immagine verrà usata solo in questo articolo.</span></span></label>
<p className="mt-2 text-xs text-slate-500">JPEG, PNG, WebP o GIF · massimo 10 MB. L’immagine verrà aggiunta direttamente all’articolo.</p>
</form><div className="relative"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input value={mediaQuery} onChange={e=>setMediaQuery(e.target.value)} placeholder="Cerca foto per titolo o didascalia…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 outline-none focus:border-jso-blue"/></div></div><div className="min-h-0 flex-1 overflow-y-auto p-4"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{filteredMedia.map(m=><button type="button" key={m.id} onClick={()=>mediaMode==='cover'?chooseCover(m):setSelectedMedia(old=>old.includes(m.id)?old.filter(id=>id!==m.id):[...old,m.id])} className={'overflow-hidden rounded-xl border text-left '+(selectedMedia.includes(m.id)||mediaMode==='cover'&&form.coverImageUrl===getAssetUrl(m.url)?'border-jso-blue ring-2 ring-jso-blue/20':'border-slate-200')}><img src={getAssetUrl(m.url)} alt={m.caption||m.title} className="aspect-[4/3] w-full bg-slate-100 object-cover"/><div className="p-2"><span className="block truncate text-xs font-bold">{m.title||m.fileName||'Immagine'}</span>{m.caption&&<span className="block truncate text-xs text-slate-500">{m.caption}</span>}</div></button>)}</div>{!filteredMedia.length&&<div className="py-12 text-center text-sm text-slate-500">Nessuna foto disponibile. Carica prima le immagini in Media Library.</div>}</div><footer className="flex items-center justify-between gap-3 border-t border-slate-200 p-4"><span className="text-sm text-slate-500">{mediaMode==='cover'?'Seleziona una copertina':selectedMedia.length+' foto selezionate'}</span><div className="flex gap-2"><button type="button" onClick={()=>setMediaOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 font-bold">Annulla</button>{mediaMode!=='cover'&&<button type="button" disabled={!selectedMedia.length} onClick={insertImages} className="rounded-xl bg-jso-navy px-4 py-2 font-bold text-white disabled:opacity-40">Inserisci foto</button>}</div></footer></section></div>}
    </div>}
  </div>
}
