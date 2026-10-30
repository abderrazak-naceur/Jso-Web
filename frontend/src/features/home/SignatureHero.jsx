import { ArrowUpRight, CalendarDays } from 'lucide-react'
import { formatDate, formatTime } from '../../lib/format'
import { CLUB_FOUNDED, CREST_SRC } from '../site/brand'
import './signature-home.css'

export default function SignatureHero({ content = {}, club, nextMatch, showMatch = true, showDonation = true }) {
  const city = club?.city || club?.City || 'Oudhref'
  const title = content.hero_title || 'Une ville.\nUn club.'
  const highlight = content.hero_highlight || 'Une passion.'
  const description = content.hero_description || `Les émotions du match, vos billets et les projets de la JSO. Une seule place pour vivre votre club, où que vous soyez.`
  const opponent = nextMatch?.opponentName || nextMatch?.OpponentName
  const kickoff = nextMatch?.kickoffAt || nextMatch?.KickoffAt

  return (
    <section id="home" aria-labelledby="home-title" className="jso-signature-hero">
      <div className="jso-signature-hero-lines" aria-hidden="true" />
      <div className="jso-signature-hero-inner">
        <div className="jso-signature-hero-copy">
          <p className="jso-signature-eyebrow">LE CLUB D’{city.toUpperCase()} · DEPUIS {CLUB_FOUNDED}</p>
          <h1 id="home-title"><span>{title}</span><em>{highlight}</em></h1>
          <p className="jso-signature-lede">{description}</p>
          <div className="jso-signature-actions">
            <a href="/billetterie" className="jso-signature-button jso-signature-button-gold">Prendre ma place <ArrowUpRight size={18} aria-hidden="true" /></a>
            {showDonation && <a href="/nos-projets" className="jso-signature-button jso-signature-button-outline">Soutenir le club <ArrowUpRight size={18} aria-hidden="true" /></a>}
          </div>
          <p className="jso-signature-hero-foot">{city} est notre force</p>
        </div>
        <div className="jso-signature-crest-zone">
          <div className="jso-signature-crest-halo"><img src={CREST_SRC} alt="Écusson de la Jeunesse Sportive d’Oudhref" fetchPriority="high" /></div>
          <p className="jso-signature-crest-caption">NOTRE BLASON <span>NOTRE HISTOIRE</span></p>
        </div>
      </div>
      {showMatch && (
        <div className="jso-signature-match-wrap">
          <div className="jso-signature-match-card">
            <div className="jso-signature-match-label"><CalendarDays size={21} aria-hidden="true" /><span>PROCHAIN<br />MATCH</span></div>
            <img src={CREST_SRC} alt="" className="jso-signature-match-crest" />
            <div className="jso-signature-match-details">
              <span>LA JSO SUR LE TERRAIN</span>
              <strong>{opponent ? `JSO — ${opponent}` : 'Rencontre à confirmer'}</strong>
              <small>{kickoff ? `${formatDate(kickoff, { day: 'numeric', month: 'long', year: 'numeric' })} · ${formatTime(kickoff)}${nextMatch.venue ? ` · ${nextMatch.venue}` : ''}` : 'Adversaire, date et stade publiés dès confirmation'}</small>
            </div>
            <a href="/matchs" className="jso-signature-match-link">Voir le calendrier <ArrowUpRight size={17} aria-hidden="true" /></a>
          </div>
        </div>
      )}
    </section>
  )
}
