export const HOME_TEMPLATES = [
  {
    id: 'classic',
    name: 'Classique JSO',
    badge: 'Classique',
    description: 'Présentation traditionnelle du club, équilibrée entre équipe, matchs et actualités.',
    preview: 'classic',
    sectionOrder: ['hero', 'selling-band', 'matches', 'news', 'team', 'media', 'club', 'events', 'shop', 'donation', 'memberships', 'community', 'sponsors', 'archive', 'mobile', 'infos', 'highlights', 'app-download'],
  },
  {
    id: 'modern-2026',
    name: 'Modern 2026',
    badge: 'Moderne',
    description: 'Accueil lumineux avec les contenus importants, les résultats et les actions du club.',
    preview: 'modern',
    sectionOrder: ['hero', 'highlights', 'matches', 'news', 'media', 'team', 'club', 'events', 'shop', 'donation', 'memberships', 'community', 'sponsors', 'archive', 'mobile', 'infos', 'selling-band', 'app-download'],
  },
  {
    id: 'stadium',
    name: 'Stadium',
    badge: 'Jour de match',
    description: 'Les matchs, résultats et médias du club passent au premier plan.',
    preview: 'stadium',
    sectionOrder: ['hero', 'matches', 'selling-band', 'highlights', 'media', 'news', 'team', 'events', 'club', 'sponsors', 'shop', 'donation', 'memberships', 'community', 'archive', 'mobile', 'infos', 'app-download'],
  },
  {
    id: 'magazine',
    name: 'Club Magazine',
    badge: 'Éditorial',
    description: 'Mise en avant des actualités, des photos et de la mémoire du club.',
    preview: 'magazine',
    sectionOrder: ['hero', 'news', 'highlights', 'archive', 'media', 'club', 'team', 'matches', 'events', 'sponsors', 'community', 'shop', 'donation', 'memberships', 'mobile', 'infos', 'selling-band', 'app-download'],
  },
  {
    id: 'premium-2026',
    name: 'JSO Premium 2026',
    badge: 'Premium',
    description: 'Une expérience haut de gamme bleu nuit et or, pensée pour les supporters, les abonnements, la billetterie et les partenaires.',
    preview: 'premium',
    sectionOrder: ['hero', 'highlights', 'matches', 'memberships', 'selling-band', 'news', 'shop', 'team', 'media', 'events', 'sponsors', 'community', 'donation', 'club', 'archive', 'infos', 'mobile', 'app-download'],
  },
]

export const HOME_TEMPLATE_IDS = new Set(HOME_TEMPLATES.map(({ id }) => id))

export const HOME_LAYOUT_TYPE_TO_SECTION = {
  Hero: 'hero',
  Highlights: 'highlights',
  SellingBand: 'selling-band',
  AppDownload: 'app-download',
  News: 'news',
  Matches: 'matches',
  Media: 'media',
  Sponsors: 'sponsors',
}

export function getHomeTemplate(id) {
  return HOME_TEMPLATES.find((template) => template.id === id) || HOME_TEMPLATES[1]
}
