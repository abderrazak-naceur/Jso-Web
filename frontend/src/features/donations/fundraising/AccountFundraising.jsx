import { useEffect, useState } from 'react'
import { ArrowRight, HeartHandshake } from 'lucide-react'
import { donationsApi, fundraisingApi } from '../../../lib/api'
import { useI18n } from '../../../i18n/index.jsx'
import FundraisingDashboard from './FundraisingDashboard'
import { ONLINE_PROVIDERS } from './FundraisingRegistration'
import { readFundraisingAccess, forgetFundraisingAccess } from './fundraisingAccess'
import { fundraisingDate, fundraisingMoney } from './fundraisingTemplates'
import './fundraising.css'

export default function AccountFundraising({ token, onChanged }) {
  const { language } = useI18n()
  const date = value => fundraisingDate(value, language)
  const money = value => fundraisingMoney(value, language)
  const [items, setItems] = useState([])
  const [guests, setGuests] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [providers, setProviders] = useState([])
  const [providerId, setProviderId] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState('')
  const [claiming, setClaiming] = useState('')
  const [paying, setPaying] = useState('')
  const [notice, setNotice] = useState('')
  const selected = items.find(item => item.id === selectedId) || items[0]

  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setItems([]); setGuests([])
    async function load() {
      const owned = await fundraisingApi.mine(token)
      if (!active) return
      setItems(owned)
      for (const item of owned) {
        try { forgetFundraisingAccess(item.id) } catch { /* Keep account access independent of local storage. */ }
      }
      const access = readFundraisingAccess().filter(record => !owned.some(item => item.id === record.id))
      const found = await Promise.allSettled(access.map(async record => ({
        ...record, data: await fundraisingApi.commitment(record.id, record.token, token),
      })))
      if (active) setGuests(found.filter(result => result.status === 'fulfilled').map(result => result.value))
    }
    load().catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    donationsApi.paymentMethods().then(methods => {
      if (!active) return
      const available = ONLINE_PROVIDERS.filter(provider => methods[provider.key])
      setProviders(available)
      setProviderId(current => available.some(provider => provider.id === current) ? current : available[0]?.id || '')
    }).catch(() => { if (active) setProviders([]) })
    return () => { active = false }
  }, [token, revision])

  function refresh() { setRevision(value => value + 1); onChanged?.() }
  async function link(record) {
    setClaiming(record.id); setError(''); setNotice('')
    try {
      await fundraisingApi.claim(record.id, record.token, token)
      try { forgetFundraisingAccess(record.id) } catch { /* The server link is already saved. */ }
      setNotice('Votre participation et ses dix mensualités sont maintenant liées à votre compte.')
      refresh()
    } catch (e) {
      setError(e.status === 409 ? 'Cette participation est déjà rattachée à un autre compte et ne peut pas être transférée.' :
        e.status === 401 ? 'Rattachement refusé. Reconnectez-vous et utilisez le navigateur ayant enregistré votre participation.' : e.message)
    }
    finally { setClaiming('') }
  }
  async function pay(installment) {
    const provider = providers.find(item => item.id === providerId)
    if (!selected || !provider || paying) return
    setPaying(installment.id); setError('')
    try {
      const result = await fundraisingApi.pay(installment.id, provider.country, provider.id, selected.email, null, token)
      if (!result.redirectUrl) throw new Error('La page de paiement est indisponible. Aucun versement n’a été confirmé.')
      window.location.assign(result.redirectUrl)
    } catch (e) { setError(e.message) }
    finally { setPaying('') }
  }

  return <section className="jso-panel mt-4" id="mes-soutiens" lang={language}>
    <div className="jso-panel-heading"><div><span className="jso-panel-eyebrow">COLLECTES DU CLUB</span><h2>Mes soutiens</h2></div><a href="/nos-projets">Nos projets <ArrowRight size={14}/></a></div>
    <p className="mb-4 text-sm text-slate-500">Vos participations, les espèces à remettre au club et chaque mensualité confirmée, même lorsque le projet est archivé.</p>
    {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    {error && <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><span>{error}</span><button type="button" className="font-bold underline" onClick={refresh}>Réessayer</button></div>}
    {loading ? <p role="status" className="text-sm text-slate-500">Chargement de vos participations…</p> : <>
      {guests.length > 0 && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-bold text-slate-900">Participation créée avant votre connexion ?</h3><p className="mt-1 text-sm text-slate-600">Rattachez uniquement vos propres participations retrouvées dans ce navigateur.</p>{guests.map(record => <div key={record.id} className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-sm">{record.data.displayName} · {record.data.projectTitle} · {money(record.data.monthlyAmountTnd)} / mois</span><button type="button" disabled={Boolean(claiming)} onClick={() => link(record)} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{claiming === record.id ? 'Rattachement…' : 'Rattacher à mon compte'}</button></div>)}</div>}
      {items.length ? <div className="jso-fundraising fr-account-area">
        <label className="fr-field">Mon projet soutenu<select value={selected.id} onChange={event => setSelectedId(event.target.value)}>{items.map(item => <option key={item.id} value={item.id}>{item.projectTitle} · {money(item.monthlyAmountTnd)} / mois · {date(item.createdAt)}</option>)}</select></label>
        <FundraisingDashboard commitment={selected} providers={providers} providerId={providerId} setProviderId={setProviderId} onPay={pay} payingId={paying} onRefresh={refresh} inAccount sectionId={`engagement-${selected.id}`}/>
      </div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><HeartHandshake className="mx-auto text-blue-800" size={28}/><h3 className="mt-3 font-bold">Aucun soutien lié à votre compte</h3><p className="mt-2 text-sm text-slate-500">Choisissez un projet en étant connecté pour suivre vos dix mensualités ici.</p><a href="/nos-projets" className="mt-4 inline-flex items-center gap-2 font-bold text-blue-800">Découvrir les projets <ArrowRight size={16}/></a></div>}
    </>}
  </section>
}
