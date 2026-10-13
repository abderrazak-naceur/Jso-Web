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
    id: 'academy',
    name: 'Académie & Formation',
    badge: 'Jeunes',
    description: 'Une homepage familiale qui met en avant les équipes, la formation et la vie du club.',
    preview: 'academy',
    sectionOrder: ['hero', 'team', 'club', 'events', 'matches', 'highlights', 'news', 'media', 'community', 'memberships', 'donation', 'sponsors', 'shop', 'archive', 'infos', 'mobile', 'app-download', 'selling-band'],
  },
  {
    id: 'supporters',
    name: 'Supporters',
    badge: 'Communauté',
    description: 'Une entrée chaleureuse centrée sur les supporters, les événements et les façons de soutenir la JSO.',
    preview: 'supporters',
    sectionOrder: ['hero', 'community', 'events', 'matches', 'selling-band', 'highlights', 'news', 'memberships', 'donation', 'shop', 'media', 'team', 'sponsors', 'club', 'archive', 'mobile', 'infos', 'app-download'],
  },
  {
    id: 'matchday',
    name: 'Matchday',
    badge: 'Résultats',
    description: 'Un format énergique pour suivre les rencontres, les temps forts et les prochaines dates.',
    preview: 'matchday',
    sectionOrder: ['hero', 'matches', 'highlights', 'events', 'media', 'team', 'selling-band', 'news', 'community', 'sponsors', 'shop', 'memberships', 'donation', 'archive', 'club', 'infos', 'mobile', 'app-download'],
  },
  {
    id: 'heritage',
    name: 'Héritage',
    badge: 'Depuis 1973',
    description: 'Un style intemporel qui raconte l’histoire du club, ses archives et ses générations de joueurs.',
    preview: 'heritage',
    sectionOrder: ['hero', 'club', 'archive', 'team', 'news', 'media', 'highlights', 'matches', 'events', 'community', 'memberships', 'sponsors', 'donation', 'shop', 'infos', 'mobile', 'selling-band', 'app-download'],
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
