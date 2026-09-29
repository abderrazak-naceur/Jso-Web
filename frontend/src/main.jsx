import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Code-splitting: the public site (App) is the default landing and stays in the
// main bundle, while the large admin back office and the payment return pages
// are loaded on demand only when their route is visited. This keeps the public
// site's initial JS payload small.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const PaymentReturn = lazy(() => import('./features/shop/PaymentReturn.jsx'))
const NewsListPage = lazy(() => import('./features/news/NewsListPage.jsx'))
const BilletteriePage = lazy(() => import('./features/tickets/BilletteriePage.jsx'))

// Minimal, framework-free fallback shown while a lazy chunk loads. Kept inline
// so it needs no extra chunk and matches the JSO paper background.
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
  // Provider return/cancel landing pages. They only read the order status
  // (set server-side by the verified webhook); they never confirm payment.
  if (path.startsWith('/payment/')) return <PaymentReturn />
  // The "all articles" listing page is exactly /actualites (optionally with a
  // ?page= query). A deeper /actualites/{slug} path is a single article and is
  // handled by App (opens the article view over the home page).
  if (path === '/actualites' || path === '/actualites/') return <NewsListPage />
  // Standalone public billetterie page: list matches on sale and buy directly.
  if (path === '/billetterie' || path === '/billetterie/') return <BilletteriePage />
  return <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<RouteFallback />}>
      <Root />
    </Suspense>
  </StrictMode>,
)
