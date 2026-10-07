import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, CheckCircle2, Copy, HeartHandshake, QrCode, Share2, Wallet } from 'lucide-react'
import PayOnlineButton from '../shop/PayOnlineButton'
import { donationsApi } from '../../lib/api'
import { formatMoney } from '../../lib/format'
import { useI18n } from '../../i18n/index.jsx'

const PRESETS = [5, 10, 20, 50, 100]

export default function DonationPage() {
  const { language } = useI18n()
  const [campaign, setCampaign] = useState(null)
  const [amount, setAmount] = useState(20)
  const [custom, setCustom] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [message, setMessage] = useState('')
  const [donation, setDonation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    donationsApi.campaign(controller.signal)
      .then(setCampaign)
      .catch((e) => setError(e?.message || 'Impossible de charger la campagne.'))
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  const effectiveAmount = useMemo(() => {
    if (amount === 'custom') {
      const parsed = Number(custom)
      return Number.isFinite(parsed) ? parsed : 0
    }
    return Number(amount)
  }, [amount, custom])

  async function startDonation(country) {
    if (effectiveAmount < 1) throw new Error('Le montant minimum est de 1 TND.')
    const created = await donationsApi.create({
      amount: effectiveAmount,
      displayName: displayName.trim() || null,
      message: message.trim() || null,
    })
    setDonation(created)
    return donationsApi.pay(created.id, country)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
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
          url: window.location.href,
        })
        setShared(true)
        setTimeout(() => setShared(false), 1800)
        return
      }
      await copyLink()
    } catch { /* share can be cancelled by the user */ }
  }

  const goal = Number(campaign?.goalTnd || 30000)
  const total = Number(campaign?.totalPaidTnd || 0)
  const progress = goal > 0 ? Math.min(100, Math.max(0, total / goal * 100)) : 0

  return (
    <main className="min-h-screen bg-jso-paper text-jso-ink">
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
                <button type="button" onClick={sharePage} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-extrabold text-jso-navy hover:bg-jso-gold">
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
                  <strong className="text-3xl font-black">{formatMoney(total, 'TND')}</strong>
                  <span className="text-sm font-bold text-white/45">objectif {formatMoney(goal, 'TND')}</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-jso-gold transition-all" style={{ width: progress + '%' }} />
                </div>
                <p className="mt-3 text-sm font-semibold text-white/55">{progress.toFixed(0)}% de l’objectif · {campaign?.donorCount || 0} contributions confirmées</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-jso-blue">1 · Choisir le montant</p>
                <h2 className="mt-2 text-2xl font-black">Chaque contribution compte.</h2>
              </div>
              {donation && <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">Contribution #{String(donation.id).slice(0, 8)}</span>}
            </div>

            {error && <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {PRESETS.map((value) => (
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
                Message <span className="font-normal text-slate-400">(facultatif)</span>
                <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength="280" placeholder="Allez JSO !" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" />
              </label>
            </div>

            <div className="mt-8 rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-bold text-slate-600">Montant choisi</p>
              <p className="mt-1 text-4xl font-black text-jso-navy">{formatMoney(effectiveAmount, 'TND')}</p>
            </div>

            <div className="mt-6">
              <PayOnlineButton
                pay={startDonation}
                label="Continuer vers le paiement"
                disabled={effectiveAmount < 1 || loading}
              />
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-400">
              La page de paiement est hébergée par le prestataire. Le site JSO ne reçoit pas les données de carte.
            </p>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <QrCode size={24} className="text-jso-blue" aria-hidden="true" />
                <h2 className="text-xl font-black">QR de la campagne</h2>
              </div>
              <div className="mt-5 rounded-2xl bg-white p-4 text-center">
                <img src="/jso-donation-qr.png" alt="QR code pour ouvrir la page de soutien JSO" className="mx-auto h-56 w-56 rounded-xl object-contain" />
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-500">Imprimez ce QR ou partagez-le sur Facebook, WhatsApp, dans le stade et sur les affiches.</p>
              <a href="/soutenir" className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-jso-blue">Ouvrir la page <ArrowUpRight size={15} aria-hidden="true" /></a>
            </div>

            <div className="rounded-[2rem] bg-jso-gold p-6 text-jso-navy">
              <p className="text-xs font-black uppercase tracking-[0.16em] opacity-60">Important</p>
              <p className="mt-3 text-sm font-semibold leading-6">Orange, Ooredoo, D17/e-Dinar et un futur numéro USSD/SMS peuvent être ajoutés comme moyens de paiement dédiés après validation commerciale et réglementaire avec les opérateurs.</p>
            </div>
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
  )
}
