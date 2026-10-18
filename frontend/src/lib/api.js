import { API_BASE_URL } from './apiConfig'

const LANGUAGE_STORAGE_KEY = 'jso_language'
const DEFAULT_LANGUAGE = 'fr'

function getRequestLanguage() {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

function languageHeaders() {
  return { Accept: 'application/json', 'Accept-Language': getRequestLanguage() }
}

async function request(path, signal) {
  const response = await fetch(API_BASE_URL + path, {
    headers: languageHeaders(),
    signal,
  })
  if (!response.ok) {
    if (response.status >= 500)
      throw new Error(`Le service est momentanément indisponible. Réessayez plus tard. (HTTP ${response.status})`)
    throw new Error('API request failed: ' + response.status)
  }
  return response.json()
}

export const publicApi = {
  getHome: (signal) => request('/home', signal),
  getContent: (signal) => request('/content', signal),
  getClub: (signal) => request('/club', signal),
  getMatches: (signal) => request('/matches', signal),
  getNews: (signal) => request('/news', signal),
  getNewsPage: (page, pageSize, signal) =>
    request('/news?page=' + encodeURIComponent(page) + '&pageSize=' + encodeURIComponent(pageSize), signal),
  getMedia: (signal) => request('/media', signal),
  getTeams: (signal) => request('/teams', signal),
  getTeamPlayers: (teamId, signal) => request('/teams/' + teamId + '/players', signal),
  getMatch: (id, signal) => request('/matches/' + id, signal),
  getMatchEvents: (id, signal) => request('/matches/' + id + '/events', signal),
  getMatchLineup: (id, signal) => request('/matches/' + id + '/lineup', signal),
  getMatchOfficials: (id, signal) => request('/matches/' + id + '/officials', signal),
  getMatchStats: (id, signal) => request('/matches/' + id + '/stats', signal),
  getMatchLiveBlog: (id, signal) => request('/matches/' + id + '/liveblog', signal),
  getNewsArticle: (slug, signal) => request('/news/' + encodeURIComponent(slug), signal),
  getSponsors: (placement, signal) => request('/sponsors' + (placement ? '?placement=' + encodeURIComponent(placement) : ''), signal),
  getProducts: (category, signal) => request('/shop/products' + (category ? '?category=' + encodeURIComponent(category) : ''), signal),
  getProduct: (slug, signal) => request('/shop/products/' + encodeURIComponent(slug), signal),
  getEvents: (signal) => request('/events', signal),
  getEvent: (slug, signal) => request('/events/' + encodeURIComponent(slug), signal),
  getDocuments: (category, signal) => request('/documents' + (category ? '?category=' + encodeURIComponent(category) : ''), signal),
  getFaq: (category, signal) => request('/faq' + (category ? '?category=' + encodeURIComponent(category) : ''), signal),
  getArchive: (signal) => request('/archive', signal),
  getCommunityPrograms: (signal) => request('/community-programs', signal),
  getNavigation: (position, signal) =>
    request('/navigation' + (position ? '?position=' + encodeURIComponent(position) : ''), signal),
  getHomeLayout: (signal) => request('/home-layout', signal),
}

export const communityApi = {
  getComments: (targetType, targetId, signal) =>
    request('/community/comments?targetType=' + encodeURIComponent(targetType) + '&targetId=' + encodeURIComponent(targetId), signal),
  getReactions: (targetType, targetId, signal) =>
    request('/community/reactions?targetType=' + encodeURIComponent(targetType) + '&targetId=' + encodeURIComponent(targetId), signal),
}

async function requestJson(path, method, body, token, extraHeaders = {}) {
  const options = {
    method,
    headers: {
      ...languageHeaders(),
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...extraHeaders,
    },
  }
  if (body) options.body = JSON.stringify(body)
  const response = await fetch(API_BASE_URL + path, options)
  if (!response.ok) {
    let message = 'Request failed: ' + response.status
    try { message = (await response.json()).message || message } catch { /* ignore */ }
    const error = new Error(message)
    error.status = response.status
    throw error
  }
  return response.status === 204 ? null : response.json()
}

async function uploadProfilePhoto(file, token) {
  const body = new FormData()
  body.append('file', file)
  const response = await fetch(API_BASE_URL + '/account/me/photo', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
    body,
  })
  if (!response.ok) {
    let message = 'Impossible de téléverser la photo (' + response.status + ').'
    try { message = (await response.json()).message || message } catch {}
    throw new Error(message)
  }
  return response.json()
}

export const accountApi = {
  register: (data) => requestJson('/account/register', 'POST', data),
  login: (data) => requestJson('/account/login', 'POST', data),
  me: (token) => requestJson('/account/me', 'GET', null, token),
  updateProfile: (data, token) => requestJson('/account/me', 'PUT', data, token),
  uploadPhoto: (file, token) => uploadProfilePhoto(file, token),
  deletePhoto: (token) => requestJson('/account/me/photo', 'DELETE', null, token),
  changePassword: (data, token) => requestJson('/account/change-password', 'POST', data, token),
}

export const shopOrderApi = {
  create: (data, token) => requestJson('/shop/orders', 'POST', data, token),
  myOrders: (token) => requestJson('/shop/orders', 'GET', null, token),
  myOrder: (id, token) => requestJson('/shop/orders/' + id, 'GET', null, token),
  pay: (id, country, token) => requestJson('/shop/orders/' + id + '/pay', 'POST', { country }, token),
}

export const ticketApi = {
  matchesOnSale: (signal) => request('/tickets/matches', signal),
  forMatch: (matchId, signal) => request('/tickets/match/' + matchId, signal),
  mine: (token) => requestJson('/tickets/mine', 'GET', null, token),
  myTicket: (id, token) => requestJson('/tickets/' + id, 'GET', null, token),
  digital: (id, token) => requestJson('/tickets/' + id + '/digital', 'GET', null, token),
  reserve: (data, token) => requestJson('/tickets/reserve', 'POST', data, token),
  pay: (id, country, token) => requestJson('/tickets/' + id + '/pay', 'POST', { country }, token),
}

export const donationsApi = {
  campaign: (signal) => request('/donations/campaign', signal),
  supporters: (page = 1, status = '', search = '', signal) => {
    const params = new URLSearchParams({ page: String(page), pageSize: '10' })
    if (status) params.set('status', status)
    if (search.trim()) params.set('search', search.trim())
    return request('/donations/supporters?' + params.toString(), signal)
  },
  paymentMethods: (signal) => request('/donations/payment-methods', signal),
  create: (data, token) => requestJson('/donations', 'POST', data, token),
  cashPledge: (data, token) => requestJson('/donations/cash-pledge', 'POST', data, token),
  status: (id) => requestJson('/donations/' + id, 'GET'),
  pay: (id, country, provider, email) => requestJson('/donations/' + id + '/pay', 'POST', { country, provider, email }),
}

export const fundraisingApi = {
  projects: signal => request('/fundraising/projects', signal),
  supporters: (id, page = 1, search = '', signal) => request(`/fundraising/projects/${encodeURIComponent(id)}/supporters?` + new URLSearchParams({ page: String(page), search }), signal),
  join: (id, data, token) => requestJson(`/fundraising/projects/${encodeURIComponent(id)}/commitments`, 'POST', data, token),
  commitment: (id, accessToken, token) => requestJson(`/fundraising/commitments/${encodeURIComponent(id)}`, 'GET', null, token, accessToken ? { 'X-Fundraising-Token': accessToken } : {}),
  mine: token => requestJson('/fundraising/mine', 'GET', null, token),
  pay: (id, country, provider, email, accessToken, token) => requestJson(`/donations/${encodeURIComponent(id)}/pay`, 'POST', { country, provider, email }, token, accessToken ? { 'X-Fundraising-Token': accessToken } : {}),
}

export const supporterApi = {
  wall: (name, signal) => request('/supporters/wall' + (name ? '?name=' + encodeURIComponent(name) : ''), signal),
  proposeMine: (data, token) => requestJson('/supporters/mine', 'POST', data, token),
  myBrick: (id, token) => requestJson('/supporters/mine/' + id, 'GET', null, token),
  pay: (id, country, token) => requestJson('/supporters/' + id + '/pay', 'POST', { country }, token),
}

export const membershipApi = {
  plans: (signal) => request('/memberships/plans', signal),
  subscribe: (planId, token) => requestJson('/memberships', 'POST', { planId }, token),
  mine: (token) => requestJson('/memberships/mine', 'GET', null, token),
  myMembership: (id, token) => requestJson('/memberships/' + id, 'GET', null, token),
  pay: (id, country, token) => requestJson('/memberships/' + id + '/pay', 'POST', { country }, token),
}

export const paymentHistoryApi = {
  mine: (token) => requestJson('/account/me/payments', 'GET', null, token),
}

export const matchStreamApi = {
  get: (matchId, token) => requestJson('/matches/' + matchId + '/stream', 'GET', null, token),
  startAccess: (matchId, country, token, promoCode) => requestJson('/matches/' + matchId + '/stream/access', 'POST', { country, promoCode }, token),
  access: (accessId, token) => requestJson('/matches/stream-access/' + accessId, 'GET', null, token),
}

export const communityFanApi = {
  postComment: (data, token) => requestJson('/community/comments', 'POST', data, token),
  addReaction: (data, token) => requestJson('/community/reactions', 'POST', data, token),
  removeReaction: (targetType, targetId, kind, token) =>
    requestJson(
      '/community/reactions?targetType=' + encodeURIComponent(targetType)
      + '&targetId=' + encodeURIComponent(targetId)
      + '&kind=' + encodeURIComponent(kind),
      'DELETE',
      null,
      token,
    ),
  report: (data, token) => requestJson('/community/reports', 'POST', data, token),
}

export const newsletterApi = {
  subscribe: (email) => requestJson('/newsletter/subscribe', 'POST', { email }),
}
