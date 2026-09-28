// Enregistrement du service worker "mode stade hors-ligne" (idée E19).
//
// - Enregistrement après le chargement de la page pour ne pas ralentir le
//   premier rendu.
// - Détection d'une nouvelle version : quand un SW est "installed" alors qu'un
//   contrôleur existe déjà, on notifie l'app via un callback (bannière de
//   mise à jour). L'activation reste manuelle (message SKIP_WAITING) pour
//   éviter toute boucle de rechargement.

let refreshing = false

export function registerServiceWorker({ onUpdateAvailable } = {}) {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  // Uniquement en production : en dev, Vite sert les modules et un SW gênerait
  // le HMR.
  if (import.meta.env && import.meta.env.DEV) return

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            // "installed" + un contrôleur existant = mise à jour disponible.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              if (typeof onUpdateAvailable === 'function') {
                onUpdateAvailable(registration)
              }
            }
          })
        })
      })
      .catch(() => {
        // Échec silencieux : l'app fonctionne normalement sans SW.
      })

    // Quand le nouveau SW prend le contrôle, on recharge une seule fois.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })
  })
}

// Demande au SW en attente de s'activer immédiatement (déclenché par le bouton
// "Mettre à jour"). Le rechargement suivra via l'événement controllerchange.
export function activateWaitingWorker(registration) {
  const waiting = registration && registration.waiting
  if (waiting) {
    waiting.postMessage({ type: 'SKIP_WAITING' })
  }
}
