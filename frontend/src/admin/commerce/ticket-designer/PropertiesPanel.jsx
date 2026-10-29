import { Eye, EyeOff, Lock, LockOpen } from 'lucide-react'
import { FONT_FAMILIES } from './document'

const input = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-jso-blue'
const label = 'text-[11px] font-black uppercase tracking-wide text-slate-500'

function NumberField({ labelText, value, min, max, step = 1, onChange }) {
  return <label className={label}>{labelText}<input type="number" value={Math.round(Number(value || 0) * 10) / 10} min={min} max={max} step={step} onChange={(event) => { const number = Number(event.target.value); if (Number.isFinite(number)) onChange(number) }} className={input} /></label>
}

function ContentFields({ variables, onVariables }) {
  const change = (key, value) => onVariables({ ...variables, [key]: value })
  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <h3 className="text-sm font-black text-slate-900">Contenu du match</h3>
    <p className="mt-1 text-xs leading-5 text-slate-400">Ces valeurs remplissent tous les formats. Vous pouvez ensuite modifier chaque calque séparément.</p>
    <label className={'mt-4 block ' + label}>Titre<input value={variables.titleText || ''} onChange={(event) => change('titleText', event.target.value)} className={input} placeholder="BILLET DE MATCH" /></label>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <label className={label}>Équipe 1<input value={variables.homeTeam || ''} onChange={(event) => change('homeTeam', event.target.value)} className={input} /></label>
      <label className={label}>Équipe 2<input value={variables.awayTeam || ''} onChange={(event) => change('awayTeam', event.target.value)} className={input} /></label>
    </div>
    <label className={'mt-3 block ' + label}>Date<input value={variables.dateText || ''} onChange={(event) => change('dateText', event.target.value)} className={input} /></label>
    <label className={'mt-3 block ' + label}>Stade / lieu<input value={variables.venueText || ''} onChange={(event) => change('venueText', event.target.value)} className={input} /></label>
    <label className={'mt-3 block ' + label}>Prix affiché<input value={variables.priceText || ''} onChange={(event) => change('priceText', event.target.value)} className={input} placeholder="5 DT" /></label>
  </section>
}

export default function PropertiesPanel({ layer, variables, onVariables, onPatch, onReplaceImage }) {
  if (!layer) return <div className="space-y-4 xl:sticky xl:top-28 xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto"><ContentFields variables={variables} onVariables={onVariables} /><aside className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-sm font-black text-slate-900">Propriétés du calque</h3><p className="mt-2 text-sm leading-6 text-slate-500">Sélectionnez un texte, une image, une forme ou le QR dans le canevas.</p></aside></div>

  const patch = (value) => onPatch(layer.id, value)
  return <div className="space-y-4 xl:sticky xl:top-28 xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto">
    <ContentFields variables={variables} onVariables={onVariables} />
    <aside className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h3 className="truncate text-sm font-black text-slate-900">Propriétés du calque</h3><p className="mt-0.5 truncate text-xs text-slate-400">{layer.name}</p></div>
        <div className="flex gap-1">
          <button type="button" onClick={() => patch({ visible: layer.visible === false })} title={layer.visible === false ? 'Afficher' : 'Masquer'} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500">{layer.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}</button>
          <button type="button" onClick={() => patch({ locked: !layer.locked })} title={layer.locked ? 'Déverrouiller' : 'Verrouiller'} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500">{layer.locked ? <Lock size={14} /> : <LockOpen size={14} />}</button>
        </div>
      </div>

      <label className={'mt-5 block ' + label}>Nom du calque<input value={layer.name || ''} maxLength={120} onChange={(event) => patch({ name: event.target.value })} className={input} /></label>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className={label}>Position et taille</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <NumberField labelText="X" value={layer.x} min={-8192} max={8192} onChange={(x) => patch({ x })} />
          <NumberField labelText="Y" value={layer.y} min={-8192} max={8192} onChange={(y) => patch({ y })} />
          <NumberField labelText="Largeur" value={layer.width} min={20} max={8192} onChange={(width) => patch({ width })} />
          <NumberField labelText="Hauteur" value={layer.height} min={20} max={8192} onChange={(height) => patch({ height })} />
          <NumberField labelText="Rotation" value={layer.rotation || 0} min={-360} max={360} step={0.5} onChange={(rotation) => patch({ rotation })} />
          <NumberField labelText="Opacité" value={layer.opacity ?? 1} min={0} max={1} step={0.05} onChange={(opacity) => patch({ opacity })} />
        </div>
      </div>

      {layer.type === 'text' && <div className="mt-5 border-t border-slate-100 pt-4">
        <p className={label}>Texte du calque</p>
        <textarea value={layer.text || ''} rows={4} maxLength={4096} onChange={(event) => patch({ text: event.target.value })} className={input} />
        <p className="mt-1 text-[11px] leading-4 text-slate-400">Variables : {'{{variables.homeTeam}}'}, {'{{variables.awayTeam}}'}, {'{{variables.dateText}}'}, {'{{variables.venueText}}'}, {'{{variables.priceText}}'}.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className={label}>Police<select value={layer.fontFamily || 'Inter'} onChange={(event) => patch({ fontFamily: event.target.value })} className={input}>{FONT_FAMILIES.map((font) => <option key={font}>{font}</option>)}</select></label>
          <NumberField labelText="Taille" value={layer.fontSize || 32} min={6} max={500} onChange={(fontSize) => patch({ fontSize })} />
          <label className={label}>Couleur<input type="color" value={layer.fill || '#ffffff'} onChange={(event) => patch({ fill: event.target.value })} className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1" /></label>
          <label className={label}>Alignement<select value={layer.align || 'left'} onChange={(event) => patch({ align: event.target.value })} className={input}><option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option></select></label>
          <NumberField labelText="Interligne" value={layer.lineHeight || 1.1} min={0.7} max={3} step={0.05} onChange={(lineHeight) => patch({ lineHeight })} />
          <NumberField labelText="Espacement" value={layer.letterSpacing || 0} min={-10} max={50} step={0.5} onChange={(letterSpacing) => patch({ letterSpacing })} />
        </div>
      </div>}

      {layer.type === 'shape' && <div className="mt-5 border-t border-slate-100 pt-4"><div className="grid grid-cols-2 gap-2"><label className={label}>Couleur<input type="color" value={layer.fill || '#f5c518'} onChange={(event) => patch({ fill: event.target.value })} className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1" /></label><NumberField labelText="Arrondi" value={layer.cornerRadius || 0} min={0} max={300} onChange={(cornerRadius) => patch({ cornerRadius })} /></div></div>}

      {layer.type === 'image' && <div className="mt-5 border-t border-slate-100 pt-4">
        <label className={label}>Ajustement<select value={layer.fit || 'cover'} onChange={(event) => patch({ fit: event.target.value })} className={input}><option value="cover">Couvrir</option><option value="contain">Contenir</option></select></label>
        {layer.source?.kind === 'url' && <label className={'mt-3 block ' + label}>URL de l’image<input value={layer.source.url || ''} maxLength={2048} onChange={(event) => patch({ source: { kind: 'url', url: event.target.value } })} className={input} /></label>}
        {layer.source?.kind === 'binding' && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Image liée automatiquement : <strong>{layer.source.key}</strong></p>}
        <label className="mt-3 flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 px-3 text-xs font-bold text-slate-600 hover:border-jso-blue">Téléverser et remplacer<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { onReplaceImage(layer.id, event.target.files?.[0]); event.target.value = '' }} /></label>
        <div className="mt-3"><NumberField labelText="Arrondi" value={layer.cornerRadius || 0} min={0} max={500} onChange={(cornerRadius) => patch({ cornerRadius })} /></div>
      </div>}

      {layer.type === 'qr' && <div className="mt-5 border-t border-slate-100 pt-4">
        <label className={label}>Destination<input value={layer.value || ''} maxLength={2048} onChange={(event) => patch({ value: event.target.value })} className={input} /></label>
        <p className="mt-1 text-[11px] text-slate-400">Utilisez {'{{match.publicUrl}}'} pour ouvrir la bonne rencontre. Ce QR est promotionnel, pas un billet d’entrée.</p>
        <div className="mt-3 grid grid-cols-2 gap-2"><label className={label}>Premier plan<input type="color" value={layer.foreground || '#0b1730'} onChange={(event) => patch({ foreground: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 p-1" /></label><label className={label}>Fond<input type="color" value={layer.background || '#ffffff'} onChange={(event) => patch({ background: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-200 p-1" /></label></div>
      </div>}
    </aside>
  </div>
}
