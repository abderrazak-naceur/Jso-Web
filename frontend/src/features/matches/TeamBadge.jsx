import { CREST_SRC } from '../site/brand'
import { teamInitials } from './matchUtils'

export default function TeamBadge({ team, compact = false, dark = false }) {
  const size = compact ? 'h-14 w-14 rounded-2xl' : 'h-20 w-20 rounded-[1.5rem] sm:h-24 sm:w-24'

  if (team.isClub) {
    return (
      <span className={`grid ${size} place-items-center`} aria-hidden="true">
        <img src={CREST_SRC} alt="" className="h-[85%] w-[85%] object-contain drop-shadow-lg" />
      </span>
    )
  }

  return (
    <span className={`grid ${size} place-items-center border text-base font-black ${dark ? 'border-white/15 bg-white/10 text-white' : 'border-slate-200 bg-slate-50 text-slate-500'}`} aria-hidden="true">
      {teamInitials(team.name)}
    </span>
  )
}
