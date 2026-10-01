import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { LEGACY_TRANSLATIONS, SUPPORTED_LANGUAGES, TRANSLATIONS } from './translations'

const STORAGE_KEY = 'jso_language'
const DEFAULT_LANGUAGE = 'fr'
const LOCALIZED_ATTRIBUTES = ['aria-label', 'aria-description', 'placeholder', 'title', 'alt']

function normalizeLanguage(value) {
  const code = String(value || '').toLowerCase().split('-')[0]
  return SUPPORTED_LANGUAGES.some((language) => language.code === code) ? code : DEFAULT_LANGUAGE
}

function getInitialLanguage() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang')
    if (fromUrl) return normalizeLanguage(fromUrl)
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) return normalizeLanguage(stored)
    return DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

function preserveWhitespace(source, translated) {
  const leading = source.match(/^\s*/)?.[0] ?? ''
  const trailing = source.match(/\s*$/)?.[0] ?? ''
  return leading + translated.trim() + trailing
}

function translateLegacy(source, language) {
  if (typeof source !== 'string' || !source.trim()) return source
  const leading = source.match(/^\s*/)?.[0] ?? ''
  const trailing = source.match(/\s*$/)?.[0] ?? ''
  const core = source.trim()

  if (language === DEFAULT_LANGUAGE) return source

  const direct = LEGACY_TRANSLATIONS[core]?.[language]
  if (direct) return leading + direct + trailing

  let match = core.match(/^Réserver (\d+) billet(?:s)?$/)
  if (match) {
    const count = Number(match[1])
    const values = {
      en: `Reserve ${count} ticket${count === 1 ? '' : 's'}`,
      it: `Prenota ${count} biglietto${count === 1 ? '' : 'biglietti'}`,
      ar: `احجز ${count} تذكرة`,
    }
    return leading + (values[language] ?? core) + trailing
  }

  match = core.match(/^(\d+) place(?:s)? disponibles$/)
  if (match) {
    const count = Number(match[1])
    const values = {
      en: `${count} place${count === 1 ? '' : 's'} available`,
      it: `${count} post${count === 1 ? 'o disponibile' : 'i disponibili'}`,
      ar: `${count} مقعد متاح`,
    }
    return leading + (values[language] ?? core) + trailing
  }

  match = core.match(/^Page (\d+) \/ (\d+)$/)
  if (match) {
    const values = {
      en: `Page ${match[1]} / ${match[2]}`,
      it: `Pagina ${match[1]} / ${match[2]}`,
      ar: `صفحة ${match[1]} / ${match[2]}`,
    }
    return leading + (values[language] ?? core) + trailing
  }

  if (core.endsWith(' (nouvel onglet)')) {
    const base = core.slice(0, -' (nouvel onglet)'.length)
    const translatedBase = translateLegacy(base, language).trim()
    const suffix = { en: ' (new tab)', it: ' (nuova scheda)', ar: ' (علامة تبويب جديدة)' }[language] ?? ' (nouvel onglet)'
    return leading + translatedBase + suffix + trailing
  }

  return source
}

const SOURCE_TEXT = new WeakMap()
const SOURCE_ATTRIBUTES = new WeakMap()

function localizePublicDom(language) {
  if (typeof document === 'undefined' || window.location.pathname.startsWith('/admin')) return () => {}

  const translatingText = new WeakSet()
  const translatingAttributes = new WeakSet()
  let disposed = false

  const translateTextNode = (node) => {
    if (disposed || !node?.parentElement) return
    const parentTag = node.parentElement.tagName
    if (parentTag === 'SCRIPT' || parentTag === 'STYLE' || parentTag === 'NOSCRIPT' || parentTag === 'TEXTAREA') return

    const current = node.nodeValue ?? ''
    if (!current.trim()) return

    if (translatingText.has(node)) {
      translatingText.delete(node)
      return
    }

    if (!SOURCE_TEXT.has(node)) SOURCE_TEXT.set(node, current)
    const original = SOURCE_TEXT.get(node)
    const translated = translateLegacy(original, language)

    if (translated !== current) {
      translatingText.add(node)
      node.nodeValue = translated
    }
  }

  const translateElement = (element) => {
    if (!(element instanceof Element)) return

    for (const attribute of LOCALIZED_ATTRIBUTES) {
      if (!element.hasAttribute(attribute)) continue
      const current = element.getAttribute(attribute) ?? ''
      if (!current.trim()) continue

      let originals = SOURCE_ATTRIBUTES.get(element)
      if (!originals) {
        originals = new Map()
        SOURCE_ATTRIBUTES.set(element, originals)
      }

      if (translatingAttributes.has(element)) {
        translatingAttributes.delete(element)
        continue
      }

      if (!originals.has(attribute)) originals.set(attribute, current)
      const original = originals.get(attribute)
      const translated = translateLegacy(original, language)

      if (translated !== current) {
        translatingAttributes.add(element)
        element.setAttribute(attribute, translated)
      }
    }
  }

  const scan = (root) => {
    if (!root) return

    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root)
      return
    }

    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return

    translateElement(root)
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()
    while (node) {
      translateTextNode(node)
      node = walker.nextNode()
    }

    if (root.querySelectorAll) {
      root.querySelectorAll('*').forEach(translateElement)
    }
  }

  scan(document.body)

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'childList') {
        record.addedNodes.forEach(scan)
      } else if (record.type === 'characterData') {
        translateTextNode(record.target)
      } else if (record.type === 'attributes' && record.target instanceof Element) {
        translateElement(record.target)
      }
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: LOCALIZED_ATTRIBUTES,
  })

  return () => {
    disposed = true
    observer.disconnect()
  }
}

function setMeta(name, content, attribute = 'name') {
  let element = document.head.querySelector(`meta[${attribute}="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, name)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function upsertAlternateLink(rel, hreflang, href) {
  let link = document.head.querySelector(`link[rel="${rel}"][hreflang="${hreflang}"]`)
  if (!link) {
    link = document.createElement('link')
    link.rel = rel
    link.hreflang = hreflang
    document.head.appendChild(link)
  }
  link.href = href
}

function localizedPath(pathname, language) {
  const params = new URLSearchParams(window.location.search)
  params.set('lang', language)
  const query = params.toString()
  return pathname + (query ? `?${query}` : '')
}

function updateSeo(language, t) {
  const pathname = window.location.pathname
  if (pathname.startsWith('/admin')) return

  const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '')
  const kind = normalizedPath === '/billetterie'
    ? 'tickets'
    : normalizedPath === '/actualites' || normalizedPath.startsWith('/actualites/')
      ? 'news'
      : 'home'
  const title = t(`seo.${kind}Title`)
  const description = t(`seo.${kind}Description`)
  const base = 'https://jso-web.onrender.com'
  const currentUrl = `${base}${localizedPath(pathname, language)}`

  document.title = title
  setMeta('description', description)
  setMeta('og:title', title, 'property')
  setMeta('og:description', description, 'property')
  setMeta('og:url', currentUrl, 'property')
  setMeta('og:locale', language === 'ar' ? 'ar_TN' : language === 'fr' ? 'fr_FR' : language === 'it' ? 'it_IT' : 'en_GB', 'property')
  setMeta('twitter:title', title)
  setMeta('twitter:description', description)

  let canonical = document.head.querySelector('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }
  canonical.href = currentUrl

  for (const supported of SUPPORTED_LANGUAGES) {
    upsertAlternateLink('alternate', supported.code, `${base}${localizedPath(pathname, supported.code)}`)
  }
  upsertAlternateLink('alternate', 'x-default', `${base}${localizedPath(pathname, DEFAULT_LANGUAGE)}`)
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage)

  const setLanguage = (nextLanguage) => {
    const next = normalizeLanguage(nextLanguage)
    setLanguageState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
      const url = new URL(window.location.href)
      url.searchParams.set('lang', next)
      window.history.replaceState(window.history.state, '', url)
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
    try {
      window.localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // Ignore storage failures.
    }
    const translate = (key, fallback = key) =>
      TRANSLATIONS[language]?.[key] ?? TRANSLATIONS[DEFAULT_LANGUAGE]?.[key] ?? fallback
    updateSeo(language, translate)
    return localizePublicDom(language)
  }, [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}
