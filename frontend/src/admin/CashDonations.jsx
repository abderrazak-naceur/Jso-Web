import { useEffect, useMemo, useState } from 'react'
import { Banknote, CheckCircle2, Printer, RefreshCw, Store, Ticket } from 'lucide-react'
import { adminApi } from './api'
import { API_BASE_URL } from '../lib/apiConfig'

function ReceiptCard({ receipt }) {
  if (!receipt) return null
  const receiptUrl = new URL(receipt.receiptUrl, new URL(API_BASE_URL, window.location.origin)).href
  return <div id="cash-donation-receipt" className="rounded-[1.5rem] border border-jso-gold/40 bg-white p-6 shadow-sm">
    <style>{`
      @media print {
        body * { visibility: hidden !important; }
        #cash-donation-receipt, #cash-donation-receipt * { visibility: visible !important; }
        #cash-donation-receipt { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; box-shadow: none !important; border: 1px solid #d4af37 !important; }
        #cash-donation-receipt .no-print { display: none !important; }
      }
    `}</style>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        <img src="/JSO-crest-regenerated.png" alt="JSO" className="h-16 w-16 object-contain" />
        <div><p className="text-xs font-black uppercase tracking-[0.16em] text-jso-blue">Jeunesse Sportive de Oudhref</p><p className="text-xs font-black uppercase tracking-[0.16em] text-jso-gold">Reçu officiel de don</p><p className="break-all text-lg font-black">{receipt.receiptNumber}</p></div>
      </div>
      <button onClick={() => window.print()} className="no-print inline-flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 text-sm font-extrabold text-white"><Printer size={16}/> Imprimer</button>
    </div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">Donateur</p><p className="mt-1 font-black">{receipt.donorName}</p></div>
      <div className="rounded-xl bg-jso-gold/15 p-4"><p className="text-xs font-bold text-slate-400">Montant</p><p className="mt-1 text-2xl font-black text-jso-navy">{receipt.amount} {receipt.currency}</p></div>
      <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">Point de collecte</p><p className="mt-1 font-black">{receipt.pointType === 'Shop' ? 'Boutique' : 'Vendeur'}{receipt.pointName ? ' · ' + receipt.pointName : ''}</p></div>
      <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-400">Date</p><p className="mt-1 font-black">{new Date(receipt.paidAt).toLocaleString('fr-FR')}</p></div>
    </div>
    <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"><CheckCircle2 size={18}/> Paiement en espèces enregistré et comptabilisé dans la collecte JSO.</div>
    <div className="mt-5 border-t border-dashed border-slate-200 pt-4 text-xs text-slate-500">
      Vérification en ligne : <a className="font-semibold underline" href={receiptUrl} target="_blank" rel="noopener noreferrer">{receiptUrl}</a>
      {receipt.whatsappSent && <p className="mt-2 font-bold text-emerald-700">✓ Reçu envoyé sur WhatsApp.</p>}
      {!receipt.whatsappSent && receipt.whatsappConfigured && <p className="mt-2 font-bold text-amber-700">Le reçu n’a pas pu être envoyé sur WhatsApp.</p>}
    </div>
  </div>
}

export default function CashDonationsModule({ onError }) {
  const [capabilities, setCapabilities] = useState(null)
  const [loadingCapabilities, setLoadingCapabilities] = useState(true)
  const [capabilityError, setCapabilityError] = useState('')
  const [form, setForm] = useState({ donorName: '', amount: '10', phone: '', whatsappOptIn: false, pointType: 'Seller', pointName: '', note: '' })
  const [receipt, setReceipt] = useState(null)
  const [saving, setSaving] = useState(false)
  const [cashReceived, setCashReceived] = useState(false)

  async function load() {
    setLoadingCapabilities(true)
    try {
      const data = await adminApi('/staff/donations/cash/capabilities')
      setCapabilities(data)
      setCapabilityError('')
      setForm(x => ({ ...x, pointType: data.defaultPointType, pointName: '' }))
      onError('')
    } catch (e) {
      const message = e.status === 403
        ? 'Accès refusé : une affectation staff active avec la permission dons en espèces est nécessaire.'
        : e.message
      setCapabilities(null)
      setCapabilityError(message)
      onError(message)
    } finally {
      setLoadingCapabilities(false)
    }
  }

  useEffect(() => { load() }, [])

  const pointOptions = useMemo(() => capabilities?.pointTypes || [], [capabilities])

  async function submit(event) {
    event.preventDefault()
    if (!capabilities?.canCollect || !cashReceived) return
    setSaving(true)
    setReceipt(null)
    try {
      const data = await adminApi('/staff/donations/cash', {
        method: 'POST',
        body: JSON.stringify({
          donorName: form.donorName || null,
          amount: Number(form.amount),
          phone: form.phone || null,
          whatsappOptIn: Boolean(form.whatsappOptIn),
          pointType: form.pointType,
          pointName: form.pointName || null,
          note: form.note || null
        })
      })
      setReceipt(data)
      setForm(x => ({ ...x, donorName: '', amount: '10', phone: '', whatsappOptIn: false, note: '' }))
      setCashReceived(false)
      onError('')
    } catch (e) {
      if (e.status === 403) {
        setCapabilities(null)
        setCapabilityError('Affectation staff expirée ou désactivée. Vérifiez Sécurité > Staff & Permissions.')
      }
      onError(e.message)
    }
    finally { setSaving(false) }
  }

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] bg-jso-navy p-6 text-white">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-jso-gold">Collecte terrain</p>
          <h2 className="mt-2 text-3xl font-black">Dons en espèces</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Cette page est réservée au personnel JSO. Le supporter remet l’argent à un point autorisé ; le personnel enregistre l’encaissement et lui remet un reçu.</p>
        </div>
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-jso-gold"><Banknote size={28}/></div>
      </div>
    </div>

    <div className="grid gap-3 md:grid-cols-3">
      {['1 · Recevoir l’argent du supporter', '2 · Saisir le montant réellement reçu', '3 · Remettre le reçu généré'].map((step) => <div key={step} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-jso-navy">{step}</div>)}
    </div>

    <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <form onSubmit={submit} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3"><Store className="text-jso-blue"/><h3 className="text-xl font-black">Nouveau reçu</h3></div>
        {capabilityError && <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900"><p>{capabilityError}</p><p className="mt-1 font-normal">Un SuperAdmin doit attribuer un rôle autorisé dans Sécurité → Staff & Permissions.</p><div className="mt-3 flex flex-wrap gap-4"><a href="/admin/security" className="font-bold underline">Ouvrir les affectations staff</a><button type="button" onClick={load} className="inline-flex items-center gap-2 font-bold underline"><RefreshCw size={15}/> Réessayer</button></div></div>}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">Donateur (optionnel)<input value={form.donorName} onChange={e => setForm({...form, donorName:e.target.value})} maxLength={100} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" placeholder="Nom du donateur"/></label>
          <label className="text-sm font-bold">Montant reçu (TND)<input value={form.amount} onChange={e => setForm({...form, amount:e.target.value})} type="number" min="1" max="1000000" step="0.01" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue"/></label>
          <label className="text-sm font-bold">Point de collecte<select value={form.pointType} onChange={e => setForm({...form, pointType:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue">{pointOptions.map(x => <option key={x} value={x}>{x === 'Shop' ? 'Boutique' : 'Vendeur'}</option>)}</select></label>
          <label className="text-sm font-bold">Nom du point (optionnel)<input value={form.pointName} onChange={e => setForm({...form, pointName:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" placeholder={form.pointType === 'Shop' ? 'Ex. Boutique JSO' : 'Ex. Vendeur 01'}/></label>
          <label className="text-sm font-bold">Téléphone (optionnel)<input value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} type="tel" maxLength={32} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" placeholder="+216 ..."/></label>
          <label className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={form.whatsappOptIn} onChange={e => setForm({...form, whatsappOptIn:e.target.checked})} disabled={!form.phone.trim()} className="mt-1 h-4 w-4 rounded border-slate-300"/><span><strong className="block text-emerald-900">Envoyer le reçu sur WhatsApp</strong><span className="mt-1 block text-xs font-medium text-emerald-800/70">Le numéro reste privé. Le reçu est envoyé automatiquement après l’encaissement si WhatsApp est configuré.</span></span></label>
          <label className="text-sm font-bold sm:col-span-2">Note<input value={form.note} onChange={e => setForm({...form, note:e.target.value})} maxLength={280} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" placeholder="Optionnel"/></label>
        </div>
        <label className="mt-5 flex items-start gap-3 rounded-xl border border-jso-gold/40 bg-jso-gold/10 p-4 text-sm font-semibold"><input type="checkbox" checked={cashReceived} onChange={e => setCashReceived(e.target.checked)} required className="mt-1 h-4 w-4"/><span>Je confirme avoir reçu <strong>{Number(form.amount || 0).toLocaleString('fr-FR')} TND en espèces</strong>. Ce clic comptabilisera immédiatement le don comme payé.</span></label>
        <button disabled={saving || !capabilities?.canCollect || !cashReceived} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-jso-navy px-5 py-3.5 font-black text-white disabled:opacity-50"><Ticket size={18}/>{loadingCapabilities ? 'Vérification des droits…' : saving ? 'Enregistrement…' : 'Confirmer l’encaissement et créer le reçu'}</button>
        <p className="mt-3 text-xs text-slate-400">N’utilisez ce formulaire qu’après avoir reçu les espèces. Un reçu unique est créé dès la confirmation.</p>
      </form>

      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-jso-blue">Qui fait quoi ?</p>
        <div className="mt-5 space-y-4">
          {['Le donateur remet l’argent au vendeur ou à la boutique.', 'Le personnel saisit le montant et imprime le reçu.', 'Le reçu porte un numéro unique et reste vérifiable en ligne.', 'Le montant rejoint automatiquement la collecte JSO.'].map((x,i) => <div key={x} className="flex gap-3 rounded-xl bg-white p-4"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-jso-gold font-black text-jso-navy">{i+1}</span><p className="text-sm font-semibold leading-6 text-slate-600">{x}</p></div>)}
        </div>
      </div>
    </div>

    {receipt && <ReceiptCard receipt={receipt}/>}
  </div>
}
