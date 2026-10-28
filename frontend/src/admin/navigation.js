import { LayoutDashboard, Trophy, CreditCard, UserRound, Wallet, HeartHandshake, ShoppingBag, Receipt, Handshake, QrCode, Users, CalendarDays, Radio, BarChart3, HeartPulse, ScanSearch, ListChecks, Newspaper, CalendarClock, Images, Pencil, PartyPopper, FileText, HelpCircle, MessageSquare, BrickWall, Megaphone, Mail, ClipboardList, GraduationCap, CalendarRange, ShieldCheck, Flag, Gauge, ShieldAlert, Server, Ticket, Landmark, Banknote } from 'lucide-react'

// Seven stable workspaces replace the long accordion navigation. Existing
// section IDs and URLs stay unchanged; a workspace is only an information-
// architecture layer that groups related modules into contextual tabs.
export const ADMIN_WORKSPACES = Object.freeze([
  { id: 'home', label: 'Accueil', shortLabel: 'Accueil', Icon: LayoutDashboard, sections: ['dashboard'] },
  { id: 'sport', label: 'Matchs & équipe', shortLabel: 'Matchs', Icon: Trophy, sections: ['matches', 'match-events', 'match-sheet', 'formations', 'teams', 'seasons-competitions', 'match-streams', 'analytics', 'injuries', 'scouting', 'checklist'] },
  { id: 'ticketing', label: 'Billetterie', shortLabel: 'Billets', Icon: Ticket, sections: ['tickets', 'ticket-designer', 'memberships'] },
  { id: 'content', label: 'Contenu', shortLabel: 'Contenu', Icon: Newspaper, sections: ['news', 'editorial', 'media', 'homepage-templates', 'content', 'club-events', 'documents', 'faq', 'archive'] },
  { id: 'community', label: 'Communauté', shortLabel: 'Communauté', Icon: Users, sections: ['fan-accounts', 'community-moderation', 'fan-photos', 'supporters', 'classifieds', 'anniversaries', 'newsletter', 'volunteers', 'community', 'facilities'] },
  { id: 'commerce', label: 'Commerce & finances', shortLabel: 'Commerce', Icon: Wallet, sections: ['finance', 'fundraising-projects', 'donations', 'cash-donations', 'shop', 'orders', 'sponsors', 'sponsorqr'] },
  { id: 'settings', label: 'Configuration', shortLabel: 'Réglages', Icon: Server, sections: ['club', 'security', 'featureflags', 'apiusage', 'gdpr', 'settings'] },
])
export const ADMIN_NAVIGATION = [
    ['dashboard', 'Dashboard', LayoutDashboard, ['SuperAdmin','ClubAdmin','Editor','MatchManager','CommunityManager','ShopManager'], 'Tableau de bord'],
    ['fan-accounts', 'Profils supporters', UserRound, ['SuperAdmin','ClubAdmin','CommunityManager'], 'Communauté'],

    ['tickets', 'Billetterie', Ticket, ['SuperAdmin','ClubAdmin','MatchManager','TicketSeller','TicketSupervisor'], 'Billetterie & Abonnements'],
    ['ticket-designer', 'Designer de billets', Ticket, ['SuperAdmin','ClubAdmin','MatchManager'], 'Billetterie & Abonnements'],
    ['memberships', 'Abonnements', CreditCard, ['SuperAdmin','ClubAdmin','SeasonManager'], 'Billetterie & Abonnements'],
    ['finance', 'Finances', Wallet, ['SuperAdmin','ClubAdmin','FinanceManager'], 'Finances & dons'],
    ['fundraising-projects', 'Objectifs de collecte de fonds', Flag, ['SuperAdmin','ClubAdmin','FinanceManager'], 'Finances & dons'],
    ['donations', 'Dons & collecte', HeartHandshake, ['SuperAdmin','ClubAdmin','FinanceManager'], 'Finances & dons'],
    ['cash-donations', 'Dons en espèces', Banknote, ['SuperAdmin','ClubAdmin','FinanceManager','ShopManager','TicketSeller','TicketSupervisor'], 'Finances & dons'],

    ['shop', 'Boutique', ShoppingBag, ['SuperAdmin','ClubAdmin','ShopManager'], 'Boutique & partenaires'],
    ['orders', 'Commandes', Receipt, ['SuperAdmin','ClubAdmin','ShopManager'], 'Boutique & partenaires'],
    ['sponsors', 'Sponsors', Handshake, ['SuperAdmin','ClubAdmin'], 'Boutique & partenaires'],
    ['sponsorqr', 'QR Sponsors', QrCode, ['SuperAdmin','ClubAdmin'], 'Boutique & partenaires'],

    ['matches', 'Match Center', Trophy, ['SuperAdmin','ClubAdmin','MatchManager'], 'Équipe & Matchs'],
    ['match-events', 'Événements de match', Trophy, ['SuperAdmin','ClubAdmin','MatchManager'], 'Équipe & Matchs'],
    ['match-sheet', 'Feuille de match', ClipboardList, ['SuperAdmin','ClubAdmin','MatchManager'], 'Équipe & Matchs'],
    ['formations', 'Formations', Users, ['SuperAdmin','ClubAdmin','MatchManager'], 'Équipe & Matchs'],
    ['teams', 'Équipes & joueurs', Users, ['SuperAdmin','ClubAdmin'], 'Équipe & Matchs'],
    ['seasons-competitions', 'Saisons & compétitions', CalendarDays, ['SuperAdmin','ClubAdmin'], 'Équipe & Matchs'],
    ['match-streams', 'Diffusion en direct', Radio, ['SuperAdmin','ClubAdmin','MatchManager'], 'Équipe & Matchs'],
    ['analytics', 'Analytics joueurs', BarChart3, ['SuperAdmin','ClubAdmin','MatchManager'], 'Équipe & Matchs'],
    ['injuries', 'Infirmerie', HeartPulse, ['ClubAdmin','MatchManager'], 'Équipe & Matchs'],
    ['scouting', 'Scouting', ScanSearch, ['ClubAdmin','MatchManager'], 'Équipe & Matchs'],
    ['checklist', 'Check-list match', ListChecks, ['ClubAdmin','MatchManager'], 'Équipe & Matchs'],

    ['news', 'News CMS', Newspaper, ['SuperAdmin','ClubAdmin','Editor'], 'Contenu & Site'],
    ['editorial', 'Calendrier éditorial', CalendarClock, ['Editor','ClubAdmin'], 'Contenu & Site'],
    ['media', 'Médias', Images, ['SuperAdmin','ClubAdmin','Editor'], 'Contenu & Site'],
    ['homepage-templates', 'Template homepage', LayoutDashboard, ['SuperAdmin','ClubAdmin'], 'Contenu & Site'],
    ['content', 'Contenus', Pencil, ['SuperAdmin','ClubAdmin','Editor'], 'Contenu & Site'],
    ['club-events', 'Agenda du club', PartyPopper, ['SuperAdmin','ClubAdmin','Editor'], 'Contenu & Site'],
    ['documents', 'Documents', FileText, ['SuperAdmin','ClubAdmin','Editor'], 'Contenu & Site'],
    ['faq', 'FAQ', HelpCircle, ['SuperAdmin','ClubAdmin','Editor'], 'Contenu & Site'],
    ['archive', 'Musée · Archives', Landmark, ['SuperAdmin','ClubAdmin','Editor'], 'Contenu & Site'],

    ['community-moderation', 'Communauté · Modération', MessageSquare, ['ClubAdmin','CommunityManager'], 'Communauté'],
    ['fan-photos', 'Photos supporters', Images, ['CommunityManager','Editor'], 'Communauté'],
    ['supporters', 'Mur des supporters', BrickWall, ['ClubAdmin','CommunityManager'], 'Communauté'],
    ['classifieds', 'Petites annonces', Megaphone, ['ClubAdmin','CommunityManager'], 'Communauté'],
    ['anniversaries', 'Anniversaires', PartyPopper, ['ClubAdmin','CommunityManager'], 'Communauté'],
    ['newsletter', 'Newsletter', Mail, ['Editor','CommunityManager'], 'Communauté'],
    ['volunteers', 'Bénévoles', ClipboardList, ['ClubAdmin','MatchManager'], 'Communauté'],
    ['community', 'Écoles & partenaires', GraduationCap, ['ClubAdmin','CommunityManager'], 'Communauté'],
    ['facilities', 'Installations', CalendarRange, ['ClubAdmin','MatchManager'], 'Communauté'],

    ['club', 'Club Settings', ShieldCheck, ['SuperAdmin','ClubAdmin'], 'Système'],
    ['security', 'Sécurité', ShieldCheck, ['SuperAdmin'], 'Système'],
    ['featureflags', 'Feature flags', Flag, ['SuperAdmin','ClubAdmin'], 'Système'],
    ['apiusage', 'Utilisation API', Gauge, ['SuperAdmin','ClubAdmin'], 'Système'],
    ['gdpr', 'RGPD', ShieldAlert, ['SuperAdmin','ClubAdmin'], 'Système'],
    ['settings', 'Configuration', Server, ['SuperAdmin','ClubAdmin'], 'Système'],
]
export const ADMIN_PERMISSION_BY_ID = Object.freeze({
  dashboard: 'dashboard:view',
  'fan-accounts': 'community:moderate',
  tickets: 'tickets:admin',
  'ticket-designer': 'tickets:admin',
  memberships: 'memberships:manage',
  finance: 'finance:view',
  'fundraising-projects': 'finance:view',
  donations: 'finance:view',
  'cash-donations': 'donations:cash',
  shop: 'shop:manage',
  orders: 'orders:manage',
  sponsors: 'sponsors:manage',
  sponsorqr: 'sponsors:qr',
  matches: 'matches:manage',
  'match-events': 'matches:events',
  'match-sheet': 'matches:sheet',
  formations: 'matches:formations',
  teams: 'teams:manage',
  'seasons-competitions': 'competitions:manage',
  'match-streams': 'matches:stream',
  analytics: 'analytics:view',
  injuries: 'medical:manage',
  scouting: 'scouting:manage',
  checklist: 'matches:checklist',
  news: 'content:news',
  editorial: 'content:calendar',
  media: 'content:media',
  'homepage-templates': 'content:manage',
  content: 'content:manage',
  'club-events': 'content:events',
  documents: 'content:documents',
  faq: 'content:faq',
  archive: 'content:archive',
  'community-moderation': 'community:moderate',
  'fan-photos': 'community:photos',
  supporters: 'community:supporters',
  classifieds: 'community:classifieds',
  anniversaries: 'community:anniversaries',
  newsletter: 'community:newsletter',
  volunteers: 'community:volunteers',
  community: 'community:programs',
  facilities: 'facilities:manage',
  club: 'club:manage',
  security: 'security:manage',
  featureflags: 'system:feature-flags',
  apiusage: 'system:api-usage',
  gdpr: 'system:gdpr',
  settings: 'system:settings',
})
export const ADMIN_PUBLIC_PATHS = Object.freeze({
  tickets: '/billetterie',
  'ticket-designer': '/billetterie',
  memberships: '/abonnements',
  donations: '/nos-projets',
  'fundraising-projects': '/nos-projets',
  'cash-donations': '/nos-projets',
  shop: '/boutique',
  orders: '/boutique',
  sponsors: '/partenaires',
  sponsorqr: '/partenaires',
  matches: '/matchs',
  'match-events': '/matchs',
  'match-sheet': '/matchs',
  formations: '/matchs',
  'match-streams': '/matchs',
  analytics: '/matchs',
  injuries: '/matchs',
  scouting: '/matchs',
  checklist: '/matchs',
  teams: '/equipe',
  'seasons-competitions': '/matchs',
  news: '/actualites',
  editorial: '/actualites',
  media: '/medias',
  'homepage-templates': '/',
  content: '/',
  'club-events': '/agenda',
  documents: '/infos',
  faq: '/infos',
  archive: '/musee',
  'fan-accounts': '/communaute',
  'community-moderation': '/communaute',
  'fan-photos': '/communaute',
  supporters: '/communaute',
  classifieds: '/communaute',
  anniversaries: '/communaute',
  newsletter: '/communaute',
  volunteers: '/communaute',
  facilities: '/communaute',
  community: '/communaute',
  club: '/club',
})

export function visibleAdminItems(role, query = '') {
  const search = query.trim().toLocaleLowerCase('fr')
  return ADMIN_NAVIGATION.filter(([id, label, , roles, category]) =>
    roles.includes(role) && Boolean(ADMIN_PERMISSION_BY_ID[id]) &&
    (!search || `${label} ${category} ${id}`.toLocaleLowerCase('fr').includes(search)))
}


const ADMIN_ITEM_BY_ID = new Map(ADMIN_NAVIGATION.map((item) => [item[0], item]))
const ADMIN_WORKSPACE_BY_SECTION = new Map(
  ADMIN_WORKSPACES.flatMap((workspace) => workspace.sections.map((section) => [section, workspace])),
)

export function adminItemById(section) {
  return ADMIN_ITEM_BY_ID.get(section) || null
}

export function adminWorkspaceForSection(section) {
  return ADMIN_WORKSPACE_BY_SECTION.get(section) || null
}

export function adminWorkspaceLabelForSection(section) {
  return adminWorkspaceForSection(section)?.label || ''
}

// Returns only workspaces that contain at least one section visible to the
// current role. Each returned workspace carries its role-filtered `items`, so
// sidebar destinations and tabs can never point to an inaccessible module.
export function visibleAdminWorkspaces(role) {
  const visible = new Map(visibleAdminItems(role).map((item) => [item[0], item]))
  return ADMIN_WORKSPACES
    .map((workspace) => ({
      ...workspace,
      items: workspace.sections.map((id) => visible.get(id)).filter(Boolean),
    }))
    .filter((workspace) => workspace.items.length > 0)
}

export function adminLandingSection(role) {
  const workspaces = visibleAdminWorkspaces(role)
  const home = workspaces.find((workspace) => workspace.id === 'home')
  return home?.items[0]?.[0] || workspaces[0]?.items[0]?.[0] || null
}
