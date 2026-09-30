import { Landmark, Sprout } from 'lucide-react'
import { pick } from '../../lib/format'
import { CLUB_FOUNDED } from '../site/brand'
import { eyebrowText } from '../site/navigation'
import SectionHeading from '../home/SectionHeading'

export default function ClubSection({ section, club, content }) {
  const city = pick(club, 'city', 'City') || 'Oudhref'
  const description = pick(club, 'description', 'Description')

  return (
    <section id="club" aria-labelledby="club-title" className="relative overflow-hidden bg-jso-navy text-white">
      <div className="absolute -right-20 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full border-[70px] border-white/[0.025]" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHeading
          section={section}
          eyebrow={eyebrowText(content.club_eyebrow, section.eyebrow)}
          title={content.club_title || 'Une histoire.'}
          muted={content.club_muted || 'Une ville. Une passion.'}
          description={description || 'La JSO est une identité collective, un lien entre les générations et une ambition pour l’avenir du football à Oudhref.'}
          light
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <article className="rounded-[2rem] border border-white/10 bg-white/5 p-7 backdrop-blur-sm">
            <p className="text-5xl font-black text-jso-gold">{CLUB_FOUNDED}</p>
            <h3 className="mt-8 text-xl font-black">Nos racines</h3>
            <p className="mt-2 text-sm leading-6 text-white/60">Une histoire sportive qui se transmet de génération en génération.</p>
          </article>
          <article className="rounded-[2rem] border border-white/10 bg-white/5 p-7 backdrop-blur-sm">
            <Landmark size={38} className="text-jso-gold" aria-hidden="true" />
            <h3 className="mt-8 text-xl font-black">{city}</h3>
            <p className="mt-2 text-sm leading-6 text-white/60">Un club ancré dans sa ville et porté par toute une communauté.</p>
          </article>
          <article className="rounded-[2rem] border border-white/10 bg-white/5 p-7 backdrop-blur-sm">
            <Sprout size={38} className="text-jso-gold" aria-hidden="true" />
            <h3 className="mt-8 text-xl font-black">La relève</h3>
            <p className="mt-2 text-sm leading-6 text-white/60">Former, accompagner et faire grandir les talents de demain.</p>
          </article>
        </div>
      </div>
    </section>
  )
}
