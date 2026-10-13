const LEVELS = [
  { min: 0, name: 'Nuovo supporter', stars: 1, next: 7, color: 'slate' },
  { min: 7, name: 'Fan fedele', stars: 2, next: 30, color: 'blue' },
  { min: 30, name: 'Appassionato', stars: 3, next: 90, color: 'violet' },
  { min: 90, name: 'VIP', stars: 4, next: 180, color: 'amber' },
  { min: 180, name: 'Leggenda JSO', stars: 5, next: null, color: 'gold' },
]

export function getSupporterLevel(value) {
  const days = Math.max(0, Number(value) || 0)
  const index = LEVELS.reduce((current, level, i) => days >= level.min ? i : current, 0)
  const level = LEVELS[index]
  const previousMin = level.min
  const progress = level.next ? Math.min(100, Math.round(((days - previousMin) / (level.next - previousMin)) * 100)) : 100
  return { ...level, days, index, progress, remaining: level.next ? Math.max(0, level.next - days) : 0 }
}

export const SUPPORTER_LEVELS = LEVELS