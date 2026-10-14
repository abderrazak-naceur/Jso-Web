import { useEffect, useMemo, useState } from 'react'
import { Search, Users, UserRound, ShieldCheck, RefreshCw, Star, ShieldBan, Pencil, UserCog } from 'lucide-react'
import { adminApi } from '../api'
import { API_BASE_URL } from '../../lib/apiConfig'

const dateLabel = (value) => value ? new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
export default function FanAccounts() {
  const [accounts, setAccounts] = useState([])
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [vipFilter, setVipFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState(null)
  const [canPromote, setCanPromote] = useState(false)
  const [promoteTarget, setPromoteTarget] = useState(null)
  const [selectedRole, setSelectedRole] = useState('Editor')
  const promotionRoles = ['ClubAdmin', 'MatchManager', 'FinanceManager', 'ShopManager', 'Editor', 'CommunityManager', 'TicketSeller', 'TicketValidator', 'TicketSupervisor', 'SeasonManager']

  async function load() {
    setLoading(true)
    setError('')
    try { setAccounts(await adminApi('/admin/fan-accounts')) }
    catch (err) { setError(err.message || 'Impossible de charger les profils supporter.') }
    finally { setLoading(false) }
  }
  useEffect(() => {
    load()
    try { setCanPromote(JSON.parse(localStorage.getItem('jso_admin_user') || '{}').role === 'SuperAdmin') } catch { setCanPromote(false) }
  }, [])

  async function updateStatus(account) {
    const nextActive = !account.isActive
    const confirmed = window.confirm(nextActive
      ? 'Réactiver ce compte supporter ?'
      : 'Bloquer ce compte ? Le supporter ne pourra plus utiliser son compte, même avec une session déjà ouverte.')
    if (!confirmed) return
    setBusyId(account.id); setError(''); setNotice('')
    try {
      await adminApi('/admin/fan-accounts/' + account.id + '/status', { method: 'PUT', body: JSON.stringify({ isActive: nextActive }) })
      setAccounts(current => current.map(item => item.id === account.id ? { ...item, isActive: nextActive } : item))
      setSelected(current => current?.id === account.id ? { ...current, isActive: nextActive } : current)
      setNotice(nextActive ? 'Compte réactivé.' : 'Compte bloqué.')
    } catch (err) { setError(err.message || 'Impossible de modifier le statut du compte.') }
    finally { setBusyId('') }
  }

  async function updateRating(account, stars) {
    setBusyId(account.id); setError(''); setNotice('')
    try {
      const result = await adminApi('/admin/fan-accounts/' + account.id + '/rating', { method: 'PUT', body: JSON.stringify({ stars }) })
      setAccounts(current => current.map(item => item.id === account.id ? { ...item, fanRatingStars: result.fanRatingStars, isVip: result.isVip } : item))
      setSelected(current => current?.id === account.id ? { ...current, fanRatingStars: result.fanRatingStars, isVip: result.isVip } : current)
      setNotice(result.isVip ? 'Valutazione salvata: utente VIP.' : 'Valutazione salvata: utente non VIP.')
    } catch (err) { setError(err.message || 'Impossible de modifier la note du compte.') }
    finally { setBusyId('') }
  }


  async function editMember(account) {
    const displayName = window.prompt('Nom affiché', account.displayName || '')
    if (displayName === null) return
    const email = window.prompt('Adresse e-mail', account.email || '')
    if (email === null) return
    const firstName = window.prompt('Prénom (facultatif)', account.firstName || '')
    if (firstName === null) return
    const lastName = window.prompt('Nom de famille (facultatif)', account.lastName || '')
    if (lastName === null) return
    const phoneNumber = window.prompt('Téléphone (facultatif)', account.phoneNumber || '')
    if (phoneNumber === null) return
    setBusyId(account.id); setError(''); setNotice('')
    try {
      const updated = await adminApi('/admin/fan-accounts/' + account.id, {
        method: 'PUT', body: JSON.stringify({ displayName, email, firstName, lastName, phoneNumber })
      })
      setAccounts(current => current.map(item => item.id === account.id ? { ...item, ...updated } : item))
      setSelected(current => current?.id === account.id ? { ...current, ...updated } : current)
      setNotice('Données du membre mises à jour.')
    } catch (err) { setError(err.message || 'Impossible de modifier ce membre.') }
    finally { setBusyId('') }
  }

  function promoteMember(account) {
    setError('')
    setNotice('')
    setSelectedRole('Editor')
    setPromoteTarget(account)
  }

  async function confirmPromotion() {
    if (!promoteTarget || !promotionRoles.includes(selectedRole)) return
    const account = promoteTarget
    setBusyId(account.id); setError(''); setNotice('')
    try {
      const created = await adminApi('/admin/fan-accounts/' + account.id + '/promote', {
        method: 'POST', body: JSON.stringify({ role: selectedRole })
      })
      setNotice('Promotion effectuée : ' + created.displayName + ' — ' + created.role + '.')
      setPromoteTarget(null)
    } catch (err) { setError(err.message || 'Impossible de promouvoir ce membre.') }
    finally { setBusyId('') }
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr')
    return accounts.filter((a) => {
      const matchesQuery = !needle || [a.displayName, a.email].some((v) => String(v || '').toLocaleLowerCase('fr').includes(needle))
      const matchesStatus = activeFilter === 'all' || (activeFilter === 'active' ? a.isActive : !a.isActive)
      const matchesVip = vipFilter === 'all' || (vipFilter === 'vip' ? a.isVip : !a.isVip)
      return matchesQuery && matchesStatus && matchesVip
    })
  }, [accounts, query, activeFilter, vipFilter])

  return <div className="space-y-6">
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-extrabold tracking-[0.18em] text-jso-blue">COMMUNAUTÉ JSO</p><h2 className="mt-2 text-2xl font-black">Gestion des supporters</h2><p className="mt-2 text-sm text-slate-500">Comptes inscrits, blocage, notation et statut VIP.</p></div>
        <button onClick={load} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> Actualiser</button>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4"><Users size={19} className="text-jso-blue"/><p className="mt-3 text-2xl font-black">{accounts.length}</p><p className="text-xs font-semibold text-slate-500">Comptes inscrits</p></div>
        <div className="rounded-2xl bg-slate-50 p-4"><ShieldCheck size={19} className="text-emerald-600"/><p className="mt-3 text-2xl font-black">{accounts.filter(a => a.isActive).length}</p><p className="text-xs font-semibold text-slate-500">Comptes actifs</p></div>
        <div className="rounded-2xl bg-slate-50 p-4"><ShieldBan size={19} className="text-rose-600"/><p className="mt-3 text-2xl font-black">{accounts.filter(a => !a.isActive).length}</p><p className="text-xs font-semibold text-slate-500">Comptes bloqués</p></div>
        <div className="rounded-2xl bg-slate-50 p-4"><Star size={19} className="text-amber-500"/><p className="mt-3 text-2xl font-black">{accounts.filter(a => a.isVip).length}</p><p className="text-xs font-semibold text-slate-500">Membres VIP</p></div>
      </div>
    </section>

    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div>}

    <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5">
        <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 px-3"><Search size={17} className="shrink-0 text-slate-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher par nom ou email…" className="w-full py-3 text-sm outline-none"/></label>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="mr-1 text-xs font-bold text-slate-500">Statut</span>
          { [['all','Tous'],['active','Actifs'],['inactive','Bloqués']].map(([value,label]) => <button key={value} onClick={() => setActiveFilter(value)} className={'rounded-full px-3 py-2 text-xs font-extrabold ' + (activeFilter === value ? 'bg-jso-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>{label}</button>)}
          <span className="ml-2 mr-1 text-xs font-bold text-slate-500">VIP</span>
          { [['all','Tous'],['vip','VIP'],['standard','Standard']].map(([value,label]) => <button key={value} onClick={() => setVipFilter(value)} className={'rounded-full px-3 py-2 text-xs font-extrabold ' + (vipFilter === value ? 'bg-jso-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>{label}</button>)}
        </div>
      </div>
      {loading ? <div className="space-y-3 p-5">{[1,2,3,4].map(n => <div key={n} className="h-16 animate-pulse rounded-xl bg-slate-100"/>)}</div>
        : filtered.length === 0 ? <div className="px-6 py-14 text-center"><UserRound size={30} className="mx-auto text-slate-300"/><p className="mt-3 font-bold">Aucun profil trouvé</p><p className="mt-1 text-sm text-slate-500">Essayez un autre nom ou filtre.</p></div>
        : <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-extrabold">Supporter</th><th className="px-5 py-3 font-extrabold">Note / VIP</th><th className="px-5 py-3 font-extrabold">Inscription</th><th className="px-5 py-3 font-extrabold">Dernière connexion</th><th className="px-5 py-3 font-extrabold">Statut</th><th className="px-5 py-3 font-extrabold">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(a => { const stars = a.fanRatingStars || 1; const initials = String(a.displayName || a.email || 'JS').split(/\s+/).slice(0,2).map(x => x[0]).join('').toUpperCase(); return <tr key={a.id} className="hover:bg-slate-50/80"><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-jso-navy text-xs font-black text-jso-gold">{a.profilePhotoUrl ? <img src={new URL(a.profilePhotoUrl, API_BASE_URL).href} alt="" className="h-full w-full object-cover"/> : initials}</div><div><p className="font-extrabold text-slate-800">{a.displayName}</p><p className="mt-0.5 text-xs text-slate-500">{a.email}</p></div></div></td><td className="px-5 py-4"><div className="flex items-center gap-1 text-amber-500" aria-label={stars + ' stelle'}>{'★'.repeat(stars)}<span className="ml-1 text-xs text-slate-400">{stars}★</span></div>{a.isVip ? <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-800">VIP</span> : <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">Standard</span>}<div className="mt-2 flex gap-1">{[1,3,5].map(value => <button key={value} disabled={busyId === a.id || stars === value} onClick={() => updateRating(a,value)} className={'rounded-lg border px-2 py-1 text-xs font-bold disabled:opacity-40 ' + (stars === value ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 hover:border-amber-300')} aria-label={'Assegna ' + value + ' stelle'}>{value}★</button>)}</div></td><td className="px-5 py-4 text-slate-600">{dateLabel(a.createdAt)}</td><td className="px-5 py-4 text-slate-600">{dateLabel(a.lastLoginAt)}</td><td className="px-5 py-4"><span className={'rounded-full px-2.5 py-1 text-xs font-bold ' + (a.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>{a.isActive ? 'Actif' : 'Bloqué'}</span></td><td className="px-5 py-4"><div className="flex items-center gap-2"><button onClick={() => setSelected(a)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold hover:border-jso-blue hover:text-jso-blue">Détails</button>{canPromote && <><button disabled={busyId === a.id} onClick={() => editMember(a)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold hover:border-jso-blue hover:text-jso-blue"><Pencil size={13}/> Modifier</button><button disabled={busyId === a.id} onClick={() => promoteMember(a)} className="inline-flex items-center gap-1 rounded-lg bg-jso-navy px-3 py-2 text-xs font-extrabold text-white hover:opacity-90"><UserCog size={13}/> Promouvoir</button></>}<button disabled={busyId === a.id} onClick={() => updateStatus(a)} className={'rounded-lg px-3 py-2 text-xs font-extrabold disabled:opacity-50 ' + (a.isActive ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100')}>{busyId === a.id ? '…' : a.isActive ? 'Bloquer' : 'Réactiver'}</button></div></td></tr> })}</tbody></table></div>}
      <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">{filtered.length} profil(s) affiché(s) · maximum API 500</div>
    </section>

    {promoteTarget && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-jso-navy/60 p-4" onMouseDown={e => { if (e.target === e.currentTarget && !busyId) setPromoteTarget(null) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="promote-account-title" className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-extrabold tracking-widest text-jso-blue">GESTION DES RÔLES</p><h3 id="promote-account-title" className="mt-2 text-xl font-black">Promouvoir un supporter</h3></div>
          <button type="button" onClick={() => setPromoteTarget(null)} disabled={!!busyId} className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50">Fermer</button>
        </div>
        <div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="font-extrabold text-slate-800">{promoteTarget.displayName}</p><p className="mt-1 text-sm text-slate-500">{promoteTarget.email}</p></div>
        <label htmlFor="fan-admin-role" className="mt-5 block text-sm font-bold text-slate-700">Nouveau rôle</label>
        <select id="fan-admin-role" value={selectedRole} onChange={e => setSelectedRole(e.target.value)} disabled={!!busyId} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-jso-blue focus:ring-2 focus:ring-jso-blue/20">
          {promotionRoles.map(role => <option key={role} value={role}>{role}</option>)}
        </select>
        <p className="mt-3 text-xs leading-5 text-slate-500">Le compte administratif utilisera la même adresse e-mail et le même mot de passe. Le rôle sera vérifié par le serveur.</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => setPromoteTarget(null)} disabled={!!busyId} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Annuler</button>
          <button type="button" onClick={confirmPromotion} disabled={!!busyId || !promotionRoles.includes(selectedRole)} className="inline-flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 text-sm font-extrabold text-white hover:opacity-90 disabled:opacity-50"><UserCog size={15}/>{busyId === promoteTarget.id ? 'Enregistrement…' : 'Confirmer'}</button>
        </div>
      </section>
    </div>}

    {selected && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-jso-navy/60 p-4" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null) }}><section role="dialog" aria-modal="true" aria-labelledby="fan-account-title" className="w-full max-w-lg rounded-[1.75rem] bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-extrabold tracking-widest text-jso-blue">FICHE SUPPORTER</p><h3 id="fan-account-title" className="mt-2 text-2xl font-black">{selected.displayName}</h3></div><button onClick={() => setSelected(null)} className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100">Fermer</button></div><div className="mt-5 flex items-center gap-4">{selected.profilePhotoUrl ? <img src={new URL(selected.profilePhotoUrl, API_BASE_URL).href} alt="" className="h-20 w-20 rounded-full object-cover"/> : <span className="grid h-20 w-20 place-items-center rounded-full bg-slate-100"><UserRound size={28}/></span>}<div><p className="font-bold">{selected.email}</p><p className="mt-1 text-sm text-slate-500">{selected.fanRatingStars || 1} stelle · {selected.isVip ? 'VIP' : 'Standard'}</p><p className="mt-1 text-xs text-slate-400">Compte {selected.isActive ? 'actif' : 'bloqué'}</p></div></div><dl className="mt-6 grid grid-cols-2 gap-4">{[['Inscription',dateLabel(selected.createdAt)],['Dernière connexion',dateLabel(selected.lastLoginAt)],['Email vérifié',selected.emailVerified ? 'Oui' : 'Non'],['Anniversaire',selected.anniversaryOptIn ? 'Activé' : 'Désactivé']].map(([label,value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 font-extrabold">{value}</dd></div>)}</dl><div className="mt-5 flex flex-wrap gap-2">{[1,3,5].map(value => <button key={value} disabled={busyId === selected.id} onClick={() => updateRating(selected,value)} className="rounded-xl border border-amber-200 px-4 py-2 text-sm font-bold text-amber-800 hover:bg-amber-50">{value} stelle</button>)}<button disabled={busyId === selected.id} onClick={() => updateStatus(selected)} className="rounded-xl border px-4 py-2 text-sm font-bold">{selected.isActive ? 'Blocca account' : 'Riattiva account'}</button></div></section></div>}
  </div>
}
