import { useMemo, useState } from 'react'
import { CalendarDays, Search, UsersRound } from 'lucide-react'
import SectionHeading from '../home/SectionHeading'
import { SectionError, SectionLoading } from '../home/SectionState'
import PlayerPortrait from './PlayerPortrait'

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'Gardiens', label: 'Gardiens' },
  { key: 'Défenseurs', label: 'Défenseurs' },
  { key: 'Milieux', label: 'Milieux' },
  { key: 'Attaquants', label: 'Attaquants' },
]

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

export default function TeamSection({ section, players = [], status = 'ready' }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  const roster = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return sortPlayers(players).filter((player) => {
      const position = normalizePosition(player.position)
      const matchesFilter = filter === 'all' || position === filter
      const name = [player.firstName, player.lastName].filter(Boolean).join(' ').toLowerCase()
      const number = String(player.shirtNumber ?? '')
      const matchesQuery = !normalizedQuery || name.includes(normalizedQuery) || number.includes(normalizedQuery)
      return matchesFilter && matchesQuery
    })
  }, [players, filter, query])

  const count = players.length

  return (
    <section id="team" aria-labelledby="team-title" className="overflow-hidden bg-jso-paper">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 pt-6 lg:px-8">
          <nav aria-label="Fil d’Ariane" className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <a href="#home" className="transition hover:text-jso-navy">Accueil</a>
            <span aria-hidden="true">›</span>
            <span className="text-slate-700">Équipe</span>
          </nav>

          <div className="relative mt-5 min-h-[250px] overflow-hidden rounded-[2rem] bg-white">
            <div
              className="absolute inset-y-0 right-0 w-full bg-cover bg-center opacity-20 sm:w-3/5 sm:opacity-100"
              style={{ backgroundImage: 'url(/team-hero.svg)' }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/25 sm:via-white/90 sm:to-transparent" aria-hidden="true" />
            <div className="relative z-10 flex min-h-[250px] items-center py-10 sm:w-3/5 lg:w-2/3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-jso-blue">Équipe première · Saison 2026/2027</p>
                <h2 id="team-title" className="mt-3 text-5xl font-black tracking-[-0.045em] text-jso-navy sm:text-6xl">
                  Les visages <span className="text-jso-gold">de la JSO</span>
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  Découvrez nos joueurs, notre staff technique et toute la famille JSO.
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-20 -mb-7 mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-200/50">
              {FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={
                    'shrink-0 rounded-xl px-5 py-3 text-sm font-extrabold transition ' +
                    (filter === item.key
                      ? 'bg-jso-navy text-white shadow-md shadow-jso-navy/15'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-jso-navy')
                  }
                >
                  {item.label}
                </button>
              ))}
              <button type="button" disabled className="hidden shrink-0 rounded-xl px-5 py-3 text-sm font-extrabold text-slate-300 xl:block" title="Le staff sera publié dans une prochaine version">
                Staff technique
              </button>
              <button type="button" disabled className="hidden shrink-0 rounded-xl px-5 py-3 text-sm font-extrabold text-slate-300 xl:block" title="La direction sera publiée dans une prochaine version">
                Direction
              </button>
            </div>

            <label className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-200/50 lg:w-80">
              <Search size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
              <span className="sr-only">Rechercher un joueur</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un joueur…"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 pb-20 pt-16 lg:px-8 lg:pb-24">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <SectionHeading
            section={section}
            eyebrow="Effectif officiel"
            title="Une équipe."
            muted="Une identité."
            description="Des portraits homogènes, une présentation claire et une expérience pensée pour suivre l’effectif JSO sur tous les écrans."
          />
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm">
            <CalendarDays size={16} className="text-jso-blue" aria-hidden="true" />
            Saison 2026/2027
          </div>
        </div>

        {status === 'loading' ? (
          <div className="mt-10"><SectionLoading message="Chargement de l’effectif…" /></div>
        ) : status === 'error' ? (
          <div className="mt-10"><SectionError message="L’effectif est momentanément indisponible." /></div>
        ) : (
          <>
            <div className="mt-8 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <p className="text-sm font-bold text-slate-500">
                <span className="text-jso-navy">{roster.length}</span> joueur{roster.length > 1 ? 's' : ''} affiché{roster.length > 1 ? 's' : ''}
                {query || filter !== 'all' ? ' sur ' + count : ''}
              </p>
              {(query || filter !== 'all') && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setFilter('all') }}
                  className="text-sm font-extrabold text-jso-blue hover:underline"
                >
                  Réinitialiser
                </button>
              )}
            </div>

            {roster.length > 0 ? (
              <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {roster.map((player) => (
                  <article
                    key={player.id}
                    className="group overflow-hidden rounded-[1.35rem] border border-jso-navy/30 bg-jso-navy shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-jso-navy/40"
                  >
                    <PlayerPortrait player={player} />
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-7 rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
                <UsersRound className="mx-auto text-jso-blue" size={34} aria-hidden="true" />
                <h3 className="mt-4 text-2xl font-black text-jso-navy">Aucun joueur trouvé</h3>
                <p className="mt-2 text-sm text-slate-500">Modifiez votre recherche ou choisissez une autre catégorie.</p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
