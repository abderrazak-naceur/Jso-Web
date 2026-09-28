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
  // Editable menu/footer (Homepage Builder). Returns active items ordered by
  // DisplayOrder; an empty list means "use the built-in navigation".
  getNavigation: (position, signal) =>
    request('/navigation' + (position ? '?position=' + encodeURIComponent(position) : ''), signal),
  // Published homepage layout sections (Homepage Builder), ordered by
  // DisplayOrder. An empty list means "use the built-in home layout".
  getHomeLayout: (signal) => request('/home-layout', signal),
}

// Public, read-only community feed: approved comments and aggregate reaction
// counts for a target (targetType = 'News' | 'Match', targetId = its Guid).
export const communityApi = {
  getComments: (targetType, targetId, signal) =>
    request('/community/comments?targetType=' + encodeURIComponent(targetType) + '&targetId=' + encodeURIComponent(targetId), signal),
  getReactions: (targetType, targetId, signal) =>
    request('/community/reactions?targetType=' + encodeURIComponent(targetType) + '&targetId=' + encodeURIComponent(targetId), signal),
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
  updateProfile: (data, token) => requestJson('/account/me', 'PUT', data, token),
  changePassword: (data, token) => requestJson('/account/change-password', 'POST', data, token),
}

// Fan shop orders API (requires the fan JWT). Prices are recomputed server-side.
export const shopOrderApi = {
  create: (data, token) => requestJson('/shop/orders', 'POST', data, token),
  myOrders: (token) => requestJson('/shop/orders', 'GET', null, token),
  myOrder: (id, token) => requestJson('/shop/orders/' + id, 'GET', null, token),
  // Starts an online payment for an order. The backend routes to Flouci
  // (Tunisia) or Stripe (elsewhere) based on `country` and returns a hosted
  // { redirectUrl } the browser must navigate to. Payment is only confirmed
  // server-side via the provider webhook, never by the browser redirect.
  pay: (id, country, token) => requestJson('/shop/orders/' + id + '/pay', 'POST', { country }, token),
}

// Fan ticketing API (requires the fan JWT). A reservation is created Pending
// (POST /tickets/reserve) then paid online. Payment is confirmed server-side by
// the verified provider webhook (Pending -> Confirmed + capacity incremented);
// the browser redirect only lands on an "en cours de vérification" page.
export const ticketApi = {
  forMatch: (matchId, signal) => request('/tickets/match/' + matchId, signal),
  mine: (token) => requestJson('/tickets/mine', 'GET', null, token),
  myTicket: (id, token) => requestJson('/tickets/' + id, 'GET', null, token),
  reserve: (data, token) => requestJson('/tickets/reserve', 'POST', data, token),
  // Starts an online payment for a Pending reservation. Routes to Flouci
  // (Tunisia) or Stripe (elsewhere) by `country`; returns { redirectUrl }.
  pay: (id, country, token) => requestJson('/tickets/' + id + '/pay', 'POST', { country }, token),
}

// Fan supporters' wall API (requires the fan JWT for the paid flow). A fan
// proposes a brick tied to their identity (POST /supporters/mine) which returns
// its id, then pays it online. Payment is confirmed server-side by the verified
// webhook (sets PaymentStatus=Paid) and is ORTHOGONAL to moderation: a brick
// only appears on the public wall once a CommunityManager approves it.
export const supporterApi = {
  wall: (name, signal) => request('/supporters/wall' + (name ? '?name=' + encodeURIComponent(name) : ''), signal),
  proposeMine: (data, token) => requestJson('/supporters/mine', 'POST', data, token),
  myBrick: (id, token) => requestJson('/supporters/mine/' + id, 'GET', null, token),
  // Starts an online payment for the fan's own brick. Routes by `country`;
  // returns { redirectUrl }.
  pay: (id, country, token) => requestJson('/supporters/' + id + '/pay', 'POST', { country }, token),
}

// Fan (supporter) community writes — require the fan JWT. Comments are created
// in a "Pending" state and only appear publicly once a moderator approves them.
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

// Public newsletter API (double opt-in). /subscribe returns a generic message and never
// reveals whether the email already exists. Confirmation/unsubscribe happen via emailed
// token links (email delivery is a backend TODO).
export const newsletterApi = {
  subscribe: (email) => requestJson('/newsletter/subscribe', 'POST', { email }),
}
