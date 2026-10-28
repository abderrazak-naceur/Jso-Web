import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Image as ImageIcon, Lock, LockOpen, QrCode, Square, Trash2, Type } from 'lucide-react'

const ICONS = { text: Type, image: ImageIcon, qr: QrCode, shape: Square }

export default function LayersPanel({ artboard, selectedId, onSelect, onPatch, onMove, onDuplicate, onDelete }) {
  const layers = [...artboard.layers].reverse()
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div><h3 className="text-sm font-black text-slate-900">Calques</h3><p className="mt-0.5 text-xs text-slate-400">Le premier est au-dessus.</p></div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500">{layers.length}</span>
      </div>
      <div className="jso-scroll max-h-[380px] space-y-1.5 overflow-y-auto pr-1">
        {layers.map((layer, visualIndex) => {
          const Icon = ICONS[layer.type] || Square
          const selected = layer.id === selectedId
          const originalIndex = artboard.layers.length - 1 - visualIndex
          return (
            <div key={layer.id} className={'group rounded-xl border p-2 transition ' + (selected ? 'border-jso-blue bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300')}>
              <button type="button" onClick={() => onSelect(layer.id)} className="flex w-full min-w-0 items-center gap-2 text-left">
                <span className={'grid h-8 w-8 shrink-0 place-items-center rounded-lg ' + (selected ? 'bg-jso-blue text-white' : 'bg-slate-100 text-slate-500')}><Icon size={15} /></span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{layer.name}</span>
                {layer.locked && <Lock size={12} className="shrink-0 text-slate-400" />}
              </button>
              {selected && <div className="mt-2 flex items-center gap-1 border-t border-blue-100 pt-2">
                <button type="button" onClick={() => onPatch(layer.id, { visible: layer.visible === false })} title={layer.visible === false ? 'Afficher' : 'Masquer'} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white">{layer.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                <button type="button" onClick={() => onPatch(layer.id, { locked: !layer.locked })} title={layer.locked ? 'Déverrouiller' : 'Verrouiller'} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white">{layer.locked ? <Lock size={14} /> : <LockOpen size={14} />}</button>
                <button type="button" onClick={() => onMove(layer.id, 'up')} disabled={originalIndex >= artboard.layers.length - 1} title="Monter" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white disabled:opacity-30"><ArrowUp size={14} /></button>
                <button type="button" onClick={() => onMove(layer.id, 'down')} disabled={originalIndex <= 0} title="Descendre" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white disabled:opacity-30"><ArrowDown size={14} /></button>
                <button type="button" onClick={() => onDuplicate(layer.id)} title="Dupliquer" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white"><Copy size={14} /></button>
                <button type="button" onClick={() => onDelete(layer.id)} disabled={layer.locked} title="Supprimer" className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-30"><Trash2 size={14} /></button>
              </div>}
            </div>
          )
        })}
      </div>
    </section>
  )
}
