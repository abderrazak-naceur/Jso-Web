import { useState } from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
import { accountApi } from '../../lib/api'

export default function AuthModal({ open, initialMode = 'login', onClose, onAuthenticated }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const isRegister = mode === 'register'
  const passwordLongEnough = password.length >= 12

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = isRegister
        ? await accountApi.register({ email, displayName, password })
        : await accountApi.login({ email, password })
      onAuthenticated?.(result)
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setBusy(false)
    }
  }

  function switchMode() {
    setMode(isRegister ? 'login' : 'register')
    setError('')
  }

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-jso-navy/60 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 text-jso-ink shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold tracking-[0.2em] text-jso-gold">ESPACE SUPPORTER</p>
            <h2 className="mt-1 text-3xl font-black">
              {isRegister ? 'Créer un compte' : 'Se connecter'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full border border-slate-200 p-2"
          >
            <X size={20} />
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {error ? (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="auth-email" className="text-sm font-bold">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"
            />
          </div>

          {isRegister ? (
            <div className="space-y-1.5">
              <label htmlFor="auth-display-name" className="text-sm font-bold">
                Nom affiché
              </label>
              <input
                id="auth-display-name"
                type="text"
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="auth-password" className="text-sm font-bold">
              Mot de passe{' '}
              {isRegister ? (
                <span className="font-medium text-slate-500">(au moins 12 caractères)</span>
              ) : null}
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={isRegister ? 12 : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 outline-none focus:border-jso-blue"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-500 hover:text-jso-blue"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {isRegister ? (
              <p
                className={`text-xs font-bold ${
                  passwordLongEnough ? 'text-green-600' : 'text-slate-400'
                }`}
              >
                12+ caractères
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-jso-navy px-4 py-3 font-extrabold text-white hover:bg-jso-blue disabled:opacity-60"
          >
            {busy ? 'Veuillez patienter…' : isRegister ? 'Créer mon compte' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {isRegister ? 'Vous avez déjà un compte ?' : 'Pas encore de compte ?'}{' '}
          <button type="button" onClick={switchMode} className="font-bold text-jso-blue">
            {isRegister ? 'Se connecter' : 'Créer un compte'}
          </button>
        </p>
      </div>
    </div>
  )
}
