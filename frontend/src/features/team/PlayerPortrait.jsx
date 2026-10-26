import { useEffect, useMemo, useState } from 'react'
import { Shield, UserRound } from 'lucide-react'
import { resolvePlayerPhoto } from './playerPhoto'

export default function PlayerPortrait({ player }) {
  const name = [player.firstName, player.lastName].filter(Boolean).join(' ') || 'Joueur JSO'
  const primaryPhoto = resolvePlayerPhoto(player)
  const localPhotos = useMemo(() => {
    const slug = [player?.firstName, player?.lastName]
      .filter(Boolean)
      .join(' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return slug ? [\`/players/\${slug}.webp\`, \`/players/\${slug}.png\`, \`/players/\${slug}.svg\`] : []
  }, [player?.firstName, player?.lastName])
  const photoCandidates = useMemo(
    () => [...new Set([primaryPhoto, ...localPhotos].filter(Boolean))],
    [primaryPhoto, localPhotos],
  )
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [failedCandidates, setFailedCandidates] = useState([])
  useEffect(() => {
    setCandidateIndex(0)
    setFailedCandidates([])
  }, [primaryPhoto, localPhotos])
  const photoUrl = photoCandidates[candidateIndex]
  const hasPhoto = Boolean(photoUrl) && !failedCandidates.includes(photoUrl)
  const position = String(player.position || 'Équipe première')
  const initials = [player.firstName, player.lastName].filter(Boolean).map((part) => part.trim()[0]).join('').slice(0, 2).toUpperCase() || 'JS'

  function handlePhotoError() {
    setFailedCandidates((previous) => [...previous, photoUrl])
    if (candidateIndex + 1 < photoCandidates.length) setCandidateIndex((index) => index + 1)
  }

  return (
    <div className="relative aspect-[4/5] min-h-[260px] overflow-hidden bg-jso-navy sm:min-h-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,rgba(255,216,61,.24),transparent_45%),linear-gradient(145deg,rgba(30,78,138,.75),transparent_55%)]" aria-hidden="true" />
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-white/10" aria-hidden="true" />
      <div className="absolute -right-2 -top-2 h-24 w-24 rounded-full border border-jso-gold/20" aria-hidden="true" />

      {hasPhoto ? (
        <img
          src={photoUrl}
          onError={handlePhotoError}
          alt={`Portrait de ${name}`}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className="relative z-10 h-full w-full scale-100 object-contain object-bottom p-0 drop-shadow-[0_18px_14px_rgba(0,0,0,.28)] transition duration-500 sm:p-1.5 group-hover:drop-shadow-[0_20px_18px_rgba(255,216,61,.18)]"
        />
      ) : (
        <div className="relative z-10 grid h-full place-items-center px-6 text-center">
          <div className="relative grid h-28 w-28 place-items-center rounded-full border border-jso-gold/50 bg-white/10 shadow-2xl shadow-black/20 backdrop-blur-sm">
            <div className="absolute inset-2 rounded-full border border-white/20" aria-hidden="true" />
            <span className="text-3xl font-black tracking-tight text-white">{initials}</span>
            <span className="absolute -bottom-2 grid h-8 w-8 place-items-center rounded-full bg-jso-gold text-jso-navy shadow-lg"><Shield size={16} aria-hidden="true" /></span>
          </div>
          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.24em] text-jso-gold">Jeunesse Sportive</p>
          <p className="mt-1 text-xs font-semibold text-white/65">Oudhref · JSO</p>
          <UserRound className="mt-4 text-white/30" size={18} aria-hidden="true" />
        </div>
      )}

      <div className="absolute left-4 top-4 z-20 grid h-11 min-w-11 place-items-center rounded-xl border border-white/30 bg-jso-navy/85 px-2 text-lg font-black text-jso-gold shadow-lg backdrop-blur">
        {player.shirtNumber ?? '—'}
      </div>

      <div className="absolute right-4 top-4 z-20 rounded-lg border border-white/20 bg-white/95 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-jso-navy shadow-md">
        {position}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 h-28 bg-gradient-to-t from-jso-navy/90 via-jso-navy/30 to-transparent" aria-hidden="true" />
      {hasPhoto && (
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/90">
          <span className="h-1.5 w-1.5 rounded-full bg-jso-gold" aria-hidden="true" />
          Effectif JSO
        </div>
      )}
    </div>
  )
}
