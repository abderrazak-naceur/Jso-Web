import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

// Promise-based replacement for the native confirm() dialog, styled with the
// admin design language. Usage:
//   const confirm = useConfirm()
//   if (await confirm({ title: 'Supprimer ?', message: '…', confirmLabel: 'Supprimer', danger: true })) { … }
const ConfirmContext = createContext(null)

export function useConfirm() {
  return useContext(ConfirmContext)
}

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null)
  const resolverRef = useRef(null)

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolverRef.current = resolve
    // String shorthand (drop-in replacement for native confirm): a plain
    // message implies a destructive action, so the dialog uses the danger style.
    const opts = typeof options === 'string' ? { message: options, danger: true } : options
    setRequest({ title: 'Confirmer', message: '', confirmLabel: 'Confirmer', cancelLabel: 'Annuler', danger: false, ...opts })
  }), [])

  const settle = useCallback((answer) => {
    resolverRef.current?.(answer)
    resolverRef.current = null
    setRequest(null)
  }, [])

  useEffect(() => {
    if (!request) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') settle(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [request, settle])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <div className="fixed inset-0 z-[290] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) settle(false) }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="jso-confirm-title" aria-describedby="jso-confirm-message" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${request.danger ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-jso-blue'}`}>
                <AlertTriangle size={21} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 id="jso-confirm-title" className="text-lg font-black text-slate-900">{request.title}</h3>
                {request.message && <p id="jso-confirm-message" className="mt-1.5 text-sm leading-6 text-slate-600">{request.message}</p>}
              </div>
              <button type="button" onClick={() => settle(false)} aria-label="Fermer" className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => settle(false)} autoFocus className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                {request.cancelLabel}
              </button>
              <button type="button" onClick={() => settle(true)} className={`rounded-xl px-4 py-2.5 text-sm font-black text-white ${request.danger ? 'bg-red-700 hover:bg-red-800' : 'bg-jso-navy hover:bg-jso-blue'}`}>
                {request.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
