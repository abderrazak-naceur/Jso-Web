import { useCallback, useEffect, useState } from 'react'

// Idea G21 — Accessibility & easy-reading mode for the public site.
// Preferences are non-sensitive and stored locally for anonymous visitors.
// No new API route is required.

export const A11Y_STORAGE_KEY = 'jso_a11y_prefs'

// Allowed text sizes. The value maps to a font-size scale applied on the
// document root via the data-jso-text-size attribute (see index.css).
export const TEXT_SIZES = ['normal', 'large', 'xlarge']

export const DEFAULT_PREFS = {
  highContrast: false,
  textSize: 'normal',
  // 'auto' means: follow the OS "prefers-reduced-motion" setting.
  reduceMotion: false,
}

function sanitize(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PREFS }
  return {
    highContrast: raw.highContrast === true,
    textSize: TEXT_SIZES.includes(raw.textSize) ? raw.textSize : 'normal',
    reduceMotion: raw.reduceMotion === true,
  }
}

export function readStoredPrefs() {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_PREFS }
  try {
    return sanitize(JSON.parse(localStorage.getItem(A11Y_STORAGE_KEY) || 'null'))
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

// Reflect the current preferences onto the <html> element so CSS can react.
// Kept in a standalone function so an inline bootstrap script can reuse the
// same attribute contract before React hydrates (avoids a flash of default UI).
export function applyPrefs(prefs) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('jso-high-contrast', prefs.highContrast === true)
  root.setAttribute('data-jso-text-size', TEXT_SIZES.includes(prefs.textSize) ? prefs.textSize : 'normal')
  root.classList.toggle('jso-reduce-motion', prefs.reduceMotion === true)
}

export function useAccessibility() {
  const [prefs, setPrefs] = useState(readStoredPrefs)

  // Persist and apply whenever preferences change.
  useEffect(() => {
    applyPrefs(prefs)
    try {
      localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(prefs))
    } catch {
      // Storage may be unavailable (private mode); preferences still apply for the session.
    }
  }, [prefs])

  const setHighContrast = useCallback((value) => {
    setPrefs((current) => ({ ...current, highContrast: value === undefined ? !current.highContrast : value === true }))
  }, [])

  const setTextSize = useCallback((value) => {
    setPrefs((current) => ({ ...current, textSize: TEXT_SIZES.includes(value) ? value : 'normal' }))
  }, [])

  const setReduceMotion = useCallback((value) => {
    setPrefs((current) => ({ ...current, reduceMotion: value === undefined ? !current.reduceMotion : value === true }))
  }, [])

  const reset = useCallback(() => setPrefs({ ...DEFAULT_PREFS }), [])

  return { prefs, setHighContrast, setTextSize, setReduceMotion, reset }
}
