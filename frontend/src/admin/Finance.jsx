import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Save, X, Wallet, TrendingUp, TrendingDown, Download } from 'lucide-react'
import { API_BASE_URL } from '../lib/apiConfig'

// Admin API helper scoped to this module (mirrors the one in AdminApp.jsx).
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

// Finances du club (piano Area B). Registre entrées/dépenses avec catégories et
// transactions, plus un résumé de la période dont le NET est affiché en rouge
// quand il s'agit d'une perte (« soldi persi »). Accès réservé à
// SuperAdmin / ClubAdmin / FinanceManager (données sensibles). Montants en
// numeric(14,2) côté serveur ; une seule devise de club, défaut TND.

const CURRENCY = 'TND'
const emptyCategory = { name: '', type: 'Expense', isActive: true }
const emptyTransaction = { date: '', categoryId: '', type: 'Expense', amount: '', currency: CURRENCY, description: '' }
const TYPE_LABELS = { Income: 'Entrée', Expense: 'Dépense' }

function fmtMoney(n) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0) + ' ' + CURRENCY
}
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }
function toInputDate(d) { return d ? new Date(d).toISOString().slice(0, 10) : '' }
// First / last day of the current month, used as the default summary window.
function monthStart() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10) }
function today() { return new Date().toISOString().slice(0, 10) }

export default function FinanceModule({ onError }) {
  const [categories, setCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  // Period + filters for the transactions table and the summary.
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(today())
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState('')

  const [catForm, setCatForm] = useState(emptyCategory)
  const [editingCat, setEditingCat] = useState(null)
  const [txForm, setTxForm] = useState({ ...emptyTransaction, date: today() })
  const [editingTx, setEditingTx] = useState(null)

  function periodQuery() {
    const params = new URLSearchParams()
    if (from) params.set('from', new Date(from).toISOString())
    if (to) params.set('to', new Date(to + 'T23:59:59').toISOString())
    return params
  }

  async function loadCategories() {
    setCategories(await api('/admin/finance/categories'))
  }
  async function loadTransactions() {
    const params = periodQuery()
    if (filterCategory) params.set('categoryId', filterCategory)
    if (filterType) params.set('type', filterType)
    setTransactions(await api('/admin/finance/transactions?' + params.toString()))
  }
  async function loadSummary() {
    setSummary(await api('/admin/finance/summary?' + periodQuery().toString()))
  }
  async function loadAll() {
    setLoading(true)
    try { await Promise.all([loadCategories(), loadTransactions(), loadSummary()]); onError('') }
    catch (e) { onError(e.message) }
    finally { setLoading(false) }
  }
  async function reloadData() {
    try { await Promise.all([loadTransactions(), loadSummary()]); onError('') }
    catch (e) { onError(e.message) }
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { reloadData() }, [from, to, filterCategory, filterType])

  // ---- Categories ----
  function editCategory(c) { setEditingCat(c.id); setCatForm({ name: c.name || '', type: c.type || 'Expense', isActive: !!c.isActive }) }
  function resetCategory() { setEditingCat(null); setCatForm(emptyCategory) }
  async function saveCategory(e) {
    e.preventDefault()
    try {
      const body = { name: catForm.name.trim(), type: catForm.type, isActive: catForm.isActive }
      if (editingCat) await api('/admin/finance/categories/' + editingCat, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/finance/categories', { method: 'POST', body: JSON.stringify(body) })
      resetCategory()
      await loadCategories()
      await reloadData()
    } catch (e) { onError(e.message) }
  }
  async function removeCategory(id) {
    if (!confirm('Supprimer cette catégorie ?')) return
    try { await api('/admin/finance/categories/' + id, { method: 'DELETE' }); if (editingCat === id) resetCategory(); await loadCategories(); await reloadData() }
    catch (e) { onError(e.message) }
  }

  // ---- Transactions ----
  function editTransaction(t) {
    setEditingTx(t.id)
    setTxForm({
      date: toInputDate(t.date),
      categoryId: t.categoryId || '',
      type: t.type || 'Expense',
      amount: t.amount != null ? String(t.amount) : '',
      currency: t.currency || CURRENCY,
      description: t.description || '',
    })
  }
  function resetTransaction() { setEditingTx(null); setTxForm({ ...emptyTransaction, date: today() }) }
  // Keep the transaction type aligned with the picked category's type.
  function pickCategory(id) {
    const cat = categories.find(c => c.id === id)
    setTxForm(f => ({ ...f, categoryId: id, type: cat ? cat.type : f.type }))
  }
  async function saveTransaction(e) {
    e.preventDefault()
    if (!txForm.categoryId) { onError('Choisissez une catégorie.'); return }
    try {
      const body = {
        date: new Date(txForm.date).toISOString(),
        categoryId: txForm.categoryId,
        type: txForm.type,
        amount: Number(txForm.amount) || 0,
        currency: (txForm.currency || CURRENCY).trim().toUpperCase(),
        description: txForm.description.trim() || null,
      }
      if (editingTx) await api('/admin/finance/transactions/' + editingTx, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/admin/finance/transactions', { method: 'POST', body: JSON.stringify(body) })
      resetTransaction()
      await reloadData()
    } catch (e) { onError(e.message) }
  }
  async function removeTransaction(id) {
    if (!confirm('Supprimer cette transaction ?')) return
    try { await api('/admin/finance/transactions/' + id, { method: 'DELETE' }); if (editingTx === id) resetTransaction(); await reloadData() }
    catch (e) { onError(e.message) }
  }

  const categoryName = useMemo(() => {
    const map = {}
    categories.forEach(c => { map[c.id] = c.name })
    return map
  }, [categories])

  // Simple client-side CSV export of the current transactions view.
  function exportCsv() {
    const header = ['Date', 'Type', 'Catégorie', 'Montant', 'Devise', 'Description']
    const escape = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
    const lines = transactions.map(t => [
      toInputDate(t.date), TYPE_LABELS[t.type] || t.type,
      t.categoryName || categoryName[t.categoryId] || '', Number(t.amount).toFixed(2),
      t.currency || CURRENCY, t.description || '',
    ].map(escape).join(','))
    const csv = [header.map(escape).join(','), ...lines].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'finances_' + from + '_' + to + '.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const net = summary ? Number(summary.net) : 0
  const isLoss = net < 0
  // Bar scale: largest single-side monthly value drives the width of every bar.
  const monthMax = summary && summary.byMonth.length
    ? Math.max(1, ...summary.byMonth.map(m => Math.max(Number(m.income), Number(m.expense))))
    : 1
  const categoryMax = summary && summary.byCategory.length
    ? Math.max(1, ...summary.byCategory.map(c => Number(c.total)))
    : 1

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2"><Wallet className="text-jso-blue" size={20}/><h2 className="text-xl font-black">Finances du club</h2></div>
      <p className="mt-1 text-xs text-slate-400">Registre des entrées et dépenses. Le net est la différence entrées − dépenses sur la période choisie ; un net négatif (en rouge) est une perte. Devise unique du club : {CURRENCY}. Accès réservé aux rôles finances.</p>
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="text-sm font-bold">Du<input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-2 block rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/></label>
        <label className="text-sm font-bold">Au<input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-2 block rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/></label>
        <label className="text-sm font-bold">Catégorie<select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="mt-2 block rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"><option value="">Toutes</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name} ({TYPE_LABELS[c.type]})</option>)}</select></label>
        <label className="text-sm font-bold">Type<select value={filterType} onChange={e => setFilterType(e.target.value)} className="mt-2 block rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"><option value="">Tous</option><option value="Income">Entrée</option><option value="Expense">Dépense</option></select></label>
        <button type="button" onClick={exportCsv} disabled={!transactions.length} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:border-jso-blue disabled:opacity-50"><Download size={16}/> Export CSV</button>
      </div>
    </div>

    {/* Résumé : Entrées / Dépenses / Net */}
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"><TrendingUp className="text-emerald-600" size={22}/><p className="mt-6 text-sm font-semibold text-slate-500">Entrées</p><p className="mt-1 text-3xl font-black text-emerald-700">{fmtMoney(summary?.totalIncome)}</p></div>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"><TrendingDown className="text-amber-600" size={22}/><p className="mt-6 text-sm font-semibold text-slate-500">Dépenses</p><p className="mt-1 text-3xl font-black text-amber-700">{fmtMoney(summary?.totalExpense)}</p></div>
      <div className={'rounded-[1.5rem] border p-6 shadow-sm ' + (isLoss ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white')}><Wallet className={isLoss ? 'text-red-600' : 'text-jso-blue'} size={22}/><p className="mt-6 text-sm font-semibold text-slate-500">Net {isLoss && '· Perte'}</p><p className={'mt-1 text-3xl font-black ' + (isLoss ? 'text-red-600' : 'text-jso-navy')}>{fmtMoney(summary?.net)}</p>{isLoss && <p className="mt-1 text-xs font-bold text-red-600">Argent perdu sur la période.</p>}</div>
    </div>

    {/* Répartitions (barres SVG/CSS légères) */}
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-black">Par mois</h2>
        {!summary || summary.byMonth.length === 0 ? <p className="mt-4 text-sm text-slate-400">Aucune donnée sur la période.</p>
          : <div className="mt-4 space-y-3">{summary.byMonth.map(m => <div key={m.month}>
              <div className="flex justify-between text-xs font-bold text-slate-500"><span>{m.month}</span><span className={Number(m.net) < 0 ? 'text-red-600' : 'text-jso-navy'}>Net {fmtMoney(m.net)}</span></div>
              <div className="mt-1 flex items-center gap-2"><span className="w-14 text-xs text-emerald-700">Entrées</span><div className="h-2.5 flex-1 rounded-full bg-slate-100"><div className="h-2.5 rounded-full bg-emerald-500" style={{ width: (Number(m.income) / monthMax * 100) + '%' }}/></div><span className="w-24 text-right text-xs">{fmtMoney(m.income)}</span></div>
              <div className="mt-1 flex items-center gap-2"><span className="w-14 text-xs text-amber-700">Dépenses</span><div className="h-2.5 flex-1 rounded-full bg-slate-100"><div className="h-2.5 rounded-full bg-amber-500" style={{ width: (Number(m.expense) / monthMax * 100) + '%' }}/></div><span className="w-24 text-right text-xs">{fmtMoney(m.expense)}</span></div>
            </div>)}</div>}
      </div>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-black">Par catégorie</h2>
        {!summary || summary.byCategory.length === 0 ? <p className="mt-4 text-sm text-slate-400">Aucune donnée sur la période.</p>
          : <div className="mt-4 space-y-3">{summary.byCategory.map(c => <div key={c.categoryId + c.type}>
              <div className="flex justify-between text-xs font-bold text-slate-500"><span>{c.categoryName || '—'} <span className="text-slate-400">({TYPE_LABELS[c.type]})</span></span><span>{fmtMoney(c.total)}</span></div>
              <div className="mt-1 h-2.5 rounded-full bg-slate-100"><div className={'h-2.5 rounded-full ' + (c.type === 'Income' ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: (Number(c.total) / categoryMax * 100) + '%' }}/></div>
            </div>)}</div>}
      </div>
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
      {/* Transactions */}
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Transactions</h2>
        <div className="mt-5 overflow-x-auto">
          {loading ? <p className="text-sm text-slate-400">Chargement…</p>
            : transactions.length === 0 ? <p className="text-sm text-slate-500">Aucune transaction sur cette période. Ajoutez-en une avec le formulaire.</p>
            : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Date</th><th className="p-2">Catégorie</th><th className="p-2">Type</th><th className="p-2">Montant</th><th className="p-2">Description</th><th className="p-2"></th></tr></thead><tbody>{transactions.map(t => <tr key={t.id} className="border-b last:border-0"><td className="p-2 whitespace-nowrap">{fmtDate(t.date)}</td><td className="p-2 font-bold">{t.categoryName || categoryName[t.categoryId] || '—'}</td><td className="p-2"><span className={'rounded-full px-2 py-0.5 text-xs font-bold ' + (t.type === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>{TYPE_LABELS[t.type] || t.type}</span></td><td className={'p-2 whitespace-nowrap font-bold ' + (t.type === 'Income' ? 'text-emerald-700' : 'text-amber-700')}>{fmtMoney(t.amount)}</td><td className="p-2 text-xs text-slate-500">{t.description || '—'}</td><td className="p-2 whitespace-nowrap"><button onClick={() => editTransaction(t)} className="mr-2 text-jso-blue"><Pencil size={16}/></button><button onClick={() => removeTransaction(t.id)} className="text-red-600"><X size={16}/></button></td></tr>)}</tbody></table>}
        </div>
      </div>
      {/* Formulaire transaction */}
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">{editingTx ? 'Modifier la transaction' : 'Nouvelle transaction'}</h2>
        <form onSubmit={saveTransaction} className="mt-5 space-y-3">
          <label className="block text-sm font-bold">Date<input type="date" value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/></label>
          <label className="block text-sm font-bold">Catégorie<select value={txForm.categoryId} onChange={e => pickCategory(e.target.value)} required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"><option value="">Choisir…</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name} ({TYPE_LABELS[c.type]})</option>)}</select></label>
          <label className="block text-sm font-bold">Type<select value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"><option value="Income">Entrée</option><option value="Expense">Dépense</option></select></label>
          <label className="block text-sm font-bold">Montant ({CURRENCY})<input type="number" min="0" step="0.01" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} required className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/></label>
          <label className="block text-sm font-bold">Description (facultatif)<textarea value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} rows="2" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/></label>
          <div className="flex gap-2 pt-2"><button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white">{editingTx ? <><Save size={16}/> Mettre à jour</> : <><Plus size={16}/> Enregistrer</>}</button>{editingTx && <button type="button" onClick={resetTransaction} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}</div>
        </form>
      </div>
    </div>

    {/* Catégories */}
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Catégories</h2>
        <div className="mt-5 overflow-x-auto">
          {categories.length === 0 ? <p className="text-sm text-slate-500">Aucune catégorie. Créez-en une (entrée ou dépense) pour commencer.</p>
            : <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Nom</th><th className="p-2">Type</th><th className="p-2">Active</th><th className="p-2"></th></tr></thead><tbody>{categories.map(c => <tr key={c.id} className="border-b last:border-0"><td className="p-2 font-bold">{c.name}</td><td className="p-2"><span className={'rounded-full px-2 py-0.5 text-xs font-bold ' + (c.type === 'Income' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>{TYPE_LABELS[c.type] || c.type}</span></td><td className="p-2">{c.isActive ? 'Oui' : 'Non'}</td><td className="p-2 whitespace-nowrap"><button onClick={() => editCategory(c)} className="mr-2 text-jso-blue"><Pencil size={16}/></button><button onClick={() => removeCategory(c.id)} className="text-red-600"><X size={16}/></button></td></tr>)}</tbody></table>}
        </div>
      </div>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">{editingCat ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</h2>
        <form onSubmit={saveCategory} className="mt-5 space-y-3">
          <label className="block text-sm font-bold">Nom<input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} required maxLength="80" placeholder="ex. Billetterie, Salaires" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"/></label>
          <label className="block text-sm font-bold">Type<select value={catForm.type} onChange={e => setCatForm({ ...catForm, type: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-jso-blue"><option value="Income">Entrée</option><option value="Expense">Dépense</option></select></label>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={catForm.isActive} onChange={e => setCatForm({ ...catForm, isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-300"/> Active</label>
          <div className="flex gap-2 pt-2"><button className="flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white">{editingCat ? <><Save size={16}/> Mettre à jour</> : <><Plus size={16}/> Enregistrer</>}</button>{editingCat && <button type="button" onClick={resetCategory} className="rounded-xl px-4 py-2.5 font-bold text-slate-500 hover:bg-slate-100">Annuler</button>}</div>
        </form>
      </div>
    </div>
  </div>
}
