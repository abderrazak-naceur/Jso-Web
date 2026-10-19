import { ArrowRight, CheckCircle2, Coins, HeartHandshake, ShieldCheck, Target, Users } from 'lucide-react'
import { useI18n } from '../../../i18n/index.jsx'
import { fundraisingMoney, projectImage } from './fundraisingTemplates'
import { fundraisingCopy as copy } from './fundraisingCopy'
import './fundraising.css'

export default function FundraisingProjectView({ project, preview = false, onSupport }) {
  const { language } = useI18n()
  const t = (key, values) => copy(language, key, values)
  const money = value => fundraisingMoney(value, language)
  const total = Number(project.totalPaidTnd) || 0
  const budget = Number(project.budgetTnd) || 0
  const progress = budget > 0 ? Math.min(100, Math.max(0, total / budget * 100)) : 0
  return <div className={`jso-fundraising fr-theme-${project.templateId || 'custom'}`}>
    {preview && <div className="fr-preview-label">{language === 'it' ? 'Anteprima del progetto' : language === 'en' ? 'Project preview' : language === 'ar' ? 'معاينة المشروع' : 'Aperçu du projet'} · {project.status === 'Published' ? (language === 'it' ? 'Pubblicato' : language === 'en' ? 'Published' : language === 'ar' ? 'منشور' : 'Publié') : (language === 'it' ? 'Bozza privata' : language === 'en' ? 'Private draft' : language === 'ar' ? 'مسودة خاصة' : 'Brouillon privé')}</div>}
    <section className="fr-hero" aria-labelledby="fr-project-title">
      <img className="fr-hero-image" src={projectImage(project)} alt="" />
      <div className="fr-hero-shade" />
      <div className="fr-container fr-hero-content">
        <p className="fr-kicker"><span /> {t('campaign')}</p>
        <h1 id="fr-project-title">{project.title || t('projectTitleFallback')}</h1>
        <p className="fr-hero-description">{project.description || t('projectSupportDescription')}</p>
        <div className="fr-hero-buttons"><button className="fr-button fr-button-gold" onClick={onSupport} type="button" disabled={preview}>{t('becomeSupporter')} <ArrowRight size={18}/></button><a className="fr-hero-link" href="#soutiens">{t('discoverSupporters')} <Users size={16}/></a></div>
        <p className="fr-hero-caption"><ShieldCheck size={15}/> {t('trackedPayments')}</p>
      </div>
    </section>
    <div className="fr-container fr-stats-wrap">
      <section className="fr-stats" aria-label={t('progressLabel')}>
        <div className="fr-stats-grid">
          {[[Users, Number(project.supporterCount) || 0, t('registeredSupporters')], [CheckCircle2, Number(project.paidSupporterCount) || 0, t('paidSupporters')], [Coins, money(total), t('collected')], [Target, money(budget), t('projectGoal')]].map(([Icon, value, label]) => <div className="fr-stat" key={label}><Icon size={24}/><div><strong>{value}</strong><span>{label}</span></div></div>)}
        </div>
        <div className="fr-progress-line"><div className="fr-progress" role="progressbar" aria-label={t('progressLabel')} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }}/></div><strong>{Math.round(progress)}%</strong></div>
        <p className="fr-stats-note">{t('onlyPaidCounts')}</p>
      </section>
    </div>
    <section className="fr-container fr-impact">
      <div><p className="fr-eyebrow">{t('thankYou')}</p><h2>{t('smallGesture')}<br/>{t('bigFuture')}</h2><p>{t('projectSupportDescription')}</p></div>
      <div className="fr-impact-items">{[[ShieldCheck, t('confidence'), t('realPayments')], [Target, t('clearCommitment'), t('clearCommitmentText', { months: project.durationMonths || 10 })], [HeartHandshake, t('sameTeam'), t('everyContribution')]].map(([Icon, title, text]) => <article key={title}><span><Icon size={25}/></span><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>
  </div>
}
