import { useState } from 'react'
import './App.css'

const matches = [
  { label: 'PROSSIMA PARTITA', competition: 'Lega Regionale', date: 'Sab 10 Mag', time: '16:00', opponent: 'USM El Harrach', live: true },
  { label: 'IN ARRIVO', competition: 'Lega Regionale', date: 'Sab 17 Mag', time: '16:00', opponent: 'RC Arba' },
  { label: 'COPPA', competition: 'Coppa', date: 'Sab 24 Mag', time: '18:00', opponent: 'JS Saoura' },
]

const features = [
  ['▶', 'Partite in diretta', 'Guarda e commenta insieme'],
  ['◉', 'Community attiva', 'Tifosi, chat e contenuti'],
  ['🛍', 'Fan Shop', 'Prodotti ufficiali e merchandising'],
  ['♛', 'News e aggiornamenti', 'Tutte le novità sulla squadra'],
]

const products = [
  ['/jersey.svg', 'Maglia ufficiale 2024/2025', '€ 49,90', '124'],
  ['/scarf.svg', 'Sciarpa Chabiba Bouderf', '€ 19,90', '89'],
  ['/cap.svg', 'Cappellino ufficiale', '€ 24,90', '67'],
  ['/hoodie.svg', 'Felpa con cappuccio', '€ 44,90', '52'],
]

const community = [
  ['Yassine_10', '2 ore fa', 'Sempre con voi 💛💙', '312', '24'],
  ['ChabibaFans', '5 ore fa', 'Atmosfera incredibile al Bouderf! 💙💛', '428', '36'],
  ['IlhamCRB', '1 giorno fa', 'La passione non si spegne mai!', '517', '41'],
  ['Bouderf1937', '2 giorni fa', 'Storia, orgoglio e futuro 💛💙', '289', '18'],
]

function App() {
  const [premiumOpen, setPremiumOpen] = useState(false)
  const [postOpen, setPostOpen] = useState(false)

  return (
    <main className="fan-app">
      <header className="site-header">
        <a className="brand" href="#top">
          <span className="brand-mark">FM</span>
          <span>Fan<span>Match</span></span>
        </a>
        <nav className="site-nav">
          <a href="#top" className="active">Home</a>
          <a href="#matches">Partite</a>
          <a href="#shop">Fan Shop</a>
          <a href="#community">Community</a>
          <a href="#premium">Premium</a>
        </nav>
        <div className="header-actions">
          <button className="round-btn" type="button" aria-label="Cerca">⌕</button>
          <button className="round-btn" type="button" aria-label="Notifiche">♧</button>
          <button className="login-btn" type="button">Accedi</button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">LA COMMUNITY UFFICIALE DEI TIFOSI</span>
          <h1>Il tuo club.<br /><span>La tua passione.</span></h1>
          <p>Segui le partite, vivi l’emozione, condividi la passione con migliaia di tifosi e porta sempre con te i colori della tua squadra.</p>
          <div className="hero-actions">
            <a className="yellow-btn" href="#matches">▶ &nbsp; Scopri FanMatch</a>
            <button className="outline-btn" type="button" onClick={() => setPostOpen(true)}>Unisciti alla community</button>
          </div>
          <div className="hero-note"><span /> 15.2K tifosi già nella community</div>
        </div>
        <div className="hero-art">
          <img src="/team-hero.svg" alt="FanMatch stadium and supporters" />
          <div className="arabic-tag">مع بعضنا<br /><b>نكملو المسيرة…</b></div>
        </div>
      </section>

      <section className="section" id="matches">
        <div className="section-heading">
          <div><span className="eyebrow">VIVI OGNI MATCH INSIEME</span><h2>Prossime partite</h2><p>Entra nella stanza, commenta il match e resta vicino alla squadra.</p></div>
          <a className="section-link" href="#matches">Vedi calendario →</a>
        </div>
        <div className="matches-grid">
          {matches.map((match) => (
            <article key={match.opponent} className={`match-card ${match.live ? 'match-featured' : ''}`}>
              <div className="match-card-top"><span>{match.label}</span><b>{match.competition}</b></div>
              <div className="match-row">
                <div className="club"><div className="club-crest">JM</div><strong>Chabiba<br />Riadia Bouderf</strong></div>
                <div className="match-date"><strong>{match.date}</strong><b>{match.time}</b></div>
                <div className="club opponent"><div className="club-crest opponent-crest">VS</div><strong>{match.opponent}</strong></div>
              </div>
              <button className={match.live ? 'match-cta yellow-btn' : 'match-cta dark-btn'} type="button" onClick={() => match.live && setPremiumOpen(true)}>
                {match.live ? '▶  Entra nella stanza' : '♧  Imposta promemoria'}
              </button>
              {match.live && <span className="ready-users">● 1.2K tifosi pronti</span>}
            </article>
          ))}
          <article className="premium-card" id="premium">
            <div>
              <span className="eyebrow">FANMATCH PREMIUM</span>
              <h3>Diventa Premium</h3>
              <p>Accedi alle dirette, chat esclusive, contenuti speciali e supporta la nostra squadra.</p>
              <button className="blue-btn" type="button" onClick={() => setPremiumOpen(true)}>Scopri i piani →</button>
            </div>
            <img src="/jersey.svg" alt="FanMatch official jersey" />
          </article>
        </div>
      </section>

      <section className="feature-grid">
        {features.map(([icon, title, text]) => (
          <article key={title} className="feature-tile">
            <div className="feature-icon">{icon}</div><div><strong>{title}</strong><span>{text}</span></div>
          </article>
        ))}
      </section>

      <section className="section" id="shop">
        <div className="section-heading">
          <div><span className="eyebrow">PORTA SEMPRE CON TE I NOSTRI COLORI</span><h2>Fan Shop</h2><p>Prodotti ufficiali per vivere la tua squadra anche fuori dallo stadio.</p></div>
          <a className="section-link" href="#shop">Vedi tutti i prodotti →</a>
        </div>
        <div className="product-grid">
          {products.map(([image, title, price, reviews]) => (
            <article key={title} className="product-card">
              <div className="product-image"><img src={image} alt={title} /></div>
              <div className="rating">★ ★ ★ ★ ★ <span>({reviews})</span></div>
              <h3>{title}</h3>
              <div className="product-bottom"><strong>{price}</strong><button type="button" aria-label={`Aggiungi ${title}`}>＋</button></div>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="community">
        <div className="section-heading">
          <div><span className="eyebrow">FOTO, VIDEO E MOMENTI DEI NOSTRI TIFOSI</span><h2>Dalla nostra community</h2><p>Condividi l’emozione, commenta le partite e vivi la passione con gli altri fan.</p></div>
          <button className="section-link button-link" type="button" onClick={() => setPostOpen(true)}>Vedi tutti i post →</button>
        </div>
        <div className="community-grid">
          {community.map(([author, time, caption, likes, comments], index) => (
            <article key={author} className="community-card">
              <img src="/team-hero.svg" alt="Community post" style={{ objectPosition: `${25 + index * 20}% center` }} />
              <div className="community-body"><div className="post-meta"><strong>{author}</strong><span>{time}</span></div><p>{caption}</p><div className="post-actions"><span>♥ {likes}</span><span>◌ {comments}</span><span>↗</span></div></div>
            </article>
          ))}
        </div>
      </section>

      <section className="stats-band">
        <div><strong>15.2K</strong><span>Tifosi registrati</span></div>
        <div><strong>8.1K</strong><span>Utenti attivi</span></div>
        <div><strong>120+</strong><span>Partite trasmesse</span></div>
        <div><strong>1</strong><span>Grande passione</span></div>
        <div className="stats-arabic">شبيبتنا<br /><span>فخر المنطقة</span></div>
      </section>

      <footer className="site-footer">
        <div className="footer-brand"><span className="brand-mark">FM</span><div><strong>FanMatch</strong><span>La community dei tifosi</span></div></div>
        <div className="footer-links"><a href="#top">Chi siamo</a><a href="#top">Contatti</a><a href="#top">Privacy</a><a href="#top">Termini</a><a href="#top">FAQ</a></div>
        <div className="footer-social">● ● ● ● ●<span>© 2026 FanMatch · Tutti i diritti riservati.</span></div>
      </footer>

      {(premiumOpen || postOpen) && (
        <div className="modal-backdrop" onClick={() => { setPremiumOpen(false); setPostOpen(false) }}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => { setPremiumOpen(false); setPostOpen(false) }}>×</button>
            <span className="eyebrow">{premiumOpen ? 'FANMATCH PREMIUM' : 'COMMUNITY'}</span>
            <h2>{premiumOpen ? 'Scopri l’esperienza Premium' : 'Unisciti ai tifosi'}</h2>
            <p>{premiumOpen ? 'Le funzioni Premium sono pronte per essere collegate al backend: dirette, chat esclusive, contenuti speciali e vantaggi per i sostenitori.' : 'La prossima versione collegherà il profilo, i post, i commenti, le reaction e le notifiche alla community reale.'}</p>
            <button className="yellow-btn" type="button" onClick={() => { setPremiumOpen(false); setPostOpen(false) }}>Continua →</button>
          </div>
        </div>
      )}
    </main>
  )
}

export default App
