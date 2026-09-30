import { ArrowUpRight, Play, Sparkles } from 'lucide-react'
import { pick } from '../../lib/format'
import SectionHeading from '../home/SectionHeading'
import { SectionError, SectionLoading } from '../home/SectionState'

export default function MediaSection({ section, media, status = 'ready' }) {
  const featured = media.slice(0, 3)

  return (
    <section id="media" aria-labelledby="media-title" className="border-y border-slate-200 bg-white/45">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHeading section={section} title="Voir, vivre," muted="partager." description="Photos, vidéos et moments forts de la communauté JSO." />
        {status === 'loading' ? (
          <div className="mt-10"><SectionLoading message="Chargement des médias…" /></div>
        ) : status === 'error' ? (
          <div className="mt-10"><SectionError message="Les médias sont momentanément indisponibles." /></div>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featured.length > 0 ? featured.map((item, index) => {
              const url = pick(item, 'url', 'Url')
              const thumbnail = pick(item, 'thumbnailUrl', 'ThumbnailUrl')
              const title = pick(item, 'title', 'Title') || 'Média JSO'
              const caption = pick(item, 'caption', 'Caption')
              const type = pick(item, 'type', 'Type') || 'Image'
              const isVideo = /video/i.test(type)

              return (
                <article key={pick(item, 'id', 'Id') || url || title} className={'group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg shadow-slate-200/40 ' + (index === 0 ? 'md:col-span-2 lg:col-span-2' : '')}>
                  <div className={'relative overflow-hidden bg-jso-navy ' + (index === 0 ? 'h-72' : 'h-60')}>
                    {(thumbnail || (!isVideo && url))
                      ? <img src={thumbnail || url} alt={caption || title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      : <div className="grid h-full place-items-center"><span className="text-5xl font-black text-jso-gold">JSO</span></div>}
                    {isVideo && <span className="absolute left-5 top-5 grid h-12 w-12 place-items-center rounded-full bg-jso-gold text-jso-navy"><Play size={20} fill="currentColor" aria-hidden="true" /></span>}
                  </div>
                  <div className="p-6">
                    <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-jso-blue">{type}</p>
                    <h3 className="mt-2 text-2xl font-black">{title}</h3>
                    {caption && <p className="mt-2 text-sm leading-6 text-slate-500">{caption}</p>}
                    {url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-jso-blue">Ouvrir<span className="sr-only"> (nouvel onglet)</span> <ArrowUpRight size={15} aria-hidden="true" /></a>}
                  </div>
                </article>
              )
            }) : (
              <div className="relative flex min-h-72 items-end overflow-hidden rounded-[2rem] bg-gradient-to-br from-jso-navy to-jso-blue p-8 text-white md:col-span-2 lg:col-span-3">
                <Sparkles className="absolute right-10 top-10 text-jso-gold/30" size={80} aria-hidden="true" />
                <div><p className="text-xs font-extrabold tracking-[0.2em] text-jso-gold">GALERIE JSO</p><h3 className="mt-3 text-3xl font-black">Les couleurs du club.</h3><p className="mt-2 text-white/65">Les prochains contenus photo et vidéo seront publiés ici.</p></div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
