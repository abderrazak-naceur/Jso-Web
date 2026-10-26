import { LoaderCircle } from 'lucide-react'

export default function RouteFallback() {
  return (
    <main
      className="jso-route-loading grid min-h-[100svh] place-items-center px-6 py-12"
      role="status"
      aria-live="polite"
      aria-label="Chargement de la page JSO"
    >
      <div className="flex flex-col items-center text-center">
        <div className="jso-route-loading__crest relative grid h-24 w-24 place-items-center rounded-[2rem] border border-jso-gold/40 bg-white/10 shadow-2xl shadow-black/20">
          <div className="absolute inset-2 rounded-[1.5rem] border border-white/15" aria-hidden="true" />
          <span className="text-3xl font-black tracking-tight text-jso-gold">JSO</span>
        </div>
        <LoaderCircle className="mt-7 animate-spin text-jso-gold" size={28} aria-hidden="true" />
        <p className="mt-4 text-sm font-extrabold tracking-wide text-white">Préparation de votre espace</p>
        <p className="mt-2 max-w-xs text-xs leading-5 text-white/65">Les contenus arrivent, encore un instant.</p>
        <div className="mt-6 h-1 w-40 overflow-hidden rounded-full bg-white/15">
          <span className="jso-route-loading__progress block h-full w-2/5 rounded-full bg-jso-gold" aria-hidden="true" />
        </div>
      </div>
    </main>
  )
}
