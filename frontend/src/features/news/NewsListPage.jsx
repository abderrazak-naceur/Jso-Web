import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { publicApi } from '../../lib/api'
import { normalizeArticle } from '../home/useHomeData'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import StandalonePageHeader from '../site/StandalonePageHeader'
import { visibleSections } from '../site/navigation'
import SiteFooter from '../site/SiteFooter'
import NewsCard from './NewsCard'
import { ARTICLE_PATH_PREFIX } from './articleUrl'

const PAGE_SIZE = 9

// Reads the current page from ?page= (1-based), defaulting to 1.
function pageFromQuery() {
  const value = Number(new URLSearchParams(window.location.search).get('page'))
  return Number.isInteger(value) && value > 0 ? value : 1
}

// Full "all articles" listing page (route /actualites). Lists every published
// article with paging. Clicking an article navigates to its deep-link
// /actualites/{slug}, which the home app opens as the article view.
export default function NewsListPage() {
  const [page, setPage] = useState(pageFromQuery)
  const [state, setState] = useState({ status: 'loading', items: [], total: 0 })
  useDocumentTitle('Toutes les actualités')

  useEffect(() => {
    const controller = new AbortController()
    setState((prev) => ({ ...prev, status: 'loading' }))
    publicApi.getNewsPage(page, PAGE_SIZE, controller.signal)
      .then((result) => {
        const items = Array.isArray(result?.items) ? result.items.map(normalizeArticle) : []
        setState({ status: 'ready', items, total: result?.total ?? items.length })
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ status: 'error', items: [], total: 0 })
      })
    return () => controller.abort()
  }, [page])

  const totalPages = Math.max(1, Math.ceil(state.total / PAGE_SIZE))

  // Change page, reflect it in the URL and scroll back to the top.
  function goTo(next) {
    const target = Math.min(Math.max(1, next), totalPages)
    if (target === page) return
    const url = target === 1 ? '/actualites' : `/actualites?page=${target}`
    window.history.pushState({}, '', url)
    setPage(target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Navigate to the single-article deep-link (opened by the home app).
  function openArticle(article) {
    if (article?.slug) window.location.assign(ARTICLE_PATH_PREFIX + encodeURIComponent(article.slug))
  }

  const footerSections = visibleSections({ community: false, archive: false, sponsors: false })

  return (
    <div className="min-h-screen bg-jso-paper text-jso-ink">
      <StandalonePageHeader />

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <p className="text-xs font-extrabold tracking-[0.2em] text-jso-blue">ACTUALITÉS</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Toutes les actualités</h1>
        <p className="mt-3 max-w-2xl text-slate-500">Communiqués, vie sportive et projets de la Jeunesse Sportive de Oudhref.</p>

        <div className="mt-10">
          {state.status === 'loading' ? (
            <div role="status" className="rounded-[2rem] border border-slate-200 bg-white p-8 text-slate-500">Chargement des actualités…</div>
          ) : state.status === 'error' ? (
            <div role="alert" className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-amber-900">Les actualités sont momentanément indisponibles.</div>
          ) : state.items.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-slate-500">Aucune actualité publiée pour le moment.</div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {state.items.map((article) => (
                  <NewsCard key={article.id || article.slug || article.title} article={article} onOpenArticle={openArticle} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav aria-label="Pagination des actualités" className="mt-12 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => goTo(page - 1)}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-jso-navy transition hover:border-jso-blue disabled:opacity-40"
                  >
                    <ChevronLeft size={16} aria-hidden="true" /> Précédent
                  </button>
                  <span className="text-sm font-bold text-slate-500" aria-live="polite">Page {page} / {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => goTo(page + 1)}
                    disabled={page >= totalPages}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-jso-navy transition hover:border-jso-blue disabled:opacity-40"
                  >
                    Suivant <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </main>

      <SiteFooter sections={footerSections} homeHref="/" />
    </div>
  )
}
