export const DESIGN_SCHEMA_VERSION = 1

export const TICKET_FORMATS = [
  { id: 'ticket-landscape', label: 'Banner', width: 1200, height: 480, description: '1200 × 480' },
  { id: 'post-square', label: 'Post carré', width: 1080, height: 1080, description: '1080 × 1080' },
  { id: 'story', label: 'Story', width: 1080, height: 1920, description: '1080 × 1920' },
  { id: 'print-landscape', label: 'Impression', width: 1748, height: 1240, description: 'A6 paysage · 300 dpi' },
]

export const DESIGN_PRESETS = [
  { id: 'stadium-night', label: 'Stade de nuit', description: 'Photo, bleu nuit et or', swatches: ['#07172d', '#174477', '#f5c518'] },
  { id: 'editorial-white', label: 'Blanc éditorial', description: 'Clair, lisible et premium', swatches: ['#f7f8fb', '#0b1730', '#f5c518'] },
  { id: 'tifo', label: 'Tifo bleu & or', description: 'Fort contraste supporters', swatches: ['#08172f', '#1d4ed8', '#f5c518'] },
  { id: 'mobile-pass', label: 'Pass mobile', description: 'Centré, minimal et digital', swatches: ['#07172d', '#ffffff', '#38bdf8'] },
]

export const FONT_FAMILIES = ['Archivo Black', 'Oswald', 'Inter', 'Arial']

function id(prefix) {
  try { return `${prefix}-${crypto.randomUUID()}` } catch { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}` }
}

const common = (type, name, x, y, width, height, extra = {}) => ({
  id: id(type),
  type,
  name,
  x: Math.round(x),
  y: Math.round(y),
  width: Math.max(1, Math.round(width)),
  height: Math.max(1, Math.round(height)),
  rotation: 0,
  opacity: 1,
  visible: true,
  locked: false,
  ...extra,
})

export const createTextLayer = (name = 'Nouveau texte', text = 'Votre texte', x = 80, y = 80) => common('text', name, x, y, 420, 80, {
  text,
  fontFamily: 'Oswald',
  fontSize: 44,
  fontWeight: 700,
  fill: '#ffffff',
  align: 'left',
  lineHeight: 1.08,
  letterSpacing: 0,
})

export const createShapeLayer = (name = 'Forme', x = 80, y = 80) => common('shape', name, x, y, 260, 120, {
  shape: 'rect', fill: '#f5c518', cornerRadius: 18,
})

export const createImageLayer = (name = 'Image', url = '/jso-stadium-hero.png', x = 80, y = 80) => common('image', name, x, y, 360, 220, {
  source: { kind: 'url', url }, fit: 'cover', cornerRadius: 12,
})

export const createQrLayer = (x = 80, y = 80) => common('qr', 'QR page du match', x, y, 180, 180, {
  value: '{{match.publicUrl}}', foreground: '#0b1730', background: '#ffffff', errorCorrectionLevel: 'M',
})

function layout(format, presetId) {
  const { width: w, height: h } = format
  const wide = w / h >= 1.5
  const margin = Math.round(Math.min(w, h) * 0.075)
  const accent = presetId === 'mobile-pass' ? '#38bdf8' : '#f5c518'
  const light = presetId === 'editorial-white'
  const foreground = light ? '#0b1730' : '#ffffff'
  const muted = light ? '#526075' : '#d5dfeb'
  const bgUrl = presetId === 'tifo' ? '/jso-bus-campaign.png' : '/jso-stadium-hero.png'
  const qrSize = Math.round(Math.min(w, h) * (wide ? 0.31 : 0.22))
  const logoSize = Math.round(Math.min(w, h) * (wide ? 0.25 : 0.16))
  const headlineSize = Math.round(Math.min(w, h) * (wide ? 0.105 : 0.075))
  const layers = []

  layers.push(common('shape', 'Fond', 0, 0, w, h, {
    locked: true,
    fill: light ? '#f7f8fb' : '#07172d',
    cornerRadius: 0,
  }))

  if (!light) {
    layers.push(common('image', 'Photo du stade', 0, 0, w, h, {
      locked: true,
      source: { kind: 'url', url: bgUrl },
      fit: 'cover',
      cornerRadius: 0,
    }))
    layers.push(common('shape', 'Voile de contraste', 0, 0, w, h, {
      locked: true,
      fill: presetId === 'tifo' ? '#07172d' : '#061326',
      opacity: presetId === 'tifo' ? 0.58 : 0.68,
      cornerRadius: 0,
    }))
  }

  if (presetId === 'editorial-white') {
    layers.push(common('shape', 'Panneau bleu', 0, Math.round(h * 0.54), w, Math.round(h * 0.46), {
      locked: true, fill: '#0b1730', cornerRadius: 0,
    }))
  } else if (presetId === 'tifo') {
    layers.push(common('shape', 'Bande or', -Math.round(w * 0.08), Math.round(h * 0.64), Math.round(w * 0.78), Math.round(h * 0.12), {
      locked: true, fill: accent, rotation: -6, cornerRadius: 0, opacity: 0.94,
    }))
  } else if (presetId === 'mobile-pass') {
    layers.push(common('shape', 'Cadre central', margin, margin, w - margin * 2, h - margin * 2, {
      locked: true, fill: '#0d294c', opacity: 0.9, cornerRadius: Math.round(margin * 0.4),
    }))
  }

  layers.push(common('shape', 'Accent supérieur', 0, 0, w, Math.max(8, Math.round(h * 0.014)), {
    locked: true, fill: accent, cornerRadius: 0,
  }))

  const logoY = wide ? Math.round(h * 0.13) : Math.round(h * 0.12)
  const leftLogoX = wide ? margin : Math.round(w * 0.22 - logoSize / 2)
  const rightLogoX = wide ? margin + logoSize + Math.round(w * 0.045) : Math.round(w * 0.78 - logoSize / 2)
  layers.push(common('image', 'Logo JSO', leftLogoX, logoY, logoSize, logoSize, {
    source: { kind: 'binding', key: 'match.clubLogoUrl' }, fit: 'contain', cornerRadius: Math.round(logoSize / 2),
  }))
  layers.push(common('image', 'Logo adversaire', rightLogoX, logoY, logoSize, logoSize, {
    source: { kind: 'binding', key: 'match.opponentLogoUrl' }, fit: 'contain', cornerRadius: Math.round(logoSize / 2),
  }))

  const textX = wide ? margin : margin
  const textWidth = wide ? w - margin * 2 - qrSize - Math.round(w * 0.08) : w - margin * 2
  const headlineY = wide ? Math.round(h * 0.59) : Math.round(h * 0.44)
  layers.push(common('text', 'Titre du visuel', textX, headlineY - Math.round(headlineSize * 0.8), textWidth, Math.round(headlineSize * 0.7), {
    text: '{{variables.titleText}}', fontFamily: 'Oswald', fontSize: Math.round(headlineSize * 0.43), fontWeight: 700,
    fill: accent, align: wide ? 'left' : 'center', lineHeight: 1, letterSpacing: 2,
  }))
  layers.push(common('text', 'Noms des équipes', textX, headlineY, textWidth, Math.round(headlineSize * 2.1), {
    text: '{{variables.homeTeam}}\n{{variables.awayTeam}}', fontFamily: 'Archivo Black', fontSize: headlineSize,
    fontWeight: 900, fill: foreground, align: wide ? 'left' : 'center', lineHeight: 1.02, letterSpacing: 0,
  }))
  layers.push(common('text', 'Date et stade', textX, headlineY + Math.round(headlineSize * 2.15), textWidth, Math.round(headlineSize * 0.9), {
    text: '{{variables.dateText}} · {{variables.venueText}}', fontFamily: 'Oswald', fontSize: Math.round(headlineSize * 0.45),
    fontWeight: 600, fill: muted, align: wide ? 'left' : 'center', lineHeight: 1.1,
  }))

  const qrX = wide ? w - margin - qrSize : Math.round((w - qrSize) / 2)
  const qrY = wide ? Math.round((h - qrSize) / 2) : h - margin - qrSize
  layers.push(common('shape', 'Fond QR', qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, {
    fill: '#ffffff', cornerRadius: 18,
  }))
  layers.push(common('qr', 'QR page du match', qrX, qrY, qrSize, qrSize, {
    value: '{{match.publicUrl}}', foreground: '#0b1730', background: '#ffffff', errorCorrectionLevel: 'M',
  }))

  const priceWidth = wide ? qrSize : Math.round(w * 0.35)
  const priceX = wide ? qrX : w - margin - priceWidth
  const priceY = wide ? Math.min(h - margin - Math.round(headlineSize * 0.75), qrY + qrSize + 14) : margin
  layers.push(common('shape', 'Fond prix', priceX, priceY, priceWidth, Math.round(headlineSize * 0.72), {
    fill: accent, cornerRadius: 14,
  }))
  layers.push(common('text', 'Prix', priceX, priceY + Math.round(headlineSize * 0.08), priceWidth, Math.round(headlineSize * 0.55), {
    text: '{{variables.priceText}}', fontFamily: 'Archivo Black', fontSize: Math.round(headlineSize * 0.48),
    fontWeight: 900, fill: '#0b1730', align: 'center', lineHeight: 1,
  }))

  return {
    id: `artboard-${format.id}`,
    name: format.label,
    formatId: format.id,
    width: w,
    height: h,
    backgroundColor: light ? '#f7f8fb' : '#07172d',
    layers,
  }
}

export function createDesignDocument(presetId = 'stadium-night', context = {}) {
  const preset = DESIGN_PRESETS.some((item) => item.id === presetId) ? presetId : DESIGN_PRESETS[0].id
  const artboards = TICKET_FORMATS.map((format) => layout(format, preset))
  return {
    schemaVersion: DESIGN_SCHEMA_VERSION,
    presetId: preset,
    activeArtboardId: artboards[0].id,
    variables: {
      titleText: 'BILLET DE MATCH',
      homeTeam: context.homeTeam || 'JSO Oudhref',
      awayTeam: context.awayTeam || 'Adversaire',
      dateText: context.kickoffDateTime || 'Date à confirmer',
      venueText: context.venue || 'Stade Oudhref',
      priceText: '5 DT',
    },
    artboards,
  }
}

export function normalizeDesignDocument(value) {
  if (!value || value.schemaVersion !== DESIGN_SCHEMA_VERSION || !Array.isArray(value.artboards) || value.artboards.length === 0) {
    return createDesignDocument()
  }
  const artboards = value.artboards.map((artboard) => ({
    ...artboard,
    layers: Array.isArray(artboard.layers) ? artboard.layers : [],
  }))
  const active = artboards.some((item) => item.id === value.activeArtboardId) ? value.activeArtboardId : artboards[0].id
  return { ...value, activeArtboardId: active, artboards, variables: { titleText: 'BILLET DE MATCH', homeTeam: 'JSO Oudhref', awayTeam: 'Adversaire', dateText: 'Date à confirmer', venueText: 'Stade Oudhref', priceText: '5 DT', ...value.variables } }
}

export function activeArtboard(document) {
  return document.artboards.find((item) => item.id === document.activeArtboardId) || document.artboards[0]
}

export function cloneDocument(document) {
  return JSON.parse(JSON.stringify(document))
}

export function updateActiveArtboard(document, updater) {
  return {
    ...document,
    artboards: document.artboards.map((artboard) => artboard.id === document.activeArtboardId ? updater(artboard) : artboard),
  }
}

export function updateLayer(document, layerId, patch) {
  return updateActiveArtboard(document, (artboard) => ({
    ...artboard,
    layers: artboard.layers.map((layer) => layer.id === layerId ? { ...layer, ...patch } : layer),
  }))
}

export function addLayer(document, layer) {
  return updateActiveArtboard(document, (artboard) => ({ ...artboard, layers: [...artboard.layers, layer] }))
}

export function removeLayer(document, layerId) {
  return updateActiveArtboard(document, (artboard) => ({ ...artboard, layers: artboard.layers.filter((layer) => layer.id !== layerId) }))
}

export function duplicateLayer(document, layerId) {
  return updateActiveArtboard(document, (artboard) => {
    const source = artboard.layers.find((layer) => layer.id === layerId)
    if (!source) return artboard
    const copy = { ...cloneDocument(source), id: id(source.type), name: `${source.name} (copie)`, x: source.x + 20, y: source.y + 20, locked: false }
    const index = artboard.layers.findIndex((layer) => layer.id === layerId)
    return { ...artboard, layers: [...artboard.layers.slice(0, index + 1), copy, ...artboard.layers.slice(index + 1)] }
  })
}

export function moveLayer(document, layerId, direction) {
  return updateActiveArtboard(document, (artboard) => {
    const index = artboard.layers.findIndex((layer) => layer.id === layerId)
    const next = direction === 'up' ? index + 1 : index - 1
    if (index < 0 || next < 0 || next >= artboard.layers.length) return artboard
    const layers = [...artboard.layers]
    ;[layers[index], layers[next]] = [layers[next], layers[index]]
    return { ...artboard, layers }
  })
}

export function resolveTemplate(text, context, variables) {
  return String(text || '').replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key) => {
    if (key.startsWith('variables.')) return variables?.[key.slice('variables.'.length)] ?? ''
    if (key.startsWith('match.')) return context?.[key.slice('match.'.length)] ?? ''
    return ''
  })
}

export function resolveSource(source, context, variables) {
  if (!source) return ''
  if (source.kind === 'url') return source.url || ''
  if (source.kind === 'binding') return resolveTemplate(`{{${source.key}}}`, context, variables)
  return ''
}
