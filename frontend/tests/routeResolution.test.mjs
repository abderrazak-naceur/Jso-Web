import test from 'node:test'
import assert from 'node:assert/strict'
import { isKnownSitePath } from '../src/features/site/routeResolution.js'

test('route resolution accepts supported direct links and content details', () => {
  for (const path of ['/', '/matchs', '/matchs/jso-vs-oasis-kebili', '/boutique', '/boutique/maillot-jso', '/agenda', '/agenda/journee-du-club', '/actualites', '/billetterie', '/nos-projets', '/soutenir', '/account/tickets', '/profil', '/password-reset', '/payment/return', '/admin/donations']) {
    assert.equal(isKnownSitePath(path), true, `${path} should be a supported route`)
  }
})

test('route resolution rejects unknown and malformed nested URLs', () => {
  for (const path of ['/un-route-inconnue', '/account/typo', '/boutique/maillot/extra', '/matchs/not-a-match', '/agenda/un-evenement/extra']) {
    assert.equal(isKnownSitePath(path), false, `${path} should render the 404 page`)
  }
})
