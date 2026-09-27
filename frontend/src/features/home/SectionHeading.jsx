export default function SectionHeading({ section, title, muted, eyebrow, description, light = false, action }) {
  const headingId = `${section.id}-title`

  return (
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className={`text-xs font-extrabold tracking-[0.22em] ${light ? 'text-jso-gold' : 'text-jso-blue'}`}>
          {section.number} / {eyebrow || section.eyebrow}
        </p>
        <h2 id={headingId} className={`mt-3 text-4xl font-black tracking-[-0.035em] sm:text-5xl lg:text-6xl ${light ? 'text-white' : 'text-jso-ink'}`}>
          {title} {muted && <span className={light ? 'text-white/45' : 'text-slate-400'}>{muted}</span>}
        </h2>
        {description && <p className={`mt-4 max-w-2xl text-base leading-7 ${light ? 'text-white/65' : 'text-slate-600'}`}>{description}</p>}
      </div>
      {action}
    </div>
  )
}
