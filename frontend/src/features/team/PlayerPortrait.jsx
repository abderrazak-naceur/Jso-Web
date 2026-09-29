import { UserRound } from 'lucide-react'

export default function PlayerPortrait({ player }) {
  const name = [player.firstName, player.lastName].filter(Boolean).join(' ') || 'Joueur JSO'
  const hasPhoto = Boolean(player.photoUrl)

  return (
    <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-jso-navy via-jso-blue/70 to-jso-navy">
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 50% 12%, rgba(255,215,0,.28), transparent 34%), linear-gradient(180deg, rgba(7,26,58,.05), rgba(7,26,58,.72))' }} aria-hidden="true" />
      {hasPhoto ? (
        <img src={player.photoUrl} alt={name} loading="lazy" decoding="async" className="relative z-10 h-full w-full object-cover object-[50%_22%] transition duration-700 group-hover:scale-[1.025]" />
      ) : (
        <div className="relative z-10 grid h-full place-items-center px-6 text-center">
          <div>
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-white/20 bg-white/10 text-white/80 backdrop-blur-sm">
              <UserRound size={38} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-jso-gold">Portrait officiel</p>
            <p className="mt-2 text-xs font-semibold text-white/65">Photo à publier</p>
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 z-20 h-1/2 bg-gradient-to-t from-jso-navy via-jso-navy/65 to-transparent" aria-hidden="true" />
      {player.shirtNumber != null && <span className="absolute right-4 top-4 z-30 grid h-11 min-w-11 place-items-center rounded-full border border-jso-gold/50 bg-jso-navy/80 px-2 text-lg font-black text-jso-gold backdrop-blur-md">{player.shirtNumber}</span>}
      <div className="absolute inset-x-5 bottom-5 z-30">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-jso-gold">{player.position || 'Équipe première'}</p>
        <h3 className="mt-1 text-2xl font-black leading-none tracking-tight text-white">{player.firstName} {player.lastName}</h3>
      </div>
    </div>
  )
}
