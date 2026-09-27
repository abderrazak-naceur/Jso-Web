import { pick } from '../../lib/format'
import { CLUB_NAME } from '../site/brand'

const STATUS_LABELS = {
  Scheduled: 'À venir',
  Live: 'En direct',
  HalfTime: 'Mi-temps',
  Finished: 'Terminé',
  Postponed: 'Reporté',
  Cancelled: 'Annulé',
}

// Match events (admin) and live blog kinds share this dictionary.
const EVENT_LABELS = {
  Goal: 'But',
  OwnGoal: 'But contre son camp',
  Penalty: 'Penalty',
  YellowCard: 'Carton jaune',
  RedCard: 'Carton rouge',
  Card: 'Carton',
  Substitution: 'Remplacement',
  VAR: 'VAR',
  Text: 'Info',
  Other: 'Autre',
}

export const RESULT_LABELS = { win: 'Victoire', draw: 'Match nul', loss: 'Défaite' }
export const RESULT_SHORT = { win: 'V', draw: 'N', loss: 'D' }

export function normalizeMatch(raw) {
  if (!raw) return null
  return {
    id: pick(raw, 'Id', 'id'),
    opponentName: pick(raw, 'OpponentName', 'opponentName') || 'Adversaire à confirmer',
    kickoffAt: pick(raw, 'KickoffAt', 'kickoffAt'),
    venue: pick(raw, 'Venue', 'venue'),
    isHome: Boolean(pick(raw, 'IsHome', 'isHome')),
    homeScore: pick(raw, 'HomeScore', 'homeScore') ?? null,
    awayScore: pick(raw, 'AwayScore', 'awayScore') ?? null,
    status: pick(raw, 'Status', 'status') || 'Scheduled',
  }
}

export function matchStatusLabel(status) {
  return STATUS_LABELS[status] || status || STATUS_LABELS.Scheduled
}

export function eventLabel(type) {
  return EVENT_LABELS[type] || type || 'Événement'
}

export function isLive(match) {
  return match?.status === 'Live' || match?.status === 'HalfTime'
}

export function hasScore(match) {
  return match?.homeScore != null && match?.awayScore != null
}

// Football convention: the home team is always shown first/left. When JSO plays
// away, the opponent comes first so the score reads in the right order.
export function matchSides(match) {
  const club = { name: CLUB_NAME, isClub: true, score: match.isHome ? match.homeScore : match.awayScore }
  const opponent = { name: match.opponentName, isClub: false, score: match.isHome ? match.awayScore : match.homeScore }
  return match.isHome ? { home: club, away: opponent } : { home: opponent, away: club }
}

// 'win' | 'draw' | 'loss' from JSO's point of view, or null without a score.
export function clubResult(match) {
  if (!hasScore(match)) return null
  const { home, away } = matchSides(match)
  const club = home.isClub ? home : away
  const other = home.isClub ? away : home
  if (club.score > other.score) return 'win'
  if (club.score < other.score) return 'loss'
  return 'draw'
}

// Short badge for teams without a logo: "AS Gabès" → "ASG", "CS Sfaxien" → "CSS".
export function teamInitials(name) {
  const words = String(name || '').split(/[\s-]+/).filter((word) => /^[A-ZÀ-Ý0-9]/.test(word))
  if (words.length === 0) return String(name || '?').slice(0, 3).toUpperCase()
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  return words
    .map((word) => (word === word.toUpperCase() && word.length <= 4 ? word : word[0]))
    .join('')
    .slice(0, 4)
    .toUpperCase()
}
