import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Ticket, Download, Save, RefreshCw, Trash2, ImagePlus } from 'lucide-react'
import { API_BASE_URL } from '../../lib/apiConfig'
import { CREST_SRC } from '../../features/site/brand'
import { teamInitials } from '../../features/matches/matchUtils'
import { slugifyMatchPart } from '../../features/site/publicRoutes'
import { TICKET_TEMPLATES, TICKET_WIDTH, TICKET_HEIGHT, paintTicket } from './ticketTemplates'

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

// Upload an image to the persistent media microservice, same endpoint the
// match admin already uses. Returns the public absolute URL.
async function uploadArtwork(blob, filename) {
  const token = localStorage.getItem('jso_admin_token')
  if (!token) throw new Error('Session administrateur expirée. Reconnectez-vous.')
  const data = new FormData()
  data.append('file', blob, filename)
  data.append('title', filename)
  data.append('caption', 'Visuel de billet généré depuis le designer')
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
function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
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

export default function TicketDesignerModule({ onError }) {
  const [matches, setMatches] = useState([])
  const [matchId, setMatchId] = useState('')
  const [templateId, setTemplateId] = useState(TICKET_TEMPLATES[0].id)
  const [priceText, setPriceText] = useState('5 DT')
  const [saving, setSaving] = useState(false)
  const [savedUrl, setSavedUrl] = useState('')
  const canvasRef = useRef(null)
  // Preloaded images kept in a ref so repainting doesn't reload them every time.
  const imagesRef = useRef({ crest: null, opponent: null, qr: null, background: null, forMatch: null })
  const [imagesReady, setImagesReady] = useState(0)

  async function loadMatches() {
    try {
      const list = await api('/admin/matches')
      const sorted = (Array.isArray(list) ? list : []).slice().sort((a, b) => {
        const ta = read(a, 'KickoffAt', 'kickoffAt') ? new Date(read(a, 'KickoffAt', 'kickoffAt')).getTime() : Infinity
        const tb = read(b, 'KickoffAt', 'kickoffAt') ? new Date(read(b, 'KickoffAt', 'kickoffAt')).getTime() : Infinity
        return ta - tb
      })
      setMatches(sorted)
      if (!matchId && sorted[0]) setMatchId(read(sorted[0], 'Id', 'id'))
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

  // Preload all images whenever the selected match changes.
  useEffect(() => {
    let active = true
    setSavedUrl('')
    async function preload() {
      const [crest, opponent, qr, background] = await Promise.all([
        loadImage(CREST_SRC),
        loadImage(fields?.opponentLogoUrl || ''),
        QRCode.toDataURL(publicUrl, { width: 320, margin: 1, errorCorrectionLevel: 'M' }).then(loadImage).catch(() => null),
        loadImage(fields?.ticketArtworkUrl || ''),
      ])
      if (!active) return
      imagesRef.current = { crest, opponent, qr, background, forMatch: fields?.id }
      setImagesReady((n) => n + 1)
    }
    if (fields) preload()
    return () => { active = false }
  }, [fields, publicUrl])

  // Repaint the canvas on any change to the template, match or price.
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
    })
  }, [fields, templateId, priceText])

  useEffect(() => { repaint() }, [repaint, imagesReady])

  function exportBlob(type = 'image/jpeg', quality = 0.92) {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current
      if (!canvas) { reject(new Error('Aperçu indisponible.')); return }
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Impossible de générer l’image.')), type, quality)
    })
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
      const url = await uploadArtwork(blob, `billet-${fields.opponentName}.jpg`)
      const body = {
        seasonId: read(match, 'SeasonId', 'seasonId'),
        competitionId: read(match, 'CompetitionId', 'competitionId'),
        teamId: read(match, 'TeamId', 'teamId'),
        opponentName: fields.opponentName,
        opponentLogoUrl: fields.opponentLogoUrl || null,
        ticketArtworkUrl: url,
        kickoffAt: fields.kickoffAt,
        venue: read(match, 'Venue', 'venue') || null,
        isHome: fields.isHome,
        homeScore: read(match, 'HomeScore', 'homeScore') ?? null,
        awayScore: read(match, 'AwayScore', 'awayScore') ?? null,
        status: read(match, 'Status', 'status') || 'Scheduled',
        isPublished: Boolean(read(match, 'IsPublished', 'isPublished')),
      }
      await api('/admin/matches/' + fields.id, { method: 'PUT', body: JSON.stringify(body) })
      setSavedUrl(url)
      await loadMatches()
      onError('')
    } catch (e) { onError(e.message) }
    finally { setSaving(false) }
  }

  async function clearArtwork() {
    if (!match || !fields) return
    if (!window.confirm('Retirer le visuel de billet enregistré pour ce match ?')) return
    setSaving(true)
    try {
      const body = {
        seasonId: read(match, 'SeasonId', 'seasonId'),
        competitionId: read(match, 'CompetitionId', 'competitionId'),
        teamId: read(match, 'TeamId', 'teamId'),
        opponentName: fields.opponentName,
        opponentLogoUrl: fields.opponentLogoUrl || null,
        ticketArtworkUrl: null,
        kickoffAt: fields.kickoffAt,
        venue: read(match, 'Venue', 'venue') || null,
        isHome: fields.isHome,
        homeScore: read(match, 'HomeScore', 'homeScore') ?? null,
        awayScore: read(match, 'AwayScore', 'awayScore') ?? null,
        status: read(match, 'Status', 'status') || 'Scheduled',
        isPublished: Boolean(read(match, 'IsPublished', 'isPublished')),
      }
      await api('/admin/matches/' + fields.id, { method: 'PUT', body: JSON.stringify(body) })
      setSavedUrl('')
      await loadMatches()
      onError('')
    } catch (e) { onError(e.message) }
    finally { setSaving(false) }
  }

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2"><Ticket className="text-jso-blue" size={20}/><h2 className="text-xl font-black">Designer de billets</h2></div>
      <p className="mt-1 text-sm text-slate-500">Choisissez un match et un modèle : le logo de l’adversaire, son nom, la date, le stade, le prix et le QR sont composés automatiquement. Enregistrez le visuel sur le match pour l’utiliser en billetterie.</p>
    </div>

    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
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

        <label className="block text-sm font-bold">Prix affiché
          <input value={priceText} onChange={(e) => setPriceText(e.target.value)} placeholder="5 DT" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-jso-blue"/>
        </label>

        {fields && !fields.opponentLogoUrl && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Ce match n’a pas de logo d’adversaire. Les initiales « {fields.opponentInitials} » seront utilisées. Ajoutez le logo dans « Match Center » pour un meilleur rendu.</p>}

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={download} disabled={!fields} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-jso-blue disabled:opacity-50"><Download size={16}/> Télécharger l’image</button>
          <button type="button" onClick={saveToMatch} disabled={!fields || saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-jso-blue disabled:opacity-50"><Save size={16}/>{saving ? 'Enregistrement…' : 'Enregistrer sur le match'}</button>
          {fields?.ticketArtworkUrl && <button type="button" onClick={clearArtwork} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={15}/> Retirer le visuel enregistré</button>}
          <button type="button" onClick={loadMatches} className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"><RefreshCw size={14}/> Actualiser les matchs</button>
        </div>
        {savedUrl && <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">Visuel enregistré et associé au match. Il sera utilisé partout où le billet du match est affiché.</p>}
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-500">Aperçu</p>
          {fields?.ticketArtworkUrl && <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600"><ImagePlus size={12}/> Visuel déjà enregistré</span>}
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <canvas ref={canvasRef} width={TICKET_WIDTH} height={TICKET_HEIGHT} className="block w-full" style={{ aspectRatio: `${TICKET_WIDTH} / ${TICKET_HEIGHT}` }} />
        </div>
        {!fields && <p className="mt-3 text-sm text-slate-400">Sélectionnez un match pour générer l’aperçu.</p>}
      </div>
    </div>
  </div>
}
