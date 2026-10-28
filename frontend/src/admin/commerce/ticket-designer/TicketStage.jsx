import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva'
import QRCode from 'qrcode'
import { resolveSource, resolveTemplate } from './document'
import { useCanvasImage } from './media'

function preparedBitmap(image, width, height, fit) {
  if (!image || !width || !height) return null
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const ctx = canvas.getContext('2d')
  const scale = fit === 'contain'
    ? Math.min(canvas.width / image.width, canvas.height / image.height)
    : Math.max(canvas.width / image.width, canvas.height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  ctx.drawImage(image, (canvas.width - drawWidth) / 2, (canvas.height - drawHeight) / 2, drawWidth, drawHeight)
  return canvas
}

function ImageContent({ layer, src, onReady }) {
  const image = useCanvasImage(src)
  useEffect(() => { onReady(!src || Boolean(image)) }, [src, image, onReady])
  const bitmap = useMemo(
    () => preparedBitmap(image, layer.width, layer.height, layer.fit || 'cover'),
    [image, layer.width, layer.height, layer.fit],
  )
  if (!bitmap) {
    return <Group><Rect width={layer.width} height={layer.height} fill="#e2e8f0" opacity={0.8} cornerRadius={layer.cornerRadius || 0} /><Text text="IMAGE" width={layer.width} height={layer.height} align="center" verticalAlign="middle" fill="#64748b" fontFamily="Inter" fontStyle="bold" fontSize={Math.max(12, Math.min(28, layer.height * 0.18))} /></Group>
  }
  return <KonvaImage image={bitmap} width={layer.width} height={layer.height} cornerRadius={layer.cornerRadius || 0} />
}

function QrContent({ layer, value, onReady }) {
  const [dataUrl, setDataUrl] = useState('')
  useEffect(() => {
    let active = true
    QRCode.toDataURL(value || 'https://jsoudhref.com', {
      width: Math.max(128, Math.round(Math.max(layer.width, layer.height))),
      margin: 1,
      errorCorrectionLevel: layer.errorCorrectionLevel || 'M',
      color: { dark: layer.foreground || '#0b1730', light: layer.background || '#ffffff' },
    }).then((url) => { if (active) setDataUrl(url) }).catch(() => { if (active) setDataUrl('') })
    return () => { active = false }
  }, [value, layer.width, layer.height, layer.foreground, layer.background, layer.errorCorrectionLevel])
  const image = useCanvasImage(dataUrl)
  useEffect(() => { onReady(Boolean(image)) }, [image, onReady])
  return image
    ? <KonvaImage image={image} width={layer.width} height={layer.height} />
    : <Rect width={layer.width} height={layer.height} fill={layer.background || '#ffffff'} />
}

function LayerNode({ layer, context, variables, onSelect, onChange, onAssetStatus }) {
  if (layer.visible === false) return null
  const common = {
    id: layer.id,
    name: 'design-node',
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    rotation: layer.rotation || 0,
    opacity: layer.opacity ?? 1,
    draggable: !layer.locked,
    onClick: (event) => { event.cancelBubble = true; onSelect(layer.id) },
    onTap: (event) => { event.cancelBubble = true; onSelect(layer.id) },
    onDragEnd: (event) => onChange(layer.id, { x: Math.round(event.target.x()), y: Math.round(event.target.y()) }),
    onTransformEnd: (event) => {
      const node = event.target
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      node.scaleX(1)
      node.scaleY(1)
      onChange(layer.id, {
        x: Math.round(node.x()),
        y: Math.round(node.y()),
        width: Math.max(20, Math.round(layer.width * scaleX)),
        height: Math.max(20, Math.round(layer.height * scaleY)),
        rotation: Math.round(node.rotation() * 10) / 10,
      })
    },
    shadowColor: layer.shadowColor || undefined,
    shadowBlur: layer.shadowBlur || 0,
    shadowOffsetX: layer.shadowOffsetX || 0,
    shadowOffsetY: layer.shadowOffsetY || 0,
    shadowOpacity: layer.shadowOpacity || 0,
  }

  if (layer.type === 'shape') {
    return <Rect {...common} fill={layer.fill || '#f5c518'} stroke={layer.stroke || undefined} strokeWidth={layer.strokeWidth || 0} cornerRadius={layer.cornerRadius || 0} />
  }
  if (layer.type === 'text') {
    return <Text {...common} text={resolveTemplate(layer.text, context, variables)} fontFamily={layer.fontFamily || 'Inter'} fontSize={layer.fontSize || 32} fontStyle={Number(layer.fontWeight) >= 700 ? 'bold' : 'normal'} fill={layer.fill || '#ffffff'} align={layer.align || 'left'} verticalAlign={layer.verticalAlign || 'middle'} lineHeight={layer.lineHeight || 1.1} letterSpacing={layer.letterSpacing || 0} padding={layer.padding || 0} wrap="word" />
  }
  if (layer.type === 'image') {
    const src = resolveSource(layer.source, context, variables)
    return <Group {...common} clipFunc={(ctx) => { ctx.beginPath(); ctx.rect(0, 0, layer.width, layer.height); ctx.closePath() }}><ImageContent layer={layer} src={src} onReady={(ready) => onAssetStatus(layer.id, ready)} /></Group>
  }
  if (layer.type === 'qr') {
    return <Group {...common}><QrContent layer={layer} value={resolveTemplate(layer.value, context, variables)} onReady={(ready) => onAssetStatus(layer.id, ready)} /></Group>
  }
  return null
}

const TicketStage = forwardRef(function TicketStage({ artboard, context, variables, selectedId, zoom, onSelect, onLayerChange, onDelete }, ref) {
  const containerRef = useRef(null)
  const stageRef = useRef(null)
  const transformerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(900)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return undefined
    const resize = () => setContainerWidth(element.clientWidth || 900)
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    const transformer = transformerRef.current
    if (!stage || !transformer) return
    const layer = artboard.layers.find((item) => item.id === selectedId)
    const node = selectedId ? stage.findOne(`#${selectedId}`) : null
    transformer.nodes(node && !layer?.locked ? [node] : [])
    transformer.getLayer()?.batchDraw()
  }, [selectedId, artboard.layers])

  useEffect(() => {
    function onKeyDown(event) {
      if (!selectedId || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return
      const selected = artboard.layers.find((layer) => layer.id === selectedId)
      if (!selected) return
      if ((event.key === 'Delete' || event.key === 'Backspace') && !selected.locked) {
        event.preventDefault()
        onDelete(selectedId)
      } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && !selected.locked) {
        event.preventDefault()
        const delta = event.shiftKey ? 10 : 1
        const patch = {
          x: selected.x + (event.key === 'ArrowLeft' ? -delta : event.key === 'ArrowRight' ? delta : 0),
          y: selected.y + (event.key === 'ArrowUp' ? -delta : event.key === 'ArrowDown' ? delta : 0),
        }
        onLayerChange(selectedId, patch)
      } else if (event.key === 'Escape') onSelect(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, artboard.layers, onDelete, onLayerChange, onSelect])

  useImperativeHandle(ref, () => ({
    exportBlob: (mimeType = 'image/jpeg', quality = 0.94) => new Promise((resolve, reject) => {
      const stage = stageRef.current
      if (!stage) { reject(new Error('Le canevas n’est pas prêt.')); return }
      const ui = stage.findOne('.editor-ui')
      ui?.hide()
      stage.draw()
      stage.toBlob({
        mimeType,
        quality,
        pixelRatio: 1,
        callback: (blob) => {
          ui?.show()
          stage.draw()
          if (blob) resolve(blob)
          else reject(new Error('Impossible d’exporter le visuel.'))
        },
      })
    }),
    getDataUrl: () => stageRef.current?.toDataURL({ pixelRatio: 0.25 }) || '',
  }), [artboard.id])

  const fitScale = Math.min(1, Math.max(0.12, (containerWidth - 48) / artboard.width), Math.max(0.12, 620 / artboard.height))
  const displayScale = fitScale * zoom

  return (
    <div ref={containerRef} className="ticket-stage-shell jso-scroll min-h-[680px] overflow-auto rounded-2xl bg-slate-200/70 p-6">
      <div className="mx-auto" style={{ width: artboard.width * displayScale, height: artboard.height * displayScale }}>
        <div style={{ width: artboard.width, height: artboard.height, transform: `scale(${displayScale})`, transformOrigin: 'top left' }}>
          <Stage
            ref={stageRef}
            width={artboard.width}
            height={artboard.height}
            onMouseDown={(event) => { if (event.target === event.target.getStage()) onSelect(null) }}
            onTouchStart={(event) => { if (event.target === event.target.getStage()) onSelect(null) }}
            style={{ background: artboard.backgroundColor || '#0b1730', boxShadow: '0 18px 50px rgba(8, 23, 48, .2)' }}
          >
            <Layer>
              {artboard.layers.map((layer) => <LayerNode key={layer.id} layer={layer} context={context} variables={variables} onSelect={onSelect} onChange={onLayerChange} />)}
            </Layer>
            <Layer name="editor-ui" listening={false}>
              <Rect x={24} y={24} width={Math.max(1, artboard.width - 48)} height={Math.max(1, artboard.height - 48)} stroke="#55a0ee" strokeWidth={1 / Math.max(displayScale, 0.1)} dash={[8 / Math.max(displayScale, 0.1), 7 / Math.max(displayScale, 0.1)]} opacity={0.42} />
              <Line points={[artboard.width / 2, 0, artboard.width / 2, artboard.height]} stroke="#55a0ee" strokeWidth={1 / Math.max(displayScale, 0.1)} dash={[5 / Math.max(displayScale, 0.1), 6 / Math.max(displayScale, 0.1)]} opacity={selectedId ? 0.24 : 0} />
              <Line points={[0, artboard.height / 2, artboard.width, artboard.height / 2]} stroke="#55a0ee" strokeWidth={1 / Math.max(displayScale, 0.1)} dash={[5 / Math.max(displayScale, 0.1), 6 / Math.max(displayScale, 0.1)]} opacity={selectedId ? 0.24 : 0} />
              <Transformer ref={transformerRef} rotateEnabled enabledAnchors={['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']} anchorFill="#ffffff" anchorStroke="#2c75d4" borderStroke="#2c75d4" anchorSize={10 / Math.max(displayScale, 0.1)} borderStrokeWidth={1.5 / Math.max(displayScale, 0.1)} boundBoxFunc={(oldBox, newBox) => newBox.width < 20 || newBox.height < 20 ? oldBox : newBox} />
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  )
})

export default TicketStage
