import { CheckCircle2, RefreshCw } from 'lucide-react'
import { getApiBaseUrl } from '../../../lib/apiConfig'
import { useI18n } from '../../../i18n/index.jsx'
import { fundraisingDate, fundraisingMoney, fundraisingPaymentLabel } from './fundraisingTemplates'
import { fundraisingCopy as copy } from './fundraisingCopy'

export default function FundraisingDashboard({ commitment, providers, providerId, setProviderId, onPay, payingId, onRefresh, sectionId = 'mon-engagement', inAccount = false }) {
  const { language } = useI18n()
  const t = (key, values) => copy(language, key, values)
  const date = value => fundraisingDate(value, language)
  const money = value => fundraisingMoney(value, language)
  const paid = commitment.installments.filter(item => item.paymentStatus === 'Paid')
  const paidTotal = paid.reduce((sum, item) => sum + Number(item.amount), 0)
  const next = commitment.installments.find(item => item.paymentStatus !== 'Paid')
  return <section id={sectionId} className="fr-dashboard"><div className="fr-container">
    <div className="fr-dashboard-top"><div><p className="fr-eyebrow">{t('supportArea')}</p><h2 className="fr-section-title">{t('thanksName', { name: commitment.displayName })}</h2><p className="fr-plan-note">{commitment.projectTitle} · {t('commitmentSince', { date: date(commitment.createdAt) })}</p></div><button className="fr-button fr-button-outline" type="button" onClick={onRefresh}><RefreshCw size={15}/>{t('refresh')}</button></div>
    <div className="fr-dashboard-cards">{[[money(commitment.monthlyAmountTnd), 'monthlyStat'], [`${paid.length} / ${commitment.months}`, 'installmentsConfirmed'], [money(paidTotal), 'amountPaid'], [next ? date(next.dueAt) : t('finished'), 'nextDue']].map(([value, key]) => <article key={key}><small>{t(key)}</small><strong>{value}</strong></article>)}</div>
    <div className="fr-summary" style={{ background: 'white', marginBottom: 20 }}><p><span>{t('totalYourCommitment')}</span><strong>{money(Number(commitment.monthlyAmountTnd) * commitment.months)}</strong></p><p><span>{t('remaining')}</span><strong>{money(Number(commitment.monthlyAmountTnd) * commitment.months - paidTotal)}</strong></p><div className="fr-mini-progress"><span style={{ width: `${paid.length / commitment.months * 100}%` }}/></div><p><span>{Math.round(paid.length / commitment.months * 100)}{t('confirmedPercent')}</span><span>{commitment.paymentMethod === 'Cash' ? t('cash') : t('onlinePayment')}</span></p></div>
    {commitment.paymentMethod === 'Cash' ? <p className="fr-alert">{t('cashInstruction')}</p> : providers.length ? <label className="fr-field">{t('payNextWith')} <select className="fr-provider-select" value={providerId} onChange={e => setProviderId(e.target.value)}>{providers.map(provider => <option value={provider.id} key={provider.id}>{provider.label}</option>)}</select></label> : <p className="fr-alert">{t('onlineUnavailableMessage')}</p>}
    <div className="fr-table-scroll"><table className="fr-table"><thead><tr><th>{t('month')}</th><th>{t('dueDate')}</th><th>{t('amount')}</th><th>{t('actualStatus')}</th><th>{t('actionReceipt')}</th></tr></thead><tbody>{commitment.installments.map(item => <tr key={item.id}><td>{t('month')} {item.installmentNumber}</td><td>{date(item.dueAt)}</td><td><strong>{money(item.amount)}</strong></td><td><span className={`fr-badge ${item.paymentStatus === 'Paid' ? 'fr-badge-paid' : 'fr-badge-pending'}`}>{item.paymentStatus === 'Paid' ? <><CheckCircle2 size={12}/>{t('paid')}</> : new Date(item.dueAt) > new Date() ? t('upcoming') : t('due')}</span></td><td>{item.paymentStatus === 'Paid' ? <a href={`${getApiBaseUrl()}/donations/${item.id}/receipt`} target="_blank" rel="noreferrer">{t('verifyReceipt')}</a> : commitment.paymentMethod === 'Online' && item.id === next?.id && providers.length > 0 ? <span className="fr-schedule-pay"><button disabled={Boolean(payingId)} type="button" onClick={() => onPay(item)}>{fundraisingPaymentLabel(item.amount, language, payingId === item.id)}</button></span> : '—'}</td></tr>)}</tbody></table></div>
    <p className="fr-plan-note">{t('noAutoDebit')} {inAccount ? t('noAutoAccount') : <>{t('dashboardLink')} <a href="/account/supports">{t('dashboard')} → {t('navFollow')}</a>. {t('dashboardOldLink')}</>}</p>
  </div></section>
}
