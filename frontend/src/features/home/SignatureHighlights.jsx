import { ArrowUpRight, HeartHandshake, Ticket, UserRound } from 'lucide-react'
import { CREST_SRC } from '../site/brand'

const cards = [
  { id: 'tickets', number: '01 / BILLETTERIE', title: <>Le match<br />commence ici.</>, description: 'Billets, abonnements et accès à vos achats au même endroit.', href: '/billetterie', Icon: Ticket },
  { id: 'projects', number: '02 / NOS PROJETS', title: <>Construisons<br />la suite.</>, description: 'Découvrez les collectes et suivez leur progression réelle.', href: '/nos-projets', Icon: HeartHandshake },
  { id: 'account', number: '03 / MON ESPACE', title: <>Tout à vous.</>, description: 'Profil, billets, paiements et participations.', href: '/mon-espace', Icon: UserRound },
]

export default function SignatureHighlights({ showDonation = true }) {
  const visibleCards = showDonation ? cards : cards.filter((card) => card.id !== 'projects')
  return (
    <section aria-labelledby="signature-highlights-title" className="jso-signature-highlights">
      <div className="jso-signature-section-inner">
        <div className="jso-signature-section-heading">
          <div><p>01 / VIVRE LE CLUB</p><h2 id="signature-highlights-title">Votre JSO, à portée de main.</h2></div>
          <span>Des parcours directs pour trouver ce qui compte, sans chercher dans plusieurs menus.</span>
        </div>
        <div className="jso-signature-journey">
          {visibleCards.map(({ id, number, title, description, href, Icon }, index) => (
            <a key={id} href={href} className={`jso-signature-journey-card jso-signature-journey-${id}`}>
              <div className="jso-signature-journey-top"><span>{String(index + 1).padStart(2, '0')} / {number.split(' / ')[1]}</span><ArrowUpRight size={20} aria-hidden="true" /></div>
              {id === 'tickets' && <div className="jso-signature-ticket-art" aria-hidden="true"><span>JSO <b>1973</b></span><small>VOTRE PLACE AU STADE</small></div>}
              {id === 'account' && <div className="jso-signature-account-art" aria-hidden="true"><img src={CREST_SRC} alt="" /></div>}
              {id === 'projects' && <Icon className="jso-signature-journey-icon" size={60} aria-hidden="true" />}
              <div className="jso-signature-journey-copy"><h3>{title}</h3><p>{description}</p></div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
