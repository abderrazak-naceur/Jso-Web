export const FUNDRAISING_TEMPLATES = [
  { id: 'bus', title: 'Bus / Transport', suggestedTitle: 'Un bus pour la JSO', description: 'Un autocar pour accompagner l’équipe en déplacement.', imageUrl: '/jso-bus-campaign.png' },
  { id: 'equipment', title: 'Équipement sportif', description: 'Des équipements pour les joueurs et la formation.', imageUrl: '/jersey.svg' },
  { id: 'travel', title: 'Déplacements', description: 'Ensemble, soutenons les rencontres à l’extérieur.', imageUrl: '/img/Jso-match-amicale/843190992_4297039220440877_3342635851119423872_n.jpg' },
  { id: 'facilities', title: 'Installations', description: 'Améliorons les lieux qui font vivre notre club.', imageUrl: '/jso-stadium-hero.png' },
  { id: 'custom', title: 'Créez le vôtre', description: 'Votre objectif, votre image et votre histoire.', imageUrl: '/jso-stadium-hero.png' },
]
export const MONTHLY_AMOUNTS = [5, 10, 20, 30, 50]
export const PLAN_MONTHS = 10
export const fundraisingMoney = value => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', currencyDisplay: 'code', minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(Number(value) || 0)
export const projectImage = project => project?.imageUrl || FUNDRAISING_TEMPLATES.find(item => item.id === project?.templateId)?.imageUrl || FUNDRAISING_TEMPLATES[0].imageUrl
export const planTotal = amount => MONTHLY_AMOUNTS.includes(Number(amount)) ? Number(amount) * PLAN_MONTHS : 0
