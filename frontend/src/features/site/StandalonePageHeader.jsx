import { ArrowLeft } from 'lucide-react'
import { CREST_SRC } from './brand'

export default function StandalonePageHeader({ children }) {
  return <header className="sticky top-0 z-50 border-b border-white/10 bg-jso-navy/95 text-white backdrop-blur-xl">
    <div className="mx-auto flex h-18 max-w-7xl items-center gap-3 px-5 lg:px-8">
      <a href="/" aria-label="JSO Oudhref — accueil" className="flex shrink-0 items-center gap-3 rounded-xl">
        <img src={CREST_SRC} alt="" className="h-11 w-11 object-contain" />
        <span className="leading-none">
          <span className="block text-lg font-black tracking-tight">JSO</span>
          <span className="mt-1 block whitespace-nowrap text-[10px] font-bold tracking-[0.2em] text-white/55">OUDHREF · TUNISIE</span>
        </span>
      </a>
      <div className="ml-auto flex items-center gap-2">
        {children}
        <a href="/" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-white/10">
          <ArrowLeft size={16} aria-hidden="true" /> Accueil
        </a>
      </div>
    </div>
  </header>
}
