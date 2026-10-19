export const FUNDRAISING_TEMPLATES = [
  { id: 'bus', title: 'Bus / Transport', suggestedTitle: 'Un bus pour la JSO', description: 'Un autocar pour accompagner l’équipe en déplacement.', imageUrl: '/jso-bus-campaign.png' },
  { id: 'equipment', title: 'Équipement sportif', description: 'Des équipements pour les joueurs et la formation.', imageUrl: '/jersey.svg' },
  { id: 'travel', title: 'Déplacements', description: 'Ensemble, soutenons les rencontres à l’extérieur.', imageUrl: '/img/Jso-match-amicale/843190992_4297039220440877_3342635851119423872_n.jpg' },
  { id: 'facilities', title: 'Installations', description: 'Améliorons les lieux qui font vivre notre club.', imageUrl: '/jso-stadium-hero.png' },
  { id: 'custom', title: 'Créez le vôtre', description: 'Votre objectif, votre image et votre histoire.', imageUrl: '/jso-stadium-hero.png' },
]
export const MONTHLY_AMOUNTS = [5, 10, 20, 30, 50]
export const PLAN_MONTHS = 10
export const fundraisingLocale = language => {
  const current = language || (typeof document === 'undefined' ? 'fr' : document.documentElement.lang || 'fr')
  return `${['fr', 'en', 'it', 'ar'].includes(current) ? current : 'fr'}-TN`
}
export const fundraisingMoney = (value, language) => new Intl.NumberFormat(fundraisingLocale(language), { style: 'currency', currency: 'TND', currencyDisplay: 'code', minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(Number(value) || 0)
export const fundraisingDate = (value, language) => value ? new Date(value).toLocaleDateString(fundraisingLocale(language)) : '—'
export const fundraisingPaymentLabel = (amount, language, loading = false) => {
  if (loading) return { fr: 'Redirection…', en: 'Redirecting…', it: 'Reindirizzamento…', ar: 'جارٍ التوجيه…' }[language] || 'Redirection…'
  const formatted = fundraisingMoney(amount, language)
  return { fr: `Régler ${formatted}`, en: `Pay ${formatted}`, it: `Paga ${formatted}`, ar: `ادفع ${formatted}` }[language] || `Régler ${formatted}`
}
export const fundraisingSupporterLabel = (count, language) => {
  const value = Number(count) || 0
  const singular = value === 1
  const label = {
    fr: singular ? 'soutien' : 'soutiens',
    en: singular ? 'supporter' : 'supporters',
    it: singular ? 'sostenitore' : 'sostenitori',
    ar: singular ? 'داعم' : 'داعمون',
  }[language] || (singular ? 'soutien' : 'soutiens')
  return `${value} ${label}`
}
export const projectImage = project => project?.imageUrl || FUNDRAISING_TEMPLATES.find(item => item.id === project?.templateId)?.imageUrl || FUNDRAISING_TEMPLATES[0].imageUrl
export const planTotal = amount => MONTHLY_AMOUNTS.includes(Number(amount)) ? Number(amount) * PLAN_MONTHS : 0
