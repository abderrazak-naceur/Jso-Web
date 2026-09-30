export default function PlayerPortrait({ player }) {
  const name = [player.firstName, player.lastName].filter(Boolean).join(' ') || 'Joueur JSO'
  const hasPhoto = Boolean(player.photoUrl)
  // Local portraits (/players/*.webp) are background-removed cutouts: show them whole,
  // anchored to the bottom, instead of cropping them like a regular photo.
  const isCutout = String(player.photoUrl || '').startsWith('/players/')
  const position = String(player.position || 'Équipe première')

  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(255,216,61,.2),transparent_32%),linear-gradient(180deg,rgba(255,255,255,.15),rgba(7,23,51,.08))]" aria-hidden="true" />

      {hasPhoto ? (
        <img
          src={player.photoUrl}
          alt={name}
          loading="lazy"
          decoding="async"
          className={`relative z-10 h-full w-full transition duration-700 group-hover:scale-[1.025] ${isCutout ? 'object-contain object-bottom' : 'object-cover object-[50%_18%]'}`}
        />
      ) : (
        <div className="relative z-10 grid h-full place-items-center bg-gradient-to-br from-slate-100 via-white to-slate-200 px-6 text-center">
          <div>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-slate-200 bg-white text-jso-blue shadow-sm">
              <span className="text-xl font-black">JSO</span>
            </div>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-jso-blue">Portrait officiel</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">Photo à publier</p>
          </div>
        </div>
      )}

      <div className="absolute left-4 top-4 z-20 grid h-10 min-w-10 place-items-center rounded-xl bg-white/95 px-2 text-lg font-black text-jso-gold shadow-md ring-1 ring-slate-200">
        {player.shirtNumber ?? '—'}
      </div>

      <div className="absolute right-4 top-4 z-20 rounded-lg bg-jso-navy px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wide text-white shadow-md">
        {position.slice(0, 1)}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-black/25 to-transparent" aria-hidden="true" />
    </div>
  )
}
