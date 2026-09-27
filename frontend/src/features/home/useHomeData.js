import { useEffect, useState } from 'react'
import { publicApi } from '../../lib/api'
import { pick } from '../../lib/format'
import { normalizeMatch } from '../matches/matchUtils'

const INITIAL_STATE = {
  status: 'loading', // loading | ready | offline, driven by /api/home (club, matches, news)
  club: null,
  content: {},
  nextMatch: null,
  recentMatches: [],
  news: [],
  players: [],
  media: [],
  sponsors: [],
  products: [],
  events: [],
  documents: [],
  faq: [],
  archive: [],
  community: [],
}

export function normalizeArticle(item) {
  return {
    id: pick(item, 'Id', 'id'),
    title: pick(item, 'Title', 'title') || 'Actualité JSO',
    slug: pick(item, 'Slug', 'slug'),
    excerpt: pick(item, 'Excerpt', 'excerpt') || '',
    body: pick(item, 'Body', 'body'),
    publishedAt: pick(item, 'PublishedAt', 'publishedAt'),
    coverImageUrl: pick(item, 'CoverImageUrl', 'coverImageUrl'),
  }
}

function normalizePlayer(player) {
  return {
    id: pick(player, 'Id', 'id'),
    firstName: pick(player, 'FirstName', 'firstName') || '',
    lastName: pick(player, 'LastName', 'lastName') || '',
    shirtNumber: pick(player, 'ShirtNumber', 'shirtNumber'),
    position: pick(player, 'Position', 'position'),
    photoUrl: pick(player, 'PhotoUrl', 'photoUrl'),
  }
}

const byShirtNumber = (a, b) => (a.shirtNumber ?? 999) - (b.shirtNumber ?? 999)

// Prefer the senior squad when several teams are published.
function pickFirstTeam(teams) {
  return teams.find((team) => /senior|premi/i.test(`${pick(team, 'Category', 'category') || ''} ${pick(team, 'Name', 'name') || ''}`)) || teams[0]
}

// Loads everything the public home page needs. Each block fails on its own:
// an unavailable endpoint only empties (or hides) its section.
export function useHomeData() {
  const [data, setData] = useState(INITIAL_STATE)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const merge = (patch) => {
      if (!signal.aborted) setData((previous) => ({ ...previous, ...patch }))
    }
    const loadList = (key, request) => request
      .then((value) => merge({ [key]: Array.isArray(value) ? value : [] }))
      .catch(() => merge({ [key]: [] }))

    publicApi.getHome(signal)
      .then((home) => merge({
        status: 'ready',
        club: home?.club || null,
        content: home?.content || {},
        nextMatch: normalizeMatch(home?.nextMatch),
        recentMatches: (home?.recentMatches || []).map(normalizeMatch),
        news: (home?.news || []).map(normalizeArticle),
      }))
      .catch(() => merge({ status: 'offline' }))

    publicApi.getTeams(signal)
      .then(async (teams) => {
        const teamId = pick(pickFirstTeam(Array.isArray(teams) ? teams : []), 'Id', 'id')
        if (!teamId) {
          merge({ players: [] })
          return
        }
        const players = await publicApi.getTeamPlayers(teamId, signal)
        merge({ players: (Array.isArray(players) ? players : []).map(normalizePlayer).sort(byShirtNumber) })
      })
      .catch(() => merge({ players: [] }))

    loadList('media', publicApi.getMedia(signal))
    loadList('sponsors', publicApi.getSponsors('Footer', signal))
    loadList('products', publicApi.getProducts(undefined, signal))
    loadList('events', publicApi.getEvents(signal))
    loadList('documents', publicApi.getDocuments(undefined, signal))
    loadList('faq', publicApi.getFaq(undefined, signal))
    loadList('archive', publicApi.getArchive(signal))
    loadList('community', publicApi.getCommunityPrograms(signal))

    return () => controller.abort()
  }, [])

  return data
}
