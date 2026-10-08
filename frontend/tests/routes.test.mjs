import test from 'node:test'
import assert from 'node:assert/strict'
import { adminEditIdFromPath, adminEditUrl, adminSectionFromPath, adminSectionUrl } from '../src/admin/adminRoutes.js'
import { eventSlugFromPath, matchIdFromPath, productSlugFromPath, sectionFromPath, sectionUrl } from '../src/features/site/publicRoutes.js'

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
  assert.equal(sectionFromPath('/boutique/slug/extra'), null)
})
