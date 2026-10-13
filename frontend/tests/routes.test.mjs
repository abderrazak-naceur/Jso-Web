import test from 'node:test'
import assert from 'node:assert/strict'
import { adminEditIdFromPath, adminEditUrl, adminSectionFromPath, adminSectionUrl } from '../src/admin/adminRoutes.js'
import { ADMIN_CATEGORY_ORDER, ADMIN_NAVIGATION, ADMIN_PERMISSION_BY_ID, ADMIN_PUBLIC_PATHS, visibleAdminItems } from '../src/admin/navigation.js'
import { ADMIN_MODULES } from '../src/admin/moduleRegistry.js'
import { SECTION_PATHS, eventSlugFromPath, matchIdFromPath, matchSlugFromPath, matchSlugFor, matchOpponentName, productSlugFromPath, sectionFromPath, sectionUrl } from '../src/features/site/publicRoutes.js'
import { resolveMediaUrl } from '../src/lib/apiConfig.js'

test('media URLs resolve against the API origin without duplicating /api', () => {
  const options = { apiBaseUrl: 'https://jso-api.onrender.com/api', origin: 'https://jso-web.onrender.com' }
  assert.equal(resolveMediaUrl('/uploads/media/2026/10/sssm.png', options), 'https://jso-api.onrender.com/uploads/media/2026/10/sssm.png')
  assert.equal(resolveMediaUrl('/uploads/media/2026/10/sssm.png', { apiBaseUrl: '/api', origin: 'https://jso-web.onrender.com' }), 'https://jso-api.onrender.com/uploads/media/2026/10/sssm.png')
  assert.equal(resolveMediaUrl('/api/uploads/media/2026/10/sssm.png', options), 'https://jso-api.onrender.com/uploads/media/2026/10/sssm.png')
  assert.equal(resolveMediaUrl('uploads/media/2026/10/sssm.png', options), 'https://jso-api.onrender.com/api/uploads/media/2026/10/sssm.png')
  assert.equal(resolveMediaUrl('https://cdn.example.test/sssm.png', options), 'https://cdn.example.test/sssm.png')
  assert.equal(resolveMediaUrl('', options), '')
})

test('admin sections and edit links survive a direct page load', () => {
  assert.equal(adminSectionFromPath('/admin'), 'dashboard')
  assert.equal(adminSectionFromPath('/admin/donations'), 'donations')
  assert.equal(adminSectionUrl('cash-donations'), '/admin/cash-donations')
  const edit = adminEditUrl('news', 'article-id')
  assert.equal(adminSectionFromPath(edit), 'news')
  assert.equal(adminEditIdFromPath('news', edit), 'article-id')
  assert.equal(adminSectionFromPath('/admin/unknown'), null)
  assert.equal(adminSectionFromPath('/admin/news/id/delete'), null)
})

test('every admin section has a module, permission and known category', () => {
  const ids = ADMIN_NAVIGATION.map(([id]) => id)
  assert.equal(new Set(ids).size, ids.length)
  for (const [id, , , , category] of ADMIN_NAVIGATION) {
    assert.ok(ADMIN_CATEGORY_ORDER.includes(category), `${id} has an unknown category`)
    assert.ok(ADMIN_PERMISSION_BY_ID[id], `${id} has no permission`)
    if (id !== 'dashboard') assert.ok(ADMIN_MODULES[id], `${id} has no module`)
  }
  assert.deepEqual(Object.keys(ADMIN_MODULES).sort(), ids.filter((id) => id !== 'dashboard').sort())
})

test('admin search only shows sections available to the role', () => {
  assert.deepEqual(visibleAdminItems('FinanceManager', 'dons').map(([id]) => id), ['finance', 'donations', 'cash-donations'])
  assert.equal(visibleAdminItems('Editor', 'sécurité').length, 0)
  assert.ok(visibleAdminItems('MatchManager', 'matchs').some(([id]) => id === 'matches'))
})

test('admin public links lead to known site pages', () => {
  const sectionIds = new Set(ADMIN_NAVIGATION.map(([id]) => id))
  const publicPaths = new Set([...Object.values(SECTION_PATHS), '/billetterie'])
  for (const [id, path] of Object.entries(ADMIN_PUBLIC_PATHS)) {
    assert.ok(sectionIds.has(id), `${id} is not an admin section`)
    assert.ok(publicPaths.has(path), `${id} links to an unknown public page`)
  }
})

test('public sections and content have stable paths', () => {
  assert.equal(sectionUrl('shop'), '/boutique')
  assert.equal(sectionFromPath('/boutique/'), 'shop')
  assert.equal(sectionFromPath('/actualites'), 'news')
  assert.equal(productSlugFromPath('/boutique/maillot-2026'), 'maillot-2026')
  assert.equal(sectionFromPath('/boutique/maillot-2026'), 'shop')
  assert.equal(eventSlugFromPath('/agenda/journee-du-club'), 'journee-du-club')
  assert.equal(sectionFromPath('/agenda/journee-du-club'), 'events')
  const match = '123e4567-e89b-12d3-a456-426614174000'
  assert.equal(matchIdFromPath(`/matchs/${match}`), match)
  assert.equal(sectionFromPath(`/matchs/${match}`), 'matches')
  assert.equal(matchSlugFor({ opponentName: 'Altra Squadra' }), 'jso-vs-altra-squadra')
  assert.equal(matchSlugFor({ OpponentName: 'Jeunesse Sportive d\'Oudref' }), 'jso-vs-jeunesse-sportive-d-oudref')
  assert.equal(matchOpponentName({ IsHome: true, AwayTeam: { Name: 'Club Sportif' } }), 'Club Sportif')
  assert.equal(matchOpponentName({ isHome: false, homeTeamName: 'Étoile du Sahel' }), 'Étoile du Sahel')
  assert.equal(matchSlugFor({ id: '123e4567-e89b-12d3-a456-426614174000' }), 'jso-vs-match-123e4567')
  assert.equal(matchSlugFromPath('/matchs/jso-vs-altra-squadra'), 'jso-vs-altra-squadra')
  assert.equal(sectionFromPath('/matchs/jso-vs-altra-squadra'), 'matches')
  assert.equal(sectionFromPath('/boutique/slug/extra'), null)
})
