// Shared loading / error placeholders for the data-driven home sections.
//
// Mirrors the conventions already used by MatchdaySection and NewsSection so
// every section distinguishes "still loading" and "request failed" from a
// genuinely empty result — instead of collapsing all three into a "coming
// soon" placeholder. French copy, no exclamation marks.

export function SectionLoading({ message = 'Chargement…', className = '' }) {
  return (
    <div
      role="status"
      className={`rounded-[2rem] border border-slate-200 bg-white p-8 font-semibold text-slate-500 ${className}`}
    >
      {message}
    </div>
  )
}

export function SectionError({
  message = 'Contenu momentanément indisponible.',
  className = '',
}) {
  return (
    <div
      role="alert"
      className={`rounded-[2rem] border border-amber-200 bg-amber-50 p-8 font-semibold text-amber-900 ${className}`}
    >
      {message}
    </div>
  )
}
