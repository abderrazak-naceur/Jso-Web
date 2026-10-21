import { useEffect, useState } from 'react'
import { Save, X, Plus, Check, RefreshCw } from 'lucide-react'
import { API_BASE_URL } from '../../lib/apiConfig'

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
    try { const payload = await response.json(); message = payload.message || message } catch { /* ignore */ }
    throw new Error(message)
  }
  if (response.status === 204) return null
  if (response.status === 200 && options.method === 'DELETE') {
    try { return await response.json() } catch { return null }
  }
  return response.json()
}

const emptyType = { name: 'Entrée générale — Stade Oudhref', price: '5', currency: 'TND', capacity: 100, isActive: true }
const STATUS_STYLES = {
  Pending: 'bg-amber-100 text-amber-700',
  Confirmed: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-slate-100 text-slate-500',
}

export default function TicketsModule({ onError }) {
  const [matches, setMatches] = useState([])
  const [matchId, setMatchId] = useState('')
  const [types, setTypes] = useState([])
  const [orders, setOrders] = useState([])
  const [form, setForm] = useState(emptyType)
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [bulkCreating, setBulkCreating] = useState(false)
  const [promoCodes, setPromoCodes] = useState([])
  const [promoForm, setPromoForm] = useState({ code: '', expiresAt: '', maxUses: '', isEnabled: true })

  async function loadMatches() {
    try { const m = await api('/admin/matches'); setMatches(m); if (!matchId && m[0]) setMatchId(m[0].id) }
    catch (e) { onError(e.message) }
  }
  useEffect(() => { loadMatches() }, [])

  async function loadTypes() {
    if (!matchId) return
    try { setTypes(await api('/admin/tickets/types?matchId=' + matchId)); onError('') }
    catch (e) { onError(e.message) }
  }
  async function loadOrders() {
    try { setOrders(await api('/admin/tickets/orders')) }
    catch (e) { onError(e.message) }
  }
  async function loadPromoCodes() {
    if (!matchId) { setPromoCodes([]); return }
    try { setPromoCodes(await api('/admin/tickets/promo-codes?matchId=' + encodeURIComponent(matchId))) }
    catch (e) { onError(e.message) }
  }
  useEffect(() => { loadTypes() }, [matchId])
  useEffect(() => { loadOrders() }, [])
  useEffect(() => { loadPromoCodes() }, [matchId])

  async function createPromoCode(event) {
    event.preventDefault()
    try {
      await api('/admin/tickets/promo-codes', { method: 'POST', body: JSON.stringify({
        matchId, code: promoForm.code.trim().toUpperCase(), expiresAt: promoForm.expiresAt ? new Date(promoForm.expiresAt).toISOString() : null,
        maxUses: promoForm.maxUses ? Number(promoForm.maxUses) : null, isEnabled: promoForm.isEnabled,
      }) })
      setPromoForm({ code: '', expiresAt: '', maxUses: '', isEnabled: true }); await loadPromoCodes(); onError('')
    } catch (e) { onError(e.message) }
  }
  async function togglePromoCode(row) {
    try { await api('/admin/tickets/promo-codes/' + row.id, { method: 'PUT', body: JSON.stringify({ expiresAt: row.expiresAt, maxUses: row.maxUses, isEnabled: !row.isEnabled }) }); await loadPromoCodes() }
    catch (e) { onError(e.message) }
  }
  async function deletePromoCode(row) {
    if (!confirm('Supprimer le code promo ' + row.code + ' ?')) return
    try { await api('/admin/tickets/promo-codes/' + row.id, { method: 'DELETE' }); await loadPromoCodes() }
    catch (e) { onError(e.message) }
  }

  function reset() { setForm(emptyType); setEditing(null); setModalOpen(false) }
  function startCreate() { setForm(emptyType); setEditing(null); setModalOpen(true) }
  function edit(t) { setEditing(t.id); setForm({ name: t.name, price: t.price, currency: t.currency, capacity: t.capacity, isActive: t.isActive }); setModalOpen(true) }

  async function save(e) {
    e.preventDefault()
    try {
      const body = { matchId, name: form.name.trim(), price: Number(form.price) || 0, currency: (form.currency || 'TND').trim().toUpperCase(), capacity: Number(form.capacity) || 1, isActive: form.isActive }
      if (editing) await api('/admin/tickets/types/' + editing, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/tickets/types', { method: 'POST', body: JSON.stringify(body) })
      reset(); await loadTypes()
    } catch (e) { onError(e.message) }
  }
  async function removeType(id) {
    const ticket = types.find((item) => item.id === id)
    if (!ticket) return
    const hasOrders = Number(ticket.soldCount || 0) > 0 || orders.some((order) =>
      String(order.ticketTypeId || '').toLowerCase() === String(id).toLowerCase()
    )
    const prompt = hasOrders
      ? 'Questo tipo di biglietto è collegato a ordini. Lo storico verrà conservato e il biglietto sarà disattivato per impedire nuovi acquisti. Continuare?'
      : 'Eliminare definitivamente questo tipo di biglietto?'
    if (!confirm(prompt)) return
    try {
      const result = await api('/admin/tickets/types/' + id, { method: 'DELETE' })
      await loadTypes()
      if (result?.deactivated) onError('Biglietto disattivato: gli ordini esistenti sono stati conservati.')
      else onError('')
    } catch (e) { onError(e.message) }
  }

  async function createTicketsForUpcomingMatches() {
    const upcoming = matches.filter((match) => match.kickoffAt && new Date(match.kickoffAt) >= new Date())
    if (!upcoming.length) { onError('Aucune partie future avec une date valide. Ajoutez d’abord les parties dans le calendrier.'); return }
    if (!confirm('Créer un billet « Entrée générale — Stade Oudhref » à 5 DT pour chacune des ' + upcoming.length + ' parties futures ? Les billets déjà présents ne seront pas dupliqués.')) return
    setBulkCreating(true)
    let created = 0
    let skipped = 0
    try {
      for (const match of upcoming) {
        const existing = await api('/admin/tickets/types?matchId=' + encodeURIComponent(match.id))
        if (existing.some((ticket) => (ticket.name || '').trim().toLocaleLowerCase() === 'entrée générale — stade oudhref')) { skipped++; continue }
        await api('/admin/tickets/types', { method: 'POST', body: JSON.stringify({ matchId: match.id, name: 'Entrée générale — Stade Oudhref', price: 5, currency: 'TND', capacity: 100, isActive: true }) })
        created++
      }
      onError('')
      alert('Terminé : ' + created + ' billet(s) créé(s), ' + skipped + ' déjà existant(s) ignoré(s). Prix : 5 DT.')
      await loadTypes()
    } catch (e) { onError('Création partielle des billets : ' + e.message + ' Rechargez la page pour vérifier les parties déjà traitées.') }
    finally { setBulkCreating(false) }
  }

  async function setOrderStatus(id, status) {
    try { await api('/admin/tickets/orders/' + id + '/status', { method: 'PUT', body: JSON.stringify({ status }) }); await loadOrders(); await loadTypes() }
    catch (e) { onError(e.message) }
  }

  const money = (n, c) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: c || 'TND' }).format(n || 0)
  const matchLabel = (m) => (m.isHome ? 'JSO' : 'Ext.') + ' — ' + (m.opponentName || '') + ' · ' + new Date(m.kickoffAt).toLocaleDateString('fr-FR', { dateStyle: 'short' })

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-black">Billetterie — Types de billets</h2><p className="mt-1 text-sm text-slate-500">Billet général à 5 DT · Stade Oudhref</p></div>
        <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={createTicketsForUpcomingMatches} disabled={bulkCreating || matches.length === 0} className="rounded-xl border border-jso-navy px-3 py-2 text-sm font-bold text-jso-navy disabled:opacity-50">{bulkCreating ? "Création…" : "Créer pour les matchs futurs · 5 DT"}</button><button type="button" onClick={startCreate} className="inline-flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 text-sm font-black text-white"><Plus size={16}/> Nouveau billet</button>
        <select value={matchId} onChange={(e) => setMatchId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-jso-blue">
          {matches.map((m) => <option key={m.id} value={m.id}>{matchLabel(m)}</option>)}
        </select></div>
      </div>
      <div className="mt-5">
        <div className="overflow-x-auto">
          {types.length === 0 ? <p className="text-sm text-slate-400">Aucun type de billet pour ce match.</p>
            : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Type</th><th className="p-2">Prix</th><th className="p-2">Vendus / Capacité</th><th className="p-2">Actif</th><th className="p-2"></th></tr></thead><tbody>{types.map((t) => <tr key={t.id} className="border-b last:border-0"><td className="p-2 font-bold">{t.name}</td><td className="p-2 whitespace-nowrap">{money(t.price, t.currency)}</td><td className="p-2">{t.soldCount} / {t.capacity}</td><td className="p-2">{t.isActive ? 'Oui' : 'Non'}</td><td className="p-2 whitespace-nowrap"><button onClick={() => edit(t)} className="mr-2 text-jso-blue"><Save size={15}/></button><button onClick={() => removeType(t.id)} className="text-red-600"><X size={16}/></button></td></tr>)}</tbody></table>}
        </div>
      </div>
    </div>

    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">Codes promo pour tester les billets QR</h2>
      <p className="mt-1 text-sm text-slate-500">Ces codes accordent un billet gratuit confirmé, sans enregistrer de paiement. Le QR sera créé dans le compte supporter et pourra être vérifié au scanner. Limitez les utilisations pour les essais.</p>
      <form onSubmit={createPromoCode} className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-bold">Code<input required minLength="3" maxLength="40" pattern="[A-Za-z0-9_-]+" value={promoForm.code} onChange={e => setPromoForm(v => ({ ...v, code: e.target.value.toUpperCase() }))} placeholder="JSOQRTEST" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 uppercase" /></label>
        <label className="text-sm font-bold">Utilisations maximum<input type="number" min="1" value={promoForm.maxUses} onChange={e => setPromoForm(v => ({ ...v, maxUses: e.target.value }))} placeholder="Ex. 5 (conseillé)" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label>
        <label className="text-sm font-bold">Date d’expiration (facultative)<input type="datetime-local" value={promoForm.expiresAt} onChange={e => setPromoForm(v => ({ ...v, expiresAt: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={promoForm.isEnabled} onChange={e => setPromoForm(v => ({ ...v, isEnabled: e.target.checked }))} /> Actif</label>
        <button disabled={!matchId} className="rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white disabled:opacity-50">Créer le code gratuit</button>
      </form>
      <div className="mt-5 space-y-2">{promoCodes.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Aucun code pour ce match.</p> : promoCodes.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"><div><strong>{row.code}</strong><p className="text-xs text-slate-500">Utilisé {row.uses}{row.maxUses ? ' / ' + row.maxUses : ' fois sans limite'}{row.expiresAt ? ' · Expire ' + new Date(row.expiresAt).toLocaleString('fr-FR') : ''}</p><p className="text-xs font-bold">{row.isEnabled ? 'Actif' : 'Désactivé'}</p></div><div className="flex gap-2"><button type="button" onClick={() => togglePromoCode(row)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold">{row.isEnabled ? 'Désactiver' : 'Activer'}</button><button type="button" onClick={() => deletePromoCode(row)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700">Supprimer</button></div></div>)}</div>
    </div>

    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between"><h2 className="text-xl font-black">Réservations</h2><button onClick={loadOrders} className="rounded-xl border border-slate-200 p-2 text-slate-600" aria-label="Actualiser"><RefreshCw size={16}/></button></div>
      <div className="mt-4 overflow-x-auto">
        {orders.length === 0 ? <p className="text-sm text-slate-400">Aucune réservation.</p>
          : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Date</th><th className="p-2">Billet</th><th className="p-2">Qté</th><th className="p-2">Total</th><th className="p-2">Mode</th><th className="p-2">Statut</th><th className="p-2"></th></tr></thead><tbody>{orders.map((o) => <tr key={o.id} className="border-b last:border-0"><td className="p-2 whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'short' })}</td><td className="p-2">{o.ticketTypeName}</td><td className="p-2">{o.quantity}</td><td className="p-2 whitespace-nowrap font-bold">{money(o.total, o.currency)}</td><td className="p-2 text-xs">{o.paymentProvider === 'Promo' ? 'Promo · ' + o.promoCode : o.paymentProvider || '—'}</td><td className="p-2"><span className={'rounded-full px-2.5 py-1 text-xs font-extrabold ' + (STATUS_STYLES[o.status] || 'bg-slate-100 text-slate-600')}>{o.status}</span></td><td className="p-2 whitespace-nowrap">{o.status === 'Pending' && <><button onClick={() => setOrderStatus(o.id, 'Confirmed')} className="mr-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white"><Check size={13}/> Confirmer</button><button onClick={() => setOrderStatus(o.id, 'Cancelled')} className="text-red-600"><X size={16}/></button></>}</td></tr>)}</tbody></table>}
      </div>
    </div>
    {modalOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) reset() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="ticket-modal-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-jso-blue">Billetterie</p><h3 id="ticket-modal-title" className="mt-1 text-xl font-black">{editing ? 'Modifier le billet' : 'Nouveau billet'}</h3></div><button type="button" onClick={reset} aria-label="Fermer" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={20}/></button></div>
        <form onSubmit={save} className="space-y-4">
          <label className="block text-sm font-bold">Nom<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-bold">Prix<input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/></label>
            <label className="block text-sm font-bold">Capacité<input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/></label>
          </div>
          <label className="block text-sm font-bold">Devise<input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/></label>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}/> Actif</label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={reset} className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-600">Annuler</button><button className="inline-flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white"><Save size={16}/>{editing ? 'Mettre à jour' : 'Créer le billet'}</button></div>
        </form>
      </div>
    </div>}
  </div>
}
