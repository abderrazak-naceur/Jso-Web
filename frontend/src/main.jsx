import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AdminApp from './admin/AdminApp.jsx'
import PaymentReturn from './features/shop/PaymentReturn.jsx'

function Root() {
  const path = window.location.pathname
  if (path.startsWith('/admin')) return <AdminApp />
  // Provider return/cancel landing pages. They only read the order status
  // (set server-side by the verified webhook); they never confirm payment.
  if (path.startsWith('/payment/')) return <PaymentReturn />
  return <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
