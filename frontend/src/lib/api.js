import { API_BASE_URL } from './apiConfig'

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
  getSponsors: (placement, signal) => request('/sponsors' + (placement ? '?placement=' + encodeURIComponent(placement) : ''), signal),
  getProducts: (category, signal) => request('/shop/products' + (category ? '?category=' + encodeURIComponent(category) : ''), signal),
  getProduct: (slug, signal) => request('/shop/products/' + encodeURIComponent(slug), signal),
}

async function requestJson(path, method, body, token) {
  const options = {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
  }
  if (body) options.body = JSON.stringify(body)
  const response = await fetch(API_BASE_URL + path, options)
  if (!response.ok) {
    let message = 'Request failed: ' + response.status
    try { message = (await response.json()).message || message } catch { /* ignore */ }
    throw new Error(message)
  }
  return response.status === 204 ? null : response.json()
}

// Fan (supporter) account API — separate from the admin token.
export const accountApi = {
  register: (data) => requestJson('/account/register', 'POST', data),
  login: (data) => requestJson('/account/login', 'POST', data),
  me: (token) => requestJson('/account/me', 'GET', null, token),
}
