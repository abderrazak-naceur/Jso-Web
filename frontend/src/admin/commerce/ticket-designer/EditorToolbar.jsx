import { Download, ImagePlus, QrCode, Redo2, Save, Shapes, Type, Undo2, UploadCloud } from 'lucide-react'

const button = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-jso-blue disabled:opacity-40'

export default function EditorToolbar({ canUndo, canRedo, dirty, busy, zoom, onUndo, onRedo, onAddText, onAddShape, onAddQr, onAddImage, onZoom, onSave, onDownload, onPublish }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <button type="button" onClick={onUndo} disabled={!canUndo} className={button} title="Annuler"><Undo2 size={15} /> <span className="hidden sm:inline">Annuler</span></button>
      <button type="button" onClick={onRedo} disabled={!canRedo} className={button} title="Rétablir"><Redo2 size={15} /> <span className="hidden sm:inline">Rétablir</span></button>
      <span className="mx-1 hidden h-7 w-px bg-slate-200 sm:block" />
      <button type="button" onClick={onAddText} className={button}><Type size={15} /> Texte</button>
      <button type="button" onClick={onAddShape} className={button}><Shapes size={15} /> Forme</button>
      <button type="button" onClick={onAddQr} className={button}><QrCode size={15} /> QR</button>
      <label className={button + ' cursor-pointer'}><ImagePlus size={15} /> Image<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { onAddImage(event.target.files?.[0]); event.target.value = '' }} /></label>
      <span className="mx-1 hidden h-7 w-px bg-slate-200 lg:block" />
      <label className="ml-auto flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600">Zoom
        <select value={zoom} onChange={(event) => onZoom(Number(event.target.value))} className="bg-transparent font-black outline-none"><option value={0.6}>60%</option><option value={0.8}>80%</option><option value={1}>100%</option><option value={1.25}>125%</option><option value={1.5}>150%</option></select>
      </label>
      <button type="button" onClick={onDownload} disabled={busy} className={button}><Download size={15} /> <span className="hidden sm:inline">Télécharger</span></button>
      <button type="button" onClick={onSave} disabled={busy || !dirty} className={button + (dirty ? ' border-jso-blue text-jso-blue' : '')}><Save size={15} /> {busy ? 'Patientez…' : 'Enregistrer'}</button>
      <button type="button" onClick={onPublish} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-jso-navy px-4 text-xs font-black text-white transition hover:bg-jso-blue disabled:opacity-40"><UploadCloud size={15} /> Publier le visuel</button>
    </div>
  )
}
