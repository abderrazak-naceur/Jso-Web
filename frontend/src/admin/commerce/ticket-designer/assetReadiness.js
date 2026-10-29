import { resolveSource, resolveTemplate } from './document.js'

export function assetKey(layer, context, variables) {
  if (layer.type === 'image') return resolveSource(layer.source, context, variables) || ''
  if (layer.type === 'qr') return JSON.stringify([resolveTemplate(layer.value, context, variables), layer.width, layer.height, layer.foreground, layer.background, layer.errorCorrectionLevel])
  return null
}

export function pendingAssets(layers, context, variables, readiness) {
  return layers.filter(layer => {
    if (layer.visible === false) return false
    const key = assetKey(layer, context, variables)
    if (key === null || key === '') return false
    const status = readiness.get(layer.id)
    return !status?.ready || status.key !== key
  })
}
