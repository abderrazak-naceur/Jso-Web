import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'

// Shared, non-blocking feedback for the whole back office. Replaces native
// alert() calls and ad-hoc inline notices. Usage:
//   const toast = useToast()
//   toast.success('Billet enregistré.') / toast.error('...') / toast.info('...')
const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

const STYLES = {
  success: { Icon: CheckCircle2, cls: 'border-emerald-200 bg-white text-emerald-800', icon: 'text-emerald-600' },
  error: { Icon: XCircle, cls: 'border-red-200 bg-white text-red-800', icon: 'text-red-600' },
  info: { Icon: Info, cls: 'border-slate-200 bg-white text-slate-700', icon: 'text-jso-blue' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback((type, message) => {
    if (!message) return
    const id = ++nextId.current
    setToasts((current) => [...current.slice(-3), { id, type, message }])
    window.setTimeout(() => dismiss(id), type === 'error' ? 6500 : 3500)
  }, [dismiss])

  const toast = {
    success: useCallback((m) => push('success', m), [push]),
    error: useCallback((m) => push('error', m), [push]),
    info: useCallback((m) => push('info', m), [push]),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-5 right-5 z-[300] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((item) => {
          const { Icon, cls, icon } = STYLES[item.type] || STYLES.info
          return (
            <div key={item.id} role="status" className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold shadow-xl ${cls}`}>
              <Icon size={19} className={`mt-0.5 shrink-0 ${icon}`} aria-hidden="true" />
              <p className="min-w-0 flex-1 leading-5">{item.message}</p>
              <button type="button" onClick={() => dismiss(item.id)} aria-label="Fermer la notification" className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
