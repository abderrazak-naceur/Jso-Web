import { ArrowRight, HeartHandshake } from 'lucide-react'
import { CREST_SRC } from '../../site/brand'
import { useI18n } from '../../../i18n/index.jsx'
import { fundraisingCopy as copy } from './fundraisingCopy'

export default function FundraisingEmptyState({ unavailableProject }) {
  const { language } = useI18n()
  const t = (key) => copy(language, key)
  return <section className="fr-welcome"><div className="fr-container fr-welcome-layout">
    <div><p className="fr-kicker"><HeartHandshake size={14}/> {language === 'en' ? 'Club projects' : language === 'it' ? 'Progetti del club' : language === 'ar' ? 'مشاريع النادي' : 'Les projets du club'}</p>
      <h1>{unavailableProject ? t('noPublishedHeading') : t('emptyProjectHeading')}</h1>
      <p>{unavailableProject ? (language === 'en' ? 'This project is not published. Explore the goals open to the JSO community.' : language === 'it' ? 'Questo progetto non è pubblicato. Scopri gli obiettivi aperti alla comunità JSO.' : language === 'ar' ? 'هذا المشروع غير منشور. اكتشف الأهداف المتاحة لمجتمع JSO.' : 'Ce projet n’est pas publié. Retrouvez les objectifs ouverts à la communauté JSO.') : (language === 'en' ? 'Upcoming JSO projects will appear here. Explore their goals, choose a contribution and track every payment.' : language === 'it' ? 'I prossimi progetti JSO saranno presentati qui. Scopri gli obiettivi, scegli il contributo e segui ogni pagamento.' : language === 'ar' ? 'ستُعرض مشاريع JSO القادمة هنا. اكتشف أهدافها واختر مساهمتك وتابع كل دفعة.' : 'Les prochains projets de la JSO seront présentés ici. Découvrez leurs objectifs, choisissez votre contribution et suivez chaque versement.')}</p>
      <a className="fr-button fr-button-gold" href={unavailableProject ? '/nos-projets' : '/'}>{unavailableProject ? (language === 'en' ? 'View published projects' : language === 'it' ? 'Vedi i progetti pubblicati' : language === 'ar' ? 'عرض المشاريع المنشورة' : 'Voir les projets publiés') : (language === 'en' ? 'Discover the club' : language === 'it' ? 'Scopri il club' : language === 'ar' ? 'اكتشف النادي' : 'Découvrir le club')}<ArrowRight size={17}/></a>
      <span className="fr-welcome-note">{unavailableProject ? (language === 'en' ? 'Only published projects are publicly available.' : language === 'it' ? 'Solo i progetti pubblicati sono accessibili al pubblico.' : language === 'ar' ? 'المشاريع المنشورة فقط متاحة للعامة.' : 'Seuls les projets publiés sont accessibles au public.') : t('noOpenProjects')}</span>
    </div>
    <div className="fr-welcome-crest"><img src={CREST_SRC} alt="Écusson de la JSO"/></div>
  </div></section>
}
