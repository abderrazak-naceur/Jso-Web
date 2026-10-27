import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Ticket, Download, Save, RefreshCw, Trash2, ImagePlus, Upload } from 'lucide-react'
import { API_BASE_URL } from '../../lib/apiConfig'
import { CREST_SRC } from '../../features/site/brand'
import { teamInitials } from '../../features/matches/matchUtils'
import { slugifyMatchPart } from '../../features/site/publicRoutes'
import { TICKET_TEMPLATES, TICKET_BACKGROUNDS, backgroundUrl, backgroundFill, TICKET_WIDTH, TICKET_HEIGHT, paintTicket } from './ticketTemplates'

// Admin API helper scoped to this module (same shape as the other commerce
// modules so it keeps working independently of AdminApp internals).
async function api(path, options = {}) {
  const token = localStorage.getItem('jso_admin_token')
  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers,
    },
  })
  if (!response.ok) {
    let message = 'Request failed: ' + response.status
    try { message = (await response.json()).message || message } catch { /* ignore */ }
    throw new Error(message)
  }
  if (response.status === 204) return null
  return response.json()
}

// Upload an image (blob or File) to the persistent media microservice, the same
// endpoint the match admin already uses. Returns the public absolute URL.
async function uploadMedia(file, filename, caption) {
  const token = localStorage.getItem('jso_admin_token')
  if (!token) throw new Error('Session administrateur expirée. Reconnectez-vous.')
  const data = new FormData()
  data.append('file', file, filename)
  data.append('title', filename)
  data.append('caption', caption)
  let response
  try {
    response = await fetch('https://jso-media-api.onrender.com/api/media/upload', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
      body: data,
    })
  } catch {
    throw new Error('Le service de stockage média est inaccessible. Réessayez dans un instant.')
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || payload.message || `Échec du téléversement (${response.status}).`)
  if (!payload.url || !/^https?:\/\//i.test(payload.url)) throw new Error('Le stockage média n’a pas retourné une URL publique valide.')
  return payload.url
}

// Load an image for canvas use. crossOrigin lets us export the canvas without
// tainting it when the media host sends CORS headers. Resolves null on error
// so the templates can fall back to initials / plain backgrounds.
async function loadImage(src) {
  // Decode an <img> from a source. Marks __cors=true when the pixels are
  // safe to export (same-origin, data:, blob:, or a CORS-enabled load).
  function decode(source, cors) {
    return new Promise((resolve) => {
      const img = new Image()
      if (cors) img.crossOrigin = 'anonymous'
      img.onload = () => { img.__cors = cors; resolve(img) }
      img.onerror = () => resolve(null)
      img.src = source
    })
  }

  if (!src) return null
  // data:/blob: and same-origin URLs are always exportable.
  const sameOrigin = /^(data:|blob:)/i.test(src) || (typeof window !== 'undefined' && src.startsWith(window.location.origin)) || src.startsWith('/')
  if (sameOrigin) return decode(src, false).then((img) => { if (img) img.__cors = true; return img })

  // Cross-origin (media host): fetch the bytes and wrap them in a same-origin
  // blob: URL. A blob: image never taints the canvas, so export keeps working
  // regardless of the host's CORS headers. If the fetch is blocked, fall back
  // to a direct load for the preview (canvas then tainted → export via URL).
  try {
    const response = await fetch(src, { mode: 'cors' })
    if (response.ok) {
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const img = await decode(objectUrl, false)
      if (img) { img.__cors = true; img.__objectUrl = objectUrl; return img }
      URL.revokeObjectURL(objectUrl)
    }
  } catch { /* fall through to a tainting load */ }

  // Try a CORS <img> load, then a plain one so the preview still shows.
  return (await decode(src, true)) || (await decode(src, false))
}

const read = (match, pascal, camel) => match?.[pascal] ?? match?.[camel]

function matchFields(match) {
  if (!match) return null
  const isHome = Boolean(read(match, 'IsHome', 'isHome'))
  const opponentName = String(read(match, 'OpponentName', 'opponentName') || 'Adversaire')
  const kickoffAt = read(match, 'KickoffAt', 'kickoffAt')
  return {
    id: read(match, 'Id', 'id'),
    isHome,
    opponentName,
    opponentInitials: teamInitials(opponentName),
    opponentLogoUrl: String(read(match, 'OpponentLogoUrl', 'opponentLogoUrl') || ''),
    ticketArtworkUrl: String(read(match, 'TicketArtworkUrl', 'ticketArtworkUrl') || ''),
    venue: String(read(match, 'Venue', 'venue') || 'Stade Oudhref'),
    kickoffAt,
    dateText: kickoffAt ? new Date(kickoffAt).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }) : 'Date à confirmer',
  }
}

const matchLabel = (m) => {
  const f = matchFields(m)
  const d = f.kickoffAt ? new Date(f.kickoffAt).toLocaleDateString('fr-FR', { dateStyle: 'short' }) : '—'
  return `${f.isHome ? 'JSO' : 'Ext.'} — ${f.opponentName} · ${d}`
}

// Build the full MatchRequest body for a PUT, overriding the fields we change.
function matchBody(match, fields, overrides) {
  return {
    seasonId: read(match, 'SeasonId', 'seasonId'),
    competitionId: read(match, 'CompetitionId', 'competitionId'),
    teamId: read(match, 'TeamId', 'teamId'),
    opponentName: fields.opponentName,
    opponentLogoUrl: fields.opponentLogoUrl || null,
    ticketArtworkUrl: fields.ticketArtworkUrl || null,
    kickoffAt: fields.kickoffAt,
    venue: read(match, 'Venue', 'venue') || null,
    isHome: fields.isHome,
    homeScore: read(match, 'HomeScore', 'homeScore') ?? null,
    awayScore: read(match, 'AwayScore', 'awayScore') ?? null,
    status: read(match, 'Status', 'status') || 'Scheduled',
    isPublished: Boolean(read(match, 'IsPublished', 'isPublished')),
    ...overrides,
  }
}

export default function TicketDesignerModule({ onError }) {
  const [matches, setMatches] = useState([])
  // Preselect the match passed by the billetterie screen (?match=<id>).
  const [matchId, setMatchId] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('match') || '' } catch { return '' }
  })
  const [templateId, setTemplateId] = useState(TICKET_TEMPLATES[0].id)
  const [backgroundId, setBackgroundId] = useState(TICKET_BACKGROUNDS[0].id)
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState('')
  const [priceText, setPriceText] = useState('5 DT')
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBg, setUploadingBg] = useState(false)
  const [savedUrl, setSavedUrl] = useState('')
  const canvasRef = useRef(null)
  // Preloaded images kept in a ref so repainting doesn't reload them every time.
  const imagesRef = useRef({ crest: null, opponent: null, qr: null, background: null })
  const [imagesReady, setImagesReady] = useState(0)

  async function loadMatches(selectId) {
    try {
      const list = await api('/admin/matches')
      const sorted = (Array.isArray(list) ? list : []).slice().sort((a, b) => {
        const ta = read(a, 'KickoffAt', 'kickoffAt') ? new Date(read(a, 'KickoffAt', 'kickoffAt')).getTime() : Infinity
        const tb = read(b, 'KickoffAt', 'kickoffAt') ? new Date(read(b, 'KickoffAt', 'kickoffAt')).getTime() : Infinity
        return ta - tb
      })
      setMatches(sorted)
      const keep = selectId || matchId
      if ((!keep || !sorted.some((m) => String(read(m, 'Id', 'id')) === String(keep))) && sorted[0]) setMatchId(read(sorted[0], 'Id', 'id'))
      else if (selectId) setMatchId(selectId)
      onError('')
    } catch (e) { onError(e.message) }
  }
  useEffect(() => { loadMatches() }, [])

  const match = useMemo(() => matches.find((m) => String(read(m, 'Id', 'id')) === String(matchId)), [matches, matchId])
  const fields = useMemo(() => matchFields(match), [match])

  // Public URL encoded in the QR: the exact match page. The path ends with the
  // match UUID so the public app resolves it directly via matchIdFromPath
  // (no ambiguity if two opponents share a name), while the readable
  // "jso-vs-{opponent}" prefix keeps the link SEO-friendly.
  const publicUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://jsoudhref.com'
    if (!fields?.id) return `${origin}/matchs`
    const opponentSlug = slugifyMatchPart(fields.opponentName)
    const prefix = opponentSlug ? `jso-vs-${opponentSlug}-` : ''
    return `${origin}/matchs/${prefix}${fields.id}`
  }, [fields])

  // The background actually used: a custom uploaded photo takes priority,
  // otherwise the chosen bundled background (a photo URL or a colour gradient).
  const activeBackgroundUrl = customBackgroundUrl || backgroundUrl(backgroundId)
  const activeBackgroundFill = customBackgroundUrl ? null : backgroundFill(backgroundId)

  // Preload crest, opponent logo and QR when the match (or its logo) changes.
  useEffect(() => {
    let active = true
    setSavedUrl('')
    async function preload() {
      const [crest, opponent, qr] = await Promise.all([
        loadImage(CREST_SRC),
        loadImage(fields?.opponentLogoUrl || ''),
        QRCode.toDataURL(publicUrl, { width: 320, margin: 1, errorCorrectionLevel: 'M' }).then(loadImage).catch(() => null),
      ])
      if (!active) return
      imagesRef.current = { ...imagesRef.current, crest, opponent, qr }
      setImagesReady((n) => n + 1)
    }
    if (fields) preload()
    return () => { active = false }
  }, [fields, publicUrl])

  // Preload the background separately so changing only the background doesn't
  // reload the logo/QR.
  useEffect(() => {
    let active = true
    loadImage(activeBackgroundUrl).then((img) => {
      if (!active) return
      imagesRef.current = { ...imagesRef.current, background: img }
      setImagesReady((n) => n + 1)
    })
    return () => { active = false }
  }, [activeBackgroundUrl])

  // Repaint the canvas on any change to the template, match, price or
  // background colour.
  const repaint = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !fields) return
    const ctx = canvas.getContext('2d')
    const imgs = imagesRef.current
    paintTicket(ctx, templateId, {
      ...fields,
      priceText: priceText || '5 DT',
      crestImage: imgs.crest,
      opponentImage: imgs.opponent,
      qrImage: imgs.qr,
      backgroundImage: imgs.background,
      backgroundFill: activeBackgroundFill,
    })
  }, [fields, templateId, priceText, activeBackgroundFill])

  useEffect(() => { repaint() }, [repaint, imagesReady])

  function exportBlob(type = 'image/jpeg', quality = 0.92) {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current
      if (!canvas) { reject(new Error('Aperçu indisponible.')); return }
      try {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Impossible de générer l’image.')), type, quality)
      } catch {
        // SecurityError: a non-CORS image tainted the canvas.
        reject(new Error('Une des images (logo ou fond) ne peut pas être exportée depuis son hébergeur. Téléversez-la à nouveau depuis le designer puis réessayez.'))
      }
    })
  }

  function validImage(file) {
    if (!file) return false
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { onError('Utilisez une image PNG, JPG ou WebP.'); return false }
    if (file.size > 10 * 1024 * 1024) { onError('L’image dépasse la limite de 10 Mo.'); return false }
    return true
  }

  // Upload a logo for the opponent and persist it on the match immediately.
  async function uploadOpponentLogo(file) {
    if (!validImage(file) || !match || !fields) return
    setUploadingLogo(true)
    try {
      const url = await uploadMedia(file, `logo-${fields.opponentName}.png`, `Logo adversaire — ${fields.opponentName}`)
      await api('/admin/matches/' + fields.id, { method: 'PUT', body: JSON.stringify(matchBody(match, fields, { opponentLogoUrl: url })) })
      await loadMatches(fields.id)
      onError('')
    } catch (e) { onError(e.message) }
    finally { setUploadingLogo(false) }
  }

  // Upload a custom background photo and use it in the preview.
  async function uploadBackground(file) {
    if (!validImage(file) || !fields) return
    setUploadingBg(true)
    try {
      const url = await uploadMedia(file, `fond-billet-${fields.opponentName}.jpg`, 'Fond personnalisé pour billet')
      setCustomBackgroundUrl(url)
      onError('')
    } catch (e) { onError(e.message) }
    finally { setUploadingBg(false) }
  }

  async function download() {
    try {
      const blob = await exportBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `billet-${fields?.opponentName || 'match'}.jpg`.replace(/\s+/g, '-').toLowerCase()
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      onError('')
    } catch (e) { onError(e.message) }
  }

  // Export the preview, upload it, then save the URL on the match's
  // TicketArtworkUrl via the existing admin match endpoint.
  async function saveToMatch() {
    if (!match || !fields) return
    setSaving(true)
    try {
      const blob = await exportBlob()
      const url = await uploadMedia(blob, `billet-${fields.opponentName}.jpg`, 'Visuel de billet généré depuis le designer')
      await api('/admin/matches/' + fields.id, { method: 'PUT', body: JSON.stringify(matchBody(match, fields, { ticketArtworkUrl: url })) })
      setSavedUrl(url)
      await loadMatches(fields.id)
      onError('')
    } catch (e) { onError(e.message) }
    finally { setSaving(false) }
  }

  async function clearArtwork() {
    if (!match || !fields) return
    if (!window.confirm('Retirer le visuel de billet enregistré pour ce match ?')) return
    setSaving(true)
    try {
      await api('/admin/matches/' + fields.id, { method: 'PUT', body: JSON.stringify(matchBody(match, fields, { ticketArtworkUrl: null })) })
      setSavedUrl('')
      await loadMatches(fields.id)
      onError('')
    } catch (e) { onError(e.message) }
    finally { setSaving(false) }
  }

  const busy = saving || uploadingLogo || uploadingBg

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2"><Ticket className="text-jso-blue" size={20}/><h2 className="text-xl font-black">Designer de billets</h2></div>
      <p className="mt-1 text-sm text-slate-500">Choisissez un match, un modèle et une photo de fond : le logo de l’adversaire, son nom, la date, le stade, le prix et le QR sont composés automatiquement. Enregistrez le visuel sur le match pour l’utiliser en billetterie.</p>
    </div>

    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <div className="space-y-5 rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <label className="block text-sm font-bold">Match
          <select value={matchId} onChange={(e) => setMatchId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-jso-blue">
            {matches.length === 0 && <option value="">Aucun match</option>}
            {matches.map((m) => <option key={read(m, 'Id', 'id')} value={read(m, 'Id', 'id')}>{matchLabel(m)}</option>)}
          </select>
        </label>

        <div>
          <p className="text-sm font-bold">Modèle</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {TICKET_TEMPLATES.map((tpl) => (
              <button key={tpl.id} type="button" onClick={() => setTemplateId(tpl.id)}
                className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${templateId === tpl.id ? 'border-jso-blue bg-jso-blue/10 text-jso-navy' : 'border-slate-200 text-slate-600 hover:border-jso-blue'}`}>
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-bold">Photo de fond</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {TICKET_BACKGROUNDS.map((bg) => (
              <button key={bg.id} type="button" onClick={() => { setBackgroundId(bg.id); setCustomBackgroundUrl('') }}
                className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${!customBackgroundUrl && backgroundId === bg.id ? 'border-jso-blue bg-jso-blue/10 text-jso-navy' : 'border-slate-200 text-slate-600 hover:border-jso-blue'}`}>
                {bg.label}
              </button>
            ))}
          </div>
          <label className={`mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold ${customBackgroundUrl ? 'border-jso-blue bg-jso-blue/10 text-jso-navy' : 'border-dashed border-slate-300 text-slate-600 hover:border-jso-blue'}`}>
            <Upload size={15}/>{uploadingBg ? 'Téléversement…' : customBackgroundUrl ? 'Fond personnalisé actif — remplacer' : 'Téléverser une photo de fond'}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploadingBg} onChange={(e) => { uploadBackground(e.target.files?.[0]); e.target.value = '' }}/>
          </label>
          {customBackgroundUrl && <button type="button" onClick={() => setCustomBackgroundUrl('')} className="mt-1 text-xs font-bold text-red-600">Revenir aux fonds proposés</button>}
        </div>

        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-sm font-bold">Logo de l’adversaire</p>
          <div className="mt-2 flex items-center gap-3">
            {fields?.opponentLogoUrl
              ? <img src={fields.opponentLogoUrl} alt="Logo adversaire" className="h-12 w-12 rounded-lg border border-slate-200 bg-white object-contain p-1"/>
              : <span className="grid h-12 w-12 place-items-center rounded-lg bg-slate-100 text-xs font-black text-slate-500">{fields?.opponentInitials || '?'}</span>}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold hover:border-jso-blue">
              <ImagePlus size={15}/>{uploadingLogo ? 'Téléversement…' : fields?.opponentLogoUrl ? 'Remplacer' : 'Ajouter le logo'}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploadingLogo || !fields} onChange={(e) => { uploadOpponentLogo(e.target.files?.[0]); e.target.value = '' }}/>
            </label>
          </div>
          <p className="mt-2 text-xs text-slate-400">Le logo est enregistré sur le match et réutilisé partout (fiche match, billet…). PNG, JPG ou WebP · 10 Mo max.</p>
        </div>

        <label className="block text-sm font-bold">Prix affiché
          <input value={priceText} onChange={(e) => setPriceText(e.target.value)} placeholder="5 DT" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-jso-blue"/>
        </label>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={download} disabled={!fields} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-jso-blue disabled:opacity-50"><Download size={16}/> Télécharger l’image</button>
          <button type="button" onClick={saveToMatch} disabled={!fields || busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-jso-blue disabled:opacity-50"><Save size={16}/>{saving ? 'Enregistrement…' : 'Enregistrer sur le match'}</button>
          {fields?.ticketArtworkUrl && <button type="button" onClick={clearArtwork} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={15}/> Retirer le visuel enregistré</button>}
          <button type="button" onClick={() => loadMatches()} className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"><RefreshCw size={14}/> Actualiser les matchs</button>
        </div>
        {savedUrl && <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">Visuel enregistré et associé au match. Il sera utilisé partout où le billet du match est affiché.</p>}
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-500">Aperçu</p>
          {fields?.ticketArtworkUrl && <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600"><ImagePlus size={12}/> Visuel déjà enregistré</span>}
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <canvas ref={canvasRef} width={TICKET_WIDTH} height={TICKET_HEIGHT} className="block w-full" style={{ aspectRatio: `${TICKET_WIDTH} / ${TICKET_HEIGHT}` }} />
        </div>
        {!fields && <p className="mt-3 text-sm text-slate-400">Sélectionnez un match pour générer l’aperçu.</p>}
      </div>
    </div>
  </div>
}
