import { useRef } from 'react'
import { Check, LayoutTemplate, Layers3 } from 'lucide-react'
import { activeArtboard, DESIGN_PRESETS, TICKET_FORMATS } from './document'
import EditorToolbar from './EditorToolbar'
import LayersPanel from './LayersPanel'
import PropertiesPanel from './PropertiesPanel'
import TicketStage from './TicketStage'

export default function TicketEditor({
  document,
  context,
  selectedId,
  dirty,
  autoSaving,
  busy,
  canUndo,
  canRedo,
  zoom,
  onSelect,
  onPatchLayer,
  onReplaceImage,
  onMoveLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onVariables,
  onPreset,
  onArtboard,
  onUndo,
  onRedo,
  onAddText,
  onAddShape,
  onAddQr,
  onAddImage,
  onZoom,
  onSave,
  onDownload,
  onPublish,
  stageRef: externalStageRef,
}) {
  const internalStageRef = useRef(null)
  const stageRef = externalStageRef || internalStageRef
  const artboard = activeArtboard(document)
  const selected = artboard.layers.find((layer) => layer.id === selectedId) || null

  return (
    <div className="space-y-4">
      <EditorToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        dirty={dirty}
        busy={busy}
        zoom={zoom}
        onUndo={onUndo}
        onRedo={onRedo}
        onAddText={onAddText}
        onAddShape={onAddShape}
        onAddQr={onAddQr}
        onAddImage={onAddImage}
        onZoom={onZoom}
        onSave={onSave}
        onDownload={onDownload}
        onPublish={onPublish}
      />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[270px_minmax(0,1fr)_300px]">
        <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4">
          <section>
            <div className="mb-3 flex items-center gap-2"><LayoutTemplate size={16} className="text-jso-blue" /><h3 className="text-sm font-black text-slate-900">Modèles</h3></div>
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
              {DESIGN_PRESETS.map((preset) => (
                <button key={preset.id} type="button" onClick={() => onPreset(preset.id)} className={'group overflow-hidden rounded-xl border p-2 text-left transition ' + (document.presetId === preset.id ? 'border-jso-blue bg-blue-50' : 'border-slate-200 hover:border-jso-blue')}>
                  <span className="flex h-12 overflow-hidden rounded-lg">{preset.swatches.map((color, index) => <span key={color + index} className="flex-1" style={{ backgroundColor: color }} />)}</span>
                  <span className="mt-2 flex items-center gap-1.5 text-xs font-black text-slate-700">{document.presetId === preset.id && <Check size={13} className="text-jso-blue" />}{preset.label}</span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">{preset.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="border-t border-slate-100 pt-4">
            <div className="mb-3 flex items-center gap-2"><Layers3 size={16} className="text-jso-blue" /><h3 className="text-sm font-black text-slate-900">Formats</h3></div>
            <div className="grid grid-cols-2 gap-2">
              {TICKET_FORMATS.map((format) => {
                const board = document.artboards.find((item) => item.formatId === format.id)
                const active = board?.id === document.activeArtboardId
                return <button key={format.id} type="button" onClick={() => board && onArtboard(board.id)} disabled={!board} className={'rounded-xl border px-2 py-2 text-left text-xs transition ' + (active ? 'border-jso-blue bg-jso-navy text-white' : 'border-slate-200 text-slate-600 hover:border-jso-blue')}><strong className="block font-black">{format.label}</strong><span className={active ? 'text-white/55' : 'text-slate-400'}>{format.description}</span></button>
              })}
            </div>
          </section>

          <section className="border-t border-slate-100 pt-4">
            <LayersPanel artboard={artboard} selectedId={selectedId} onSelect={onSelect} onPatch={onPatchLayer} onMove={onMoveLayer} onDuplicate={onDuplicateLayer} onDelete={onDeleteLayer} />
          </section>
        </aside>

        <main className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-semibold text-slate-500">
            <span>{artboard.name} · {artboard.width} × {artboard.height}px</span>
            <span>{autoSaving ? '● Enregistrement automatique…' : dirty ? '● Modifications non enregistrées' : '✓ Projet enregistré'}</span>
          </div>
          <TicketStage ref={stageRef} artboard={artboard} context={context} variables={document.variables} selectedId={selectedId} zoom={zoom} onSelect={onSelect} onLayerChange={onPatchLayer} onDelete={onDeleteLayer} />
        </main>

        <PropertiesPanel layer={selected} variables={document.variables} onVariables={onVariables} onPatch={onPatchLayer} onReplaceImage={onReplaceImage} />
      </div>
    </div>
  )
}
