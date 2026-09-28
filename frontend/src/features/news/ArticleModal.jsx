import { useEffect, useState } from 'react'
import { CalendarDays, User, X } from 'lucide-react'
import { publicApi } from '../../lib/api'
import { formatDate, pick } from '../../lib/format'
import { normalizeArticle } from '../home/useHomeData'
import { useDialog } from '../site/useDialog'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import CommentsSection from '../community/CommentsSection'
import ShareBar from './ShareBar'
import { articleShareUrl } from './articleUrl'

export default function ArticleModal({ initialArticle, onClose, token, onRequireLogin }) {
  const [article, setArticle] = useState(initialArticle)
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(Boolean(initialArticle.slug))
  const dialogRef = useDialog(onClose)

  useEffect(() => {
    setArticle(initialArticle)
    setMetadata(null)
    if (!initialArticle.slug) {
      setLoading(false)
      return undefined
    }

    const controller = new AbortController()
    setLoading(true)
    publicApi.getNewsArticle(initialArticle.slug, controller.signal)
      .then((result) => {
        setArticle(normalizeArticle(result?.article || initialArticle))
        setMetadata(result?.metadata || null)
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setArticle(initialArticle)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [initialArticle])

  const author = pick(metadata, 'authorName', 'AuthorName')
  const category = pick(metadata, 'category', 'Category') || 'Actualité'
  const paragraphs = String(article.body || article.excerpt || '').split(/\n+/).filter(Boolean)
  // Reflect the open article in the browser tab / shared-link title.
  useDocumentTitle(article.title)

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-jso-navy/65 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <article ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="article-title" tabIndex={-1} className="mx-auto my-6 w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white text-jso-ink shadow-2xl outline-none">
        {article.coverImageUrl && <div className="h-64 overflow-hidden bg-slate-100 sm:h-80"><img src={article.coverImageUrl} alt="" className="h-full w-full object-cover" /></div>}
        <div className="p-6 sm:p-9">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-jso-blue">{category}</p>
              <h2 id="article-title" className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-5xl">{article.title}</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Fermer l’article" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 transition hover:bg-slate-100"><X size={18} aria-hidden="true" /></button>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-b border-slate-200 pb-6 text-sm text-slate-500">
            {article.publishedAt && <p className="flex items-center gap-2"><CalendarDays size={15} aria-hidden="true" />{formatDate(article.publishedAt)}</p>}
            {author && <p className="flex items-center gap-2"><User size={15} aria-hidden="true" />{author}</p>}
          </div>
          {article.excerpt && <p className="mt-7 text-xl font-semibold leading-8 text-slate-700">{article.excerpt}</p>}
          {loading ? <p role="status" className="mt-7 text-sm text-slate-400">Chargement de l’article…</p> : (
            <div className="mt-7 space-y-5 text-base leading-8 text-slate-600">
              {paragraphs.length > 0 ? paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>) : <p>Le contenu complet sera disponible prochainement.</p>}
            </div>
          )}
          {article.slug && (
            <div className="mt-8 border-t border-slate-200 pt-6">
              <ShareBar url={articleShareUrl(article.slug)} title={article.title} />
            </div>
          )}
          {article.id && (
            <CommentsSection
              targetType="News"
              targetId={article.id}
              token={token}
              onRequireLogin={onRequireLogin}
            />
          )}
        </div>
      </article>
    </div>
  )
}
