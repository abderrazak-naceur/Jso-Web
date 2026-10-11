import { useEffect, useState } from 'react'
import { ArrowLeft, Camera, CheckCircle2, Crown, Mail, CalendarDays, ShieldCheck, UserRound, Save, Trash2 } from 'lucide-react'
import { accountApi } from '../../lib/api'
import { useFanSession } from './useFanSession'
import AuthModal from './AuthModal'
import StandalonePageHeader from '../site/StandalonePageHeader'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { prepareProfilePhoto } from './profilePhoto'
import { API_BASE_URL } from '../../lib/apiConfig'
import { getSupporterLevel, SUPPORTER_LEVELS } from './supporterLevel'

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function SupporterProfilePage() {
  const fan = useFanSession()
  const [authOpen, setAuthOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [profile, setProfile] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [anniversaryOptIn, setAnniversaryOptIn] = useState(false)
  const [birthDate, setBirthDate] = useState('')
  const [photo, setPhoto] = useState('')
  const [photoError, setPhotoError] = useState('')
  useDocumentTitle('Mon profil — JSO')

  useEffect(() => {
    if (fan.status !== 'authenticated' || !fan.token) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    accountApi.me(fan.token).then((data) => {
      if (!active) return
      setProfile(data)
      setPhoto(data?.profilePhotoUrl ? new URL(data.profilePhotoUrl, API_BASE_URL).href : '')
      setDisplayName(data?.displayName || '')
      setAnniversaryOptIn(Boolean(data?.anniversaryOptIn))
      setBirthDate(data?.birthDate ? String(data.birthDate).slice(0, 10) : '')
      setError('')
    }).catch((err) => {
      if (active) setError(err?.message || 'Impossible de charger votre profil.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [fan.status, fan.token])

  const name = displayName || fan.user?.displayName || fan.user?.email?.split('@')[0] || 'Supporter JSO'
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'JS'
  const level = getSupporterLevel(profile?.loginDaysCount ?? fan.user?.loginDaysCount)

  async function choosePhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPhotoBusy(true)
    setPhotoError('')
    try {
      const prepared = await prepareProfilePhoto(file)
      const blob = await (await fetch(prepared)).blob()
      const uploaded = await accountApi.uploadPhoto(new File([blob], 'profile.jpg', { type: 'image/jpeg' }), fan.token)
      const next = uploaded.profilePhotoUrl ? new URL(uploaded.profilePhotoUrl, API_BASE_URL).href : ''
      setPhoto(next)
      setProfile(previous => ({ ...previous, profilePhotoUrl: uploaded.profilePhotoUrl }))
      setNotice('Photo de profil enregistrée sur votre compte.')
    } catch (err) {
      setPhotoError(err?.message || 'Impossible de charger cette photo.')
    } finally {
      setPhotoBusy(false)
    }
  }

  function removePhoto() {
    try {
      accountApi.deletePhoto(fan.token).then(() => {
        setPhoto('')
        setProfile(previous => ({ ...previous, profilePhotoUrl: null }))
        setNotice('Photo retirée. Vos initiales sont affichées.')
      }).catch(err => setPhotoError(err?.message || 'Impossible de retirer la photo.'))
      setPhotoError('')
    } catch (err) {
      setPhotoError(err?.message || 'Impossible de retirer la photo.')
    }
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const updated = await accountApi.updateProfile({
        displayName,
        anniversaryOptIn,
        birthDate: anniversaryOptIn ? birthDate || null : null,
      }, fan.token)
      setProfile((previous) => ({ ...previous, ...updated }))
      fan.updateUser({ ...updated })
      setNotice('Votre profil a été enregistré.')
    } catch (err) {
      setError(err?.message || 'L’enregistrement a échoué. Réessayez.')
    } finally {
      setSaving(false)
    }
  }

  if (fan.status === 'unknown' || loading) {
    return <div className="min-h-screen bg-jso-paper"><StandalonePageHeader /><main className="mx-auto max-w-5xl px-5 py-20 text-center text-sm font-semibold text-slate-500">Chargement de votre profil…</main></div>
  }

  if (fan.status !== 'authenticated' || !fan.token) {
    return <div className="min-h-screen bg-jso-paper text-jso-ink"><StandalonePageHeader /><main className="mx-auto max-w-3xl px-5 py-16"><a href="/" className="inline-flex items-center gap-2 text-sm font-bold text-jso-blue"><ArrowLeft size={16} /> Retour au site</a><section className="mt-8 rounded-[2rem] bg-jso-navy p-8 text-white shadow-xl sm:p-12"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-jso-gold"><ShieldCheck size={28} /></span><p className="mt-6 text-xs font-extrabold tracking-[0.2em] text-jso-gold">ESPACE SUPPORTER</p><h1 className="mt-2 text-3xl font-black">Votre profil JSO</h1><p className="mt-4 leading-7 text-white/75">Connectez-vous pour consulter et personnaliser votre profil supporter.</p><button type="button" onClick={() => setAuthOpen(true)} className="mt-7 rounded-full bg-jso-gold px-6 py-3 font-extrabold text-jso-navy transition hover:bg-white">Se connecter</button></section></main><AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthenticated={(result) => { fan.signIn(result); setAuthOpen(false) }} /></div>
  }

  return <div className="min-h-screen bg-slate-50 text-jso-ink">
    <StandalonePageHeader />
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <a href="/account" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-jso-blue"><ArrowLeft size={16} /> Mon espace supporter</a>
      <div className="mt-5 overflow-hidden rounded-[2rem] bg-jso-navy text-white shadow-xl">
        <div className="relative px-6 py-8 sm:px-10 sm:py-10">
          <div className="absolute inset-0 opacity-20" aria-hidden="true" style={{ background: 'radial-gradient(circle at 85% 10%, #ffd700 0, transparent 32%), radial-gradient(circle at 10% 100%, #1769e0 0, transparent 40%)' }} />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative h-28 w-28 shrink-0 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 p-1 shadow-lg">
              <div className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-white text-2xl font-black text-jso-navy">{photo ? <img src={photo} alt={`Photo de profil de ${name}`} className="h-full w-full object-cover" /> : initials}</div>
              <span className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full border-2 border-jso-navy bg-jso-gold text-jso-navy"><Crown size={17} /></span>
            </div>
            <div className="min-w-0 flex-1"><p className="text-xs font-extrabold tracking-[0.22em] text-jso-gold">ESPACE PERSONNEL JSO</p><h1 className="mt-2 break-words text-3xl font-black sm:text-4xl">{name}</h1><p className="mt-2 flex items-center gap-2 break-all text-sm text-white/70"><Mail size={15} /> {profile?.email || fan.user?.email}</p><div className="mt-4 flex flex-wrap items-center gap-2"><span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-extrabold text-amber-200">{level.name} · {'★'.repeat(level.stars)}{'☆'.repeat(5-level.stars)}</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80"><CalendarDays size={13} className="mr-1 inline" /> Membre depuis {formatDate(profile?.memberSince)}</span></div></div>
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-jso-gold px-4 py-3 text-sm font-extrabold text-jso-navy transition hover:bg-white sm:self-center"><Camera size={17} /> {photoBusy ? 'Préparation…' : 'Changer la photo'}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={choosePhoto} disabled={photoBusy} /></label>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold tracking-[0.18em] text-jso-blue">VOS INFORMATIONS</p><h2 className="mt-2 text-2xl font-black">Informations personnelles</h2><p className="mt-2 text-sm leading-6 text-slate-500">Gardez vos informations à jour pour profiter pleinement des services du club.</p></div><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-jso-blue"><UserRound size={21} /></span></div>
          {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
          {notice && <div role="status" className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><CheckCircle2 size={17} />{notice}</div>}
          {photoError && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{photoError}</p>}
          <form onSubmit={submit} className="mt-6 space-y-5">
            <div><label htmlFor="supporter-name" className="mb-2 block text-sm font-bold">Nom affiché</label><input id="supporter-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={100} autoComplete="name" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-jso-blue focus:ring-4 focus:ring-blue-100" /></div>
            <div><label htmlFor="supporter-email" className="mb-2 flex items-center justify-between gap-3 text-sm font-bold">Adresse e-mail<span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${profile?.emailVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{profile?.emailVerified ? 'Vérifiée' : 'Non vérifiée'}</span></label><input id="supporter-email" type="email" value={profile?.email || fan.user?.email || ''} readOnly disabled className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500" /></div>
            <div className="rounded-2xl border border-slate-200 p-4 sm:p-5"><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={anniversaryOptIn} onChange={(event) => setAnniversaryOptIn(event.target.checked)} className="mt-1 h-4 w-4 accent-blue-600" /><span><span className="block text-sm font-extrabold">Recevoir un message pour votre anniversaire</span><span className="mt-1 block text-sm leading-5 text-slate-500">Puoi scegliere se condividere la data per ricevere un augurio dal club.</span></span></label>{anniversaryOptIn && <div className="mt-4"><label htmlFor="supporter-birthdate" className="mb-2 block text-sm font-bold">Data di nascita</label><input id="supporter-birthdate" type="date" value={birthDate} max={new Date().toISOString().slice(0,10)} onChange={(event) => setBirthDate(event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue focus:ring-4 focus:ring-blue-100" /></div>}</div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><button type="button" onClick={removePhoto} disabled={!photo} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={16} /> Rimuovi foto</button><button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-jso-blue px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-jso-navy disabled:cursor-wait disabled:opacity-60"><Save size={17} /> {saving ? 'Enregistrement en cours…' : 'Enregistrer le profil'}</button></div>
          </form>
        </section>
        <aside className="space-y-6">
          <section className="rounded-[1.75rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-jso-navy text-jso-gold"><Crown size={21} /></span><div><p className="text-xs font-extrabold tracking-[0.15em] text-amber-700">FIDÉLITÉ JSO</p><h2 className="text-xl font-black">{level.name}</h2></div></div><p className="mt-4 text-sm leading-6 text-slate-600">{level.days} jour(s) d’activité sur votre compte.</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-amber-100"><div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all" style={{ width: `${level.progress}%` }} /></div><p className="mt-2 text-xs font-semibold text-slate-500">{level.next ? `${level.remaining} jour(s) avant le niveau suivant` : 'Niveau maximum atteint !'}</p><div className="mt-4 grid grid-cols-5 gap-1">{SUPPORTER_LEVELS.map((item) => <div key={item.name} className={`rounded-lg px-1 py-2 text-center ${level.index >= SUPPORTER_LEVELS.indexOf(item) ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-400'}`}><p className="text-xs font-black">{item.stars} ★</p><p className="mt-1 text-[9px] font-bold leading-tight">{item.name}</p></div>)}</div></section>
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck size={19} /></span><h2 className="font-black">Votre compte</h2></div><p className="mt-3 text-sm leading-6 text-slate-500">Vos informations personnelles sont accessibles uniquement après connexion à votre compte.</p><a href="/account" className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-jso-blue hover:text-jso-navy">Accéder à mon espace <ArrowLeft size={15} className="rotate-180" /></a></section>
        </aside>
      </div>
      <p className="mt-5 text-center text-xs leading-5 text-slate-400">Votre photo est enregistrée dans ce navigateur sur cet appareil. La synchronisation de la photo entre plusieurs appareils nécessite un stockage photo côté serveur.</p>
    </main>
  </div>
}
