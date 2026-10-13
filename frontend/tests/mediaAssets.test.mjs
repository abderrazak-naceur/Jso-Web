import assert from 'node:assert/strict'
import { access, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { MATCH_AMICALE_PHOTOS } from '../src/features/media/matchAmicalePhotos.js'

const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url))

test('each curated JSO match photo exists and has accessible descriptive text', async () => {
  assert.equal(MATCH_AMICALE_PHOTOS.length, 5)
  assert.equal(new Set(MATCH_AMICALE_PHOTOS.map(({ file }) => file)).size, MATCH_AMICALE_PHOTOS.length)

  await Promise.all(MATCH_AMICALE_PHOTOS.map(async (photo) => {
    assert.ok(photo.alt.trim().length > 20, `${photo.file} needs meaningful alt text`)
    assert.equal(photo.src, `/img/Jso-match-amicale/${photo.file}`)
    const path = `${publicDirectory}img/Jso-match-amicale/${photo.file}`
    await access(path)
    assert.ok((await stat(path)).size > 10_000, `${photo.file} must not be an empty placeholder`)
  }))
})
