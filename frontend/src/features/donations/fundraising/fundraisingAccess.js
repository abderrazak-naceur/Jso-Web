const ACCESS_KEY = 'jso_fundraising_access'

export function readFundraisingAccess() {
  try {
    const items = JSON.parse(localStorage.getItem(ACCESS_KEY) || '[]')
    return Array.isArray(items) ? items.filter(item => item.id && item.token && item.projectId).slice(0, 20) : []
  } catch { return [] }
}

export function saveFundraisingAccess(record) {
  const list = [record, ...readFundraisingAccess().filter(item => item.id !== record.id)].slice(0, 20)
  localStorage.setItem(ACCESS_KEY, JSON.stringify(list))
}

export function forgetFundraisingAccess(id) {
  localStorage.setItem(ACCESS_KEY, JSON.stringify(readFundraisingAccess().filter(item => item.id !== id)))
}

export function createFundraisingAccess(projectId) {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return { id: crypto.randomUUID(), projectId, token: btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '') }
}
