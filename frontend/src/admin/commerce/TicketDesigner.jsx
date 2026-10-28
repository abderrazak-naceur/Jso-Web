import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, RefreshCw, RotateCcw, Ticket, Trash2 } from 'lucide-react'
import { adminApi } from '../api'
import { useConfirm } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import { CREST_SRC, CLUB_NAME } from '../../features/site/brand'
import { slugifyMatchPart } from '../../features/site/publicRoutes'
import TicketEditor from './ticket-designer/TicketEditor'
import {
  activeArtboard,
  addLayer,
  createDesignDocument,
  createImageLayer,
  createQrLayer,
  createShapeLayer,
  createTextLayer,
  duplicateLayer,
  moveLayer,
  normalizeDesignDocument,
  removeLayer,
  updateLayer,
} from './ticket-designer/document'
import useEditorHistory from './ticket-designer/useEditorHistory'
import { uploadMedia } from './ticket-designer/media'

const read = (match, pascal, camel) => match?.[pascal] ?? match?.[camel]

function matchFields(match) {
  if (!match) return null
  const isHome = Boolean(read(match, 'IsHome', 'isHome'))
  const opponentName = String(read(match, 'OpponentName', 'opponentName') || 'Adversaire')
  const kickoffAt = read(match, 'KickoffAt', 'kickoffAt')
  return {
    id: read(match, 'Id', 'id'),
    seasonId: read(match, 'SeasonId', 'seasonId'),
    competitionId: read(match, 'CompetitionId', 'competitionId'),
    teamId: read(match, 'TeamId', 'teamId'),
    isHome,
    opponentName,
    opponentLogoUrl: String(read(match, 'OpponentLogoUrl', 'opponentLogoUrl') || ''),
    ticketArtworkUrl: String(read(match, 'TicketArtworkUrl', 'ticketArtworkUrl') || ''),
    kickoffAt,
    venue: String(read(match, 'Venue', 'venue') || 'Stade Oudhref'),
    status: read(match, 'Status', 'status') || 'Scheduled',
    isPublished: Boolean(read(match, 'IsPublished', 'isPublished')),
    homeScore: read(match, 'HomeScore', 'homeScore') ?? null,
    awayScore: read(match, 'AwayScore', 'awayScore') ?? null,
  }
}

function labelForMatch(match) {
  const fields = matchFields(match)
  const date = fields?.kickoffAt ? new Date(fields.kickoffAt).toLocaleDateString('fr-FR', { dateStyle: 'short' }) : '—'
  return `${fields?.isHome ? '🏠 JSO' : '✈ Ext.'} — ${fields?.opponentName || 'Adversaire'} · ${date}`
}

function matchRequest(match, overrides = {}) {
  const fields = matchFields(match)
  return {
    seasonId: fields.seasonId,
    competitionId: fields.competitionId,
    teamId: fields.teamId,
    opponentName: fields.opponentName,
    opponentLogoUrl: fields.opponentLogoUrl || null,
    ticketArtworkUrl: fields.ticketArtworkUrl || null,
    kickoffAt: fields.kickoffAt,
    venue: fields.venue || null,
    isHome: fields.isHome,
    homeScore: fields.homeScore,
    awayScore: fields.awayScore,
    status: fields.status,
    isPublished: fields.isPublished,
    ...overrides,
  }
}

export default function TicketDesignerModule({ onError }) {
  const confirm = useConfirm()
  const toast = useToast()
  const stageRef = useRef(null)
  const initialDocument = useMemo(() => createDesignDocument(), [])
  const history = useEditorHistory(initialDocument)
  const [matches, setMatches] = useState([])
  const [matchId, setMatchId] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('match') || '' } catch { return '' }
  })
  const [selectedId, setSelectedId] = useState(null)
  const [savedSignature, setSavedSignature] = useState(JSON.stringify(initialDocument))
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [publishedArtwork, setPublishedArtwork] = useState('')
  const [fontsReady, setFontsReady] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)

  const match = useMemo(() => matches.find((item) => String(read(item, 'Id', 'id')) === String(matchId)), [matches, matchId])
  const fields = useMemo(() => matchFields(match), [match])
  const signature = useMemo(() => JSON.stringify(history.document), [history.document])
  const dirty = signature !== savedSignature

  useEffect(() => {
    if (!document.getElementById('jso-ticket-editor-fonts')) {
      const link = document.createElement('link')
      link.id = 'jso-ticket-editor-fonts'
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;600;700;800&family=Oswald:wght@500;600;700&display=swap'
      document.head.appendChild(link)
    }
    if (!document.fonts) { setFontsReady(true); return }
    Promise.all([
      document.fonts.load('400 40px "Archivo Black"'),
      document.fonts.load('700 32px Oswald'),
      document.fonts.load('600 24px Inter'),
    ]).finally(() => setFontsReady(true))
  }, [])

  const publicUrl = useMemo(() => {
    if (!fields?.id) return `${window.location.origin}/matchs`
    const opponent = slugifyMatchPart(fields.opponentName)
    return `${window.location.origin}/matchs/${opponent ? `jso-vs-${opponent}-` : ''}${fields.id}`
  }, [fields])

  const context = useMemo(() => {
    if (!fields) return {}
    const kickoff = fields.kickoffAt ? new Date(fields.kickoffAt) : null
    const date = kickoff && Number.isFinite(kickoff.getTime())
      ? kickoff.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
      : 'Date à confirmer'
    const time = kickoff && Number.isFinite(kickoff.getTime())
      ? kickoff.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : ''
    return {
      id: fields.id,
      clubName: CLUB_NAME,
      clubShortName: 'JSO',
      clubLogoUrl: CREST_SRC,
      opponentName: fields.opponentName,
      opponentLogoUrl: fields.opponentLogoUrl,
      homeTeam: fields.isHome ? CLUB_NAME : fields.opponentName,
      awayTeam: fields.isHome ? fields.opponentName : CLUB_NAME,
      kickoffDate: date,
      kickoffTime: time,
      kickoffDateTime: time ? `${date} · ${time}` : date,
      venue: fields.venue,
      publicUrl,
      _fontRevision: fontsReady ? 1 : 0,
    }
  }, [fields, publicUrl, fontsReady])

  async function loadMatches(preferredId) {
    const list = await adminApi('/admin/matches')
    const sorted = (Array.isArray(list) ? list : []).slice().sort((a, b) => {
      const first = new Date(read(a, 'KickoffAt', 'kickoffAt') || 0).getTime()
      const second = new Date(read(b, 'KickoffAt', 'kickoffAt') || 0).getTime()
      return first - second
    })
    setMatches(sorted)
    const wanted = preferredId || matchId
    const exists = sorted.some((item) => String(read(item, 'Id', 'id')) === String(wanted))
    if (!exists && sorted[0]) setMatchId(read(sorted[0], 'Id', 'id'))
    return sorted
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    loadMatches().catch((error) => { if (active) onError(error.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
    // Initial match selection is intentionally read once from the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!fields?.id) return undefined
    const controller = new AbortController()
    setLoading(true)
    setSelectedId(null)
    adminApi(`/admin/matches/${encodeURIComponent(fields.id)}/ticket-design`, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return
        const document = normalizeDesignDocument(result?.document || createDesignDocument('stadium-night', context))
        history.reset(document)
        setSavedSignature(JSON.stringify(document))
        setPublishedArtwork(result?.ticketArtworkUrl || fields?.ticketArtworkUrl || '')
        onError('')
      })
      .catch((error) => { if (!controller.signal.aborted) onError(error.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
    // history.reset is stable; fields artwork is only a legacy fallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields?.id])

  useEffect(() => {
    const artboard = activeArtboard(history.document)
    if (selectedId && !artboard.layers.some((layer) => layer.id === selectedId)) setSelectedId(null)
  }, [history.document, selectedId])

  useEffect(() => {
    function warn(event) {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // Debounced background save, like a design tool. It never blocks dragging;
  // if the document changes while a request is running, the older signature
  // is saved and the new state schedules another pass.
  useEffect(() => {
    if (!dirty || !fields?.id || loading || busy) return undefined
    const document = history.document
    const documentSignature = signature
    const timer = window.setTimeout(async () => {
      setAutoSaving(true)
      try {
        await adminApi(`/admin/matches/${fields.id}/ticket-design`, {
          method: 'PUT',
          body: JSON.stringify({ document }),
        })
        setSavedSignature(documentSignature)
        onError('')
      } catch (error) {
        onError(error.message)
      } finally {
        setAutoSaving(false)
      }
    }, 2200)
    return () => window.clearTimeout(timer)
  }, [signature, dirty, fields?.id, loading, busy])

  async function selectMatch(nextId) {
    if (nextId === matchId) return
    if (dirty && !await confirm({ title: 'Changer de match ?', message: 'Les modifications non enregistrées seront perdues.', confirmLabel: 'Changer de match', danger: true })) return
    setMatchId(nextId)
    const url = new URL(window.location.href)
    url.searchParams.set('match', nextId)
    window.history.replaceState({}, '', url.pathname + url.search)
  }

  function patchLayer(layerId, patch) {
    history.commit((document) => updateLayer(document, layerId, patch))
  }

  function addAndSelect(layer) {
    history.commit((document) => addLayer(document, layer))
    setSelectedId(layer.id)
  }

  function addText() {
    const board = activeArtboard(history.document)
    addAndSelect(createTextLayer('Nouveau texte', 'Votre texte', board.width * 0.12, board.height * 0.22))
  }

  function addShape() {
    const board = activeArtboard(history.document)
    addAndSelect(createShapeLayer('Nouvelle forme', board.width * 0.15, board.height * 0.25))
  }

  function addQr() {
    const board = activeArtboard(history.document)
    addAndSelect(createQrLayer(board.width * 0.35, board.height * 0.25))
  }

  async function addImage(file) {
    if (!file) return
    setBusy(true)
    try {
      const url = await uploadMedia(file, `Visuel billet - ${file.name}`, 'Élément ajouté dans le designer de billets')
      const board = activeArtboard(history.document)
      addAndSelect(createImageLayer(file.name, url, board.width * 0.18, board.height * 0.2))
      toast.success('Image ajoutée au visuel.')
      onError('')
    } catch (error) { onError(error.message) }
    finally { setBusy(false) }
  }

  async function replaceLayerImage(layerId, file) {
    if (!file) return
    setBusy(true)
    try {
      const url = await uploadMedia(file, `Visuel billet - ${file.name}`, 'Image remplacée dans le designer de billets')
      patchLayer(layerId, { source: { kind: 'url', url } })
      toast.success('Image du calque remplacée.')
      onError('')
    } catch (error) { onError(error.message) }
    finally { setBusy(false) }
  }

  async function replaceOpponentLogo(file) {
    if (!file || !match) return
    setBusy(true)
    try {
      const url = await uploadMedia(file, `Logo adversaire - ${fields.opponentName}`, `Logo de ${fields.opponentName}`)
      await adminApi(`/admin/matches/${fields.id}`, { method: 'PUT', body: JSON.stringify(matchRequest(match, { opponentLogoUrl: url })) })
      setMatches((current) => current.map((item) => String(read(item, 'Id', 'id')) === String(fields.id) ? { ...item, opponentLogoUrl: url, OpponentLogoUrl: url } : item))
      toast.success('Logo adversaire enregistré.')
      onError('')
    } catch (error) { onError(error.message) }
    finally { setBusy(false) }
  }

  async function changePreset(presetId) {
    if (dirty && !await confirm({ title: 'Changer de modèle ?', message: 'Le nouveau modèle remplacera tous les calques actuels. Enregistrez d’abord si vous souhaitez les conserver.', confirmLabel: 'Remplacer le modèle', danger: true })) return
    const document = createDesignDocument(presetId, context)
    history.commit(document)
    setSelectedId(null)
  }

  async function saveDesign(showToast = true) {
    if (!fields?.id) return false
    setBusy(true)
    try {
      const result = await adminApi(`/admin/matches/${fields.id}/ticket-design`, {
        method: 'PUT',
        body: JSON.stringify({ document: history.document }),
      })
      const normalized = normalizeDesignDocument(result.document)
      setSavedSignature(JSON.stringify(normalized))
      if (showToast) toast.success('Projet du visuel enregistré.')
      onError('')
      return true
    } catch (error) {
      onError(error.message)
      return false
    } finally { setBusy(false) }
  }

  async function download() {
    setBusy(true)
    try {
      const board = activeArtboard(history.document)
      const blob = await stageRef.current?.exportBlob('image/png', 1)
      if (!blob) throw new Error('Le canevas n’est pas prêt.')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `jso-${slugifyMatchPart(fields?.opponentName || 'match')}-${board.formatId}.png`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success('Visuel téléchargé.')
      onError('')
    } catch (error) { onError(error.message) }
    finally { setBusy(false) }
  }

  async function publish() {
    if (!fields?.id) return
    setBusy(true)
    try {
      if (dirty) {
        const designResult = await adminApi(`/admin/matches/${fields.id}/ticket-design`, {
          method: 'PUT',
          body: JSON.stringify({ document: history.document }),
        })
        setSavedSignature(JSON.stringify(normalizeDesignDocument(designResult.document)))
      }
      const blob = await stageRef.current?.exportBlob('image/jpeg', 0.94)
      if (!blob) throw new Error('Le canevas n’est pas prêt.')
      const filename = `visuel-match-jso-${slugifyMatchPart(fields.opponentName) || fields.id}.jpg`
      const url = await uploadMedia(blob, filename, 'Visuel promotionnel du match JSO')
      await adminApi(`/admin/matches/${fields.id}/ticket-artwork`, { method: 'PUT', body: JSON.stringify({ url }) })
      setPublishedArtwork(url)
      setMatches((current) => current.map((item) => String(read(item, 'Id', 'id')) === String(fields.id) ? { ...item, ticketArtworkUrl: url, TicketArtworkUrl: url } : item))
      toast.success('Visuel publié sur la fiche du match.')
      onError('')
    } catch (error) { onError(error.message) }
    finally { setBusy(false) }
  }

  async function clearDesign() {
    if (!fields?.id || !await confirm({ title: 'Effacer le projet modifiable ?', message: 'Tous les calques et réglages enregistrés seront supprimés. Le visuel déjà publié restera en ligne.', confirmLabel: 'Effacer le projet', danger: true })) return
    setBusy(true)
    try {
      await adminApi(`/admin/matches/${fields.id}/ticket-design`, { method: 'DELETE' })
      const document = createDesignDocument('stadium-night', context)
      history.reset(document)
      setSavedSignature(JSON.stringify(document))
      setSelectedId(null)
      toast.success('Projet modifiable effacé.')
      onError('')
    } catch (error) { onError(error.message) }
    finally { setBusy(false) }
  }

  async function clearPublishedArtwork() {
    if (!fields?.id || !await confirm({ title: 'Retirer le visuel publié ?', message: 'Le visuel ne sera plus proposé sur la fiche publique du match. Le projet modifiable sera conservé.', confirmLabel: 'Retirer le visuel', danger: true })) return
    setBusy(true)
    try {
      await adminApi(`/admin/matches/${fields.id}/ticket-artwork`, { method: 'PUT', body: JSON.stringify({ url: null }) })
      setPublishedArtwork('')
      toast.success('Visuel public retiré.')
      onError('')
    } catch (error) { onError(error.message) }
    finally { setBusy(false) }
  }

  if (loading && !matches.length) return <div className="grid min-h-64 place-items-center rounded-3xl border border-slate-200 bg-white text-sm font-bold text-slate-500">Chargement du designer…</div>

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-jso-blue"><Ticket size={15} /> Visuel promotionnel</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Designer du match</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Composez l’affiche du match avec des calques déplaçables. Le QR ouvre la page de la rencontre. Le billet numérique d’entrée conserve son QR personnel et sécurisé.</p>
          </div>
          <button type="button" onClick={() => loadMatches(matchId)} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:border-jso-blue disabled:opacity-40"><RefreshCw size={15} /> Actualiser</button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-end">
          <label className="text-xs font-black uppercase tracking-wide text-slate-500">Match
            <select value={matchId} onChange={(event) => selectMatch(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none focus:border-jso-blue">
              {!matches.length && <option value="">Aucun match</option>}
              {matches.map((item) => <option key={read(item, 'Id', 'id')} value={read(item, 'Id', 'id')}>{labelForMatch(item)}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-jso-blue"><ImagePlus size={15} />{fields?.opponentLogoUrl ? 'Remplacer le logo adverse' : 'Ajouter le logo adverse'}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy || !fields} onChange={(event) => { replaceOpponentLogo(event.target.files?.[0]); event.target.value = '' }} /></label>
            <button type="button" onClick={clearDesign} disabled={busy || !fields} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:border-red-300 hover:text-red-700 disabled:opacity-40"><RotateCcw size={15} /> Réinitialiser</button>
            {publishedArtwork && <button type="button" onClick={clearPublishedArtwork} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-3 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-40"><Trash2 size={15} /> Retirer le visuel publié</button>}
          </div>
        </div>
        {publishedArtwork && <p className="mt-3 text-xs font-semibold text-emerald-700">✓ Un visuel est actuellement publié pour ce match.</p>}
      </section>

      {fields ? <TicketEditor
        document={history.document}
        context={context}
        selectedId={selectedId}
        dirty={dirty}
        autoSaving={autoSaving}
        busy={busy || loading}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        zoom={zoom}
        onSelect={setSelectedId}
        onPatchLayer={patchLayer}
        onReplaceImage={replaceLayerImage}
        onMoveLayer={(id, direction) => history.commit((document) => moveLayer(document, id, direction))}
        onDuplicateLayer={(id) => history.commit((document) => duplicateLayer(document, id))}
        onDeleteLayer={(id) => history.commit((document) => removeLayer(document, id))}
        onVariables={(variables) => history.commit((document) => ({ ...document, variables }))}
        onPreset={changePreset}
        onArtboard={(id) => { history.commit((document) => ({ ...document, activeArtboardId: id })); setSelectedId(null) }}
        onUndo={history.undo}
        onRedo={history.redo}
        onAddText={addText}
        onAddShape={addShape}
        onAddQr={addQr}
        onAddImage={addImage}
        onZoom={setZoom}
        onSave={() => saveDesign(true)}
        onDownload={download}
        onPublish={publish}
        stageRef={stageRef}
      /> : <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">Sélectionnez un match pour commencer.</div>}
    </div>
  )
}
