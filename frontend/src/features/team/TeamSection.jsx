import { Users } from 'lucide-react'
import SectionHeading from '../home/SectionHeading'
import { SectionError, SectionLoading } from '../home/SectionState'
import PlayerPortrait from './PlayerPortrait'

function normalizePosition(position) {
  const value = String(position || '').toLowerCase()
  if (value.includes('gard') || value.includes('keeper')) return 'Gardiens'
  if (value.includes('déf') || value.includes('def')) return 'Défenseurs'
  if (value.includes('mil')) return 'Milieux'
  if (value.includes('att')) return 'Attaquants'
  return 'Effectif'
}

function sortPlayers(players) {
  const order = { Gardiens: 1, Défenseurs: 2, Milieux: 3, Attaquants: 4, Effectif: 5 }
  return [...players].sort((a, b) => {
    const group = order[normalizePosition(a.position)] - order[normalizePosition(b.position)]
    if (group !== 0) return group
    return (a.shirtNumber ?? 999) - (b.shirtNumber ?? 999)
  })
}

export default function TeamSection({ section, players, status = 'ready' }) {
  const roster = sortPlayers(players).slice(0, 18)
  const groups = ['Gardiens', 'Défenseurs', 'Milieux', 'Attaquants', 'Effectif']
    .map((label) => ({ label, players: roster.filter((player) => normalizePosition(player.position) === label) }))
    .filter((group) => group.players.length > 0)

  return (
    <section id="team" aria-labelledby="team-title" className="overflow-hidden border-y border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
        <SectionHeading
          section={section}
          title="Les visages"
          muted="de la JSO."
          description="Un effectif, une identité. Retrouvez les joueurs de l’équipe première, présentés avec une direction photo homogène et pensée pour le club."
        />
        {status === 'loading' ? (
          <div className="mt-10"><SectionLoading message="Chargement de l’effectif…" /></div>
        ) : status === 'error' ? (
          <div className="mt-10"><SectionError message="L’effectif est momentanément indisponible." /></div>
        ) : roster.length > 0 ? (
          <div className="mt-12 space-y-14">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="mb-5 flex items-center gap-4">
                  <span className="h-px flex-1 bg-slate-200" />
                  <h3 className="shrink-0 text-xs font-black uppercase tracking-[0.2em] text-jso-blue">{group.label}</h3>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                  {group.players.map((player) => (
                    <article key={player.id} className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-jso-navy shadow-lg shadow-slate-300/25 transition duration-300 hover:-translate-y-1 hover:shadow-2xl">
                      <PlayerPortrait player={player} />
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-12 overflow-hidden rounded-[2rem] bg-jso-navy p-8 text-white sm:p-10">
            <Users size={32} className="text-jso-gold" aria-hidden="true" />
            <h3 className="mt-8 text-3xl font-black">Équipe première</h3>
            <p className="mt-2 max-w-lg text-white/65">Les profils officiels des joueurs seront publiés ici.</p>
          </div>
        )}
      </div>
    </section>
  )
}
