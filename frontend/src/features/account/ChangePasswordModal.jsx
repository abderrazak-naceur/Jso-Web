import { useState } from 'react'
import { X } from 'lucide-react'
import { accountApi } from '../../lib/api'

export default function ChangePasswordModal({ open, token, onClose, onChanged }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!open) return null

  const reset = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 12) {
      setError('Le nouveau mot de passe doit contenir au moins 12 caractères.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setBusy(true)
    try {
      await accountApi.changePassword({ currentPassword, newPassword }, token)
      setSuccess('Mot de passe mis à jour.')
      reset()
      onChanged?.()
      setTimeout(() => {
        onClose?.()
      }, 1200)
    } catch (err) {
      setError(err?.message || 'Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setBusy(false)
    }
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
            <p className="text-xs font-extrabold tracking-[0.2em] text-jso-gold">SÉCURITÉ</p>
            <h2 className="text-3xl font-black">Changer le mot de passe</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-sm font-semibold" htmlFor="current-password">
              Mot de passe actuel
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold" htmlFor="new-password">
              Nouveau mot de passe
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"
              minLength={12}
              required
            />
            <p className="text-xs text-slate-500">au moins 12 caractères</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold" htmlFor="confirm-password">
              Confirmer le nouveau mot de passe
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"
              minLength={12}
              required
            />
          </div>

          {error ? (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {success}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-jso-navy px-4 py-3 font-extrabold text-white hover:bg-jso-blue disabled:opacity-60"
          >
            {busy ? 'Enregistrement…' : 'Mettre à jour'}
          </button>
        </form>
      </div>
    </div>
  )
}
