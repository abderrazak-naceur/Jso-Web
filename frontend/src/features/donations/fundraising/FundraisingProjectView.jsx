import { ArrowRight, CheckCircle2, Coins, HeartHandshake, ShieldCheck, Target, Users } from 'lucide-react'
import { fundraisingMoney as money, projectImage } from './fundraisingTemplates'
import './fundraising.css'

export default function FundraisingProjectView({ project, preview = false, onSupport }) {
  const total = Number(project.totalPaidTnd) || 0
  const budget = Number(project.budgetTnd) || 0
  const progress = budget > 0 ? Math.min(100, Math.max(0, total / budget * 100)) : 0
  return <div className={`jso-fundraising fr-theme-${project.templateId || 'custom'}`}>
    {preview && <div className="fr-preview-label">Aperçu du projet · {project.status === 'Published' ? 'Publié' : 'Brouillon privé'}</div>}
    <section className="fr-hero" aria-labelledby="fr-project-title">
      <img className="fr-hero-image" src={projectImage(project)} alt="" />
      <div className="fr-hero-shade" />
      <div className="fr-container fr-hero-content">
        <p className="fr-kicker"><span /> Campagne de soutien · JSO</p>
        <h1 id="fr-project-title">{project.title || 'Le titre de votre projet'}</h1>
        <p className="fr-hero-description">{project.description || 'Présentez votre projet, son impact et les raisons de le soutenir.'}</p>
        <div className="fr-hero-buttons"><button className="fr-button fr-button-gold" onClick={onSupport} type="button" disabled={preview}>Devenir soutien <ArrowRight size={18}/></button><a className="fr-hero-link" href="#soutiens">Découvrir les soutiens <Users size={16}/></a></div>
        <p className="fr-hero-caption"><ShieldCheck size={15}/> Des contributions suivies, des paiements vérifiés.</p>
      </div>
    </section>
    <div className="fr-container fr-stats-wrap">
      <section className="fr-stats" aria-label="Avancement réel de la collecte">
        <div className="fr-stats-grid">
          {[[Users, Number(project.supporterCount) || 0, 'Soutiens inscrits'], [CheckCircle2, Number(project.paidSupporterCount) || 0, 'Soutiens ayant versé'], [Coins, money(total), 'Réellement collectés'], [Target, money(budget), 'Objectif du projet']].map(([Icon, value, label]) => <div className="fr-stat" key={label}><Icon size={24}/><div><strong>{value}</strong><span>{label}</span></div></div>)}
        </div>
        <div className="fr-progress-line"><div className="fr-progress" role="progressbar" aria-label="Collecte du projet" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }}/></div><strong>{Math.round(progress)}%</strong></div>
        <p className="fr-stats-note">Les promesses ne sont pas ajoutées au montant collecté. Seuls les versements confirmés sont comptabilisés.</p>
      </section>
    </div>
    <section className="fr-container fr-impact">
      <div><p className="fr-eyebrow">Un projet qui nous rassemble</p><h2>Un petit geste.<br/>Un grand avenir.</h2><p>Votre soutien accompagne la JSO dans un projet concret. Choisissez votre mensualité, suivez vos versements et avancez avec le club.</p></div>
      <div className="fr-impact-items">{[[ShieldCheck, 'Confiance', 'Les sommes annoncées correspondent aux paiements reçus.'], [Target, 'Un engagement clair', `${project.durationMonths || 10} mois, un montant choisi et un suivi de chaque échéance.`], [HeartHandshake, 'Une même équipe', 'Chaque participation fait partie de l’histoire de ce projet.']].map(([Icon, title, text]) => <article key={title}><span><Icon size={25}/></span><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>
  </div>
}
