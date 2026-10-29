import test from 'node:test'
import assert from 'node:assert/strict'
import { assetKey, pendingAssets } from '../src/admin/commerce/ticket-designer/assetReadiness.js'
import { DESIGN_PRESETS, createDesignDocument, activeArtboard, createImageLayer, createQrLayer } from '../src/admin/commerce/ticket-designer/document.js'

test('each editable template contains the requested social formats', () => {
  for (const preset of DESIGN_PRESETS) {
    const document = createDesignDocument(preset.id, { opponentName: 'Test club' })
    assert.ok(activeArtboard(document))
    assert.deepEqual(document.artboards.slice(0, 3).map(board => [board.width, board.height]), [[1200, 480], [1080, 1080], [1080, 1920]])
    assert.deepEqual(JSON.parse(JSON.stringify(document)), document)
  }
})

test('export waits for both images and QR, and ignores invisible assets', () => {
  const image = createImageLayer('Logo', '/logo.png')
  const qr = createQrLayer()
  const context = { publicUrl: 'https://example.org/matchs/test' }
  const readiness = new Map()
  assert.equal(pendingAssets([image, qr], context, {}, readiness).length, 2)
  readiness.set(image.id, { key: assetKey(image, context, {}), ready: true })
  assert.deepEqual(pendingAssets([image, qr], context, {}, readiness), [qr])
  readiness.set(qr.id, { key: assetKey(qr, context, {}), ready: true })
  assert.deepEqual(pendingAssets([image, qr], context, {}, readiness), [])
  assert.deepEqual(pendingAssets([{ ...image, visible: false }], context, {}, new Map()), [])
})

test('a different source, match URL or QR size invalidates previous readiness', () => {
  const image = createImageLayer('Logo', '/logo.png')
  const qr = createQrLayer()
  const context = { publicUrl: 'https://example.org/matchs/one' }
  const readiness = new Map([image, qr].map(layer => [layer.id, { key: assetKey(layer, context, {}), ready: true }]))
  assert.equal(pendingAssets([{ ...image, source: { kind: 'url', url: '/other.png' } }], context, {}, readiness).length, 1)
  assert.equal(pendingAssets([qr], { publicUrl: 'https://example.org/matchs/two' }, {}, readiness).length, 1)
  assert.equal(pendingAssets([{ ...qr, width: 300 }], context, {}, readiness).length, 1)
})
