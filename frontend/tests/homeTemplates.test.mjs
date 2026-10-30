import test from 'node:test'
import assert from 'node:assert/strict'
import { HOME_LAYOUT_TYPE_TO_SECTION, HOME_TEMPLATES } from '../src/features/home/homeTemplates.js'
import { orderHomeSections } from '../src/features/home/homeLayoutOrder.js'

test('each homepage template has one complete, distinct section order', () => {
  const ids = HOME_TEMPLATES.map((template) => template.id)
  assert.equal(HOME_TEMPLATES.length, 8, 'homepage should offer eight templates')
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(new Set(HOME_TEMPLATES.map((template) => template.name)).size, 8, 'template names should be distinct')
  assert.equal(new Set(HOME_TEMPLATES.map((template) => template.preview)).size, 8, 'each choice needs its own visual preview skin')
  for (const template of HOME_TEMPLATES) {
    assert.ok(template.name.trim(), `${template.id} needs a name`)
    assert.ok(template.description.trim(), `${template.id} needs a description`)
    assert.equal(template.preview, template.id === 'modern-2026' ? 'signature' : template.id)
  }

  const baseline = [...HOME_TEMPLATES[0].sectionOrder].sort()
  for (const template of HOME_TEMPLATES) {
    assert.equal(new Set(template.sectionOrder).size, template.sectionOrder.length, `${template.id} repeats a section`)
    assert.deepEqual([...template.sectionOrder].sort(), baseline, `${template.id} is missing a section`)
  }
  assert.equal(new Set(HOME_TEMPLATES.map((template) => template.sectionOrder.join(','))).size, HOME_TEMPLATES.length)
})

test('homepage layout reorders selected sections and leaves omitted sections visible', () => {
  const defaults = ['hero', 'matches', 'news', 'team', 'media', 'app-download']
  const result = orderHomeSections(defaults, [
    { type: 'News' },
    { type: 'Hero' },
    { type: 'Unknown' },
  ])

  assert.deepEqual(result, ['news', 'matches', 'hero', 'team', 'media', 'app-download'])
  assert.equal(new Set(result).size, defaults.length)
})

test('every admin-managed homepage layout type maps to a rendered section', () => {
  const allSections = new Set(HOME_TEMPLATES.flatMap((template) => template.sectionOrder))
  assert.equal(Object.keys(HOME_LAYOUT_TYPE_TO_SECTION).length, allSections.size)
  for (const [type, section] of Object.entries(HOME_LAYOUT_TYPE_TO_SECTION)) {
    assert.ok(allSections.has(section), `${type} maps to missing section ${section}`)
  }
})
