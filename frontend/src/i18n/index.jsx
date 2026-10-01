import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { SUPPORTED_LANGUAGES, TRANSLATIONS } from './translations'

const STORAGE_KEY = 'jso_language'
const DEFAULT_LANGUAGE = 'fr'

function normalizeLanguage(value) {
  const code = String(value || '').toLowerCase().split('-')[0]
  return SUPPORTED_LANGUAGES.some((language) => language.code === code) ? code : DEFAULT_LANGUAGE
}

function getInitialLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) return normalizeLanguage(stored)
    return normalizeLanguage(window.navigator.language)
  } catch {
    return DEFAULT_LANGUAGE
  }
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage)

  const setLanguage = (nextLanguage) => {
    const next = normalizeLanguage(nextLanguage)
    setLanguageState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Language remains active for the current session if storage is unavailable.
    }
  }

  const value = useMemo(() => ({
    language,
    setLanguage,
    languages: SUPPORTED_LANGUAGES,
    t: (key, fallback = key) => TRANSLATIONS[language]?.[key] ?? TRANSLATIONS[DEFAULT_LANGUAGE]?.[key] ?? fallback,
  }), [language])

  useEffect(() => {
    const metadata = SUPPORTED_LANGUAGES.find((item) => item.code === language) ?? SUPPORTED_LANGUAGES[0]
    document.documentElement.lang = language
    document.documentElement.dir = metadata.dir
    document.documentElement.dataset.language = language
  }, [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}
