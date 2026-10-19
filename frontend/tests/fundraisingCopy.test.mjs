import test from 'node:test'
import assert from 'node:assert/strict'
import { FUNDRAISING_COPY_KEYS, fundraisingCopy, publicSupportStatus } from '../src/features/donations/fundraising/fundraisingCopy.js'

test('every fundraising operational copy key has French, English, Italian and Arabic text', () => {
  for (const key of FUNDRAISING_COPY_KEYS) {
    for (const language of ['fr', 'en', 'it', 'ar']) {
      const value = fundraisingCopy(language, key)
      assert.ok(value && value !== key, `${key} is missing ${language} copy`)
    }
  }
})

test('fundraising copy interpolates values in all supported languages', () => {
  assert.equal(fundraisingCopy('en', 'chooseMonthly', { months: 10 }), 'Choose your monthly contribution for 10 months.')
  assert.equal(fundraisingCopy('it', 'thanksName', { name: 'Amir' }), 'Grazie, Amir.')
  assert.match(fundraisingCopy('ar', 'thanksName', { name: 'Amir' }), /Amir/)
})

test('public supporter status distinguishes cash pending from paid progress and completion', () => {
  assert.deepEqual(publicSupportStatus({ paymentMethod: 'Cash', paidInstallments: 0, months: 10 }), { key: 'cashPending', paid: false })
  assert.deepEqual(publicSupportStatus({ paymentMethod: 'Online', paidInstallments: 2, months: 10 }), { key: 'paymentsProgress', paid: true })
  assert.deepEqual(publicSupportStatus({ paymentMethod: 'Cash', paidInstallments: 10, months: 10 }), { key: 'allPaymentsConfirmed', paid: true })
})
