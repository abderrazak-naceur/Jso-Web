import { useState } from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
import { accountApi } from '../../lib/api'
import { useDialog } from '../site/useDialog'

export default function AuthModal({ open, initialMode = 'login', onClose, onAuthenticated }) {
  return open ? <AuthForm initialMode={initialMode} onClose={onClose} onAuthenticated={onAuthenticated}/> : null
}

function AuthForm({ initialMode, onClose, onAuthenticated }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [anniversaryOptIn, setAnniversaryOptIn] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useDialog(() => { if (!busy) onClose?.() })

  const isRegister = mode === 'register'
  const passwordLongEnough = password.length >= 12

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = isRegister
        ? await accountApi.register({
            email: email.trim(),
            displayName: `${firstName.trim()} ${lastName.trim()}`,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            birthDate,
            phoneNumber: phoneNumber.trim(),
            anniversaryOptIn,
            password,
          })
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
      className="fixed inset-0 z-[80] grid place-items-center bg-jso-navy/60 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
      ref={dialogRef}
      tabIndex={-1}
    >
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-[2rem] bg-white p-5 text-jso-ink shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold tracking-[0.2em] text-jso-gold">ESPACE SUPPORTER</p>
            <h2 id="auth-title" className="mt-1 text-3xl font-black">
              {isRegister ? 'Créer un compte' : 'Se connecter'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Fermer"
            className="rounded-full border border-slate-200 p-2"
          >
            <X size={20} />
          </button>
        </div>

        {isRegister && <p className="mt-3 text-sm text-slate-500">Renseignez vos coordonnées pour créer votre profil supporter. Les messages d’anniversaire sont facultatifs.</p>}
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
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"
            />
          </div>

          {isRegister ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><label htmlFor="auth-first-name" className="text-sm font-bold">Prénom</label><input id="auth-first-name" required maxLength={100} autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" /></div>
                <div className="space-y-1.5"><label htmlFor="auth-last-name" className="text-sm font-bold">Nom</label><input id="auth-last-name" required maxLength={100} autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><label htmlFor="auth-birth-date" className="text-sm font-bold">Date de naissance</label><input id="auth-birth-date" type="date" required min="1900-01-01" max={new Date().toISOString().slice(0, 10)} autoComplete="bday" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" /></div>
                <div className="space-y-1.5"><label htmlFor="auth-phone" className="text-sm font-bold">Téléphone</label><input id="auth-phone" type="tel" required minLength={7} maxLength={32} autoComplete="tel" inputMode="tel" placeholder="+216 XX XXX XXX" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" /></div>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={anniversaryOptIn} onChange={(event) => setAnniversaryOptIn(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" /><span>Je souhaite recevoir un message pour mon anniversaire. <span className="text-slate-500">Ce choix peut être modifié dans mon profil.</span></span></label>
            </>
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
                autoComplete={isRegister ? 'new-password' : 'current-password'}
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

        {!isRegister && <p className="mt-4 text-center text-sm"><a href="/password-reset?type=fan" className="font-bold text-jso-blue hover:underline">Mot de passe oublié ?</a></p>}
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
