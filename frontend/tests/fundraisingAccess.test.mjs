import test from 'node:test'
import assert from 'node:assert/strict'
import { createFundraisingAccess, readFundraisingAccess, saveFundraisingAccess, forgetFundraisingAccess } from '../src/features/donations/fundraising/fundraisingAccess.js'

let stored = null
globalThis.localStorage = { getItem: () => stored, setItem: (_, value) => { stored = value } }

test('legacy recovery tolerates malformed data and ignores incomplete credentials', () => {
  stored = '{broken'
  assert.deepEqual(readFundraisingAccess(), [])
  stored = JSON.stringify([{ id: 'missing-secret', projectId: 'p' }, { id: 'c', token: 'secret', projectId: 'p' }])
  assert.deepEqual(readFundraisingAccess(), [{ id: 'c', token: 'secret', projectId: 'p' }])
})

test('claim cleanup removes only the linked secret and preserves unrelated guest access', () => {
  stored = null
  saveFundraisingAccess({ id: 'owned', token: 'owned-secret', projectId: 'p1' })
  saveFundraisingAccess({ id: 'guest', token: 'guest-secret', projectId: 'p2' })
  forgetFundraisingAccess('owned')
  assert.deepEqual(readFundraisingAccess(), [{ id: 'guest', token: 'guest-secret', projectId: 'p2' }])
  forgetFundraisingAccess('already-removed')
  assert.equal(readFundraisingAccess().length, 1)
})

test('retry identifiers use independent random 256-bit URL-safe secrets', () => {
  const first = createFundraisingAccess('p')
  const second = createFundraisingAccess('p')
  assert.match(first.token, /^[A-Za-z0-9_-]{43}$/)
  assert.match(first.id, /^[a-f0-9-]{36}$/)
  assert.notEqual(first.token, second.token)
  assert.notEqual(first.id, second.id)
  assert.equal(first.projectId, 'p')
})
