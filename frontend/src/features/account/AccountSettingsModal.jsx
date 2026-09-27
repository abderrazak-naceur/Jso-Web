import { useState } from 'react'
import { X, User, ShieldCheck, Bell } from 'lucide-react'

export default function AccountSettingsModal({ open, user, onClose, onOpenProfile, onOpenChangePassword }) {
  const [tab, setTab] = useState('profil')

  if (!open) return null

  const tabs = [
    { id: 'profil', label: 'Profil', icon: User },
    { id: 'securite', label: 'Sécurité', icon: ShieldCheck },
    { id: 'preferences', label: 'Préférences', icon: Bell },
  ]

  const tabClass = (id) =>
    `rounded-full px-4 py-2 text-sm font-bold ${
      tab === id ? 'bg-jso-navy text-white' : 'text-slate-600 hover:bg-slate-100'
    }`

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-jso-navy/60 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl rounded-[2rem] bg-white p-8 text-jso-ink shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-jso-gold">
              PARAMÈTRES
            </p>
            <h2 className="text-3xl font-black">Mon compte</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full border border-slate-200 p-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={tabClass(id)}>
              <span className="inline-flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'profil' && (
            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-black">Profil</h3>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Nom</p>
                  <p className="font-semibold">{user?.displayName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Adresse e-mail
                  </p>
                  <p className="font-semibold">{user?.email || '—'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenProfile}
                className="mt-5 rounded-xl bg-jso-navy px-4 py-3 font-extrabold text-white hover:bg-jso-blue"
              >
                Modifier le profil
              </button>
            </div>
          )}

          {tab === 'securite' && (
            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-black">Sécurité</h3>
              <p className="mt-3 text-sm text-slate-600">
                Gérez la sécurité de votre compte. Pour protéger votre accès, choisissez un mot de
                passe unique et suffisamment long.
              </p>
              <button
                type="button"
                onClick={onOpenChangePassword}
                className="mt-5 rounded-xl bg-jso-navy px-4 py-3 font-extrabold text-white hover:bg-jso-blue"
              >
                Changer le mot de passe
              </button>
            </div>
          )}

          {tab === 'preferences' && (
            <div className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-lg font-black">Préférences</h3>
              <p className="mt-3 text-sm text-slate-600">
                Bientôt, vous pourrez choisir les notifications que vous souhaitez recevoir : alertes
                sur les matchs, résultats en direct et actualités du club. Vous pourrez également
                gérer votre abonnement à la newsletter directement depuis cet espace.
              </p>
              <p className="mt-4 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                Bientôt disponible
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
