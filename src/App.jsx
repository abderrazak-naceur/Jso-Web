import { useState } from 'react'
import './App.css'

const features = [
  {
    icon: '◈',
    title: 'Interview practice',
    text: 'Simulate realistic technical and behavioral interviews in a focused workspace.',
  },
  {
    icon: '↗',
    title: 'AI feedback',
    text: 'Get clear feedback on your answers, structure, clarity, and confidence.',
  },
  {
    icon: '✦',
    title: 'Career insights',
    text: 'Track your progress and identify the areas that matter most for your next interview.',
  },
]

function App() {
  const [demoOpen, setDemoOpen] = useState(false)

  return (
    <main className="app-shell">
      <nav className="navbar">
        <a className="brand" href="#top" aria-label="Interview AI home">
          <span className="brand-mark">AI</span>
          <span>Interview<span>AI</span></span>
        </a>

        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
        </div>

        <button className="nav-cta" type="button" onClick={() => setDemoOpen(true)}>
          Try demo
        </button>
      </nav>

      <section className="hero-section" id="top">
        <div className="hero-copy">
          <div className="eyebrow">AI-POWERED INTERVIEW COACH</div>
          <h1>
            Walk into your next interview with
            <span> confidence.</span>
          </h1>
          <p className="hero-subtitle">
            Practice realistic interviews, receive instant AI feedback, and turn every session into measurable progress.
          </p>

          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => setDemoOpen(true)}>
              Start practicing <span>→</span>
            </button>
            <a className="secondary-link" href="#how-it-works">See how it works</a>
          </div>

          <div className="trust-row">
            <span className="status-dot" />
            <span>No credit card required</span>
            <span className="trust-divider">•</span>
            <span>Built for technical &amp; behavioral interviews</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="AI interview dashboard preview">
          <div className="glow glow-one" />
          <div className="glow glow-two" />
          <div className="dashboard-card">
            <div className="dashboard-topbar">
              <span className="mini-title">Live interview</span>
              <span className="live-pill"><span /> LIVE</span>
            </div>

            <div className="question-block">
              <div className="question-label">QUESTION 03</div>
              <h2>Tell me about a challenging project you delivered.</h2>
              <div className="waveform" aria-hidden="true">
                {Array.from({ length: 34 }).map((_, index) => (
                  <i key={index} style={{ height: `${12 + ((index * 17) % 40)}px` }} />
                ))}
              </div>
            </div>

            <div className="score-grid">
              <div className="score-card">
                <span>Clarity</span>
                <strong>92</strong>
                <small>Excellent</small>
              </div>
              <div className="score-card">
                <span>Structure</span>
                <strong>87</strong>
                <small>Very good</small>
              </div>
              <div className="score-card highlight-card">
                <span>Confidence</span>
                <strong>94</strong>
                <small>Excellent</small>
              </div>
            </div>

            <div className="insight-card">
              <div>
                <span className="insight-kicker">AI INSIGHT</span>
                <p>Strong example. Add a measurable outcome to make your answer more impactful.</p>
              </div>
              <span className="spark">✦</span>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-strip" aria-label="Product highlights">
        <div><strong>10k+</strong><span>practice sessions</span></div>
        <div><strong>4.9/5</strong><span>user rating</span></div>
        <div><strong>24/7</strong><span>AI coaching</span></div>
        <div><strong>3 min</strong><span>to your first session</span></div>
      </section>

      <section className="features-section" id="features">
        <div className="section-heading">
          <span className="eyebrow">DESIGNED AROUND YOUR SUCCESS</span>
          <h2>Everything you need to interview better.</h2>
        </div>

        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-section" id="how-it-works">
        <div className="workflow-copy">
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>Practice. Improve. Repeat.</h2>
          <p>
            A simple workflow designed to keep you focused on the conversation instead of the tool.
          </p>
          <div className="steps">
            <div><span>01</span><div><h3>Choose your interview</h3><p>Select a role, difficulty, and interview style.</p></div></div>
            <div><span>02</span><div><h3>Answer naturally</h3><p>Practice with realistic questions and timed responses.</p></div></div>
            <div><span>03</span><div><h3>Review your feedback</h3><p>Understand what worked and what to improve next.</p></div></div>
          </div>
        </div>

        <div className="review-card">
          <div className="review-header">
            <span>SESSION REVIEW</span>
            <strong>08:42</strong>
          </div>
          <div className="review-score">
            <div className="score-ring"><span>91</span><small>/100</small></div>
            <div><h3>Great session</h3><p>You are becoming more concise and structured.</p></div>
          </div>
          <div className="progress-line"><span style={{ width: '91%' }} /></div>
          <div className="review-meta"><span>Clarity <b>92%</b></span><span>Confidence <b>94%</b></span><span>Structure <b>87%</b></span></div>
        </div>
      </section>

      <section className="pricing-section" id="pricing">
        <div className="pricing-card">
          <div>
            <span className="eyebrow">START TODAY</span>
            <h2>Your next interview starts here.</h2>
            <p>Use the demo now and validate the experience before connecting the real AI backend.</p>
          </div>
          <button className="primary-button" type="button" onClick={() => setDemoOpen(true)}>Open demo <span>→</span></button>
        </div>
      </section>

      <footer className="footer">
        <span>© 2026 InterviewAI</span>
        <span>Frontend MVP · React + Vite</span>
      </footer>

      {demoOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setDemoOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="demo-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setDemoOpen(false)} aria-label="Close">×</button>
            <span className="eyebrow">INTERVIEW DEMO</span>
            <h2 id="demo-title">Ready for question one?</h2>
            <p>This frontend demo is ready. The next step is connecting the session to your .NET API and AI provider.</p>
            <div className="modal-actions">
              <button className="primary-button" type="button" onClick={() => setDemoOpen(false)}>Start demo <span>→</span></button>
              <button className="secondary-button" type="button" onClick={() => setDemoOpen(false)}>Maybe later</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default App
