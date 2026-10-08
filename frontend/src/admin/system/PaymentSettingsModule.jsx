import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CircleAlert, CreditCard, Landmark, Pencil, Plus, Power, RefreshCw, Smartphone, Trash2, X } from 'lucide-react'
import { adminApi } from '../api'

const templates = [
  ['FLOUCI', 'Flouci', 'Hosted', 'TN', 'TND'],
  ['STRIPE', 'Stripe', 'Hosted', '', 'EUR'],
  ['D17', 'D17', 'Hosted', 'TN', 'TND'],
  ['EDINAR', 'e-DINAR', 'Hosted', 'TN', 'TND'],
  ['CLICTOPAY', 'ClicToPay', 'Hosted', 'TN', 'TND'],
  ['KONNECT', 'Konnect', 'Hosted', 'TN', 'TND'],
  ['IPAY', 'iPay', 'Hosted', 'TN', 'TND'],
  ['BANK_TRANSFER', 'Virement bancaire', 'BankTransfer', '', 'TND'],
  ['CASH', 'Espèces', 'Cash', 'TN', 'TND'],
]

const secretFields = {
  FLOUCI: ['appToken', 'appSecret', 'webhookSecret'],
  STRIPE: ['secretKey', 'webhookSecret'],
  D17: ['apiKey', 'secretKey'],
  EDINAR: ['apiKey', 'secretKey'],
  CLICTOPAY: ['siteKey', 'apiKey', 'secretKey'],
  KONNECT: ['apiKey', 'receiverWalletId'],
  IPAY: ['apiKey', 'secretKey'],
}

function Badge({ active }) {
  return active
    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700"><CheckCircle2 size={13}/> Actif</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500"><Power size={13}/> Inactif</span>
}

function emptyForm() {
  return { code: 'FLOUCI', name: 'Flouci', type: 'Hosted', country: 'TN', currency: 'TND', baseUrl: '', isActive: false, sortOrder: 0, settingsJson: '', secrets: {} }
}

export default function PaymentSettingsModule({ onError = () => {} }) {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [notice, setNotice] = useState('')

  const isNew = editing === 'new'
  const fields = useMemo(() => secretFields[form.code] || [], [form.code])

  async function load() {
    try {
      const data = await adminApi('/admin/payment-config')
      setProviders(data?.providers || [])
      onError('')
    } catch (e) { onError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function openNew() {
    setForm(emptyForm())
    setEditing('new')
    setNotice('')
  }

  function openEdit(p) {
    setForm({
      ...p,
      settingsJson: p.settingsJson || '',
      secrets: {},
    })
    setEditing(p.id)
    setNotice('')
  }

  function updateField(key, value) {
    setForm(v => ({ ...v, [key]: value }))
  }

  function selectTemplate(code) {
    const t = templates.find(x => x[0] === code)
    if (!t) return
    setForm(v => ({ ...v, code: t[0], name: t[1], type: t[2], country: t[3], currency: t[4] }))
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true); setNotice('')
    try {
      const payload = {
        ...form,
        sortOrder: Number(form.sortOrder) || 0,
        secrets: Object.fromEntries(Object.entries(form.secrets || {}).filter(([, v]) => v.trim())),
      }
      if (isNew) await adminApi('/admin/payment-config', { method: 'POST', body: JSON.stringify(payload) })
      else await adminApi('/admin/payment-config/' + editing, { method: 'PUT', body: JSON.stringify(payload) })
      setEditing(null); await load()
    } catch (e) { setNotice(e.message) }
    finally { setSaving(false) }
  }

  async function toggle(id) {
    try { await adminApi('/admin/payment-config/' + id + '/toggle', { method: 'POST' }); await load() }
    catch (e) { onError(e.message) }
  }

  async function test(p) {
    setTesting(p.id); setNotice('')
    try {
      const result = await adminApi('/admin/payment-config/' + p.id + '/test', { method: 'POST' })
      setNotice((result?.success ? '✓ ' : '⚠ ') + (result?.message || 'Test terminé.'))
    } catch (e) { setNotice(e.message) }
    finally { setTesting(null) }
  }

  async function remove(p) {
    if (!window.confirm('Supprimer « ' + p.name + ' » ? Cette action est définitive.')) return
    try { await adminApi('/admin/payment-config/' + p.id, { method: 'DELETE' }); await load() }
    catch (e) { onError(e.message) }
  }

  if (loading) return <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-sm text-slate-500">Chargement des moyens de paiement…</div>

  return <div className="space-y-5">
    <div className="rounded-[1.5rem] bg-jso-navy p-6 text-white">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-jso-gold">Configuration · Paiements</p>
          <h2 className="mt-2 text-2xl font-black">Moyens de paiement</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">CRUD complet des prestataires. Les secrets sont chiffrés côté API et ne sont jamais renvoyés au navigateur.</p>
        </div>
        <button type="button" onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-900 shadow-sm hover:bg-slate-100"><Plus size={17}/> Ajouter un moyen</button>
      </div>
    </div>

    {notice && <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">{notice}</div>}

    {providers.length === 0
      ? <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-10 text-center"><CreditCard className="mx-auto text-slate-300" size={38}/><p className="mt-3 font-black">Aucun moyen configuré</p><p className="mt-1 text-sm text-slate-500">Ajoutez Flouci, Stripe ou un autre prestataire.</p></div>
      : <div className="grid gap-4 xl:grid-cols-2">{providers.map(p => <ProviderCard key={p.id} p={p} testing={testing === p.id} onEdit={() => openEdit(p)} onToggle={() => toggle(p.id)} onTest={() => test(p)} onDelete={() => remove(p)}/>)}</div>
    }

    {editing && <Modal title={isNew ? 'Ajouter un moyen de paiement' : 'Modifier ' + form.name} onClose={() => setEditing(null)}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Prestataire"><select value={form.code} onChange={e => selectTemplate(e.target.value)} className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100">{templates.map(t => <option key={t[0]} value={t[0]}>{t[1]}</option>)}</select></Field>
          <Field label="Nom affiché"><input required value={form.name} onChange={e => updateField('name', e.target.value)} className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"/></Field>
          <Field label="Type"><select value={form.type} onChange={e => updateField('type', e.target.value)} className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"><option>Hosted</option><option>Api</option><option>BankTransfer</option><option>Cash</option></select></Field>
          <Field label="Pays"><input value={form.country || ''} onChange={e => updateField('country', e.target.value)} placeholder="TN" className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"/></Field>
          <Field label="Devise"><input value={form.currency} onChange={e => updateField('currency', e.target.value)} placeholder="TND" className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"/></Field>
          <Field label="URL API"><input value={form.baseUrl || ''} onChange={e => updateField('baseUrl', e.target.value)} placeholder="https://..." className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"/></Field>
        </div>
        <Field label="Ordre"><input type="number" value={form.sortOrder} onChange={e => updateField('sortOrder', e.target.value)} className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"/></Field>

        {fields.length > 0 && <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-black">Identifiants secrets</p>
          <p className="mt-1 text-xs text-slate-500">{isNew ? 'Ils seront chiffrés en base.' : 'Laissez vide pour conserver le secret actuel.'}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{fields.map(key => <Field key={key} label={key}><input type="password" autoComplete="new-password" value={form.secrets?.[key] || ''} onChange={e => setForm(v => ({ ...v, secrets: { ...v.secrets, [key]: e.target.value } }))} className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" placeholder={isNew ? '••••••••' : (form.secretsConfigured?.[key] ? '•••••••• (déjà configuré)' : 'Non configuré')}/></Field>)}</div>
        </div>}

        <Field label="Paramètres JSON (optionnel)"><textarea rows={3} value={form.settingsJson || ''} onChange={e => updateField('settingsJson', e.target.value)} className="input font-mono text-xs" placeholder='{"merchantId":"..."}'/></Field>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 p-3"><input type="checkbox" checked={form.isActive} onChange={e => updateField('isActive', e.target.checked)} className="h-4 w-4"/><span><b>Activer ce moyen de paiement</b><span className="block text-xs text-slate-500">Un moyen actif peut être utilisé par l'application.</span></span></label>

        {notice && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{notice}</div>}
        <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setEditing(null)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50">Annuler</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 text-sm font-black text-white hover:opacity-90 disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div>
      </form>
    </Modal>}
  </div>
}

function ProviderCard({ p, testing, onEdit, onToggle, onTest, onDelete }) {
  const Icon = p.type === 'BankTransfer' ? Landmark : p.type === 'Cash' ? Smartphone : CreditCard
  const secrets = Object.keys(p.secretsConfigured || {})
  return <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-jso-navy text-jso-gold"><Icon size={20}/></div><div><h3 className="font-black">{p.name}</h3><p className="text-xs text-slate-500">{p.code} · {p.type} · {p.currency}{p.country ? ' · ' + p.country : ''}</p></div></div>
      <Badge active={p.isActive}/>
    </div>
    <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2"><div>Secrets configurés : <b>{secrets.length ? secrets.join(', ') : 'aucun'}</b></div><div>URL : <b>{p.baseUrl || '—'}</b></div></div>
    <div className="mt-5 flex flex-wrap gap-2">
      <button onClick={onEdit} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Pencil size={14}/> Modifier</button>
      <button onClick={onToggle} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Power size={14}/> {p.isActive ? 'Désactiver' : 'Activer'}</button>
      <button onClick={onTest} disabled={testing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50">{testing ? <RefreshCw className="animate-spin" size={14}/> : <CheckCircle2 size={14}/>} Tester</button>
      <button onClick={onDelete} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100"><Trash2 size={14}/> Supprimer</button>
    </div>
  </article>
}

function Field({ label, children }) { return <label className="block text-sm font-bold text-slate-700"><span className="mb-1.5 block text-xs uppercase tracking-wider text-slate-400">{label}</span>{children}</label> }

function Modal({ title, onClose, children }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] bg-white p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between gap-4"><h3 className="text-xl font-black">{title}</h3><button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X size={18}/></button></div>
      {children}
    </div>
  </div>
}
