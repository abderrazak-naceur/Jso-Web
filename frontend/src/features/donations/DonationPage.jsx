import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowUpRight, BusFront, CheckCircle2, Copy, HeartHandshake, QrCode, Search, Share2, ShieldCheck, UsersRound, Wallet } from 'lucide-react'
import QRCode from 'qrcode'
import PayOnlineButton from '../shop/PayOnlineButton'
import { donationsApi } from '../../lib/api'
import { useFanSession } from '../account/useFanSession'
import { formatMoney } from '../../lib/format'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useI18n } from '../../i18n/index.jsx'
import StandalonePageHeader from '../site/StandalonePageHeader'
import { CLUB_SOCIALS } from '../site/brand'

const PRESETS = [5, 10, 20, 30, 50]
const PAYMENT_METHODS = [
  { id: 'flouci', label: 'Flouci', description: 'Paiement hébergé en Tunisie', group: 'online', country: 'TN' },
  { id: 'card', label: 'Carte bancaire', description: 'Visa / Mastercard via la passerelle de paiement', group: 'online', country: 'INTL' },
  { id: 'konnect', label: 'Konnect', description: 'Paiement hébergé en Tunisie', group: 'online', country: 'TN' },
  { id: 'paymee', label: 'Paymee', description: 'Paiement hébergé en Tunisie (e-mail requis)', group: 'online', country: 'TN' },
]
const CLUB_FACEBOOK_URL = CLUB_SOCIALS.find((social) => social.key === 'facebook').url


export default function DonationPage() {
  const { language } = useI18n()
  const fan = useFanSession()
  useDocumentTitle('Un bus pour la JSO | Nos projets')
  const [campaign, setCampaign] = useState(null)
  const [paymentMethods, setPaymentMethods] = useState(null)
  const [methodsLoading, setMethodsLoading] = useState(true)
  const [qrUrl, setQrUrl] = useState('')
  const [amount, setAmount] = useState(null)
  const [custom, setCustom] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [supporters, setSupporters] = useState({ items: [], page: 1, totalPages: 1, totalCount: 0 })
  const [supporterStatus, setSupporterStatus] = useState('')
  const [supporterSearch, setSupporterSearch] = useState('')
  const [donation, setDonation] = useState(null)
  const [cashSubmitting, setCashSubmitting] = useState(false)
  const [cashSubmitted, setCashSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState('')
  const pageUrl = window.location.origin + '/nos-projets'

  useEffect(() => {
    QRCode.toDataURL(pageUrl, {
      width: 256,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#071E42', light: '#FFFFFF' },
    }).then(setQrUrl).catch(() => setQrUrl(''))
  }, [pageUrl])

  useEffect(() => {
    const controller = new AbortController()
    donationsApi.campaign(controller.signal)
      .then((value) => {
        setCampaign(value)
        setError('')
      })
      .catch((e) => { if (!controller.signal.aborted) setError(e?.message || 'Impossible de charger la campagne.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    donationsApi.paymentMethods(controller.signal)
      .then((methods) => {
        setPaymentMethods(methods)
        setSelectedMethod(methods.flouci ? 'flouci' : methods.konnect ? 'konnect' : methods.paymee ? 'paymee' : methods.stripe ? 'card' : '')
      })
      .catch(() => { if (!controller.signal.aborted) setPaymentMethods({ flouci: false, stripe: false, konnect: false, paymee: false }) })
      .finally(() => { if (!controller.signal.aborted) setMethodsLoading(false) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    donationsApi.supporters(supporters.page, supporterStatus, supporterSearch, controller.signal)
      .then(setSupporters)
      .catch((e) => { if (!controller.signal.aborted) setError(e?.message || 'Impossible de charger la liste des soutiens.') })
    return () => controller.abort()
  }, [supporters.page, supporterStatus, supporterSearch])

  useEffect(() => {
    if (window.location.hash === '#faire-un-don') {
      requestAnimationFrame(() => document.getElementById('faire-un-don')?.scrollIntoView({ block: 'start' }))
    }
  }, [])

  const presets = [...new Set([...PRESETS, Number(campaign?.suggestedMonthlyContributionTnd || 10)])].sort((a, b) => a - b)
  const methods = PAYMENT_METHODS.filter((method) => Boolean(paymentMethods?.[method.id === 'card' ? 'stripe' : method.id]))

  const effectiveAmount = useMemo(() => {
    if (amount === 'custom') {
      const parsed = Number(custom)
      return Number.isFinite(parsed) ? parsed : 0
    }
    return Number(amount)
  }, [amount, custom])

  async function startDonation(country) {
    if (!['flouci', 'card', 'konnect', 'paymee'].includes(selectedMethod) ||
        !paymentMethods?.[selectedMethod === 'card' ? 'stripe' : selectedMethod]) {
      throw new Error('Ce moyen de paiement est en cours de raccordement au compte de paiement JSO.')
    }
    if (effectiveAmount < 1) throw new Error('Le montant minimum est de 1 TND.')
    if (!displayName.trim()) throw new Error('Indiquez le nom qui apparaîtra dans la liste publique.')
    if (selectedMethod === 'paymee' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      throw new Error('Une adresse e-mail valide est requise pour Paymee.')
    if (selectedMethod === 'paymee' && !phone.trim())
      throw new Error('Un numéro de téléphone est requis pour Paymee.')
    const created = await donationsApi.create({
      amount: effectiveAmount,
      displayName: displayName.trim(),
      phone: phone.trim() || null,
    }, fan.token)
    setDonation(created)
    return donationsApi.pay(created.id, country, selectedMethod === 'card' ? 'STRIPE' : selectedMethod.toUpperCase(), email.trim() || null)
  }

  async function submitCashPledge() {
    if (!displayName.trim()) { setError('Indiquez le nom qui apparaîtra dans la liste publique.'); return }
    if (effectiveAmount < 1) { setError('Le montant minimum est de 1 TND.'); return }
    setCashSubmitting(true)
    setError('')
    setCashSubmitted(false)
    try {
      const created = await donationsApi.cashPledge({
        amount: effectiveAmount,
        displayName: displayName.trim(),
        phone: phone.trim() || null,
      }, fan.token)
      setDonation(created)
      setCashSubmitted(true)
      setCampaign((current) => current ? { ...current, supporterCount: Number(current.supporterCount || current.donorCount || 0) + 1 } : current)
      setSupporterStatus('')
      setSupporterSearch('')
      setSupporters((current) => ({
        ...current,
        page: 1,
        totalCount: current.totalCount + 1,
        items: [{ ...created, paymentStatus: 'Pending', createdAt: new Date().toISOString(), paidAt: null }, ...current.items].slice(0, 10),
      }))
    } catch (e) {
      setError(e?.message || 'Impossible d’enregistrer votre promesse de don.')
    } finally {
      setCashSubmitting(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* browser fallback */ }
  }

  async function sharePage() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: campaign?.title || 'Soutenir la JSO',
          text: campaign?.description || 'Soutenez la Jeunesse Sportive de Oudhref.',
          url: pageUrl,
        })
        setShared(true)
        setTimeout(() => setShared(false), 1800)
        return
      }
      await copyLink()
    } catch { /* share can be cancelled by the user */ }
  }

  const goal = Number(campaign?.goalTnd || 10000)
  const total = Number(campaign?.totalPaidTnd || 0)
  const progress = goal > 0 ? Math.min(100, Math.max(0, total / goal * 100)) : 0

  return (
    <div className="min-h-screen bg-jso-paper text-jso-ink">
      <StandalonePageHeader />
      <main id="main-content" tabIndex={-1}>
      <section className="relative isolate overflow-hidden bg-jso-navy text-white">
        <img src="/jso-bus-campaign.png" alt="Un autocar de l’équipe devant un stade de football" className="absolute inset-0 -z-20 h-full w-full object-cover object-[66%_center] opacity-80" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#06162f]/95 via-[#06162f]/75 to-[#06162f]/25" />
        <img src="/jso-club-mark.svg" alt="" aria-hidden="true" className="absolute right-[20%] top-[38%] z-0 hidden h-28 drop-shadow-lg lg:block" />
        <div className="relative z-10 mx-auto max-w-7xl px-5 pb-8 pt-14 lg:px-8 lg:pb-10 lg:pt-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-jso-gold/40 bg-jso-gold/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-jso-gold">
              <HeartHandshake size={15} aria-hidden="true" /> Campagne de soutien
            </div>
            <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-tight sm:text-7xl">Un bus <span className="text-jso-gold">per la JSO</span></h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
              Ensemble pour un avenir plus fort. Aidons notre équipe à se déplacer en sécurité et dans de bonnes conditions.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#faire-un-don" className="inline-flex items-center gap-2 rounded-xl bg-jso-gold px-5 py-3.5 text-sm font-extrabold text-jso-navy shadow-lg shadow-black/20 hover:bg-white">
                <HeartHandshake size={17} aria-hidden="true" /> Devenir soutien
              </a>
              <button type="button" onClick={sharePage} className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-black/10 px-5 py-3.5 text-sm font-extrabold text-white hover:bg-white/10">
                <Share2 size={17} aria-hidden="true" /> {shared ? 'Partagé' : 'Partager'}
              </button>
              <button type="button" onClick={copyLink} className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-black/10 px-5 py-3.5 text-sm font-extrabold text-white hover:bg-white/10">
                <Copy size={17} aria-hidden="true" /> {copied ? 'Lien copié' : 'Copier le lien'}
              </button>
            </div>
          </div>

          <div className="mt-12 rounded-2xl border border-white/10 bg-[#071e42]/90 p-5 shadow-2xl backdrop-blur sm:p-6">
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              {[
              { label: 'Soutiens inscrits', value: campaign?.supporterCount ?? campaign?.donorCount ?? '—', icon: HeartHandshake },
                { label: 'Paiements confirmés', value: campaign?.donorCount ?? 0, icon: CheckCircle2 },
                { label: 'Total collecté', value: formatMoney(total, 'TND'), icon: Wallet },
                { label: 'Objectif', value: formatMoney(goal, 'TND'), icon: BusFront },
              ].map((stat) => <div key={stat.label} className="flex items-center gap-3 border-white/10 md:border-r md:px-4 md:first:pl-0 md:last:border-0">
                <stat.icon className="shrink-0 text-jso-gold" size={23} aria-hidden="true" />
                <div><p className="text-xl font-black sm:text-2xl">{stat.value}</p><p className="mt-1 text-[11px] font-semibold text-white/65 sm:text-xs">{stat.label}</p></div>
              </div>)}
            </div>
            <div className="mt-5 flex items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-jso-gold transition-all" style={{ width: progress + '%' }} /></div>
              <strong className="text-sm">{progress.toFixed(0)}%</strong>
            </div>
            <p className="mt-2 text-xs font-semibold text-white/55">Chaque contribution rapprochera l’équipe de son objectif.</p>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-7 px-5 py-10 md:grid-cols-[1.2fr_repeat(3,1fr)] lg:px-8">
          <div><h2 className="text-2xl font-black">Pourquoi un bus ?</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-600">Un bus dédié aidera la JSO à voyager avec plus de sécurité et de confort, tout en réduisant les coûts de déplacement du club.</p></div>
          {[[ShieldCheck, 'Sécurité', 'Des déplacements mieux organisés pour nos joueurs.'], [BusFront, 'Autonomie', 'Une équipe prête à voyager pour chaque rencontre.'], [UsersRound, 'Solidarité', 'Chaque soutien fait avancer le projet commun.']].map(([Icon, title, description]) => <div key={title} className="flex gap-3 md:block"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-jso-blue"><Icon size={21} aria-hidden="true" /></span><div><h3 className="mt-1 font-black">{title}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{description}</p></div></div>)}
        </div>
      </section>

      <section id="faire-un-don" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          {methodsLoading ? <div role="status" className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-600">Vérification des moyens de paiement…</div> : <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-jso-blue">Je soutiens ce projet</p>
                <h2 className="mt-2 text-2xl font-black">Chaque contribution compte.</h2>
              </div>
              {donation && <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">Contribution #{String(donation.id).slice(0, 8)}</span>}
            </div>

            {error && <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {presets.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setAmount(value); setCustom('') }}
                  className={'rounded-2xl border px-4 py-4 text-center font-black transition ' + (amount === value ? 'border-jso-navy bg-jso-navy text-white' : 'border-slate-200 hover:border-jso-blue')}
                >
                  {value} DT
                </button>
              ))}
            </div>

            <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-4 text-sm font-bold">
              <input type="radio" name="donation-amount" checked={amount === 'custom'} onChange={() => setAmount('custom')} />
              <span className="shrink-0">Autre montant</span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount === 'custom' ? custom : ''}
                onChange={(e) => { setAmount('custom'); setCustom(e.target.value) }}
                className="ml-auto w-28 rounded-xl border border-slate-200 px-3 py-2 text-right outline-none focus:border-jso-blue"
                placeholder="0.00"
              />
            </label>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold sm:col-span-2">
                Nom affiché <span className="text-red-600">*</span>
                <input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength="80" autoComplete="name" placeholder="Ex. Mohamed Khaled" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" />
                <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">Ce nom sera visible dans la liste publique des soutiens. Vos coordonnées ne sont jamais affichées.</span>
              </label>
              {selectedMethod === 'paymee' && <>
                <label className="text-sm font-bold">
                  E-mail <span className="text-red-600">*</span>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength="254" autoComplete="email" placeholder="vous@exemple.com" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" />
                </label>
                <label className="text-sm font-bold">
                  Téléphone <span className="text-red-600">*</span>
                  <input required value={phone} onChange={(e) => setPhone(e.target.value)} maxLength="32" inputMode="tel" autoComplete="tel" placeholder="+216 XX XXX XXX" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" />
                  <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">Ces coordonnées restent privées et servent uniquement à initier le paiement.</span>
                </label>
              </>}
            </div>
            <div className="mt-8 rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-bold text-slate-600">Montant choisi</p>
              <p className="mt-1 text-4xl font-black text-jso-navy">{effectiveAmount >= 1 ? formatMoney(effectiveAmount, 'TND') : 'Sélectionnez un montant'}</p>
            </div>

            <div className="mt-4 rounded-2xl border border-jso-gold/40 bg-jso-gold/10 p-4 text-sm">
              <strong className="block">Contribution ponctuelle</strong>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Cette opération est un don unique. Vous pourrez renouveler librement votre soutien chaque mois.</span>
            </div>

            <div className="mt-8">
              <p className="text-sm font-black">2 · Choisir un moyen disponible</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {methods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id)}
                    className={'rounded-2xl border p-4 text-left transition ' + (selectedMethod === method.id ? 'border-jso-navy bg-jso-navy text-white' : 'border-slate-200 bg-white hover:border-jso-blue')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-black">{method.label}</p>
                      <span className={'rounded-full px-2 py-1 text-[10px] font-black ' + (selectedMethod === method.id ? 'bg-white/15 text-white/80' : 'bg-emerald-50 text-emerald-700')}>Disponible</span>
                    </div>
                    <p className={'mt-1 text-xs ' + (selectedMethod === method.id ? 'text-white/65' : 'text-slate-500')}>{method.description}</p>
                  </button>
                ))}
                <button
                  key="cash"
                  type="button"
                  onClick={() => setSelectedMethod('cash')}
                  className={'rounded-2xl border p-4 text-left transition ' + (selectedMethod === 'cash' ? 'border-jso-navy bg-jso-navy text-white' : 'border-slate-200 bg-white hover:border-jso-blue')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black">Espèces (Cash)</p>
                    <span className={'rounded-full px-2 py-1 text-[10px] font-black ' + (selectedMethod === 'cash' ? 'bg-white/15 text-white/80' : 'bg-amber-50 text-amber-800')}>À confirmer</span>
                  </div>
                  <p className={'mt-1 text-xs ' + (selectedMethod === 'cash' ? 'text-white/65' : 'text-slate-500')}>Votre nom apparaît dans la liste des soutiens. Le don sera compté après réception par un responsable JSO.</p>
                </button>
              </div>
            </div>
            <div className="mt-6">
              {selectedMethod === 'cash' ? (
                <button type="button" onClick={submitCashPledge} disabled={effectiveAmount < 1 || loading || cashSubmitting} className="w-full rounded-full bg-jso-navy px-5 py-4 text-sm font-extrabold text-white disabled:opacity-50">
                  {cashSubmitting ? 'Enregistrement…' : 'Déclarer ma contribution en espèces'}
                </button>
              ) : methods.some((method) => method.id === selectedMethod) ? (
                <PayOnlineButton
                  key={selectedMethod}
                  pay={startDonation}
                  label="Continuer vers le paiement"
                  disabled={effectiveAmount < 1 || loading || !paymentMethods}
                  defaultCountry={selectedMethod === 'card' ? 'FR' : 'TN'}
                  fixedCountry
                  providerLabel={selectedMethod === 'card' ? 'Stripe' : PAYMENT_METHODS.find((method) => method.id === selectedMethod)?.label}
                />
              ) : (
                <p className="text-sm text-slate-600">Choisissez un moyen de paiement ci-dessus pour continuer.</p>
              )}
            </div>

            {cashSubmitted && <div role="status" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">Votre participation est enregistrée et visible dans la liste. Le statut restera « En attente » jusqu’à ce qu’un responsable JSO reçoive l’argent et confirme le paiement.</div>}
            <p className="mt-4 text-xs leading-5 text-slate-400">
              {selectedMethod === 'cash' ? 'Aucun paiement en ligne n’a été effectué. Le montant sera comptabilisé uniquement après confirmation du responsable.' : 'La page de paiement est hébergée par le prestataire. Le site JSO ne reçoit pas les données de carte.'}
            </p>
          </div>}

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <QrCode size={24} className="text-jso-blue" aria-hidden="true" />
                <h2 className="text-xl font-black">Partager le projet</h2>
              </div>
              <div className="mt-5 rounded-2xl bg-white p-4 text-center">
                {qrUrl
                  ? <img src={qrUrl} alt="QR scannable vers la page de soutien JSO" className="mx-auto h-56 w-56" />
                  : <div className="mx-auto grid h-56 w-56 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500">QR indisponible</div>}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-500">Ce QR ouvre la page de collecte JSO. Choisissez un paiement en ligne ou enregistrez une contribution en espèces à confirmer par le club.</p>
              {qrUrl && <a href={qrUrl} download="jso-soutenir-qr.png" className="mt-3 inline-block text-sm font-bold text-jso-blue underline">Télécharger le QR du projet</a>}
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={copyLink} className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-extrabold text-jso-navy hover:border-jso-blue">
                  <Copy size={15} aria-hidden="true" /> {copied ? 'Lien copié' : 'Copier'}
                </button>
                <a href={pageUrl} className="inline-flex items-center justify-center gap-2 rounded-full bg-jso-navy px-4 py-3 text-sm font-extrabold text-white hover:bg-jso-blue">
                  Ouvrir <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">Faire un don en espèces</h2>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600">
                <li>Adressez-vous à un vendeur ou à une boutique JSO autorisée.</li>
                <li>Remettez le montant choisi. Le personnel enregistre le don dans son espace JSO.</li>
                <li>Demandez immédiatement le reçu numéroté et conservez son lien de vérification.</li>
              </ol>
              <p className="mt-4 text-xs leading-5 text-slate-500">Une déclaration en espèces reste en attente et n’est pas ajoutée au total collecté tant qu’un responsable n’a pas confirmé la réception.</p>
              <a href={CLUB_FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-jso-blue underline">Demander un point de collecte sur Facebook <ArrowUpRight size={15} aria-hidden="true" /></a>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-jso-blue">La communauté JSO</p>
              <h2 className="mt-2 text-3xl font-black">Nos soutiens</h2>
              <p className="mt-2 text-sm text-slate-500">Merci à chaque personne qui participe au projet.</p>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les soutiens">
              {[['', 'Tous'], ['paid', 'Paiements confirmés'], ['pending', 'À confirmer']].map(([value, label]) => <button key={value || 'all'} type="button" onClick={() => { setSupporterStatus(value); setSupporters((current) => ({ ...current, page: 1 })) }} className={'rounded-lg px-3 py-2 text-xs font-extrabold ' + (supporterStatus === value ? 'bg-jso-navy text-white' : 'border border-slate-200 text-slate-600 hover:border-jso-blue')}>{label}</button>)}
            </div>
          </div>
          <label className="mt-6 flex max-w-md items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-400 focus-within:border-jso-blue">
            <Search size={17} aria-hidden="true" />
            <input value={supporterSearch} onChange={(event) => { setSupporterSearch(event.target.value); setSupporters((current) => ({ ...current, page: 1 })) }} placeholder="Rechercher un nom" className="min-w-0 flex-1 text-slate-800 outline-none" />
          </label>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Nom affiché</th><th className="px-4 py-3">Contribution</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Participation</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {supporters.items.map((item, index) => <tr key={item.id}>
                  <td className="px-4 py-3 text-slate-400">{(supporters.page - 1) * 10 + index + 1}</td>
                  <td className="px-4 py-3 font-bold text-jso-ink">{item.displayName}</td>
                  <td className="px-4 py-3 font-extrabold">{formatMoney(item.amount, 'TND')}</td>
                  <td className="px-4 py-3"><span className={'inline-flex rounded-full px-2.5 py-1 text-xs font-bold ' + (item.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')}>{item.paymentStatus === 'Paid' ? 'Payé' : 'À confirmer'}</span></td>
                  <td className="px-4 py-3 text-slate-500">{new Date(item.paidAt || item.createdAt).toLocaleDateString(language === 'ar' ? 'ar-TN' : language === 'it' ? 'it-IT' : language === 'en' ? 'en-GB' : 'fr-FR')}</td>
                </tr>)}
                {supporters.items.length === 0 && <tr><td colSpan="5" className="px-4 py-12 text-center text-slate-500">Aucun soutien pour ce filtre. Soyez le premier à participer.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <p>{supporters.totalCount} soutien{supporters.totalCount === 1 ? '' : 's'} affiché{supporters.totalCount === 1 ? '' : 's'}</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setSupporters((current) => ({ ...current, page: Math.max(1, current.page - 1) }))} disabled={supporters.page <= 1} className="rounded-lg border border-slate-200 px-3 py-2 font-bold disabled:opacity-40">Précédent</button>
              <span className="min-w-16 text-center text-xs font-bold">{supporters.page} / {Math.max(1, supporters.totalPages)}</span>
              <button type="button" onClick={() => setSupporters((current) => ({ ...current, page: Math.min(current.totalPages, current.page + 1) }))} disabled={supporters.page >= supporters.totalPages} className="rounded-lg border border-slate-200 px-3 py-2 font-bold disabled:opacity-40">Suivant</button>
            </div>
          </div>
        </div>
      </section>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-8 lg:px-8">
          <a href="/" className="inline-flex items-center gap-2 text-sm font-extrabold text-jso-navy hover:text-jso-blue">
            <ArrowLeft size={16} aria-hidden="true" /> Retour à l’accueil
          </a>
          <p className="text-xs font-semibold text-slate-400">© {new Date().getFullYear()} Jeunesse Sportive de Oudhref</p>
        </div>
      </footer>
    </div>
  )
}
