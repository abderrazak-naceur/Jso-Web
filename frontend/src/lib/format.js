// Shared helpers for the public site (French locale).

const LOCALE = 'fr-FR'
const DAY_MS = 86400000

// First defined, non-null value among the given keys. The API serialises in
// camelCase but older payloads used PascalCase, so both are accepted.
export function pick(object, ...keys) {
  for (const key of keys) {
    if (object?.[key] !== undefined && object?.[key] !== null) return object[key]
  }
  return undefined
}

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const date = toDate(value)
  return date ? date.toLocaleDateString(LOCALE, options) : ''
}

export function formatTime(value) {
  const date = toDate(value)
  return date ? date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' }) : ''
}

export function formatDateTime(value, dateStyle = 'medium') {
  const date = toDate(value)
  return date ? date.toLocaleString(LOCALE, { dateStyle, timeStyle: 'short' }) : ''
}

// "aujourd’hui", "demain", "dans 6 jours", "hier"… counted in calendar days.
const relativeFormatter = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })

export function relativeDay(value, now = new Date()) {
  const date = toDate(value)
  if (!date) return ''
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS)
  return relativeFormatter.format(days, 'day')
}

export function formatMoney(amount, currency = 'TND') {
  try {
    return new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(amount || 0)
  } catch {
    return `${amount ?? 0} ${currency}`
  }
}
