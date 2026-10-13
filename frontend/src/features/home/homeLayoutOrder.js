import { HOME_LAYOUT_TYPE_TO_SECTION } from './homeTemplates.js'

/**
 * Reorders selected homepage sections in their existing slots. Sections omitted
 * from the configured layout stay visible; visibility has its own setting.
 */
export function orderHomeSections(defaultKeys, layout) {
  if (!Array.isArray(layout) || layout.length === 0) return defaultKeys

  const controllable = new Set(defaultKeys)
  const desired = []
  const seen = new Set()
  for (const item of layout) {
    const key = HOME_LAYOUT_TYPE_TO_SECTION[item.type]
    if (!key || seen.has(key) || !controllable.has(key)) continue
    seen.add(key)
    desired.push(key)
  }
  if (desired.length === 0) return defaultKeys

  const selected = new Set(desired)
  const slots = defaultKeys.flatMap((key, index) => selected.has(key) ? [index] : [])
  const result = [...defaultKeys]
  slots.forEach((slot, index) => { result[slot] = desired[index] })
  return result
}
