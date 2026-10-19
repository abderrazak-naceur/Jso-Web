import { ArrowLeft, SearchX } from 'lucide-react'
import { useI18n } from '../../i18n/index.jsx'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

const messages = {
  fr: ['Page introuvable', 'Cette adresse ne correspond à aucune page du site.', 'Retour à l’accueil', 'Erreur 404 — JSO'],
  en: ['Page not found', 'This address does not match a page on the site.', 'Back to home', '404 — JSO'],
  it: ['Pagina non trovata', 'Questo indirizzo non corrisponde a una pagina del sito.', 'Torna alla home', 'Errore 404 — JSO'],
  ar: ['الصفحة غير موجودة', 'هذا العنوان لا يطابق أي صفحة في الموقع.', 'العودة إلى الرئيسية', 'خطأ 404 — JSO'],
}

export default function NotFoundPage() {
  const { language } = useI18n()
  const [title, description, home, documentTitle] = messages[language] || messages.fr
  useDocumentTitle(documentTitle)
  return <main id="main-content" className="grid min-h-screen place-items-center bg-jso-paper px-5 py-16 text-jso-ink">
    <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg sm:p-12" aria-labelledby="not-found-title">
      <SearchX size={44} aria-hidden="true" className="mx-auto text-jso-blue" />
      <p className="mt-5 text-xs font-black tracking-[0.2em] text-jso-blue">404</p>
      <h1 id="not-found-title" className="mt-2 text-3xl font-black sm:text-4xl">{title}</h1>
      <p className="mt-3 text-slate-600">{description}</p>
      <a href="/" className="mt-7 inline-flex items-center gap-2 rounded-full bg-jso-navy px-6 py-3 font-extrabold text-white transition hover:bg-jso-blue"><ArrowLeft size={17} aria-hidden="true" />{home}</a>
    </section>
  </main>
}
