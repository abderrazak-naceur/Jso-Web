import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { accountApi } from '../../lib/api'

function formatMemberSince(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function ProfileModal({ open, token, user, onClose, onUpdated }) {
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [anniversaryOptIn, setAnniversaryOptIn] = useState(false)
  const [birthDate, setBirthDate] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError('')
    accountApi
      .me(token)
      .then((data) => {
        if (cancelled) return
        setProfile(data)
        setDisplayName(data?.displayName ?? '')
        setAnniversaryOptIn(Boolean(data?.anniversaryOptIn))
        setBirthDate(data?.birthDate ?? '')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || 'Impossible de charger le profil.')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, token])

  if (!open) return null

  const onSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const updated = await accountApi.updateProfile(
        {
          displayName,
          anniversaryOptIn,
          birthDate: anniversaryOptIn ? birthDate || null : null,
        },
        token,
      )
      onUpdated(updated)
      onClose()
    } catch (err) {
      setError(err?.message || 'La mise à jour a échoué.')
    } finally {
      setBusy(false)
    }
  }

  const email = profile?.email ?? user?.email ?? ''
  const emailVerified = profile?.emailVerified ?? user?.emailVerified ?? false
  const memberSince = profile?.memberSince ?? user?.memberSince ?? null

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-jso-navy/60 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Mon profil"
    >
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 text-jso-ink shadow-2xl">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-extrabold tracking-[0.2em] text-jso-gold">MON PROFIL</p>
            <h2 className="mt-2 text-3xl font-black">Mon profil</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <p className="mt-8 text-sm font-semibold text-slate-500">Chargement…</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-bold" htmlFor="profile-email">
                  Email
                </label>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                    emailVerified ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {emailVerified ? 'Vérifié' : 'Non vérifié'}
                </span>
              </div>
              <input
                id="profile-email"
                type="email"
                value={email}
                readOnly
                disabled
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-500 outline-none focus:border-jso-blue"
              />
            </div>

            <div>
              <label className="text-sm font-bold" htmlFor="profile-display-name">
                Nom affiché
              </label>
              <input
                id="profile-display-name"
                type="text"
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"
              />
            </div>

            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={anniversaryOptIn}
                onChange={(event) => setAnniversaryOptIn(event.target.checked)}
              />
              Recevoir un message d’anniversaire
            </label>

            {anniversaryOptIn && (
              <div>
                <label className="text-sm font-bold" htmlFor="profile-birth-date">
                  Date de naissance
                </label>
                <input
                  id="profile-birth-date"
                  type="date"
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"
                />
              </div>
            )}

            <p className="text-sm font-semibold text-slate-500">
              Membre depuis&nbsp;: {formatMemberSince(memberSince)}
            </p>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-jso-navy px-4 py-3 font-extrabold text-white hover:bg-jso-blue disabled:opacity-60"
            >
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
