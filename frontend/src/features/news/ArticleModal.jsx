import { useEffect, useState } from 'react'
import { CalendarDays, User, X } from 'lucide-react'
import { publicApi } from '../../lib/api'
import { formatDate, pick } from '../../lib/format'
import { normalizeArticle } from '../home/useHomeData'
import { useDialog } from '../site/useDialog'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import CommentsSection from '../community/CommentsSection'
import ShareBar from './ShareBar'
import { sharePreviewUrl } from '../../lib/sharePreviewUrl'

function renderArticleLine(line, index) {
  const image = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)$/)
  if (image) return <figure key={index} className="my-7"><img src={image[2]} alt={image[1]} loading="lazy" className="max-h-[42rem] w-full rounded-xl object-contain"/>{image[1]&&<figcaption className="mt-2 text-center text-sm text-slate-500">{image[1]}</figcaption>}</figure>
  if (line.startsWith('> ')) return <blockquote key={index} className="border-l-4 border-jso-blue pl-4 italic text-slate-600">{line.slice(2)}</blockquote>
  if (line.startsWith('- ')) return <p key={index} className="pl-4">• {line.slice(2)}</p>
  return <p key={index}>{line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')}</p>
}

export default function ArticleModal({ initialArticle, onClose, token, onRequireLogin }) {
  const [article, setArticle] = useState(initialArticle)
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(Boolean(initialArticle.slug))
  const [loadError, setLoadError] = useState('')
  const dialogRef = useDialog(onClose)

  useEffect(() => {
    setArticle(initialArticle); setMetadata(null); setLoadError('')
    if (!initialArticle.slug) { setLoading(false); return undefined }
    const controller = new AbortController()
    setLoading(true)
    publicApi.getNewsArticle(initialArticle.slug, controller.signal)
      .then((result) => { setArticle(normalizeArticle(result?.article || initialArticle)); setMetadata(result?.metadata || null) })
      .catch((error) => { if (error.name !== 'AbortError') { setArticle(initialArticle); setLoadError(error.message?.includes('404') ? "Cet article n'est plus disponible." : "Impossible de charger cet article pour le moment.") } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [initialArticle])

  const author = pick(metadata, 'authorName', 'AuthorName')
  const category = pick(metadata, 'category', 'Category') || 'Actualité'
  const bodyLines = String(article.body || article.excerpt || '').split(/\n+/).filter(Boolean)
  useDocumentTitle(article.title)

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-jso-navy/65 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <article ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="article-title" tabIndex={-1} className="mx-auto my-6 w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white text-jso-ink shadow-2xl outline-none">
        {article.coverImageUrl && <div className="h-64 overflow-hidden bg-slate-100 sm:h-80"><img src={article.coverImageUrl} alt="" className="h-full w-full object-cover" /></div>}
        <div className="p-6 sm:p-9">
          <div className="flex items-start justify-between gap-5"><div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-jso-blue">{category}</p><h2 id="article-title" className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-5xl">{article.title}</h2></div><button type="button" onClick={onClose} aria-label="Fermer l’article" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 transition hover:bg-slate-100"><X size={18} aria-hidden="true" /></button></div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-b border-slate-200 pb-6 text-sm text-slate-500">{article.publishedAt && <p className="flex items-center gap-2"><CalendarDays size={15} aria-hidden="true" />{formatDate(article.publishedAt)}</p>}{author && <p className="flex items-center gap-2"><User size={15} aria-hidden="true" />{author}</p>}</div>
          {article.excerpt && <p className="mt-7 text-xl font-semibold leading-8 text-slate-700">{article.excerpt}</p>}
          {loadError && <p role="alert" className="mt-7 rounded-xl bg-amber-50 p-4 text-amber-900">{loadError}</p>}
          {loading ? <p role="status" className="mt-7 text-sm text-slate-400">Chargement de l’article…</p> : !loadError && <div className="mt-7 space-y-5 text-base leading-8 text-slate-600">{bodyLines.length > 0 ? bodyLines.map(renderArticleLine) : <p>Le contenu complet sera disponible prochainement.</p>}</div>}
          {article.slug && !loadError && <div className="mt-8 border-t border-slate-200 pt-6"><ShareBar url={sharePreviewUrl('article', article.slug)} title={article.title} /></div>}
          {article.id && <CommentsSection targetType="News" targetId={article.id} token={token} onRequireLogin={onRequireLogin}/>}
        </div>
      </article>
    </div>
  )
}
