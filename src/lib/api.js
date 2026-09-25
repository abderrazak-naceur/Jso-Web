const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5080/api').replace(/\/$/, '')

async function request(path, signal) {
  const response = await fetch(API_BASE_URL + path, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!response.ok) throw new Error('API request failed: ' + response.status)
  return response.json()
}

export const publicApi = {
  getHome: (signal) => request('/home', signal),
  getClub: (signal) => request('/club', signal),
  getMatches: (signal) => request('/matches', signal),
  getNews: (signal) => request('/news', signal),
  getMedia: (signal) => request('/media', signal),
  getTeams: (signal) => request('/teams', signal),
  getTeamPlayers: (teamId, signal) => request('/teams/' + teamId + '/players', signal),
  getMatch: (id, signal) => request('/matches/' + id, signal),
  getMatchEvents: (id, signal) => request('/matches/' + id + '/events', signal),
  getMatchLineup: (id, signal) => request('/matches/' + id + '/lineup', signal),
  getMatchOfficials: (id, signal) => request('/matches/' + id + '/officials', signal),
  getMatchStats: (id, signal) => request('/matches/' + id + '/stats', signal),
  getNewsArticle: (slug, signal) => request('/news/' + encodeURIComponent(slug), signal),
}
