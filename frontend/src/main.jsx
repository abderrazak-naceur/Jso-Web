import { Component, StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { I18nProvider } from './i18n/index.jsx'

const App = lazy(() => import('./App.jsx'))
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const PaymentReturn = lazy(() => import('./features/shop/PaymentReturn.jsx'))
const NewsListPage = lazy(() => import('./features/news/NewsListPage.jsx'))
const BilletteriePage = lazy(() => import('./features/tickets/BilletteriePage.jsx'))
const DonationPage = lazy(() => import('./features/donations/DonationPage.jsx'))

class RootErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children

    const error = this.state.error
    return (
      <main style={{ minHeight: '100vh', padding: '32px', fontFamily: 'system-ui, sans-serif', background: '#f6f8fc', color: '#0b1730' }}>
        <h1 style={{ marginBottom: '12px' }}>JSO — Errore di avvio</h1>
        <p style={{ marginBottom: '16px' }}>L'applicazione ha incontrato un errore JavaScript durante l'avvio.</p>
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: '16px', borderRadius: '12px', background: '#fff', border: '1px solid #dbe3f0' }}>
          {String(error?.stack || error?.message || error)}
        </pre>
      </main>
    )
  }
}

function RouteFallback() {
  return (
    <div
      role="status"
      className="grid min-h-screen place-items-center bg-jso-paper text-jso-ink"
    >
      <span className="text-sm font-semibold text-slate-500">Chargement…</span>
    </div>
  )
}

function Root() {
  const path = window.location.pathname
  if (path.startsWith('/admin')) return <AdminApp />
  if (path.startsWith('/payment/')) return <PaymentReturn />
  if (path === '/actualites' || path === '/actualites/') return <NewsListPage />
  if (path === '/billetterie' || path === '/billetterie/') return <BilletteriePage />
  if (path === '/soutenir' || path === '/soutenir/') return <DonationPage />
  return <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <I18nProvider>
        <Suspense fallback={<RouteFallback />}>
          <Root />
        </Suspense>
      </I18nProvider>
    </RootErrorBoundary>
  </StrictMode>,
)