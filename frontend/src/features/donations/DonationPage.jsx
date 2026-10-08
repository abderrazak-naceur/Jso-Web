import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Copy, HeartHandshake, QrCode, Share2, Wallet } from 'lucide-react'
import QRCode from 'qrcode'
import PayOnlineButton from '../shop/PayOnlineButton'
import { donationsApi } from '../../lib/api'
import { formatMoney } from '../../lib/format'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useI18n } from '../../i18n/index.jsx'
import StandalonePageHeader from '../site/StandalonePageHeader'
import { CLUB_SOCIALS } from '../site/brand'

const PRESETS = [5, 10, 20, 50, 100, 250]
const PAYMENT_METHODS = [
  { id: 'flouci', label: 'Flouci', description: 'Paiement hébergé en Tunisie', group: 'online', country: 'TN' },
  { id: 'card', label: 'Carte bancaire', description: 'Visa / Mastercard via la passerelle de paiement', group: 'online', country: 'INTL' },
  { id: 'konnect', label: 'Konnect', description: 'Paiement hébergé en Tunisie', group: 'online', country: 'TN' },
  { id: 'paymee', label: 'Paymee', description: 'Paiement hébergé en Tunisie (e-mail requis)', group: 'online', country: 'TN' },
]
const CLUB_FACEBOOK_URL = CLUB_SOCIALS.find((social) => social.key === 'facebook').url


export default function DonationPage() {
  const { language } = useI18n()
  useDocumentTitle('Soutenir la JSO')
  const [campaign, setCampaign] = useState(null)
  const [paymentMethods, setPaymentMethods] = useState(null)
  const [methodsLoading, setMethodsLoading] = useState(true)
  const [methodsError, setMethodsError] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [amount, setAmount] = useState(null)
  const [custom, setCustom] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [message, setMessage] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [whatsappOptIn, setWhatsappOptIn] = useState(false)
  const [donation, setDonation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState('')
  const pageUrl = window.location.origin + '/soutenir'

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
        setAmount((current) => current ?? Number(value.suggestedMonthlyContributionTnd || 10))
      })
      .catch((e) => { if (!controller.signal.aborted) setError(e?.message || 'Impossible de charger la campagne.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    donationsApi.paymentMethods(controller.signal)
      .then((methods) => {
        setPaymentMethods(methods)
        setMethodsError(false)
        setSelectedMethod(methods.flouci ? 'flouci' : methods.konnect ? 'konnect' : methods.paymee ? 'paymee' : methods.stripe ? 'card' : '')
      })
      .catch(() => { if (!controller.signal.aborted) { setPaymentMethods({ flouci: false, stripe: false, konnect: false, paymee: false }); setMethodsError(true) } })
      .finally(() => { if (!controller.signal.aborted) setMethodsLoading(false) })
    return () => controller.abort()
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
    if (selectedMethod === 'paymee' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      throw new Error('Une adresse e-mail valide est requise pour Paymee.')
    if (selectedMethod === 'paymee' && !phone.trim())
      throw new Error('Un numéro de téléphone est requis pour Paymee.')
    const created = await donationsApi.create({
      amount: effectiveAmount,
      displayName: displayName.trim() || null,
      message: message.trim() || null,
      phone: phone.trim() || null,
      whatsappOptIn: Boolean(phone.trim() && whatsappOptIn),
    })
    setDonation(created)
    return donationsApi.pay(created.id, country, selectedMethod === 'card' ? 'STRIPE' : selectedMethod.toUpperCase(), email.trim() || null)
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
  const monthlyTotal = Number(campaign?.monthlyPaidTnd || 0)
  const progress = goal > 0 ? Math.min(100, Math.max(0, monthlyTotal / goal * 100)) : 0

  return (
    <div className="min-h-screen bg-jso-paper text-jso-ink">
      <StandalonePageHeader />
      <main id="main-content" tabIndex={-1}>
      <section className="overflow-hidden bg-jso-navy text-white">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-jso-gold/30 bg-jso-gold/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-jso-gold">
                <HeartHandshake size={15} aria-hidden="true" />
                Soutenir le club
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">
                Ensemble, faisons grandir la JSO.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
                Votre contribution aide le club à financer son fonctionnement, ses jeunes, ses déplacements et ses projets.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#faire-un-don" className="inline-flex items-center gap-2 rounded-full bg-jso-gold px-5 py-3 text-sm font-extrabold text-jso-navy hover:bg-white">
                  <HeartHandshake size={17} aria-hidden="true" /> Comment faire un don
                </a>
                <button type="button" onClick={sharePage} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-extrabold text-white hover:bg-white/10">
                  <Share2 size={17} aria-hidden="true" /> {shared ? 'Partagé' : 'Partager'}
                </button>
                <button type="button" onClick={copyLink} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-extrabold text-white hover:bg-white/10">
                  <Copy size={17} aria-hidden="true" /> {copied ? 'Lien copié' : 'Copier le lien'}
                </button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-jso-gold">Campagne</p>
                  <h2 className="mt-2 text-2xl font-black">{campaign?.title || 'Soutien JSO'}</h2>
                </div>
                <Wallet className="text-jso-gold/80" size={30} aria-hidden="true" />
              </div>
              <div className="mt-8">
                <div className="flex items-end justify-between gap-3">
                  <strong className="text-3xl font-black">{formatMoney(monthlyTotal, 'TND')}</strong>
                  <span className="text-sm font-bold text-white/45">objectif {formatMoney(goal, 'TND')}</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-jso-gold transition-all" style={{ width: progress + '%' }} />
                </div>
                <p className="mt-3 text-sm font-semibold text-white/55">{progress.toFixed(0)}% de l’objectif ce mois-ci · {formatMoney(total, 'TND')} collectés depuis le début · {campaign?.donorCount || 0} contributions confirmées</p>
                <div className="mt-4 rounded-xl bg-white/5 p-3 text-sm">
                  <strong>Objectif mensuel du club</strong>
                  <p className="mt-1 text-white/55">Suggestion : {formatMoney(campaign?.suggestedMonthlyContributionTnd || 10, 'TND')} par don. Vous choisissez librement le montant et pouvez revenir chaque mois. Aucun abonnement ni prélèvement automatique.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faire-un-don" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          {methodsLoading ? <div role="status" className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-600">Vérification des moyens de paiement…</div> : methods.length > 0 ? <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-jso-blue">1 · Choisir le montant</p>
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
              <label className="text-sm font-bold">
                Nom affiché <span className="font-normal text-slate-400">(facultatif)</span>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength="80" placeholder="Ex. Famille Ben Salah" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" />
              </label>
              <label className="text-sm font-bold">
                Téléphone / WhatsApp <span className="font-normal text-slate-400">({selectedMethod === 'paymee' ? 'requis pour Paymee' : 'facultatif'})</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength="32" inputMode="tel" placeholder="+216 XX XXX XXX" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" />
                <span className="mt-2 block text-xs font-normal leading-5 text-slate-400">Votre numéro reste privé. Pour Paymee, il est transmis au prestataire afin d'initier le paiement. Il n'apparaît pas sur la page publique.</span>
              </label>
              <label className="text-sm font-bold sm:col-span-2">
                E-mail <span className="font-normal text-slate-400">(requis pour Paymee)</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength="254" placeholder="vous@exemple.com" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" />
              </label>
              <label className="text-sm font-bold sm:col-span-2">
                Message <span className="font-normal text-slate-400">(facultatif)</span>
                <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength="280" placeholder="Allez JSO !" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" />
              </label>
            </div>
            <div className="mt-8 rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-bold text-slate-600">Montant choisi</p>
              <p className="mt-1 text-4xl font-black text-jso-navy">{formatMoney(effectiveAmount, 'TND')}</p>
            </div>

            <div className="mt-4 rounded-2xl border border-jso-gold/40 bg-jso-gold/10 p-4 text-sm">
              <strong className="block">Contribution ponctuelle</strong>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Cette opération est un don unique. Vous pourrez renouveler librement votre soutien chaque mois.</span>
            </div>

            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <input type="checkbox" checked={whatsappOptIn} onChange={(e) => setWhatsappOptIn(e.target.checked)} disabled={!phone.trim()} className="mt-1 h-5 w-5 rounded border-slate-300" />
              <span>
                <strong className="block text-emerald-900">Recevoir mon reçu sur WhatsApp</strong>
                <span className="mt-1 block text-xs leading-5 text-emerald-800/70">La JSO utilisera ce numéro uniquement pour tenter d'envoyer le reçu après la confirmation du paiement.</span>
              </span>
            </label>

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
              </div>
            </div>
            <div className="mt-6">
              {methods.some((method) => method.id === selectedMethod) ? (
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

            <p className="mt-4 text-xs leading-5 text-slate-400">
              La page de paiement est hébergée par le prestataire. Le site JSO ne reçoit pas les données de carte.
            </p>
          </div> : <div className="rounded-[2rem] border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-jso-blue">Comment donner aujourd’hui</p>
            <h2 className="mt-3 text-3xl font-black text-jso-navy">Don en espèces auprès de la JSO</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">{methodsError ? 'Nous ne pouvons pas vérifier les paiements en ligne pour le moment.' : 'Le paiement en ligne n’est pas encore disponible.'} Vous pouvez soutenir le club en remettant votre don à un vendeur ou à une boutique JSO autorisée.</p>
            <ol className="mt-6 space-y-3 text-sm leading-6 text-slate-700">
              <li className="rounded-xl bg-slate-50 p-4"><strong>1.</strong> Contactez le club pour connaître un point de collecte autorisé.</li>
              <li className="rounded-xl bg-slate-50 p-4"><strong>2.</strong> Remettez le montant de votre choix au personnel.</li>
              <li className="rounded-xl bg-slate-50 p-4"><strong>3.</strong> Le personnel enregistre le don et vous remet un reçu numéroté.</li>
            </ol>
            <a href={CLUB_FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-jso-navy px-5 py-3 text-sm font-extrabold text-white hover:bg-jso-blue">Demander un point de collecte sur Facebook <ArrowUpRight size={16} aria-hidden="true" /></a>
            <p className="mt-4 text-xs leading-5 text-slate-500">Cette page ne prélève aucun montant et ne crée pas de don en attente. Chaque don est ponctuel ; la contribution mensuelle affichée est une suggestion, sans abonnement automatique.</p>
          </div>}

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <QrCode size={24} className="text-jso-blue" aria-hidden="true" />
                <h2 className="text-xl font-black">QR de la campagne</h2>
              </div>
              <div className="mt-5 rounded-2xl bg-white p-4 text-center">
                {qrUrl
                  ? <img src={qrUrl} alt="QR scannable vers la page de soutien JSO" className="mx-auto h-56 w-56" />
                  : <div className="mx-auto grid h-56 w-56 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500">QR indisponible</div>}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-500">Ce QR ouvre cette page d’information. {methods.length ? 'Vous pourrez y choisir un paiement disponible.' : 'Il ne déclenche aucun paiement ; le don en espèces se fait auprès du club.'}</p>
              {qrUrl && <a href={qrUrl} download="jso-soutenir-qr.png" className="mt-3 inline-block text-sm font-bold text-jso-blue underline">Télécharger le QR</a>}
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={copyLink} className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-extrabold text-jso-navy hover:border-jso-blue">
                  <Copy size={15} aria-hidden="true" /> {copied ? 'Lien copié' : 'Copier'}
                </button>
                <a href={pageUrl} className="inline-flex items-center justify-center gap-2 rounded-full bg-jso-navy px-4 py-3 text-sm font-extrabold text-white hover:bg-jso-blue">
                  Ouvrir <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              </div>
            </div>

            {methods.length > 0 && <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">Faire un don en espèces</h2>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600">
                <li>Adressez-vous à un vendeur ou à une boutique JSO autorisée.</li>
                <li>Remettez le montant choisi. Le personnel enregistre le don dans son espace JSO.</li>
                <li>Demandez immédiatement le reçu numéroté et conservez son lien de vérification.</li>
              </ol>
              <p className="mt-4 text-xs leading-5 text-slate-500">Le don en espèces se fait sur place. Aucun paiement en espèces ne peut être validé depuis cette page.</p>
              <a href={CLUB_FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-jso-blue underline">Demander un point de collecte sur Facebook <ArrowUpRight size={15} aria-hidden="true" /></a>
            </div>}
          </aside>
        </div>
      </section>

      {campaign?.recentDonations?.length > 0 && (
        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-jso-blue">Communauté</p>
                <h2 className="mt-2 text-2xl font-black">Merci aux derniers soutiens.</h2>
              </div>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {campaign.recentDonations.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="truncate">{item.displayName || 'Un amoureux de la JSO'}</strong>
                    <span className="shrink-0 font-black text-jso-blue">{formatMoney(item.amount, 'TND')}</span>
                  </div>
                  {item.message && <p className="mt-3 text-sm italic leading-6 text-slate-500">“{item.message}”</p>}
                  <p className="mt-3 text-xs font-bold text-slate-400">{new Date(item.paidAt).toLocaleDateString(language === 'ar' ? 'ar-TN' : language === 'it' ? 'it-IT' : language === 'en' ? 'en-GB' : 'fr-FR')}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
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
