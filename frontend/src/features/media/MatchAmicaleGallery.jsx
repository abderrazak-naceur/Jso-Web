import { ArrowUpRight, Camera } from 'lucide-react'
import { MATCH_AMICALE_PHOTOS } from './matchAmicalePhotos'

export default function MatchAmicaleGallery() {
  return (
    <section aria-labelledby="match-amicale-gallery-title" className="mt-16">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-jso-blue">
            <Camera size={15} aria-hidden="true" /> Dans les coulisses
          </p>
          <h3 id="match-amicale-gallery-title" className="mt-2 text-3xl font-black tracking-tight text-jso-navy sm:text-4xl">
            Le match, en images.
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Quelques instants de jeu et de vie d’équipe lors d’un match amical de la JSO.
          </p>
        </div>
        <span className="text-xs font-bold text-slate-400">Photos du club</span>
      </div>

      <div className="grid auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[190px] sm:grid-cols-4 sm:gap-4">
        {MATCH_AMICALE_PHOTOS.map((photo, index) => (
          <a
            key={photo.file}
            href={photo.src}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${photo.alt} Ouvrir la photo en grand format (nouvel onglet).`}
            className={`group relative isolate overflow-hidden rounded-2xl bg-jso-navy shadow-lg shadow-slate-900/10 focus-visible:outline-jso-blue ${index === 0 ? 'col-span-2 row-span-2 min-h-[220px]' : ''}`}
          >
            <img
              src={photo.src}
              alt={photo.alt}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-jso-navy/85 via-transparent to-transparent opacity-80 transition group-hover:opacity-100" aria-hidden="true" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 sm:p-4">
              <span className="text-xs font-extrabold text-white sm:text-sm">{photo.caption}</span>
              <ArrowUpRight size={16} className="shrink-0 text-jso-gold" aria-hidden="true" />
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
