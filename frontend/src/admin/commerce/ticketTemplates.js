// Visual templates for the match-ticket designer.
//
// Every template is a pure function that paints a 1200x480 ticket onto a 2D
// canvas context from a `data` object. Painting on canvas (rather than DOM)
// means the live preview and the exported JPEG/PNG are pixel-identical, and the
// result can be uploaded to the media service and saved on Match.TicketArtworkUrl.
//
// All templates compose the same match data automatically: the opponent logo
// and name, the club crest, the match date, the venue, the "BILLET DE MATCH"
// wording, the price and a QR code. Each template only differs in layout and
// colours, so adding a new one is just another entry in TICKET_TEMPLATES.

export const TICKET_WIDTH = 1200
export const TICKET_HEIGHT = 480

// Club palette (mirrors the jso-navy / jso-gold Tailwind tokens used site-wide).
const NAVY = '#0b1730'
const NAVY_SOFT = '#13233f'
const BLUE = '#1d4ed8'
const GOLD = '#f5c518'
const WHITE = '#ffffff'
const PAPER = '#f6f8fc'

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

// Draw text truncated to a maximum width, appending an ellipsis if needed.
function fitText(ctx, text, maxWidth) {
  const value = String(text || '')
  if (ctx.measureText(value).width <= maxWidth) return value
  let trimmed = value
  while (trimmed.length > 1 && ctx.measureText(trimmed + '…').width > maxWidth) {
    trimmed = trimmed.slice(0, -1)
  }
  return trimmed + '…'
}

// Draw an image "contain" within a box, centred, preserving aspect ratio.
function drawContain(ctx, img, x, y, w, h) {
  if (!img || !img.width || !img.height) return
  const scale = Math.min(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

// Circular logo badge with a soft background, falling back to initials.
function drawLogoBadge(ctx, img, initials, cx, cy, radius, ring) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = WHITE
  ctx.fill()
  if (ring) {
    ctx.lineWidth = 6
    ctx.strokeStyle = ring
    ctx.stroke()
  }
  ctx.clip()
  if (img) {
    drawContain(ctx, img, cx - radius * 0.72, cy - radius * 0.72, radius * 1.44, radius * 1.44)
  } else {
    ctx.fillStyle = NAVY
    ctx.font = `800 ${radius * 0.7}px Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(initials || '?', cx, cy + 2)
  }
  ctx.restore()
}

function dashedPerforation(ctx, x, top, bottom) {
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'
  ctx.lineWidth = 3
  ctx.setLineDash([10, 12])
  ctx.beginPath()
  ctx.moveTo(x, top)
  ctx.lineTo(x, bottom)
  ctx.stroke()
  ctx.restore()
}

// Draw the QR stub area (QR image + price) on the right side.
function drawStub(ctx, data, x, w, bg, fg) {
  const { height } = { height: TICKET_HEIGHT }
  dashedPerforation(ctx, x, 40, height - 40)
  ctx.fillStyle = fg
  ctx.textAlign = 'center'
  ctx.font = '800 26px Arial, sans-serif'
  ctx.fillText('JSO', x + w / 2, 70)
  const qrSize = Math.min(w - 48, 200)
  const qrX = x + (w - qrSize) / 2
  const qrY = 92
  ctx.fillStyle = WHITE
  roundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12)
  ctx.fill()
  if (data.qrImage) ctx.drawImage(data.qrImage, qrX, qrY, qrSize, qrSize)
  ctx.fillStyle = fg
  ctx.font = '900 40px Arial, sans-serif'
  ctx.fillText(data.priceText, x + w / 2, qrY + qrSize + 60)
  void bg
}

// ---- shared field block (opponent logo + names + date/venue) --------------

function matchHeadline(data) {
  return data.isHome ? `JSO  ·  ${data.opponentName}` : `${data.opponentName}  ·  JSO`
}

// ---- templates ------------------------------------------------------------

// 1. Classique : navy plein, liseré or, stub QR à droite.
function paintClassic(ctx, data) {
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT)
  // gold accent bar
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, TICKET_WIDTH, 10)
  ctx.fillRect(0, TICKET_HEIGHT - 10, TICKET_WIDTH, 10)

  const stubW = 300
  const bodyW = TICKET_WIDTH - stubW
  // crest + opponent
  drawLogoBadge(ctx, data.crestImage, 'JSO', 120, 150, 70, GOLD)
  ctx.fillStyle = WHITE
  ctx.font = '800 30px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('VS', bodyW / 2, 158)
  drawLogoBadge(ctx, data.opponentImage, data.opponentInitials, bodyW - 180, 150, 70, GOLD)

  ctx.textAlign = 'left'
  ctx.fillStyle = GOLD
  ctx.font = '800 24px Arial, sans-serif'
  ctx.fillText('BILLET DE MATCH', 60, 280)
  ctx.fillStyle = WHITE
  ctx.font = '900 44px Arial, sans-serif'
  ctx.fillText(fitText(ctx, matchHeadline(data), bodyW - 120), 60, 330)
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = '600 26px Arial, sans-serif'
  ctx.fillText(fitText(ctx, data.dateText, bodyW - 120), 60, 375)
  ctx.fillText(fitText(ctx, data.venue, bodyW - 120), 60, 412)

  drawStub(ctx, data, bodyW, stubW, NAVY, WHITE)
}

// 2. Stade : photo/visuel en fond assombri, texte par-dessus.
function paintStadium(ctx, data) {
  ctx.fillStyle = NAVY_SOFT
  ctx.fillRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT)
  if (data.backgroundImage) {
    ctx.save()
    ctx.globalAlpha = 0.55
    drawContain(ctx, data.backgroundImage, 0, 0, TICKET_WIDTH, TICKET_HEIGHT)
    ctx.restore()
  }
  // dark gradient for legibility
  const grad = ctx.createLinearGradient(0, 0, 0, TICKET_HEIGHT)
  grad.addColorStop(0, 'rgba(7,14,32,0.35)')
  grad.addColorStop(1, 'rgba(7,14,32,0.9)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT)

  const stubW = 300
  const bodyW = TICKET_WIDTH - stubW
  drawLogoBadge(ctx, data.opponentImage, data.opponentInitials, 110, 120, 60, GOLD)
  ctx.textAlign = 'left'
  ctx.fillStyle = GOLD
  ctx.font = '800 22px Arial, sans-serif'
  ctx.fillText('STADE OUDHREF · BILLET DE MATCH', 60, 250)
  ctx.fillStyle = WHITE
  ctx.font = '900 52px Arial, sans-serif'
  ctx.fillText(fitText(ctx, matchHeadline(data), bodyW - 120), 60, 310)
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.font = '600 26px Arial, sans-serif'
  ctx.fillText(fitText(ctx, `${data.dateText}  ·  ${data.venue}`, bodyW - 120), 60, 360)

  drawStub(ctx, data, bodyW, stubW, NAVY, WHITE)
}

// 3. Clair : fond papier, accents navy/or, style épuré.
function paintLight(ctx, data) {
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT)
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, 18, TICKET_HEIGHT)
  ctx.fillStyle = GOLD
  ctx.fillRect(18, 0, 8, TICKET_HEIGHT)

  const stubW = 300
  const bodyW = TICKET_WIDTH - stubW
  drawLogoBadge(ctx, data.crestImage, 'JSO', 130, 150, 66, NAVY)
  ctx.fillStyle = NAVY
  ctx.font = '800 28px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('VS', bodyW / 2, 158)
  drawLogoBadge(ctx, data.opponentImage, data.opponentInitials, bodyW - 170, 150, 66, NAVY)

  ctx.textAlign = 'left'
  ctx.fillStyle = BLUE
  ctx.font = '800 24px Arial, sans-serif'
  ctx.fillText('BILLET DE MATCH', 70, 285)
  ctx.fillStyle = NAVY
  ctx.font = '900 44px Arial, sans-serif'
  ctx.fillText(fitText(ctx, matchHeadline(data), bodyW - 130), 70, 335)
  ctx.fillStyle = '#51607a'
  ctx.font = '600 26px Arial, sans-serif'
  ctx.fillText(fitText(ctx, data.dateText, bodyW - 130), 70, 378)
  ctx.fillText(fitText(ctx, data.venue, bodyW - 130), 70, 415)

  // light-themed stub
  dashedPerforation(ctx, bodyW, 40, TICKET_HEIGHT - 40)
  ctx.fillStyle = NAVY
  ctx.textAlign = 'center'
  ctx.font = '800 26px Arial, sans-serif'
  ctx.fillText('JSO', bodyW + stubW / 2, 70)
  const qrSize = 200
  const qrX = bodyW + (stubW - qrSize) / 2
  const qrY = 92
  ctx.strokeStyle = '#d7deeb'
  ctx.lineWidth = 2
  roundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12)
  ctx.stroke()
  if (data.qrImage) ctx.drawImage(data.qrImage, qrX, qrY, qrSize, qrSize)
  ctx.fillStyle = NAVY
  ctx.font = '900 40px Arial, sans-serif'
  ctx.fillText(data.priceText, bodyW + stubW / 2, qrY + qrSize + 60)
}

// 4. Diagonal : bandes dynamiques navy/or en diagonale.
function paintDiagonal(ctx, data) {
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT)
  ctx.save()
  ctx.fillStyle = BLUE
  ctx.beginPath()
  ctx.moveTo(0, TICKET_HEIGHT)
  ctx.lineTo(TICKET_WIDTH * 0.55, 0)
  ctx.lineTo(TICKET_WIDTH * 0.72, 0)
  ctx.lineTo(TICKET_WIDTH * 0.2, TICKET_HEIGHT)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = GOLD
  ctx.beginPath()
  ctx.moveTo(TICKET_WIDTH * 0.72, 0)
  ctx.lineTo(TICKET_WIDTH * 0.8, 0)
  ctx.lineTo(TICKET_WIDTH * 0.28, TICKET_HEIGHT)
  ctx.lineTo(TICKET_WIDTH * 0.2, TICKET_HEIGHT)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  const stubW = 300
  const bodyW = TICKET_WIDTH - stubW
  drawLogoBadge(ctx, data.opponentImage, data.opponentInitials, bodyW - 150, 140, 72, GOLD)
  ctx.textAlign = 'left'
  ctx.fillStyle = GOLD
  ctx.font = '800 24px Arial, sans-serif'
  ctx.fillText('BILLET DE MATCH', 60, 120)
  ctx.fillStyle = WHITE
  ctx.font = '900 48px Arial, sans-serif'
  ctx.fillText('JSO OUDHREF', 60, 175)
  ctx.font = '900 40px Arial, sans-serif'
  ctx.fillText(fitText(ctx, `vs ${data.opponentName}`, bodyW - 120), 60, 320)
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.font = '600 26px Arial, sans-serif'
  ctx.fillText(fitText(ctx, data.dateText, bodyW - 120), 60, 365)
  ctx.fillText(fitText(ctx, data.venue, bodyW - 120), 60, 402)

  drawStub(ctx, data, bodyW, stubW, NAVY, WHITE)
}

export const TICKET_TEMPLATES = [
  { id: 'classic', label: 'Classique', paint: paintClassic },
  { id: 'stadium', label: 'Stade (visuel en fond)', paint: paintStadium },
  { id: 'light', label: 'Clair', paint: paintLight },
  { id: 'diagonal', label: 'Diagonal', paint: paintDiagonal },
]

export function getTemplate(id) {
  return TICKET_TEMPLATES.find((item) => item.id === id) || TICKET_TEMPLATES[0]
}

// Paint a template onto a canvas context. `data` carries both the match text
// fields and any preloaded images (crestImage, opponentImage, qrImage,
// backgroundImage). Missing images degrade gracefully (initials / plain bg).
export function paintTicket(ctx, templateId, data) {
  ctx.clearRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT)
  getTemplate(templateId).paint(ctx, data)
}
