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
const GOLD_DEFAULT = '#f5c518'
const WHITE = '#ffffff'

// The accent colour used by every template for highlights (bars, badges,
// price pill, eyebrow text). It is the club gold by default and is reassigned
// by paintTicket() to the admin-chosen accent before each render. Canvas
// painting is synchronous, so a module-scoped value is safe here.
let GOLD = GOLD_DEFAULT
// When false, team logo badges are skipped (set per render by paintTicket).
let SHOW_LOGOS = true
// Admin's title-size multiplier and vertical offset for the main text block
// (text + logos move together; the background and the QR stub stay fixed).
let TITLE_SCALE = 1
let TEXT_DY = 0

// Headline font scaled by the admin's title-size control. Uses the display
// face loaded by ensureTicketFonts() (Archivo Black) with Arial as fallback.
function hf(weight, size) {
  return `${weight} ${Math.round(size * TITLE_SCALE)}px 'Archivo Black', Arial, sans-serif`
}

// The matte colour used to "punch" the ticket notches. It matches the admin
// page background so the exported JPEG reads as a die-cut ticket stub.
const MATTE = '#f4f7fc'

// Loads the display faces used by the templates from Google Fonts and waits
// for them before the first paint. Falls back silently to Arial if offline.
let fontsPromise = null
export function ensureTicketFonts() {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      if (typeof document === 'undefined' || !document.fonts) return
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Oswald:wght@500;600;700&display=swap'
      document.head.appendChild(link)
      await Promise.all([
        document.fonts.load('400 40px "Archivo Black"'),
        document.fonts.load('700 32px Oswald'),
        document.fonts.load('600 24px Oswald'),
        document.fonts.load('500 20px Oswald'),
      ])
    })().catch(() => {})
  }
  return fontsPromise
}

export const TICKET_ACCENTS = [
  { id: 'gold', label: 'Or', color: '#f5c518' },
  { id: 'white', label: 'Blanc', color: '#ffffff' },
  { id: 'red', label: 'Rouge', color: '#e23b3b' },
  { id: 'green', label: 'Vert', color: '#22b07d' },
  { id: 'sky', label: 'Bleu ciel', color: '#38bdf8' },
]

// Bundled backgrounds shown in the designer. Photo backgrounds reference a
// same-origin image in public/; colour backgrounds carry no URL and are painted
// as a gradient (via `fill`). The admin can also upload a custom photo.
export const TICKET_BACKGROUNDS = [
  { id: 'stadium', label: 'Stade (nuit)', url: '/jso-stadium-hero.png' },
  { id: 'bus', label: 'Supporters & bus', url: '/jso-bus-campaign.png' },
  { id: 'navy', label: 'Bleu nuit', url: '', fill: ['#0b1730', '#13233f'] },
  { id: 'blue', label: 'Bleu royal', url: '', fill: ['#0b1730', '#1d4ed8'] },
  { id: 'gold', label: 'Dégradé or', url: '', fill: ['#13233f', '#8a6d08'] },
  { id: 'none', label: 'Aucune', url: '', fill: ['#0b1730', '#13233f'] },
]

export function backgroundUrl(id) {
  return (TICKET_BACKGROUNDS.find((item) => item.id === id) || TICKET_BACKGROUNDS[0]).url
}

// The gradient stops for a colour background id (empty for photo backgrounds).
export function backgroundFill(id) {
  return (TICKET_BACKGROUNDS.find((item) => item.id === id) || {}).fill || null
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
// Skipped entirely when the admin turned logos off.
function drawLogoBadge(ctx, img, initials, cx, cy, radius, ring) {
  if (!SHOW_LOGOS) return
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
  // Dotted perforation (small round holes) with punched semicircle notches at
  // the top and bottom edges, like a real die-cut ticket stub.
  ctx.save()
  ctx.fillStyle = color
  for (let y = top; y <= bottom; y += 14) {
    ctx.beginPath()
    ctx.arc(x, y, 2.6, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  // Notches punched into the matte so the stub looks detachable.
  ctx.save()
  ctx.fillStyle = MATTE
  ctx.beginPath()
  ctx.arc(x, 0, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x, TICKET_HEIGHT, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// Soft vignette over the photo area so edges fall off like a studio light.
function vignette(ctx, w, h, strength = 0.38) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(4,9,20,${strength})`)
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

// Minimal CODE39 encoder (uppercase A–Z, 0–9, dash, point, space, star guards).
const CODE39 = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwwnnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
}

// Draw a CODE39 barcode for `text` centred inside the given box.
function drawBarcode(ctx, text, cx, y, width, height, color) {
  const value = `*${String(text).toUpperCase().replace(/[^0-9A-Z.\- ]/g, '')}*`
  const narrow = 2
  const wide = 5
  let totalUnits = 0
  for (const ch of value) totalUnits += [...(CODE39[ch] || '')].reduce((n, c) => n + (c === 'w' ? wide : narrow), 0) + narrow
  if (!totalUnits) return
  const scale = Math.min(1, width / totalUnits)
  let x = cx - (totalUnits * scale) / 2
  ctx.save()
  ctx.fillStyle = color
  for (const ch of value) {
    const pattern = CODE39[ch] || ''
    let isBar = true
    for (const c of pattern) {
      const w = (c === 'w' ? wide : narrow) * scale
      if (isBar) ctx.fillRect(x, y, Math.max(1, w - 0.4), height)
      x += w
      isBar = !isBar
    }
    x += narrow * scale
  }
  ctx.restore()
}

// Right-hand stub: JSO wordmark, framed QR, price, seat info and a real
// barcode with the ticket serial, punched like a die-cut ticket. `dark`
// chooses the palette.
function drawStub(ctx, data, x, w, dark) {
  const fg = dark ? WHITE : NAVY
  const sub = dark ? 'rgba(255,255,255,0.65)' : 'rgba(11,23,48,0.65)'
  dashedPerforation(ctx, x, 40, TICKET_HEIGHT - 40, dark ? 'rgba(255,255,255,0.5)' : 'rgba(11,23,48,0.3)')
  ctx.textAlign = 'center'
  ctx.fillStyle = fg
  ctx.font = '700 24px Oswald, Arial, sans-serif'
  ctx.fillText('JSO', x + w / 2, 66)
  const showQr = data.showQr !== false
  const qrSize = Math.min(w - 56, 168)
  const qrX = x + (w - qrSize) / 2
  const qrY = 84
  if (showQr) {
    ctx.fillStyle = WHITE
    ctx.shadowColor = 'rgba(0,0,0,0.3)'
    ctx.shadowBlur = dark ? 16 : 0
    roundRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 14)
    ctx.fill()
    ctx.shadowBlur = 0
    if (data.qrImage) ctx.drawImage(data.qrImage, qrX, qrY, qrSize, qrSize)
  }
  // price pill (sits under the QR, or centred vertically when the QR is hidden)
  const pillW = w - 64
  const pillX = x + 32
  const pillY = showQr ? qrY + qrSize + 16 : 150
  ctx.fillStyle = GOLD
  roundRect(ctx, pillX, pillY, pillW, 50, 14)
  ctx.fill()
  ctx.fillStyle = NAVY
  ctx.font = `900 ${Math.round(32 * TITLE_SCALE)}px Oswald, Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText(data.priceText, x + w / 2, pillY + 35)

  // Seat info (tribune / porte / place), only the fields the admin filled in.
  const seatParts = [
    data.tribune ? `TRIBUNE ${data.tribune}` : '',
    data.gate ? `PORTE ${data.gate}` : '',
    data.seat ? `PLACE ${data.seat}` : '',
  ].filter(Boolean)
  if (seatParts.length) {
    ctx.fillStyle = fg
    ctx.font = '600 19px Oswald, Arial, sans-serif'
    ctx.fillText(seatParts.join('  ·  '), x + w / 2, pillY + 84)
  }

  // Serial + real CODE39 barcode pinned to the bottom of the stub.
  const serial = (data.serial || '').trim()
  if (serial) {
    const barcodeY = TICKET_HEIGHT - 84
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.92)' : '#ffffff'
    roundRect(ctx, x + 24, barcodeY - 10, w - 48, 74, 10)
    ctx.fill()
    drawBarcode(ctx, serial, x + w / 2, barcodeY, w - 72, 40, '#0b1730')
    ctx.fillStyle = '#0b1730'
    ctx.font = '600 15px Oswald, Arial, sans-serif'
    ctx.fillText(serial.toUpperCase(), x + w / 2, barcodeY + 58)
  } else {
    ctx.fillStyle = sub
    ctx.font = '500 15px Oswald, Arial, sans-serif'
    ctx.fillText('Vivez chaque match avec la JSO', x + w / 2, TICKET_HEIGHT - 36)
  }
}

// The two teams as shown on the ticket. Uses the admin's manual names when
// provided, otherwise falls back to the match (JSO vs opponent, ordered by
// home/away). A custom separator keeps "Équipe A · Équipe B" readable.
function matchHeadline(data) {
  const home = (data.homeTeam || '').trim()
  const away = (data.awayTeam || '').trim()
  if (home || away) return `${home || '—'} · ${away || '—'}`
  return data.isHome ? `JSO · ${data.opponentName}` : `${data.opponentName} · JSO`
}

// The eyebrow/title line ("BILLET DE MATCH · STADE OUDHREF" by default).
function titleText(data, withVenue) {
  const base = (data.title || 'BILLET DE MATCH').toUpperCase()
  return withVenue ? `${base} · ${(data.venue || 'STADE OUDHREF').toUpperCase()}` : base
}

// Paint the background photo (cover) with a template-specific dark overlay so
// text is always legible. When no photo is available, fall back to a navy
// gradient that still looks intentional.
function paintBackground(ctx, data, overlay) {
  if (data.backgroundImage) {
    drawCover(ctx, data.backgroundImage, 0, 0, TICKET_WIDTH, TICKET_HEIGHT)
  } else {
    const stops = Array.isArray(data.backgroundFill) && data.backgroundFill.length >= 2
      ? data.backgroundFill
      : ['#0b1730', '#13233f']
    const grad = ctx.createLinearGradient(0, 0, TICKET_WIDTH, TICKET_HEIGHT)
    grad.addColorStop(0, stops[0])
    grad.addColorStop(1, stops[1])
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT)
  }
  overlay(ctx)
  // Soft vignette so edges fall off like a studio light on every template.
  vignette(ctx, TICKET_WIDTH, TICKET_HEIGHT)
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

  ctx.save()
  ctx.translate(0, TEXT_DY)
  drawLogoBadge(ctx, data.crestImage, 'JSO', 110, 120, 60, GOLD)
  ctx.fillStyle = WHITE
  ctx.font = '800 26px Oswald, Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('VS', bodyW / 2 + 40, 128)
  drawLogoBadge(ctx, data.opponentImage, data.opponentInitials, bodyW - 120, 120, 60, GOLD)

  ctx.textAlign = 'left'
  ctx.fillStyle = GOLD
  ctx.font = '800 22px Oswald, Arial, sans-serif'
  ctx.fillText(titleText(data, true), 56, 320)
  ctx.fillStyle = WHITE
  ctx.font = hf(900, 50)
  ctx.fillText(fitText(ctx, matchHeadline(data), bodyW - 110), 56, 375)
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ctx.font = '600 25px Oswald, Arial, sans-serif'
  ctx.fillText(fitText(ctx, `${data.dateText}  ·  ${data.venue}`, bodyW - 110), 56, 418)
  ctx.restore()

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

  ctx.save()
  ctx.translate(0, TEXT_DY)
  drawLogoBadge(ctx, data.opponentImage, data.opponentInitials, 130, 150, 72, GOLD)
  ctx.textAlign = 'left'
  ctx.fillStyle = GOLD
  ctx.font = '800 22px Oswald, Arial, sans-serif'
  ctx.fillText(titleText(data, false), 230, 110)
  ctx.fillStyle = WHITE
  ctx.font = hf(900, 46)
  ctx.fillText('JSO OUDHREF', 230, 160)
  ctx.font = hf(900, 40)
  ctx.fillText(fitText(ctx, `vs ${data.opponentName}`, bodyW - 260), 230, 215)
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ctx.font = '600 25px Oswald, Arial, sans-serif'
  ctx.fillText(fitText(ctx, data.dateText, bodyW - 90), 56, 400)
  ctx.fillText(fitText(ctx, data.venue, bodyW - 90), 56, 435)
  ctx.restore()

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
  ctx.save()
  ctx.translate(0, TEXT_DY)
  // gold diagonal ribbon
  ctx.fillStyle = GOLD
  ctx.beginPath()
  ctx.moveTo(0, TICKET_HEIGHT - 150)
  ctx.lineTo(bodyW, TICKET_HEIGHT - 230)
  ctx.lineTo(bodyW, TICKET_HEIGHT - 150)
  ctx.lineTo(0, TICKET_HEIGHT - 70)
  ctx.closePath()
  ctx.globalAlpha = 0.92
  ctx.fill()
  ctx.globalAlpha = 1

  drawLogoBadge(ctx, data.opponentImage, data.opponentInitials, bodyW - 120, 120, 64, GOLD)
  ctx.textAlign = 'left'
  ctx.fillStyle = WHITE
  ctx.font = '800 22px Oswald, Arial, sans-serif'
  ctx.fillText(titleText(data, false), 56, 90)
  ctx.font = hf(900, 56)
  ctx.fillText(fitText(ctx, matchHeadline(data), bodyW - 110), 56, 180)
  // text on the gold ribbon
  ctx.fillStyle = NAVY
  ctx.font = '800 26px Oswald, Arial, sans-serif'
  ctx.fillText(fitText(ctx, `${data.dateText} · ${data.venue}`, bodyW - 90), 56, TICKET_HEIGHT - 105)
  ctx.restore()

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

  ctx.save()
  ctx.translate(0, TEXT_DY)
  drawLogoBadge(ctx, data.opponentImage, data.opponentInitials, bodyW - 110, 90, 56, GOLD)
  ctx.textAlign = 'left'
  ctx.fillStyle = WHITE
  ctx.font = '800 22px Oswald, Arial, sans-serif'
  ctx.fillText(titleText(data, true), 56, 60)
  ctx.font = hf(900, 44)
  ctx.fillText(fitText(ctx, matchHeadline(data), bodyW - 200), 56, 210)

  ctx.fillStyle = GOLD
  ctx.font = '800 22px Oswald, Arial, sans-serif'
  ctx.fillText('DATE', 56, photoH + 70)
  ctx.fillText('STADE', 56, photoH + 140)
  ctx.fillStyle = WHITE
  ctx.font = '700 26px Oswald, Arial, sans-serif'
  ctx.fillText(fitText(ctx, data.dateText, bodyW - 110), 56, photoH + 105)
  ctx.fillText(fitText(ctx, data.venue, bodyW - 110), 56, photoH + 175)
  ctx.restore()

  drawStub(ctx, data, bodyW, stubW, true)
}

// 5. Bannière — grande photo pleine largeur, bandeau navy translucide en bas.
function paintBanner(ctx, data) {
  paintBackground(ctx, data, (c) => {
    c.fillStyle = 'rgba(7,14,32,0.25)'
    c.fillRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT)
  })
  const stubW = 300
  const bodyW = TICKET_WIDTH - stubW
  ctx.save()
  ctx.translate(0, TEXT_DY)
  // bottom navy band
  ctx.fillStyle = 'rgba(7,14,32,0.86)'
  ctx.fillRect(0, TICKET_HEIGHT - 150, bodyW, 150)
  ctx.fillStyle = GOLD
  ctx.fillRect(0, TICKET_HEIGHT - 150, bodyW, 6)

  drawLogoBadge(ctx, data.crestImage, 'JSO', 90, 90, 56, GOLD)
  drawLogoBadge(ctx, data.opponentImage, data.opponentInitials, 220, 90, 56, GOLD)
  ctx.textAlign = 'left'
  ctx.fillStyle = WHITE
  ctx.font = '800 20px Oswald, Arial, sans-serif'
  ctx.fillText(titleText(data, false), 56, TICKET_HEIGHT - 100)
  ctx.font = hf(900, 40)
  ctx.fillText(fitText(ctx, matchHeadline(data), bodyW - 110), 56, TICKET_HEIGHT - 55)
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.font = '600 22px Oswald, Arial, sans-serif'
  ctx.fillText(fitText(ctx, `${data.dateText} · ${data.venue}`, bodyW - 110), 56, TICKET_HEIGHT - 24)
  ctx.restore()

  drawStub(ctx, data, bodyW, stubW, true)
}

// 6. Minimal — photo centrée très assombrie, grand "VS" central, épuré.
function paintMinimal(ctx, data) {
  paintBackground(ctx, data, (c) => {
    c.fillStyle = 'rgba(7,14,32,0.78)'
    c.fillRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT)
  })
  const stubW = 300
  const bodyW = TICKET_WIDTH - stubW
  ctx.save()
  ctx.translate(0, TEXT_DY)
  ctx.textAlign = 'center'
  ctx.fillStyle = GOLD
  ctx.font = '800 22px Oswald, Arial, sans-serif'
  ctx.fillText(titleText(data, true), bodyW / 2, 70)

  drawLogoBadge(ctx, data.crestImage, 'JSO', bodyW / 2 - 170, 190, 66, GOLD)
  drawLogoBadge(ctx, data.opponentImage, data.opponentInitials, bodyW / 2 + 170, 190, 66, GOLD)
  ctx.fillStyle = WHITE
  ctx.font = '900 54px Oswald, Arial, sans-serif'
  ctx.fillText('VS', bodyW / 2, 208)
  ctx.font = hf(900, 34)
  ctx.fillText(fitText(ctx, matchHeadline(data), bodyW - 120), bodyW / 2, 330)
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.font = '600 24px Oswald, Arial, sans-serif'
  ctx.fillText(fitText(ctx, `${data.dateText} · ${data.venue}`, bodyW - 120), bodyW / 2, 375)
  ctx.restore()

  drawStub(ctx, data, bodyW, stubW, true)
}

// 7. Or — fond or vif (ou photo), texte navy, look premium à fort contraste.
function paintGold(ctx, data) {
  if (data.backgroundImage) {
    drawCover(ctx, data.backgroundImage, 0, 0, TICKET_WIDTH, TICKET_HEIGHT)
    ctx.fillStyle = 'rgba(245,197,24,0.86)'
    ctx.fillRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT)
  } else {
    const g = ctx.createLinearGradient(0, 0, TICKET_WIDTH, TICKET_HEIGHT)
    g.addColorStop(0, '#f5c518')
    g.addColorStop(1, '#e0a800')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT)
  }
  const stubW = 300
  const bodyW = TICKET_WIDTH - stubW
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, bodyW, 8)

  ctx.save()
  ctx.translate(0, TEXT_DY)
  drawLogoBadge(ctx, data.opponentImage, data.opponentInitials, bodyW - 120, 130, 68, NAVY)
  ctx.textAlign = 'left'
  ctx.fillStyle = NAVY
  ctx.font = '800 24px Oswald, Arial, sans-serif'
  ctx.fillText(titleText(data, false), 56, 120)
  ctx.font = hf(900, 52)
  ctx.fillText(fitText(ctx, matchHeadline(data), bodyW - 110), 56, 200)
  ctx.font = '700 25px Oswald, Arial, sans-serif'
  ctx.fillText(fitText(ctx, data.dateText, bodyW - 110), 56, 300)
  ctx.fillText(fitText(ctx, data.venue, bodyW - 110), 56, 338)
  ctx.restore()

  // navy stub for contrast
  ctx.fillStyle = NAVY
  ctx.fillRect(bodyW, 0, stubW, TICKET_HEIGHT)
  drawStub(ctx, data, bodyW, stubW, true)
}

export const TICKET_TEMPLATES = [
  { id: 'stadium', label: 'Stade', paint: paintStadium, usesPhoto: true },
  { id: 'spotlight', label: 'Projecteur', paint: paintSpotlight, usesPhoto: true },
  { id: 'tifo', label: 'Tifo', paint: paintTifo, usesPhoto: true },
  { id: 'classic', label: 'Classique', paint: paintClassicPhoto, usesPhoto: true },
  { id: 'banner', label: 'Bannière', paint: paintBanner, usesPhoto: true },
  { id: 'minimal', label: 'Minimal', paint: paintMinimal, usesPhoto: true },
  { id: 'gold', label: 'Or premium', paint: paintGold, usesPhoto: true },
]

export function getTemplate(id) {
  return TICKET_TEMPLATES.find((item) => item.id === id) || TICKET_TEMPLATES[0]
}

// Paint a template onto a canvas context. `data` carries both the match text
// fields and any preloaded images (crestImage, opponentImage, qrImage,
// backgroundImage), plus the admin's customisation (accent, title, homeTeam,
// awayTeam, showQr, showLogos). Missing images degrade gracefully.
export function paintTicket(ctx, templateId, data) {
  // Resolve the per-render accent colour and logo visibility (module-scoped so
  // the templates and shared helpers pick them up without threading params).
  GOLD = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(data.accent || '')) ? data.accent : GOLD_DEFAULT
  SHOW_LOGOS = data.showLogos !== false
  TITLE_SCALE = Number(data.titleScale) > 0 ? Number(data.titleScale) : 1
  TEXT_DY = Number(data.textDy) || 0
  ctx.clearRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT)
  getTemplate(templateId).paint(ctx, data)
  // Reset so a later render with no accent falls back to the club gold.
  GOLD = GOLD_DEFAULT
  SHOW_LOGOS = true
  TITLE_SCALE = 1
  TEXT_DY = 0
}
