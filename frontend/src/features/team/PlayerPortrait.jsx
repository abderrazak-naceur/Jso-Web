import { useState } from 'react'
import { isCutoutPhoto, resolvePlayerPhoto } from './playerPhoto'

function positionCode(position) {
  const value = String(position || '').toLowerCase()
  if (value.includes('gard') || value.includes('keeper')) return 'GB'
  if (value.includes('déf') || value.includes('def')) return 'DEF'
  if (value.includes('mil')) return 'MIL'
  if (value.includes('att')) return 'ATT'
  return 'JSO'
}

export default function PlayerPortrait({ player }) {
  const [failed, setFailed] = useState(false)
  const firstName = String(player.firstName || '').trim()
  const lastName = String(player.lastName || '').trim()
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Joueur JSO'
  const number = player.shirtNumber ?? '—'
  const code = positionCode(player.position)
  const photoUrl = resolvePlayerPhoto(player)
  const hasPhoto = Boolean(photoUrl) && !failed
  const photoCredit = player.photoCredit || (
    hasPhoto && photoUrl.includes('wikimedia.org') ? 'Wikimedia Commons' : ''
  )
  const isCutout = isCutoutPhoto(photoUrl)

  return (
    <div className="relative aspect-[3/4] overflow-hidden bg-jso-navy text-white">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, rgba(255,215,0,.22), transparent 55%), linear-gradient(165deg, #0e2a5e 0%, #071a3a 55%, #040f24 100%)',
        }}
      />
      <div
        className="absolute -right-16 -top-16 h-56 w-56 rotate-12 bg-jso-gold/15"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-20 -left-16 h-56 w-56 -rotate-12 bg-jso-blue/20"
        aria-hidden="true"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-2 top-8 select-none text-[7rem] font-black leading-none tracking-tighter text-white/10"
      >
        {number}
      </span>

      <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4">
        <div className="text-center">
          <p className="text-3xl font-black leading-none text-jso-gold">{number}</p>
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.2em] text-white/80">{code}</p>
        </div>
        <img src="/jso-club-mark.svg" alt="" aria-hidden="true" className="h-11 w-auto drop-shadow-lg" loading="lazy" />
      </div>

      <div className="absolute inset-x-0 top-[4.5rem] bottom-[5.5rem] z-10 flex items-end justify-center px-6">
        {hasPhoto ? (
          <img
            src={photoUrl}
            onError={() => setFailed(true)}
            alt={fullName}
            loading="lazy"
            decoding="async"
            className={`h-full w-auto max-w-full drop-shadow-[0_18px_28px_rgba(0,0,0,.45)] transition duration-700 group-hover:scale-[1.03] ${isCutout ? 'object-contain object-bottom' : 'rounded-b-[2rem] object-cover object-top'}`}
            style={{ maskImage: 'linear-gradient(180deg, black 82%, transparent 100%)', WebkitMaskImage: 'linear-gradient(180deg, black 82%, transparent 100%)' }}
          />
        ) : (
          <svg viewBox="0 0 200 190" role="img" aria-label={'Maillot JSO — ' + fullName} className="h-full w-auto drop-shadow-[0_18px_28px_rgba(0,0,0,.45)]">
            <path d="M62 22 L86 8 L100 16 L114 8 L138 22 L162 52 L146 68 L136 58 L136 172 Q100 182 64 172 L64 58 L54 68 L38 52 Z" fill="#ffd700" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="3" />
            <path d="M86 8 L100 16 L114 8 L108 30 L92 30 Z" fill="#071a3a" />
            <path d="M100 16 L100 178" stroke="#071a3a" strokeWidth="8" opacity="0.9" />
            <path d="M64 58 L136 58" stroke="#071a3a" strokeWidth="3" opacity="0.35" />
            <circle cx="100" cy="52" r="17" fill="#071a3a" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2" />
            <text x="100" y="60" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="19" fontWeight="900" fill="#ffd700">
              {String(number)}
            </text>
            <text x="100" y="150" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="900" letterSpacing="3" fill="#071a3a" opacity="0.75">
              JSO
            </text>
          </svg>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20">
        <div className="h-1 bg-gradient-to-r from-transparent via-jso-gold to-transparent" aria-hidden="true" />
        <div className="bg-gradient-to-t from-black/70 via-[#071a3a]/85 to-transparent px-4 pb-4 pt-6 text-center">
          <p className="truncate text-[11px] font-black uppercase tracking-[0.24em] text-jso-gold">
            {code} · JSO
          </p>
          <h3 className="mt-1 truncate text-xl font-black uppercase tracking-tight text-white">
            {lastName || firstName || 'Joueur JSO'}
          </h3>
          {lastName && firstName && (
            <p className="truncate text-sm font-semibold text-white/70">{firstName}</p>
          )}
          {photoCredit && (
            <p className="mt-1 truncate text-[10px] font-medium text-white/45">Photo : {photoCredit} (CC)</p>
          )}
        </div>
      </div>
    </div>
  )
}
