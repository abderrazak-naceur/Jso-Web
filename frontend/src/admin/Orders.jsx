import { useEffect, useState } from 'react'
import { Eye, RefreshCw } from 'lucide-react'
import { API_BASE_URL } from '../lib/apiConfig'

async function api(path, options = {}) {
  const token = localStorage.getItem('jso_admin_token')
  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers,
    },
  })
  if (!response.ok) {
    let message = 'Request failed: ' + response.status
    try { message = (await response.json()).message || message } catch { /* ignore */ }
    throw new Error(message)
  }
  if (response.status === 204) return null
  return response.json()
}

const STATUSES = ['Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled', 'Failed']
const STATUS_STYLES = {
  Pending: 'bg-amber-100 text-amber-700',
  Paid: 'bg-emerald-100 text-emerald-700',
  Shipped: 'bg-blue-100 text-blue-700',
  Delivered: 'bg-slate-200 text-slate-700',
  Cancelled: 'bg-slate-100 text-slate-500',
  Failed: 'bg-red-100 text-red-700',
}
// Forward transitions mirrored from the backend so the UI only offers valid moves.
const NEXT = {
  Pending: ['Paid', 'Cancelled', 'Failed'],
  Paid: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: [],
  Failed: ['Pending'],
}

export default function OrdersModule({ onError }) {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('')
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try { setOrders(await api('/admin/shop/orders' + (filter ? '?status=' + filter : ''))); onError('') }
    catch (e) { onError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [filter])

  async function openDetail(id) {
    try { setDetail(await api('/admin/shop/orders/' + id)) }
    catch (e) { onError(e.message) }
  }

  async function changeStatus(id, status) {
    try {
      await api('/admin/shop/orders/' + id + '/status', { method: 'PUT', body: JSON.stringify({ status }) })
      await load()
      if (detail?.id === id) await openDetail(id)
    } catch (e) { onError(e.message) }
  }

  const money = (n, c) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c || 'TND' }).format(n || 0)
  const badge = (s) => 'rounded-full px-2.5 py-1 text-xs font-extrabold ' + (STATUS_STYLES[s] || 'bg-slate-100 text-slate-600')

  return <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">Commandes</h2>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-jso-blue">
            <option value="">Tous les statuts</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={load} className="rounded-xl border border-slate-200 p-2 text-slate-600" aria-label="Actualiser"><RefreshCw size={16} /></button>
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        {loading ? <p className="text-sm text-slate-400">Chargement…</p>
          : orders.length === 0 ? <p className="text-sm text-slate-400">Aucune commande.</p>
          : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Date</th><th className="p-2">Client</th><th className="p-2">Total</th><th className="p-2">Statut</th><th className="p-2"></th></tr></thead><tbody>{orders.map((o) => <tr key={o.id} className="border-b last:border-0"><td className="p-2 whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'short' })}</td><td className="p-2">{o.customerName || '—'}</td><td className="p-2 whitespace-nowrap font-bold">{money(o.total, o.currency)}</td><td className="p-2"><span className={badge(o.status)}>{o.status}</span></td><td className="p-2"><button onClick={() => openDetail(o.id)} className="text-jso-blue"><Eye size={16} /></button></td></tr>)}</tbody></table>}
      </div>
    </div>

    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">Détail</h2>
      {!detail ? <p className="mt-4 text-sm text-slate-400">Sélectionnez une commande.</p>
        : <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between"><span className={badge(detail.status)}>{detail.status}</span><span className="text-lg font-black">{money(detail.total, detail.currency)}</span></div>
            <div className="text-sm text-slate-600">
              <p><b>Client :</b> {detail.customerName || '—'}</p>
              {detail.customerEmail && <p><b>Email :</b> {detail.customerEmail}</p>}
              {detail.note && <p><b>Note :</b> {detail.note}</p>}
              <p><b>Créée :</b> {new Date(detail.createdAt).toLocaleString('fr-FR')}</p>
              {detail.paidAt && <p><b>Payée :</b> {new Date(detail.paidAt).toLocaleString('fr-FR')}</p>}
            </div>
            <div className="rounded-2xl border border-slate-200 p-3">
              {(detail.items || []).map((it, i) => <div key={i} className="flex justify-between border-b border-slate-100 py-1.5 text-sm last:border-0"><span>{it.quantity}× {it.productName}</span><span className="font-semibold">{money(it.lineTotal, detail.currency)}</span></div>)}
            </div>
            {(NEXT[detail.status] || []).length > 0 && <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
              {NEXT[detail.status].map((s) => <button key={s} onClick={() => changeStatus(detail.id, s)} className="rounded-xl bg-jso-navy px-3 py-2 text-sm font-bold text-white hover:bg-jso-blue">{s === 'Paid' ? 'Confirmer le paiement' : s === 'Shipped' ? 'Marquer expédiée' : s === 'Delivered' ? 'Marquer livrée' : s === 'Cancelled' ? 'Annuler' : s}</button>)}
            </div>}
          </div>}
    </div>
  </div>
}
