import { useEffect, useState } from 'react'
import { CloudOff, RefreshCw, X } from 'lucide-react'
import { registerServiceWorker, activateWaitingWorker } from './lib/registerServiceWorker'

// Idée E19 — indicateur "mode hors-ligne" pour le site public.
//
// Deux rôles :
//  1. Afficher une bannière claire quand le navigateur passe hors ligne
//     (navigator.onLine + événements online/offline), pour prévenir que les
//     données affichées peuvent ne pas être à jour.
//  2. Proposer un rafraîchissement lorsqu'une nouvelle version du service
//     worker est prête, sans boucle de rechargement.

function getInitialOnline() {
  if (typeof navigator === 'undefined') return true
  // navigator.onLine vaut true par défaut si l'info n'est pas disponible.
  return navigator.onLine !== false
}

export default function OfflineBanner() {
  const [online, setOnline] = useState(getInitialOnline)
  const [dismissed, setDismissed] = useState(false)
  const [updateReg, setUpdateReg] = useState(null)

  useEffect(() => {
    function handleOnline() {
      setOnline(true)
      setDismissed(false)
    }
    function handleOffline() {
      setOnline(false)
      setDismissed(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Enregistre le service worker (no-op en dev) et écoute les mises à jour.
  useEffect(() => {
    registerServiceWorker({
      onUpdateAvailable: (registration) => setUpdateReg(registration),
    })
  }, [])

  if (updateReg) {
    return (
      <div className="jso-offline-banner" role="status" aria-live="polite">
        <div className="jso-offline-banner__inner jso-offline-banner__inner--update">
          <RefreshCw size={18} aria-hidden="true" className="shrink-0" />
          <p className="jso-offline-banner__text">
            Une nouvelle version du site est disponible.
          </p>
          <button
            type="button"
            onClick={() => activateWaitingWorker(updateReg)}
            className="jso-offline-banner__action"
          >
            Mettre à jour
          </button>
          <button
            type="button"
            aria-label="Ignorer"
            onClick={() => setUpdateReg(null)}
            className="jso-offline-banner__close"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    )
  }

  if (online || dismissed) return null

  return (
    <div className="jso-offline-banner" role="status" aria-live="polite">
      <div className="jso-offline-banner__inner">
        <CloudOff size={18} aria-hidden="true" className="shrink-0" />
        <p className="jso-offline-banner__text">
          <span className="font-black">Mode hors-ligne.</span>{' '}
          Vous consultez les dernières données enregistrées : elles peuvent ne
          pas être à jour.
        </p>
        <button
          type="button"
          aria-label="Masquer"
          onClick={() => setDismissed(true)}
          className="jso-offline-banner__close"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
