import { useState } from 'react'
import { ArrowLeft, ArrowRight, ShieldCheck, X } from 'lucide-react'
import { useDialog } from '../../site/useDialog'
import { CREST_SRC } from '../../site/brand'
import { useI18n } from '../../../i18n/index.jsx'
import { MONTHLY_AMOUNTS, PLAN_MONTHS, planTotal, fundraisingMoney } from './fundraisingTemplates'
import { fundraisingCopy as copy, fundraisingProviderLabel } from './fundraisingCopy'

export const ONLINE_PROVIDERS = [
  { id: 'STRIPE', key: 'stripe', label: 'Carte bancaire · international', country: 'FR' },
  { id: 'FLOUCI', key: 'flouci', label: 'Flouci · Tunisie', country: 'TN' },
  { id: 'KONNECT', key: 'konnect', label: 'Konnect · Tunisie', country: 'TN' },
  { id: 'PAYMEE', key: 'paymee', label: 'Paymee · Tunisie', country: 'TN' },
]

export default function FundraisingRegistration({ project, initialAmount, methods, user, onClose, onJoin }) {
  const { language } = useI18n()
  const t = (key, values) => copy(language, key, values)
  const money = value => fundraisingMoney(value, language)
  const ref = useDialog(() => { if (!saving) onClose() })
  const available = ONLINE_PROVIDERS.filter(provider => methods?.[provider.key])
  const [step, setStep] = useState(1)
  const [amount, setAmount] = useState(initialAmount || 5)
  const [name, setName] = useState(user?.displayName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phoneNumber || user?.phone || '')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [provider, setProvider] = useState(available[0]?.id || '')
  const [consent, setConsent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    setError('')
    if (step < 3) { setStep(step + 1); return }
    if (!consent || saving) return
    if (paymentMethod === 'Online' && !available.some(item => item.id === provider)) { setError(t('noProvider')); return }
    if (provider === 'PAYMEE' && paymentMethod === 'Online' && (!phone.trim() || !email.trim())) { setError(t('paymeeFields')); return }
    setSaving(true)
    try { await onJoin({ displayName: name.trim(), monthlyAmountTnd: amount, phone: phone.trim() || null, email: email.trim() || null, paymentMethod }, available.find(item => item.id === provider)) }
    catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }
  const paymentLabel = {
    fr: `Payer le premier mois · ${money(amount)}`, en: `Pay the first month · ${money(amount)}`, it: `Paga il primo mese · ${money(amount)}`, ar: `ادفع الشهر الأول · ${money(amount)}`,
  }[language] || `Payer le premier mois · ${money(amount)}`
  const submitLabel = saving ? t('saving') : step < 3 ? t('continue') : paymentMethod === 'Cash' ? t('confirmCommitment') : paymentLabel
  return <div className="jso-fundraising fr-modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}>
    <section ref={ref} role="dialog" aria-modal="true" aria-labelledby="fr-registration-title" tabIndex={-1} className="fr-modal">
      <div className="fr-modal-head"><img src={CREST_SRC} alt="JSO"/><button className="fr-close" type="button" aria-label="Fermer l’inscription" disabled={saving} onClick={onClose}><X size={18}/></button></div>
      <form className="fr-modal-body" onSubmit={submit}>
        <h2 id="fr-registration-title">{t('regTitle')}</h2><p className="fr-modal-subtitle">{project.title} · {t('regSubtitle')}</p>
        <p className="fr-plan-note">{t('linkedAccount')}</p>
        <div className="fr-steps" aria-label={`${language === 'en' ? 'Step' : language === 'it' ? 'Passaggio' : language === 'ar' ? 'الخطوة' : 'Étape'} ${step} ${language === 'en' ? 'of' : language === 'it' ? 'di' : language === 'ar' ? 'من' : 'sur'} 3`}>{['yourDetails', 'yourContribution', 'confirmation'].map((key, i) => <span className={step === i + 1 ? 'is-active' : ''} key={key}><b>{i + 1}</b>{t(key)}</span>)}</div>
        {step === 1 && <>
          <label className="fr-field">{t('publicNameRequired')}<input required value={name} onChange={e => setName(e.target.value)} maxLength={80} autoComplete="name" placeholder={t('firstLastName')}/><small>{t('publicNameHint')}</small></label>
          <div className="fr-field-pair"><label className="fr-field">{t('email')}<input type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={254} autoComplete="email" placeholder={language === 'it' ? 'tu@esempio.com' : language === 'en' ? 'you@example.com' : language === 'ar' ? 'you@example.com' : 'vous@exemple.com'}/></label><label className="fr-field">{t('phone')}<input type="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={32} autoComplete="tel" placeholder="+216…"/></label></div>
          <p className="fr-plan-note">{t('phoneHint')}</p>
        </>}
        {step === 2 && <><p className="fr-modal-subtitle">{t('chooseMonthly', { months: PLAN_MONTHS })}</p>{MONTHLY_AMOUNTS.map(value => <label className="fr-option" key={value}><input type="radio" name="monthly-amount" checked={amount === value} onChange={() => setAmount(value)}/><span><strong>{money(value)} / {language === 'en' ? 'month' : language === 'it' ? 'mese' : language === 'ar' ? 'شهر' : 'mois'}</strong><small>{t('totalCommitment')}: {money(planTotal(value))}</small></span></label>)}</>}
        {step === 3 && <>
          <div className="fr-summary"><p><span>{t('yourPublicName')}</span><strong>{name}</strong></p><p><span>{t('monthlyContribution')}</span><strong>{money(amount)}</strong></p><p><span>{t('duration')}</span><strong>{PLAN_MONTHS} {language === 'en' ? 'months' : language === 'it' ? 'mesi' : language === 'ar' ? 'أشهر' : 'mois'}</strong></p><p><span>{t('commitmentTotal')}</span><strong>{money(planTotal(amount))}</strong></p></div>
          <label className="fr-option"><input type="radio" name="pay-method" checked={paymentMethod === 'Cash'} onChange={() => setPaymentMethod('Cash')}/><span><strong>{t('cashAtClub')}</strong><small>{t('cashMethodHint')}</small></span></label>
          <label className="fr-option"><input type="radio" name="pay-method" checked={paymentMethod === 'Online'} onChange={() => setPaymentMethod('Online')} disabled={!available.length}/><span><strong>{t('cardOnline')}</strong><small>{available.length ? t('onlineMethodHint') : t('onlineUnavailable')}</small></span></label>
          {paymentMethod === 'Online' && <label className="fr-field">{t('provider')}<select value={provider} onChange={e => setProvider(e.target.value)}>{available.map(item => <option key={item.id} value={item.id}>{fundraisingProviderLabel(item.id, language, item.label)}</option>)}</select></label>}
          <label className="fr-consent"><input required type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/><span>{t('consent')}</span></label>
        </>}
        {error && <p className="fr-alert fr-error" role="alert">{error}</p>}
        <div className="fr-modal-buttons">{step > 1 && <button className="fr-button fr-button-outline" type="button" disabled={saving} onClick={() => setStep(step - 1)}><ArrowLeft size={15}/>{t('back')}</button>}<button className="fr-button fr-button-gold" disabled={saving || (step === 3 && !consent)} type="submit">{submitLabel}<ArrowRight size={16}/></button></div>
        <p className="fr-plan-note"><ShieldCheck size={12} style={{ display: 'inline', marginRight: 4 }}/>{t('verifiedOnly')}</p>
      </form>
    </section>
  </div>
}
