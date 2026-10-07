import { useState } from 'react'

// Reusable "Payer en ligne" control with a country selector, mirroring the shop
// CartDrawer checkout so tickets and the supporters' wall share the exact same
// flow and safety model. It takes a `pay(country)` callback that must call the
// relevant API (ticketApi.pay / supporterApi.pay / shopOrderApi.pay) and return
// a `{ redirectUrl }`. On success the browser is redirected to the provider's
// HOSTED page (Flouci for Tunisia, Stripe otherwise); no card data ever touches
// our servers, and payment is confirmed server-side by the verified webhook.
//
// Loading and error states are handled here: if the provider is not configured
// (sandbox without keys) the API returns a clean message we show without
// crashing.
const COUNTRIES = [
  { code: 'TN', label: 'Tunisie' },
  { code: 'FR', label: 'France' },
  { code: 'DE', label: 'Allemagne' },
  { code: 'IT', label: 'Italie' },
  { code: 'BE', label: 'Belgique' },
  { code: 'CH', label: 'Suisse' },
  { code: 'CA', label: 'Canada' },
  { code: 'US', label: 'États-Unis' },
  { code: 'GB', label: 'Royaume-Uni' },
  { code: 'XX', label: 'Autre pays' },
]

export default function PayOnlineButton({ pay, label = 'Payer en ligne', disabled = false, defaultCountry = 'TN' }) {
  const [country, setCountry] = useState(defaultCountry)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  async function handlePay() {
    setError('')
    setPaying(true)
    try {
      const res = await pay(country)
      const redirectUrl = res?.redirectUrl
      if (redirectUrl) {
        window.location.assign(redirectUrl)
        return
      }
      setError('Le paiement en ligne est momentanément indisponible. Veuillez réessayer plus tard.')
    } catch (e) {
      setError(e?.message || 'Le paiement en ligne est momentanément indisponible. Veuillez réessayer plus tard.')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="w-full max-w-xs text-left">
      <label htmlFor="pay-country" className="mb-1 block text-sm font-bold text-jso-ink">Pays</label>
      <select
        id="pay-country"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"
      >
        {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
      </select>
      <p className="mt-1 text-xs text-slate-400">
        {country === 'TN' ? 'Paiement en dinars (TND) via Flouci.' : 'Paiement international via Stripe.'}
      </p>

      {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      <button
        onClick={handlePay}
        disabled={paying || disabled}
        className="mt-3 w-full rounded-full bg-jso-navy px-6 py-3 font-extrabold text-white hover:bg-jso-blue disabled:opacity-60"
      >
        {paying ? 'Redirection…' : label}
      </button>
      <p className="mt-2 text-xs text-slate-400">Paiement sécurisé sur la page du prestataire. Aucune donnée de carte ne transite par nos serveurs.</p>
    </div>
  )
}