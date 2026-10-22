import { Component, StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { I18nProvider } from './i18n/index.jsx'
import { isKnownSitePath } from './features/site/routeResolution.js'

const App = lazy(() => import('./App.jsx'))
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const PaymentReturn = lazy(() => import('./features/shop/PaymentReturn.jsx'))
const NewsListPage = lazy(() => import('./features/news/NewsListPage.jsx'))
const BilletteriePage = lazy(() => import('./features/tickets/BilletteriePage.jsx'))
const DonationPage = lazy(() => import('./features/donations/DonationPage.jsx'))
const SoutenirPage = lazy(() => import('./features/donations/SoutenirPage.jsx'))
const CustomerDashboardPage = lazy(() => import('./features/account/CustomerDashboardPage.jsx'))
const SupporterProfilePage = lazy(() => import('./features/account/SupporterProfilePage.jsx'))
const NotFoundPage = lazy(() => import('./features/site/NotFoundPage.jsx'))

class RootErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    // Never render exception messages or stack traces into the public page.
    return { hasError: true }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main style={{ minHeight: '100vh', padding: '32px', fontFamily: 'system-ui, sans-serif', background: '#f6f8fc', color: '#0b1730' }}>
        <h1 style={{ marginBottom: '12px' }}>JSO</h1>
        <p role="alert">Une erreur inattendue est survenue. Veuillez recharger la page ou réessayer plus tard.</p>
      </main>
    )
  }
}

function RouteFallback() {
  return (
    <div role="status" className="grid min-h-screen place-items-center bg-jso-paper text-jso-ink">
      <span className="text-sm font-semibold text-slate-500">Chargement…</span>
    </div>
  )
}

function Root() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/admin' || path.startsWith('/admin/')) return <AdminApp />
  if (path.startsWith('/payment/')) return <PaymentReturn />
  if (path === '/actualites') return <NewsListPage />
  if (path === '/billetterie') return <BilletteriePage />
  if (path === '/nos-projets') return <DonationPage />
  // Keep the legacy donation campaign URL and page intact; do not silently
  // redirect supporters to the newer multi-project fundraising experience.
  if (path === '/soutenir') return <SoutenirPage />
  if (path === '/support-campaign-preview') {
    window.history.replaceState({}, '', '/nos-projets' + window.location.search + window.location.hash)
    return <DonationPage />
  }
  if (['/account', '/mon-espace', '/account/tickets', '/account/memberships', '/account/orders', '/account/supports', '/account/payments'].includes(path)) return <CustomerDashboardPage />
  if (path === '/profil' || path === '/profile') return <SupporterProfilePage />
  if (!isKnownSitePath(path)) return <NotFoundPage />
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
