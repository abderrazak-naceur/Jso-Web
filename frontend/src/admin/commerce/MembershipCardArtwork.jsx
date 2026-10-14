import { useEffect, useState } from 'react'
import { ImagePlus, Save, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react'
import { adminApi } from '../api'
import { API_BASE_URL } from '../../lib/apiConfig'
import { useRef } from 'react'

const SETTINGS_KEY = 'membership_card_artwork'
const DEFAULTS = {
  front: 'https://d2ol7oe51mr4n9.cloudfront.net/user_3DuYKVhdmNmMSAGu9ckyEmyckau/3493cf9d-f016-4ba7-beba-6961d763af26.png',
  back: 'https://d2ol7oe51mr4n9.cloudfront.net/user_3DuYKVhdmNmMSAGu9ckyEmyckau/86cf1566-e2fa-4aee-a76e-77045d22aeb0.png',
}

export default function MembershipCardArtwork({ onError = () => {} }) {
  const [artwork, setArtwork] = useState(DEFAULTS)
  const [files, setFiles] = useState({ front: null, back: null })
  const [previews, setPreviews] = useState(DEFAULTS)
  const previewsRef = useRef(previews)
  previewsRef.current = previews
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    adminApi('/content')
      .then((data) => {
        if (!active) return
        const raw = data?.[SETTINGS_KEY]
        if (!raw) return
        try {
          const value = JSON.parse(raw)
          if (active) {
            const next = { front: value.front || DEFAULTS.front, back: value.back || DEFAULTS.back }
            setArtwork(next)
            setPreviews(next)
          }
        } catch { /* Keep known working defaults if legacy data is malformed. */ }
      })
      .catch((error) => { if (active) onError(error.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => () => {
    Object.values(previewsRef.current).forEach((url) => {
      if (typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url)
    })
  }, [])

  function choose(side, file) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      onError('Choisissez une image JPG, PNG ou WebP.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      onError('La taille maximale par image est de 10 Mo.')
      return
    }
    onError('')
    setSaved(false)
    setFiles((current) => ({ ...current, [side]: file }))
    setPreviews((current) => {
      if (current[side]?.startsWith?.('blob:')) URL.revokeObjectURL(current[side])
      return { ...current, [side]: URL.createObjectURL(file) }
    })
  }

  async function upload(side, file) {
    const body = new FormData()
    body.append('file', file)
    body.append('title', side === 'front' ? 'Carte abonnement JSO — recto' : 'Carte abonnement JSO — verso')
    body.append('caption', side === 'front' ? 'Recto officiel de la carte d’abonnement 2026–2027' : 'Verso officiel de la carte d’abonnement 2026–2027')
    return adminApi('/admin/media/upload', { method: 'POST', body })
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setSaved(false)
    onError('')
    try {
      const next = { ...artwork }
      // Upload only replaced sides so saving one side never overwrites the other.
      for (const side of ['front', 'back']) {
        if (files[side]) {
          const media = await upload(side, files[side])
          next[side] = media.url.startsWith('http') ? media.url : new URL(media.url, API_BASE_URL.replace(/\\/api\\/?$/, '')).toString()
        }
      }
      await adminApi('/admin/content/' + encodeURIComponent(SETTINGS_KEY), {
        method: 'PUT',
        body: JSON.stringify({ value: JSON.stringify(next) }),
      })
      setArtwork(next)
      setPreviews(next)
      setFiles({ front: null, back: null })
      setSaved(true)
    } catch (error) {
      onError(error.message || 'Impossible d’enregistrer les images.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="space-y-6">
    <header>
      <p className="text-xs font-black uppercase tracking-[.16em] text-jso-blue">Contenu du site</p>
      <h2 className="mt-1 text-2xl font-black">Visuels de la carte d’abonnement</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Chargez le recto et le verso séparément. Chaque image possède sa propre prévisualisation ; si vous ne remplacez qu’un côté, l’autre reste inchangé.</p>
    </header>

    <form onSubmit={save} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      {loading && <p role="status" className="mb-4 text-sm text-slate-500">Chargement des images enregistrées…</p>}
      <div className="grid gap-5 lg:grid-cols-2">
        {[
          { side: 'front', label: 'Recto / Fronte', caption: 'Image affichée comme face avant de la carte.' },
          { side: 'back', label: 'Verso / Retro', caption: 'Image affichée comme face arrière de la carte.' },
        ].map(({ side, label, caption }) => (
          <section key={side} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
              <div><h3 className="font-black">{label}</h3><p className="text-xs text-slate-500">{caption}</p></div>
              <span className="rounded-full bg-jso-navy px-3 py-1 text-xs font-bold text-jso-gold">{side === 'front' ? '01' : '02'}</span>
            </div>
            <div className="grid min-h-56 place-items-center bg-[#071440] p-3">
              {previews[side]
                ? <img src={previews[side]} alt={label} className="max-h-80 w-full rounded-lg object-contain" />
                : <div className="text-white/70"><ImagePlus size={34} /><span className="mt-2 block text-sm">Aucune image</span></div>}
            </div>
            <div className="p-4">
              <label className="block text-sm font-bold text-slate-700">
                Sélectionner le {side === 'front' ? 'recto' : 'verso'}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choose(side, event.target.files?.[0])} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-jso-navy file:px-3 file:py-2 file:font-bold file:text-white" />
              </label>
              <p className="mt-2 text-xs text-slate-500">JPG, PNG ou WebP · maximum 10 Mo{files[side] ? ' · ' + files[side].name : ''}</p>
              {files[side] && <p className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={14} />Nouvelle image prête à enregistrer</p>}
            </div>
          </section>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
        <button disabled={saving || loading || (!files.front && !files.back)} className="inline-flex items-center gap-2 rounded-xl bg-jso-navy px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"><Save size={17} />{saving ? 'Enregistrement…' : 'Enregistrer les deux faces'}</button>
        <button type="button" onClick={() => { setFiles({ front: null, back: null }); setPreviews(artwork); setSaved(false); onError('') }} disabled={saving || (!files.front && !files.back)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 disabled:opacity-50">Annuler les changements</button>
        {saved && <span role="status" className="text-sm font-bold text-emerald-700">Images enregistrées.</span>}
      </div>
      <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertTriangle size={16} className="mt-0.5 shrink-0" />L’upload utilise la Media Library de l’API. Sur Render, les fichiers stockés dans le système local du conteneur peuvent disparaître lors d’un redéploiement si aucun disque persistant ou stockage externe n’est configuré.</p>
    </form>
  </div>
}
