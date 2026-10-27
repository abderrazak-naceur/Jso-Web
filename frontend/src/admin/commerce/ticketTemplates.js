// Professional, photo-based templates for the match-ticket designer.
//
// Each template paints a 1200x480 ticket onto a 2D canvas from a `data` object.
// Painting on canvas keeps the live preview and the exported JPEG pixel-identical,
// and the result is uploaded to the media service and saved on
// Match.TicketArtworkUrl.
//
// Templates compose the same match data automatically (opponent logo + name,
// club crest, date, venue, "BILLET DE MATCH" wording, price and QR); they differ
// in layout, colour grade and how the background photo is used. A background
// photo makes the ticket look professional; the admin can pick a bundled club
// photo or upload a custom one, and each template applies its own dark overlay
// so the text stays readable over any image.

export const TICKET_WIDTH = 1200
export const TICKET_HEIGHT = 480

// Club palette (mirrors the jso-navy / jso-gold Tailwind tokens used site-wide).
const NAVY = '#0b1730'
const GOLD = '#f5c518'
const WHITE = '#ffffff'

// Bundled professional backgrounds shipped with the app (public/). The admin
// can also upload a custom background from the designer.
export const TICKET_BACKGROUNDS = [
  { id: 'stadium', label: 'Stade (nuit)', url: '/jso-stadium-hero.png' },
  { id: 'bus', label: 'Supporters & bus', url: '/jso-bus-campaign.png' },
  { id: 'none', label: 'Aucune (dégradé)', url: '' },
]

export function backgroundUrl(id) {
  return (TICKET_BACKGROUNDS.find((item) => item.id === id) || TICKET_BACKGROUNDS[0]).url
}

// ---- small canvas helpers -------------------------------------------------

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function fitText(ctx, text, maxWidth) {
  const value = String(text || '')
  if (ctx.measureText(value).width <= maxWidth) return value
  let trimmed = value
  while (trimmed.length > 1 && ctx.measureText(trimmed + '…').width > maxWidth) {
    trimmed = trimmed.slice(0, -1)
  }
  return trimmed + '…'
}

// Draw an image to COVER a box (fill it, cropping overflow), preserving aspect.
function drawCover(ctx, img, x, y, w, h) {
  if (!img || !img.width || !img.height) return
  const scale = Math.max(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.save()
  roundRect(ctx, x, y, w, h, 0)
  ctx.clip()
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  ctx.restore()
}

// Draw an image CONTAINED in a box, centred, preserving aspect ratio.
function drawContain(ctx, img, x, y, w, h) {
  if (!img || !img.width || !img.height) return
  const scale = Math.min(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

// Circular logo badge with a white background, falling back to initials.
function drawLogoBadge(ctx, img, initials, cx, cy, radius, ring) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = WHITE
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = 18
  ctx.fill()
  ctx.shadowBlur = 0
  if (ring) { ctx.lineWidth = 5; ctx.strokeStyle = ring; ctx.stroke() }
  ctx.clip()
  if (img) {
    drawContain(ctx, img, cx - radius * 0.74, cy - radius * 0.74, radius * 1.48, radius * 1.48)
  } else {
    ctx.fillStyle = NAVY
    ctx.font = `800 ${radius * 0.72}px Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(initials || '?', cx, cy + 2)
  }
  ctx.restore()
}

function dashedPerforation(ctx, x, top, bottom, color) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.setLineDash([10, 12])
  ctx.beginPath()
  ctx.moveTo(x, top)
  ctx.lineTo(x, bottom)
  ctx.stroke()
  ctx.restore()
}

// Right-hand stub: JSO wordmark, framed QR, price. `dark` chooses the palette.
function drawStub(ctx, data, x, w, dark) {
  const fg = dark ? WHITE : NAVY
  dashedPerforation(ctx, x, 36, TICKET_HEIGHT - 36, dark ? 'rgba(255,255,255,0.5)' : 'rgba(11,23,48,0.3)')
  ctx.textAlign = 'center'
  ctx.fillStyle = fg
  ctx.font = '800 26px Arial, sans-serif'
  ctx.fillText('JSO', x + w / 2, 72)
  const qrSize = Math.min(w - 56, 196)
  const qrX = x + (w - qrSize) / 2
  const qrY = 96
  ctx.fillStyle = WHITE
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = dark ? 16 : 0
  roundRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 14)
  ctx.fill()
  ctx.shadowBlur = 0
  if (data.qrImage) ctx.drawImage(data.qrImage, qrX, qrY, qrSize, qrSize)
  // price pill
  const pillW = w - 64
  const pillX = x + 32
  const pillY = qrY + qrSize + 24
  ctx.fillStyle = GOLD
  roundRect(ctx, pillX, pillY, pillW, 54, 14)
  ctx.fill()
  ctx.fillStyle = NAVY
  ctx.font = '900 34px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(data.priceText, x + w / 2, pillY + 37)
}

function matchHeadline(data) {
  return data.isHome ? `JSO · ${data.opponentName}` : `${data.opponentName} · JSO`
}

// Paint the background photo (cover) with a template-specific dark overlay so
// text is always legible. When no photo is available, fall back to a navy
// gradient that still looks intentional.
function paintBackground(ctx, data, overlay) {
  if (data.backgroundImage) {
    drawCover(ctx, data.backgroundImage, 0, 0, TICKET_WIDTH, TICKET_HEIGHT)
  } else {
    const grad = ctx.createLinearGradient(0, 0, TICKET_WIDTH, TICKET_HEIGHT)
    grad.addColorStop(0, '#0b1730')
    grad.addColorStop(1, '#13233f')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT)
  }
  overlay(ctx)
}

// ---- templates ------------------------------------------------------------

// 1. Stade — photo plein cadre, voile sombre bas→haut, crest + adversaire.
function paintStadium(ctx, data) {
  paintBackground(ctx, data, (c) => {
    const g = c.createLinearGradient(0, 0, 0, TICKET_HEIGHT)
    g.addColorStop(0, 'rgba(7,14,32,0.35)')
    g.addColorStop(1, 'rgba(7,14,32,0.92)')
    c.fillStyle = g
    c.fillRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT)
  })
  const stubW = 300
  const bodyW = TICKET_WIDTH - stubW
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, TICKET_WIDTH, 8)

  drawLogoBadge(ctx, data.crestImage, 'JSO', 110, 120, 60, GOLD)
  ctx.fillStyle = WHITE
  ctx.font = '800 26px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('VS', bodyW / 2 + 40, 128)
  drawLogoBadge(ctx, data.opponentImage, data.opponentInitials, bodyW - 120, 120, 60, GOLD)

  ctx.textAlign = 'left'
  ctx.fillStyle = GOLD
  ctx.font = '800 22px Arial, sans-serif'
  ctx.fillText('BILLET DE MATCH · STADE OUDHREF', 56, 320)
  ctx.fillStyle = WHITE
  ctx.font = '900 50px Arial, sans-serif'
  ctx.fillText(fitText(ctx, matchHeadline(data), bodyW - 110), 56, 375)
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ctx.font = '600 25px Arial, sans-serif'
  ctx.fillText(fitText(ctx, `${data.dateText}  ·  ${data.venue}`, bodyW - 110), 56, 418)

  drawStub(ctx, data, bodyW, stubW, true)
}

// 2. Projecteur — photo + panneau navy semi-transparent à gauche (type carte).
function paintSpotlight(ctx, data) {
  paintBackground(ctx, data, (c) => {
    c.fillStyle = 'rgba(7,14,32,0.45)'
    c.fillRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT)
  })
  const stubW = 300
  const bodyW = TICKET_WIDTH - stubW
  // left navy panel
  ctx.save()
  const panel = ctx.createLinearGradient(0, 0, bodyW, 0)
  panel.addColorStop(0, 'rgba(11,23,48,0.96)')
  panel.addColorStop(0.7, 'rgba(11,23,48,0.72)')
  panel.addColorStop(1, 'rgba(11,23,48,0)')
  ctx.fillStyle = panel
  ctx.fillRect(0, 0, bodyW, TICKET_HEIGHT)
  ctx.restore()
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, 10, TICKET_HEIGHT)

  drawLogoBadge(ctx, data.opponentImage, data.opponentInitials, 130, 150, 72, GOLD)
  ctx.textAlign = 'left'
  ctx.fillStyle = GOLD
  ctx.font = '800 22px Arial, sans-serif'
  ctx.fillText('BILLET DE MATCH', 230, 110)
  ctx.fillStyle = WHITE
  ctx.font = '900 46px Arial, sans-serif'
  ctx.fillText('JSO OUDHREF', 230, 160)
  ctx.font = '900 40px Arial, sans-serif'
  ctx.fillText(fitText(ctx, `vs ${data.opponentName}`, bodyW - 260), 230, 215)
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ctx.font = '600 25px Arial, sans-serif'
  ctx.fillText(fitText(ctx, data.dateText, bodyW - 90), 56, 400)
  ctx.fillText(fitText(ctx, data.venue, bodyW - 90), 56, 435)

  drawStub(ctx, data, bodyW, stubW, true)
}

// 3. Tifo — photo + large bandeau or diagonal, grand titre.
function paintTifo(ctx, data) {
  paintBackground(ctx, data, (c) => {
    const g = c.createLinearGradient(0, TICKET_HEIGHT, TICKET_WIDTH, 0)
    g.addColorStop(0, 'rgba(7,14,32,0.9)')
    g.addColorStop(0.6, 'rgba(7,14,32,0.5)')
    g.addColorStop(1, 'rgba(7,14,32,0.25)')
    c.fillStyle = g
    c.fillRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT)
  })
  const stubW = 300
  const bodyW = TICKET_WIDTH - stubW
  // gold diagonal ribbon
  ctx.save()
  ctx.fillStyle = GOLD
  ctx.beginPath()
  ctx.moveTo(0, TICKET_HEIGHT - 150)
  ctx.lineTo(bodyW, TICKET_HEIGHT - 230)
  ctx.lineTo(bodyW, TICKET_HEIGHT - 150)
  ctx.lineTo(0, TICKET_HEIGHT - 70)
  ctx.closePath()
  ctx.globalAlpha = 0.92
  ctx.fill()
  ctx.restore()

  drawLogoBadge(ctx, data.opponentImage, data.opponentInitials, bodyW - 120, 120, 64, GOLD)
  ctx.textAlign = 'left'
  ctx.fillStyle = WHITE
  ctx.font = '800 22px Arial, sans-serif'
  ctx.fillText('BILLET DE MATCH', 56, 90)
  ctx.font = '900 56px Arial, sans-serif'
  ctx.fillText(fitText(ctx, matchHeadline(data), bodyW - 110), 56, 180)
  // text on the gold ribbon
  ctx.fillStyle = NAVY
  ctx.font = '800 26px Arial, sans-serif'
  ctx.fillText(fitText(ctx, `${data.dateText} · ${data.venue}`, bodyW - 90), 56, TICKET_HEIGHT - 105)

  drawStub(ctx, data, bodyW, stubW, true)
}

// 4. Classique — bandeau photo en haut, bloc navy en bas (plus sobre).
function paintClassicPhoto(ctx, data) {
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT)
  const stubW = 300
  const bodyW = TICKET_WIDTH - stubW
  const photoH = 250
  if (data.backgroundImage) drawCover(ctx, data.backgroundImage, 0, 0, bodyW, photoH)
  else { ctx.fillStyle = '#13233f'; ctx.fillRect(0, 0, bodyW, photoH) }
  const g = ctx.createLinearGradient(0, 0, 0, photoH)
  g.addColorStop(0, 'rgba(7,14,32,0.1)')
  g.addColorStop(1, 'rgba(7,14,32,0.85)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, bodyW, photoH)
  ctx.fillStyle = GOLD
  ctx.fillRect(0, photoH, bodyW, 6)

  drawLogoBadge(ctx, data.opponentImage, data.opponentInitials, bodyW - 110, 90, 56, GOLD)
  ctx.textAlign = 'left'
  ctx.fillStyle = WHITE
  ctx.font = '800 22px Arial, sans-serif'
  ctx.fillText('BILLET DE MATCH · STADE OUDHREF', 56, 60)
  ctx.font = '900 44px Arial, sans-serif'
  ctx.fillText(fitText(ctx, matchHeadline(data), bodyW - 200), 56, 210)

  ctx.fillStyle = GOLD
  ctx.font = '800 22px Arial, sans-serif'
  ctx.fillText('DATE', 56, photoH + 70)
  ctx.fillText('STADE', 56, photoH + 140)
  ctx.fillStyle = WHITE
  ctx.font = '700 26px Arial, sans-serif'
  ctx.fillText(fitText(ctx, data.dateText, bodyW - 110), 56, photoH + 105)
  ctx.fillText(fitText(ctx, data.venue, bodyW - 110), 56, photoH + 175)

  drawStub(ctx, data, bodyW, stubW, true)
}

export const TICKET_TEMPLATES = [
  { id: 'stadium', label: 'Stade', paint: paintStadium, usesPhoto: true },
  { id: 'spotlight', label: 'Projecteur', paint: paintSpotlight, usesPhoto: true },
  { id: 'tifo', label: 'Tifo', paint: paintTifo, usesPhoto: true },
  { id: 'classic', label: 'Classique', paint: paintClassicPhoto, usesPhoto: true },
]

export function getTemplate(id) {
  return TICKET_TEMPLATES.find((item) => item.id === id) || TICKET_TEMPLATES[0]
}

// Paint a template onto a canvas context. `data` carries both the match text
// fields and any preloaded images (crestImage, opponentImage, qrImage,
// backgroundImage). Missing images degrade gracefully.
export function paintTicket(ctx, templateId, data) {
  ctx.clearRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT)
  getTemplate(templateId).paint(ctx, data)
}
