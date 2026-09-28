import { ArrowUpRight } from 'lucide-react'
import { eyebrowText } from '../site/navigation'
import NewsCard from '../news/NewsCard'
import { NEWS_LIST_PATH } from '../news/articleUrl'
import SectionHeading from './SectionHeading'

export default function NewsSection({ section, status, articles, content, onOpenArticle }) {
  return (
    <section id="news" aria-labelledby="news-title" className="border-y border-slate-200 bg-white/45">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHeading
          section={section}
          eyebrow={eyebrowText(content.news_eyebrow, section.eyebrow)}
          title={content.news_title || 'Le club'}
          muted={content.news_muted || 'en mouvement.'}
          description="Communiqués, vie sportive et projets de la Jeunesse Sportive de Oudhref."
        />
        <div className="mt-10">
          {status === 'loading' ? (
            <div role="status" className="rounded-[2rem] border border-slate-200 bg-white p-8 text-slate-500">Chargement des actualités…</div>
          ) : status === 'offline' ? (
            <div role="alert" className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-amber-900">Les actualités sont momentanément indisponibles.</div>
          ) : articles.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-slate-500">Aucune actualité publiée pour le moment.</div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((article, index) => <NewsCard key={article.id || article.slug || article.title} article={article} featured={index === 0} onOpenArticle={onOpenArticle} />)}
            </div>
          )}
          {status !== 'loading' && articles.length > 0 && (
            <div className="mt-10 text-center">
              <a href={NEWS_LIST_PATH} className="inline-flex items-center gap-2 rounded-full bg-jso-navy px-6 py-3 text-sm font-extrabold text-white transition hover:bg-jso-blue">
                Toutes les actualités <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
