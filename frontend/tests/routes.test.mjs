import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { adminEditIdFromPath, adminEditUrl, adminSectionFromPath, adminSectionUrl } from '../src/admin/adminRoutes.js'
import { ADMIN_CATEGORY_ORDER, ADMIN_NAVIGATION, ADMIN_PERMISSION_BY_ID, ADMIN_PUBLIC_PATHS, ADMIN_QUICK_SECTION_IDS, visibleAdminItems } from '../src/admin/navigation.js'
import { ADMIN_MODULES } from '../src/admin/moduleRegistry.js'
import { SECTION_PATHS, eventSlugFromPath, matchIdFromPath, matchSlugFromPath, matchSlugFor, matchOpponentName, productSlugFromPath, sectionFromPath, sectionUrl } from '../src/features/site/publicRoutes.js'

test('admin sections and edit links survive a direct page load', () => {
  assert.equal(adminSectionFromPath('/admin'), 'dashboard')
  assert.equal(adminSectionFromPath('/admin/donations'), 'donations')
  assert.equal(adminSectionFromPath('/admin/fundraising-projects'), 'fundraising-projects')
  const fundraisingEdit = adminEditUrl('fundraising-projects', 'project-id')
  assert.equal(adminSectionFromPath(fundraisingEdit), 'fundraising-projects')
  assert.equal(adminEditIdFromPath('fundraising-projects', fundraisingEdit), 'project-id')
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
  assert.deepEqual(visibleAdminItems('FinanceManager', 'dons').map(([id]) => id), ['finance', 'fundraising-projects', 'donations', 'cash-donations'])
  assert.ok(visibleAdminItems('FinanceManager').some(([id]) => id === 'fundraising-projects'))
  assert.ok(!visibleAdminItems('Editor').some(([id]) => id === 'fundraising-projects'))
  assert.equal(visibleAdminItems('Editor', 'sécurité').length, 0)
  assert.ok(visibleAdminItems('MatchManager', 'matchs').some(([id]) => id === 'matches'))
})

test('admin quick destinations exist and remain role gated', () => {
  const ids = new Set(ADMIN_NAVIGATION.map(([id]) => id))
  assert.equal(new Set(ADMIN_QUICK_SECTION_IDS).size, ADMIN_QUICK_SECTION_IDS.length)
  for (const id of ADMIN_QUICK_SECTION_IDS) assert.ok(ids.has(id), `${id} is not an admin section`)
  const editorIds = new Set(visibleAdminItems('Editor').map(([id]) => id))
  assert.ok(editorIds.has('news'))
  assert.ok(!editorIds.has('donations'))
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
  assert.equal(matchSlugFromPath('/matchs/jso-vs-'), 'jso-vs-')
  assert.equal(matchSlugFromPath('/matchs/jso-vs-altra-squadra'), 'jso-vs-altra-squadra')
  assert.equal(sectionFromPath('/matchs/jso-vs-altra-squadra'), 'matches')
  assert.equal(sectionFromPath('/boutique/slug/extra'), null)
})

test('account routes use the dashboard that includes payment history', () => {
  const source = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')
  assert.match(source, /import\('\.\/features\/account\/CustomerDashboardPage\.jsx'\)/)
  assert.match(source, /path === '\/account' \|\| path === '\/mon-espace'\) return <CustomerDashboardPage \/>/)
})
