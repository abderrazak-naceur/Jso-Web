import { useState } from 'react'
import './App.css'

const primaryNav = [
  ['Home', 'home'],
  ['Club', 'club'],
  ['Équipe', 'team'],
  ['Match Center', 'matches'],
  ['Actualités', 'news'],
  ['Media', 'media'],
]

const news = [
  { category: 'CLUB', title: 'JSO prépare la nouvelle saison', meta: 'Actualité du club', accent: 'blue' },
  { category: 'MATCH', title: 'Le prochain rendez-vous approche', meta: 'Match Center', accent: 'gold' },
  { category: 'ACADEMY', title: 'Les talents d’Oudhref en lumière', meta: 'Formation', accent: 'cyan' },
]

const squad = [
  ['01', 'GK', 'Portier'],
  ['04', 'CB', 'Défenseur'],
  ['08', 'CM', 'Milieu'],
  ['10', 'FW', 'Attaquant'],
]

const clubPillars = [
  ['01', 'MATCHDAY', 'Suivre chaque rendez-vous du club avec un centre de match pensé pour le direct.'],
  ['02', 'MEDIA HOUSE', 'Photos, vidéos, interviews et archives dans une expérience éditoriale premium.'],
  ['03', 'COMMUNITY', 'Créer une vraie place digitale pour les supporters autour de JSO.'],
  ['04', 'CLUB SHOP', 'Maillots, accessoires et produits du club dans une boutique intégrée.'],
]

function App() {
  const [activeNav, setActiveNav] = useState('Home')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [lang, setLang] = useState('FR')

  const navigate = (label, anchor) => {
    setActiveNav(label)
    setMenuOpen(false)
    document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className="jso-site">
      <div className="background-noise" />
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <header className="navbar">
        <button className="brand" type="button" onClick={() => navigate('Home', 'home')} aria-label="JSO home">
          <span className="brand-mark"><img src="/jso-club-mark.svg" alt="JSO" /></span>
          <span className="brand-text"><strong>JSO</strong><small>Jeunesse Sportive d'Oudhref</small></span>
        </button>

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`} aria-label="Navigation principale">
          {primaryNav.map(([label, anchor]) => (
            <button key={label} type="button" className={activeNav === label ? 'active' : ''} onClick={() => navigate(label, anchor)}>{label}</button>
          ))}
        </nav>

        <div className="nav-actions">
          <button className="language-switch" type="button" onClick={() => setLang(lang === 'FR' ? 'AR' : 'FR')} aria-label="Changer la langue">{lang} <span>⌄</span></button>
          <button className="icon-glass" type="button" aria-label="Recherche">⌕</button>
          <button className="nav-cta" type="button" onClick={() => navigate('Match Center', 'matches')}>Match Center <span>↗</span></button>
          <button className="menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Menu">☰</button>
        </div>
      </header>

      <section className="hero" id="home">
        <div className="hero-copy">
          <div className="hero-badges"><span className="eyebrow">JEUNESSE SPORTIVE D'OUDHREF</span><span className="season-badge">SAISON 2026/27</span></div>
          <h1>Le club.<br /><span>En grand.</span></h1>
          <p>Une nouvelle expérience digitale pour JSO : identité, matchday, équipe, actualités, médias et communauté dans une seule plateforme.</p>
          <div className="hero-actions">
            <button className="btn-primary" type="button" onClick={() => navigate('Match Center', 'matches')}>Explorer le Match Center <span>→</span></button>
            <button className="btn-glass" type="button" onClick={() => setShowVideo(true)}><span className="play">▶</span> Découvrir JSO</button>
          </div>
          <div className="hero-meta"><span className="live-dot" /> <strong>Club digital nouvelle génération</strong><span>·</span><span>Oudhref / Tunisie</span></div>
        </div>

        <div className="hero-visual">
          <div className="hero-grid-lines" />
          <div className="hero-circle circle-one" />
          <div className="hero-circle circle-two" />
          <div className="hero-card">
            <div className="hero-card-head"><span>JSO / MATCHDAY</span><b>NEXT</b></div>
            <div className="hero-card-center">
              <div className="hero-side"><img src="/jso-club-mark.svg" alt="JSO" /><strong>JSO</strong><small>OUDHREF</small></div>
              <div className="hero-vs"><span>À VENIR</span><strong>VS</strong><small>Date à confirmer</small></div>
              <div className="hero-side"><div className="opponent-mark">TBA</div><strong>ADVERSAIRE</strong><small>À confirmer</small></div>
            </div>
            <div className="hero-card-bottom"><span>Live score</span><span>Line-up</span><span>Stats</span><span>Chat</span></div>
          </div>
          <div className="hero-floating floating-top glass-card"><span>01</span><div><small>CLUB IDENTITY</small><strong>Born in Oudhref.</strong></div></div>
          <div className="hero-floating floating-bottom glass-card"><small>DIGITAL HUB</small><strong>JSO / 24·7</strong><div className="signal-bars"><i /><i /><i /><i /><i /><i /></div></div>
        </div>
      </section>

      <section className="marquee"><div className="marquee-track"><span>JSO / MATCHDAY</span><b>✦</b><span>JSO / NEWS</span><b>✦</b><span>JSO / MEDIA</span><b>✦</b><span>JSO / COMMUNITY</span><b>✦</b><span>JSO / CLUB SHOP</span><b>✦</b><span>JSO / MATCHDAY</span><b>✦</b></div></section>

      <section className="section-frame" id="club">
        <div className="section-top"><div><span className="section-number">01 / CLUB</span><h2>Une identité forte.<br /><span>Une expérience moderne.</span></h2></div><p>Le nouveau visage numérique de JSO est pensé comme un club média : contenu, données, matchday et communauté.</p></div>
        <div className="pillar-grid">
          {clubPillars.map(([num, title, text]) => <article className="pillar-card" key={num}><span>{num}</span><small>{title}</small><p>{text}</p><strong>↗</strong></article>)}
        </div>
      </section>

      <section className="section-frame" id="matches">
        <div className="section-top"><div><span className="section-number">02 / MATCH CENTER</span><h2>Tout commence<br /><span>par le match.</span></h2></div><button className="text-link" type="button" onClick={() => setShowVideo(true)}>Ouvrir l’expérience match ↗</button></div>
        <div className="match-layout">
          <article className="featured-match glass-card">
            <div className="match-kicker"><span>PROCHAIN MATCH</span><b>À VENIR</b></div>
            <div className="match-versus">
              <div className="team-large"><img src="/jso-club-mark.svg" alt="JSO" /><strong>JSO</strong><small>Jeunesse Sportive d'Oudhref</small></div>
              <div className="match-time"><span>DATE / HORAIRE</span><strong>-- : --</strong><small>Calendrier à synchroniser</small><i>VS</i></div>
              <div className="team-large"><div className="tba-large">TBA</div><strong>ADVERSAIRE</strong><small>À confirmer</small></div>
            </div>
            <div className="match-data-row"><span>Composition</span><span>Événements</span><span>Statistiques</span><span>Commentaires</span><button type="button" onClick={() => setShowVideo(true)}>Entrer dans le match →</button></div>
          </article>
          <aside className="side-match-card">
            <span className="section-number">DERNIER SCORE</span>
            <div className="side-score"><strong>JSO</strong><span>—</span><strong>TBA</strong></div>
            <p>Les résultats seront alimentés automatiquement depuis la future source de données du club.</p>
            <div className="stat-mini"><span>Score</span><b>--</b></div><div className="stat-mini"><span>Classement</span><b>--</b></div><div className="stat-mini"><span>Forme</span><b>— — —</b></div>
          </aside>
        </div>
      </section>

      <section className="section-frame" id="news">
        <div className="section-top"><div><span className="section-number">03 / NEWSROOM</span><h2>Le club<br /><span>en mouvement.</span></h2></div><button className="text-link" type="button">Toutes les actualités →</button></div>
        <div className="news-layout">
          <article className="news-hero-card">
            <div className="editorial-art"><span>JSO</span><strong>IDENTITY</strong><small>OUDHREF / 2026</small><div className="editorial-ring" /></div>
            <div className="news-hero-copy"><span>À LA UNE</span><h3>Le nouveau chapitre digital de Jeunesse Sportive d'Oudhref.</h3><p>Une plateforme conçue pour moderniser la relation entre le club, les joueurs, les supporters et la ville.</p><button type="button">Lire l’article ↗</button></div>
          </article>
          <div className="news-stack">
            {news.map((item) => <article className="news-item" key={item.title}><div className={`news-thumb ${item.accent}`}><span>{item.category}</span></div><div><small>{item.meta}</small><h3>{item.title}</h3><button type="button">Lire ↗</button></div></article>)}
          </div>
        </div>
      </section>

      <section className="section-frame" id="team">
        <div className="section-top"><div><span className="section-number">04 / ÉQUIPE</span><h2>Les couleurs.<br /><span>La nouvelle génération.</span></h2></div><button className="text-link" type="button">Voir l’effectif →</button></div>
        <div className="squad-grid">
          {squad.map(([number, position, role], index) => <article className={`player-card player-${index + 1}`} key={number}><div className="player-top"><span>{position}</span><b>{number}</b></div><div className="player-silhouette">JSO</div><div className="player-footer"><small>{role}</small><strong>Profil joueur</strong><span>↗</span></div></article>)}
        </div>
      </section>

      <section className="media-section section-frame" id="media">
        <div className="media-header"><div><span className="section-number">05 / MEDIA HOUSE</span><h2>Voir le club.<br /><span>Ressentir le club.</span></h2></div><button className="text-link" type="button" onClick={() => setShowVideo(true)}>Ouvrir Media House →</button></div>
        <div className="media-layout">
          <button className="media-feature" type="button" onClick={() => setShowVideo(true)}><div className="media-art"><span>JSO</span><strong>MATCHDAY</strong><small>HIGHLIGHTS / 00:42</small></div><span className="media-play">▶</span><div className="media-label"><small>VIDEO / 01</small><strong>Les moments qui restent.</strong></div></button>
          <div className="media-list"><article><div>PRESS</div><span><small>INTERVIEW</small><strong>Dans le vestiaire JSO</strong></span><b>↗</b></article><article><div>YOUTH</div><span><small>ACADEMY</small><strong>La relève d'Oudhref</strong></span><b>↗</b></article><article><div>ROOTS</div><span><small>ARCHIVES</small><strong>Une histoire à raconter</strong></span><b>↗</b></article></div>
        </div>
      </section>

      <section className="community-band section-frame" id="community">
        <div className="community-glass">
          <div className="community-copy"><span className="section-number">06 / COMMUNITY</span><h2>La tribune<br /><span>ne s'arrête jamais.</span></h2><p>Posts, réactions, commentaires, rendez-vous de match et contenu supporter : une couche sociale pensée directement dans le site du club.</p><button className="btn-primary" type="button">Rejoindre la communauté <span>→</span></button></div>
          <div className="community-stack"><article><span>J</span><div><strong>@jso_support</strong><p>Le prochain match, on le vit ensemble. 💙</p><small>il y a 3 min · 124 réactions</small></div></article><article><span>O</span><div><strong>@oudhref_fans</strong><p>Une équipe, une ville, une seule identité.</p><small>il y a 16 min · 87 réactions</small></div></article><article><span>JS</span><div><strong>@jso_media</strong><p>Nouvelle série vidéo bientôt disponible.</p><small>il y a 28 min · 63 réactions</small></div></article></div>
        </div>
      </section>

      <section className="shop-section section-frame" id="shop">
        <div className="section-top"><div><span className="section-number">07 / CLUB SHOP</span><h2>Porter<br /><span>les couleurs.</span></h2></div><button className="text-link" type="button">Voir la boutique →</button></div>
        <div className="shop-grid">
          {[['01', 'Maillot JSO', 'HOME'], ['02', 'Écharpe JSO', 'CLASSIC'], ['03', 'Casquette', 'OUDHREF'], ['04', 'Hoodie', 'ESSENTIALS']].map(([n, name, tag], index) => <article className="shop-card" key={n}><div className={`shop-product product-${index + 1}`}><span>JSO</span><small>{tag}</small></div><div className="shop-info"><div><strong>{name}</strong><span>Collection 2026/27</span></div><button type="button">＋</button></div></article>)}
        </div>
      </section>

      <section className="closing-section section-frame">
        <div className="closing-grid"><div><span className="section-number">JSO / DIGITAL CLUB</span><h2>Built for the<br /><span>next generation.</span></h2><p>Une plateforme web moderne, évolutive et prête pour le live, la donnée, la communauté et le mobile.</p><button className="btn-primary" type="button" onClick={() => navigate('Home', 'home')}>Retour à l’accueil <span>↑</span></button></div><div className="closing-orb"><div className="closing-ring" /><img src="/jso-club-mark.svg" alt="JSO" /></div></div>
      </section>

      <footer className="footer">
        <div className="footer-main"><div className="footer-brand"><img src="/jso-club-mark.svg" alt="JSO" /><div><strong>JSO</strong><span>Jeunesse Sportive d'Oudhref</span></div></div><div className="footer-nav"><a href="#club">Club</a><a href="#team">Équipe</a><a href="#matches">Match Center</a><a href="#news">Actualités</a><a href="#media">Media</a><a href="#community">Community</a><a href="#shop">Shop</a></div></div>
        <div className="footer-bottom"><span>© 2026 JSO · Digital Club Experience</span><span>Oudhref / Tunisia</span></div>
      </footer>

      {showVideo && <div className="modal-backdrop" onClick={() => setShowVideo(false)}><div className="modal-video" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="video-title"><button className="modal-close" type="button" onClick={() => setShowVideo(false)} aria-label="Fermer">×</button><div className="modal-screen"><span>JSO</span><strong>MEDIA HOUSE</strong><small>VIDEO PLAYER READY</small></div><div className="modal-body"><span className="section-number">MEDIA HOUSE</span><h2 id="video-title">The club, in motion.</h2><p>Cette zone est prête à être connectée au futur CMS vidéo du club.</p></div></div></div>}
    </main>
  )
}

export default App
