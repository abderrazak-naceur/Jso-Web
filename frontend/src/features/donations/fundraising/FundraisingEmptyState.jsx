import { ArrowRight, HeartHandshake } from 'lucide-react'
import { CREST_SRC } from '../../site/brand'

export default function FundraisingEmptyState({ unavailableProject }) {
  return <section className="fr-welcome"><div className="fr-container fr-welcome-layout">
    <div><p className="fr-kicker"><HeartHandshake size={14}/> Les projets du club</p>
      <h1>{unavailableProject ? 'Retrouvons un projet à soutenir.' : 'Ensemble, construisons la suite.'}</h1>
      <p>{unavailableProject ? 'Ce projet n’est pas publié. Retrouvez les objectifs ouverts à la communauté JSO.' : 'Les prochains projets de la JSO seront présentés ici. Découvrez leurs objectifs, choisissez votre contribution et suivez chaque versement.'}</p>
      <a className="fr-button fr-button-gold" href={unavailableProject ? '/nos-projets' : '/'}>{unavailableProject ? 'Voir les projets publiés' : 'Découvrir le club'}<ArrowRight size={17}/></a>
      <span className="fr-welcome-note">{unavailableProject ? 'Seuls les projets publiés sont accessibles au public.' : 'Aucune collecte n’est ouverte pour le moment.'}</span>
    </div>
    <div className="fr-welcome-crest"><img src={CREST_SRC} alt="Écusson de la JSO"/></div>
  </div></section>
}
