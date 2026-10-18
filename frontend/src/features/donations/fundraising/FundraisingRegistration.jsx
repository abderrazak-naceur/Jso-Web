import { useState } from 'react'
import { ArrowLeft, ArrowRight, ShieldCheck, X } from 'lucide-react'
import { useDialog } from '../../site/useDialog'
import { CREST_SRC } from '../../site/brand'
import { MONTHLY_AMOUNTS, PLAN_MONTHS, planTotal, fundraisingMoney as money } from './fundraisingTemplates'

export const ONLINE_PROVIDERS = [
  { id: 'STRIPE', key: 'stripe', label: 'Carte bancaire · international', country: 'FR' },
  { id: 'FLOUCI', key: 'flouci', label: 'Flouci · Tunisie', country: 'TN' },
  { id: 'KONNECT', key: 'konnect', label: 'Konnect · Tunisie', country: 'TN' },
  { id: 'PAYMEE', key: 'paymee', label: 'Paymee · Tunisie', country: 'TN' },
]

export default function FundraisingRegistration({ project, initialAmount, methods, user, onClose, onJoin }) {
  const ref = useDialog(() => { if (!saving) onClose() })
  const available = ONLINE_PROVIDERS.filter(provider => methods?.[provider.key])
  const [step, setStep] = useState(1)
  const [amount, setAmount] = useState(initialAmount || 5)
  const [name, setName] = useState(user?.displayName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
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
    if (paymentMethod === 'Online' && !available.some(item => item.id === provider)) { setError('Aucun prestataire disponible. Choisissez les espèces.'); return }
    if (provider === 'PAYMEE' && paymentMethod === 'Online' && (!phone.trim() || !email.trim())) { setError('Paymee demande un téléphone et une adresse e-mail. Renseignez-les à l’étape 1.'); return }
    setSaving(true)
    try { await onJoin({ displayName: name.trim(), monthlyAmountTnd: amount, phone: phone.trim() || null, email: email.trim() || null, paymentMethod }, available.find(item => item.id === provider)) }
    catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }
  return <div className="jso-fundraising fr-modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}>
    <section ref={ref} role="dialog" aria-modal="true" aria-labelledby="fr-registration-title" tabIndex={-1} className="fr-modal">
      <div className="fr-modal-head"><img src={CREST_SRC} alt="JSO"/><button className="fr-close" type="button" aria-label="Fermer l’inscription" disabled={saving} onClick={onClose}><X size={18}/></button></div>
      <form className="fr-modal-body" onSubmit={submit}>
        <h2 id="fr-registration-title">Devenez soutien de la JSO</h2><p className="fr-modal-subtitle">{project.title} · Un petit geste, un grand impact.</p>
        <div className="fr-steps" aria-label={`Étape ${step} sur 3`}>{['Vos coordonnées', 'Votre contribution', 'Confirmation'].map((text, i) => <span className={step === i + 1 ? 'is-active' : ''} key={text}><b>{i + 1}</b>{text}</span>)}</div>
        {step === 1 && <>
          <label className="fr-field">Nom public *<input required value={name} onChange={e => setName(e.target.value)} maxLength={80} autoComplete="name" placeholder="Prénom et nom"/><small>Ce nom apparaîtra dans la liste des soutiens. Aucun contact n’est affiché publiquement.</small></label>
          <div className="fr-field-pair"><label className="fr-field">E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={254} autoComplete="email" placeholder="vous@exemple.com"/></label><label className="fr-field">Téléphone<input type="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={32} autoComplete="tel" placeholder="+216…"/></label></div>
          <p className="fr-plan-note">Le téléphone permet au club de vous contacter pour les espèces. Ces coordonnées restent privées. Paymee les demande pour le paiement en ligne.</p>
        </>}
        {step === 2 && <><p className="fr-modal-subtitle">Choisissez votre contribution mensuelle pendant {PLAN_MONTHS} mois.</p>{MONTHLY_AMOUNTS.map(value => <label className="fr-option" key={value}><input type="radio" name="monthly-amount" checked={amount === value} onChange={() => setAmount(value)}/><span><strong>{money(value)} / mois</strong><small>Pour {PLAN_MONTHS} mois · Total de l’engagement : {money(planTotal(value))}</small></span></label>)}</>}
        {step === 3 && <>
          <div className="fr-summary"><p><span>Votre nom public</span><strong>{name}</strong></p><p><span>Contribution mensuelle</span><strong>{money(amount)}</strong></p><p><span>Durée</span><strong>{PLAN_MONTHS} mois</strong></p><p><span>Engagement total</span><strong>{money(planTotal(amount))}</strong></p></div>
          <label className="fr-option"><input type="radio" name="pay-method" checked={paymentMethod === 'Cash'} onChange={() => setPaymentMethod('Cash')}/><span><strong>Espèces auprès du club</strong><small>Votre nom apparaît dès l’inscription. Chaque versement est confirmé après réception.</small></span></label>
          <label className="fr-option"><input type="radio" name="pay-method" checked={paymentMethod === 'Online'} onChange={() => setPaymentMethod('Online')} disabled={!available.length}/><span><strong>Carte / paiement en ligne</strong><small>{available.length ? 'Votre premier versement sera payé sur le site sécurisé du prestataire.' : 'Les paiements en ligne ne sont pas encore configurés pour le club.'}</small></span></label>
          {paymentMethod === 'Online' && <label className="fr-field">Prestataire<select value={provider} onChange={e => setProvider(e.target.value)}>{available.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
          <label className="fr-consent"><input required type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/><span>Je confirme cet engagement volontaire et l’affichage de mon nom dans les soutiens. Les dix versements sont réglés séparément, sans prélèvement automatique.</span></label>
        </>}
        {error && <p className="fr-alert fr-error" role="alert">{error}</p>}
        <div className="fr-modal-buttons">{step > 1 && <button className="fr-button fr-button-outline" type="button" disabled={saving} onClick={() => setStep(step - 1)}><ArrowLeft size={15}/>Retour</button>}<button className="fr-button fr-button-gold" disabled={saving || (step === 3 && !consent)} type="submit">{saving ? 'Enregistrement…' : step < 3 ? 'Continuer' : paymentMethod === 'Cash' ? 'Confirmer mon engagement' : `Payer le premier mois · ${money(amount)}`}<ArrowRight size={16}/></button></div>
        <p className="fr-plan-note"><ShieldCheck size={12} style={{ display: 'inline', marginRight: 4 }}/>Seuls les paiements reçus et vérifiés sont comptabilisés.</p>
      </form>
    </section>
  </div>
}
