import { useState } from 'react'
import './App.css'

const teams = [
  { name: 'My Team', meta: 'Next match · Sat 20:45', accent: 'green' },
  { name: 'Second Team', meta: 'League · Round 8', accent: 'blue' },
  { name: 'Women', meta: 'Match tomorrow · 18:00', accent: 'gold' },
]

const feed = [
  { author: 'Marco', time: '8 min', title: 'La partita si avvicina: cosa ne pensate della formazione?', reactions: 32 },
  { author: 'Luca', time: '21 min', title: 'Il nuovo acquisto può cambiare il nostro attacco.', reactions: 18 },
  { author: 'Sara', time: '43 min', title: 'Pronostico per il weekend: dite la vostra 👇', reactions: 27 },
]

function App() {
  const [selectedTeam, setSelectedTeam] = useState(0)
  const [showPostComposer, setShowPostComposer] = useState(false)
  const [activeReaction, setActiveReaction] = useState(null)

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="Jso home">
          <span className="brand-mark">J</span>
          <span>Jso<span>Fans</span></span>
        </a>

        <nav className="nav-links" aria-label="Main navigation">
          <a className="active" href="#home">Home</a>
          <a href="#matches">Partite</a>
          <a href="#community">Community</a>
          <a href="#teams">Squadre</a>
        </nav>

        <div className="topbar-actions">
          <button className="icon-button" type="button" aria-label="Notifications">◌</button>
          <button className="profile-button" type="button">AB</button>
        </div>
      </header>

      <section className="hero" id="home">
        <div className="hero-copy">
          <span className="eyebrow">FAN PLATFORM</span>
          <h1>Il tuo club.<br />La tua community.</h1>
          <p>Segui le tue squadre, vivi le partite e parla con altri tifosi in un unico spazio.</p>
          <div className="hero-actions">
            <a className="primary-button" href="#matches">Vai al Match Center <span>→</span></a>
            <button className="ghost-button" type="button" onClick={() => setShowPostComposer(true)}>Scrivi un post</button>
          </div>
        </div>

        <div className="hero-card" aria-label="Fan dashboard preview">
          <div className="hero-card-header">
            <div>
              <span>LIVE MATCH CENTER</span>
              <strong>La prossima partita</strong>
            </div>
            <span className="live-badge"><i /> Live soon</span>
          </div>
          <div className="scoreboard">
            <div className="club-block">
              <div className="club-badge club-home">H</div>
              <strong>HOME</strong>
              <small>Home team</small>
            </div>
            <div className="match-time">
              <small>SABATO</small>
              <strong>20:45</strong>
              <span>Campionato</span>
            </div>
            <div className="club-block">
              <div className="club-badge club-away">A</div>
              <strong>AWAY</strong>
              <small>Away team</small>
            </div>
          </div>
          <div className="match-pills">
            <span>Formazioni</span><span>Eventi</span><span>Commenti</span>
          </div>
        </div>
      </section>

      <div className="content-grid">
        <aside className="sidebar">
          <section className="panel" id="teams">
            <div className="panel-title-row">
              <div>
                <span className="eyebrow">MY TEAMS</span>
                <h2>Le tue squadre</h2>
              </div>
              <button className="small-button" type="button">+ Aggiungi</button>
            </div>

            <div className="team-list">
              {teams.map((team, index) => (
                <button
                  key={team.name}
                  className={`team-item ${selectedTeam === index ? 'selected' : ''}`}
                  type="button"
                  onClick={() => setSelectedTeam(index)}
                >
                  <span className={`team-icon ${team.accent}`}>{index === 0 ? '★' : index === 1 ? '◉' : '✦'}</span>
                  <span>
                    <strong>{team.name}</strong>
                    <small>{team.meta}</small>
                  </span>
                  <span className="chevron">›</span>
                </button>
              ))}
            </div>
          </section>

          <section className="side-stat">
            <span>FAN STREAK</span>
            <strong>12 giorni</strong>
            <p>Hai seguito la tua squadra per 12 giorni consecutivi.</p>
          </section>
        </aside>

        <div className="main-column">
          <section className="panel" id="matches">
            <div className="panel-title-row">
              <div>
                <span className="eyebrow">MATCH CENTER</span>
                <h2>Partite in evidenza</h2>
              </div>
              <a className="text-link" href="#matches">Vedi tutte →</a>
            </div>

            <div className="match-grid">
              <article className="match-card featured-match">
                <div className="match-card-top"><span>OGGI · 20:45</span><b>IN ARRIVO</b></div>
                <div className="match-teams">
                  <div><span className="club-badge club-home large">H</span><strong>HOME</strong></div>
                  <span className="vs">VS</span>
                  <div><span className="club-badge club-away large">A</span><strong>AWAY</strong></div>
                </div>
                <div className="match-footer"><span>Campionato</span><span>🔔 Attiva alert</span></div>
              </article>
              <article className="match-card">
                <div className="match-card-top"><span>DOM · 17:00</span><b>UPCOMING</b></div>
                <div className="compact-score">
                  <span className="mini-club">H</span><strong>HOME</strong>
                  <span className="versus">–</span>
                  <strong>AWAY</strong><span className="mini-club away">A</span>
                </div>
                <p>Round 8 · League</p>
              </article>
            </div>
          </section>

          <section className="panel" id="community">
            <div className="panel-title-row">
              <div>
                <span className="eyebrow">COMMUNITY</span>
                <h2>Cosa dicono i tifosi</h2>
              </div>
              <button className="small-button dark" type="button" onClick={() => setShowPostComposer(true)}>+ Nuovo post</button>
            </div>

            <div className="composer-mini" onClick={() => setShowPostComposer(true)} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && setShowPostComposer(true)}>
              <div className="avatar">AB</div>
              <span>Condividi un pensiero sulla tua squadra...</span>
              <button type="button">Pubblica</button>
            </div>

            <div className="feed-list">
              {feed.map((post, index) => (
                <article className="feed-card" key={post.author + post.time}>
                  <div className="feed-header">
                    <div className="avatar small">{post.author.slice(0, 1)}</div>
                    <div><strong>{post.author}</strong><small>{post.time} fa · Tifoso</small></div>
                    <button className="more-button" type="button" aria-label="Altre opzioni">•••</button>
                  </div>
                  <p>{post.title}</p>
                  <div className="feed-actions">
                    <button type="button" className={activeReaction === index ? 'reacted' : ''} onClick={() => setActiveReaction(activeReaction === index ? null : index)}>♥ {post.reactions}</button>
                    <button type="button">◌ Commenta</button>
                    <button type="button">↗ Condividi</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      <footer className="footer">
        <span>© 2026 Jso Fans</span>
        <span>Fan platform · Frontend MVP</span>
      </footer>

      {showPostComposer && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowPostComposer(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="post-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setShowPostComposer(false)} aria-label="Chiudi">×</button>
            <span className="eyebrow">COMMUNITY POST</span>
            <h2 id="post-title">Cosa vuoi condividere?</h2>
            <textarea placeholder="Scrivi qualcosa per gli altri tifosi..." rows="5" />
            <div className="modal-actions">
              <button className="ghost-button" type="button" onClick={() => setShowPostComposer(false)}>Annulla</button>
              <button className="primary-button" type="button" onClick={() => setShowPostComposer(false)}>Pubblica <span>→</span></button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default App
