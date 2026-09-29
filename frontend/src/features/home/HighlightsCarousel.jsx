import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react'

// Premium horizontal "À la une" carousel for the public home, mirroring the
// mobile app. Uses native CSS scroll-snap so it swipes on touch and scrolls
// with the arrow buttons on desktop; the active card is tracked to drive the
// pagination dots. Cards carry real club content (match, news, boutique,
// memberships) built by the caller.
//
// Each item: { key, badge, title, subtitle, cta, imageUrl?, onSelect }.
export default function HighlightsCarousel({ items }) {
  const trackRef = useRef(null)
  const cardRefs = useRef([])
  const [active, setActive] = useState(0)

  // Track which card is closest to the viewport centre for the dots.
  const onScroll = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const centre = track.scrollLeft + track.clientWidth / 2
    let best = 0
    let bestDist = Infinity
    cardRefs.current.forEach((card, index) => {
      if (!card) return
      const cardCentre = card.offsetLeft + card.offsetWidth / 2
      const dist = Math.abs(cardCentre - centre)
      if (dist < bestDist) {
        bestDist = dist
        best = index
      }
    })
    setActive(best)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return undefined
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => track.removeEventListener('scroll', onScroll)
  }, [onScroll])

  function scrollToCard(index) {
    const clamped = Math.min(Math.max(0, index), items.length - 1)
    cardRefs.current[clamped]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }

  if (!items || items.length === 0) return null

  return (
    <section aria-label="À la une" className="border-b border-slate-200 bg-white/45">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-jso-blue">À la une</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Le club en un coup d’œil</h2>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scrollToCard(active - 1)}
              disabled={active === 0}
              aria-label="Précédent"
              className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 text-jso-navy transition hover:border-jso-blue hover:text-jso-blue disabled:opacity-40"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollToCard(active + 1)}
              disabled={active === items.length - 1}
              aria-label="Suivant"
              className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 text-jso-navy transition hover:border-jso-blue hover:text-jso-blue disabled:opacity-40"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, index) => (
            <button
              key={item.key}
              type="button"
              ref={(el) => { cardRefs.current[index] = el }}
              onClick={item.onSelect}
              className={`group relative flex aspect-[16/10] w-[85%] shrink-0 snap-center overflow-hidden rounded-[2rem] text-left shadow-xl shadow-slate-300/40 transition duration-300 sm:w-[70%] lg:w-[46%] ${index === active ? 'opacity-100' : 'opacity-80'}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-jso-blue to-jso-navy" aria-hidden="true" />
              {item.imageUrl && (
                <img src={item.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-jso-navy/92 via-jso-navy/45 to-jso-navy/10" aria-hidden="true" />
              <div className="relative mt-auto flex w-full flex-col p-6 sm:p-8">
                <span className="w-fit rounded-full bg-jso-gold px-3 py-1 text-[11px] font-black uppercase tracking-[0.15em] text-jso-navy">{item.badge}</span>
                <h3 className="mt-4 text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl">{item.title}</h3>
                <p className="mt-1 text-sm font-bold text-jso-gold">{item.subtitle}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-white">
                  {item.cta} <ArrowUpRight size={16} aria-hidden="true" />
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-2 flex justify-center gap-2">
          {items.map((item, index) => (
            <button
              key={item.key}
              type="button"
              onClick={() => scrollToCard(index)}
              aria-label={`Aller à la carte ${index + 1}`}
              aria-current={index === active}
              className={`h-2 rounded-full transition-all ${index === active ? 'w-6 bg-jso-blue' : 'w-2 bg-slate-300'}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
