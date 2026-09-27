// Single source of truth for the public one-page site: order of the sections on
// the home page, header/footer navigation and the "01 / …" numbering.
// `primary` items are shown directly in the header, the others under "Plus".
export const SITE_SECTIONS = [
  { id: 'matches', label: 'Matchs', eyebrow: 'MATCHDAY', primary: true },
  { id: 'news', label: 'Actualités', eyebrow: 'NEWSROOM', primary: true },
  { id: 'team', label: 'Équipe', eyebrow: 'ÉQUIPE', primary: true },
  { id: 'club', label: 'Le Club', eyebrow: 'LE CLUB', primary: true },
  { id: 'shop', label: 'Boutique', eyebrow: 'BOUTIQUE', primary: true },
  { id: 'media', label: 'Médias', eyebrow: 'MEDIA HOUSE' },
  { id: 'events', label: 'Agenda', eyebrow: 'AGENDA' },
  { id: 'community', label: 'Communauté', eyebrow: 'COMMUNAUTÉ' },
  { id: 'archive', label: 'Musée', eyebrow: 'MUSÉE' },
  { id: 'mobile', label: 'App mobile', eyebrow: 'APP MOBILE' },
  { id: 'sponsors', label: 'Partenaires', eyebrow: 'PARTENAIRES' },
  { id: 'infos', label: 'Infos pratiques', eyebrow: 'INFOS PRATIQUES' },
]

// Keeps only the sections that will actually render (`visibility[id] === false`
// hides one) and numbers them in page order, so menus never point to nothing.
export function visibleSections(visibility) {
  return SITE_SECTIONS
    .filter((section) => visibility[section.id] !== false)
    .map((section, index) => ({ ...section, number: String(index + 1).padStart(2, '0') }))
}

// CMS eyebrows were seeded with a fixed number ("02 / LE CLUB"): strip it so the
// numbering always follows the real order of the page.
export function eyebrowText(value, fallback) {
  const text = String(value || '').replace(/^\s*\d+\s*\/\s*/, '').trim()
  return text || fallback
}
