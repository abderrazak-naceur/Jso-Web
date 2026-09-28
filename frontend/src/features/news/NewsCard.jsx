import { ArrowUpRight, Newspaper } from 'lucide-react'
import { formatDate } from '../../lib/format'

// Shared visual for a news article: cover image, or a branded placeholder.
function NewsVisual({ article, featured }) {
  if (article.coverImageUrl) {
    return <img src={article.coverImageUrl} alt={article.title || ''} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
  }
  return (
    <div className="relative grid h-full min-h-48 place-items-center overflow-hidden bg-gradient-to-br from-jso-navy to-jso-blue">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border-[28px] border-white/5" aria-hidden="true" />
      <Newspaper size={featured ? 54 : 42} className="text-jso-gold" aria-hidden="true" />
    </div>
  )
}

// Article card reused by the home news section and the full "all articles"
// listing page. `featured` makes the first card span two columns on the home
// grid; the listing page uses a uniform grid (featured = false everywhere).
export default function NewsCard({ article, featured = false, onOpenArticle }) {
  return (
    <article className={`group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg shadow-slate-200/40 ${featured ? 'md:col-span-2 md:grid md:grid-cols-[0.9fr_1.1fr]' : ''}`}>
      <div className={featured ? 'min-h-64 overflow-hidden' : 'h-52 overflow-hidden'}><NewsVisual article={article} featured={featured} /></div>
      <div className="flex flex-col p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-3 text-xs font-extrabold tracking-[0.15em]">
          <span className="text-jso-blue">ACTUALITÉ</span>
          {article.publishedAt && <time dateTime={article.publishedAt} className="tracking-normal text-slate-400">{formatDate(article.publishedAt)}</time>}
        </div>
        <h3 className={`${featured ? 'mt-5 text-3xl sm:text-4xl' : 'mt-4 text-2xl'} font-black leading-tight tracking-tight`}>{article.title}</h3>
        {article.excerpt && <p className="mt-3 line-clamp-3 leading-7 text-slate-500">{article.excerpt}</p>}
        <button type="button" onClick={() => onOpenArticle(article)} className="mt-auto inline-flex items-center gap-2 pt-6 text-left text-sm font-extrabold text-jso-blue">
          Lire l’article <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      </div>
    </article>
  )
}
