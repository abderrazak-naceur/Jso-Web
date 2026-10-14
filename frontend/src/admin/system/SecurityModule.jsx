import { useEffect, useMemo, useState } from 'react'
import { Plus, ShieldCheck, Trash2, RefreshCw } from 'lucide-react'
import { adminApi } from '../api'

const ROLES = ['TicketSeller','TicketValidator','TicketSupervisor','SeasonManager','MatchManager','ShopManager','Editor','CommunityManager','FinanceManager','ClubAdmin','SuperAdmin']
const SCOPES = ['Global','Club','Team','Match','Venue','Gate']

const empty = {
  adminUserId: '',
  role: 'TicketValidator',
  scopeType: 'Global',
  scopeId: '',
  gateId: '',
  deviceId: '',
  isActive: true,
  validFrom: '',
  validTo: ''
}

export default function SecurityModule({ onError }) {
  const [users,setUsers] = useState([])
  const [fanAccounts,setFanAccounts] = useState([])
  const [selectedFanId,setSelectedFanId] = useState('')
  const [promotionRole,setPromotionRole] = useState('Editor')
  const [promoting,setPromoting] = useState(false)
  const [promotionNotice,setPromotionNotice] = useState('')
  const [canManageRoles,setCanManageRoles] = useState(false)
  const [logs,setLogs] = useState([])
  const [assignments,setAssignments] = useState([])
  const [references,setReferences] = useState({matches:[],teams:[],facilities:[],gates:[],devices:[]})
  const [form,setForm] = useState(empty)
  const [saving,setSaving] = useState(false)

  async function load() {
    try {
      const [u,fanList,l,a,refs] = await Promise.all([
        adminApi('/admin/security/users'),
        adminApi('/admin/fan-accounts?active=true'),
        adminApi('/admin/audit?take=50'),
        adminApi('/admin/security/staff-assignments?activeOnly=false'),
        adminApi('/admin/security/staff-assignments/references')
      ])
      setUsers(u); setFanAccounts(fanList); setLogs(l); setAssignments(a); setReferences(refs)
      if (!form.adminUserId && u[0]) setForm(x => ({...x, adminUserId:u[0].id}))
    } catch(e) { onError(e.message) }
  }

  useEffect(()=>{
    try { setCanManageRoles(JSON.parse(localStorage.getItem('jso_admin_user') || '{}').role === 'SuperAdmin') } catch { setCanManageRoles(false) }
    load()
  }, [])

  const userMap = useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users])

  async function promoteRegisteredUser(e) {
    e.preventDefault()
    const fan = fanAccounts.find(x => x.id === selectedFanId)
    if (!fan) { onError('Seleziona un account supporter.'); return }
    if (!fan.isActive || !fan.emailVerified) { onError('L’account deve essere attivo e avere l’e-mail verificata.'); return }
    const confirmed = window.confirm(
      promotionRole === 'SuperAdmin'
        ? 'Confermi di promuovere ' + fan.displayName + ' (' + fan.email + ') a SUPERADMIN? Avrà accesso completo all’amministrazione.'
        : 'Confermi di promuovere ' + fan.displayName + ' (' + fan.email + ') al ruolo ' + promotionRole + '?'
    )
    if (!confirmed) return
    setPromoting(true)
    setPromotionNotice('')
    try {
      const created = await adminApi('/admin/fan-accounts/' + fan.id + '/promote', {
        method: 'POST',
        body: JSON.stringify({ role: promotionRole })
      })
      setPromotionNotice('Account amministrativo creato: ' + created.displayName + ' — ' + created.role + '.')
      setFanAccounts(current => current.filter(x => x.id !== fan.id))
      await load()
    } catch (e) { onError(e.message || 'Impossibile promuovere questo account.') }
    finally { setPromoting(false) }
  }

  async function createAssignment(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await adminApi('/admin/security/staff-assignments', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          scopeId: form.scopeId || null,
          gateId: form.gateId || null,
          deviceId: form.deviceId || null,
          validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
          validTo: form.validTo ? new Date(form.validTo).toISOString() : null
        })
      })
      setForm({...empty, adminUserId:form.adminUserId})
      await load()
    } catch(e) { onError(e.message) }
    finally { setSaving(false) }
  }

  async function deactivate(id) {
    if (!confirm('Désactiver cette affectation staff ?')) return
    try { await adminApi('/admin/security/staff-assignments/'+id, {method:'DELETE'}); await load() }
    catch(e) { onError(e.message) }
  }

  return <div className="space-y-6">
    {canManageRoles && (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2"><ShieldCheck className="text-jso-blue"/><h2 className="text-xl font-black">Utenti registrati → Staff</h2></div>
      <p className="mt-2 text-sm text-slate-500">Promuovi un supporter registrato e verificato a un ruolo amministrativo. L’assegnazione a SuperAdmin richiede una conferma esplicita ed è registrata nell’audit log.</p>
      {promotionNotice && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{promotionNotice}</p>}
      <form onSubmit={promoteRegisteredUser} className="mt-4 grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(180px,1fr)_auto]">
        <label className="text-sm font-bold">Account registrato
          <select required value={selectedFanId} onChange={e=>setSelectedFanId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3">
            <option value="">Seleziona un supporter verificato</option>
            {fanAccounts.filter(x=>x.isActive && x.emailVerified).map(x=><option key={x.id} value={x.id}>{x.displayName} — {x.email}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">Ruolo da assegnare
          <select value={promotionRole} onChange={e=>setPromotionRole(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3">
            {ROLES.map(x=><option key={x} value={x}>{x}</option>)}
          </select>
        </label>
        <div className="flex items-end"><button type="submit" disabled={promoting || !selectedFanId} className="w-full rounded-xl bg-jso-navy px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50">{promoting ? 'Promozione…' : 'Promuovi account'}</button></div>
      </form>
      {promotionRole === 'SuperAdmin' && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">Attenzione: SuperAdmin concede accesso completo al pannello amministrativo.</p>}
      {fanAccounts.filter(x=>x.isActive && x.emailVerified).length === 0 && <p className="mt-3 text-sm text-slate-500">Nessun account attivo con e-mail verificata disponibile per la promozione.</p>}
    </div>

    )}

    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-black">Staff & Permissions</h2><p className="mt-1 text-sm text-slate-500">Affectations par rôle, match, gate et device.</p></div>
        <button onClick={load} className="rounded-xl border border-slate-200 p-2 text-slate-600" aria-label="Actualiser"><RefreshCw size={16}/></button>
      </div>
      <form onSubmit={createAssignment} className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-bold">Utilisateur<select value={form.adminUserId} onChange={e=>setForm({...form,adminUserId:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2">{users.map(u=><option key={u.id} value={u.id}>{u.displayName} — {u.email}</option>)}</select></label>
        <label className="text-sm font-bold">Rôle<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2">{ROLES.map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="text-sm font-bold">Scope<select value={form.scopeType} onChange={e=>setForm({...form,scopeType:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2">{SCOPES.map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="text-sm font-bold">Risorsa
          {form.scopeType === 'Match' ? <select value={form.scopeId} onChange={e=>setForm({...form,scopeId:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"><option value="">Seleziona match</option>{references.matches.map(x=><option key={x.id} value={x.id}>{new Date(x.kickoffAt).toLocaleString('it-IT')} · {x.isHome ? 'vs' : '@'} {x.opponentName}</option>)}</select>
          : form.scopeType === 'Team' ? <select value={form.scopeId} onChange={e=>setForm({...form,scopeId:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"><option value="">Seleziona squadra</option>{references.teams.map(x=><option key={x.id} value={x.id}>{x.name} · {x.category}</option>)}</select>
          : form.scopeType === 'Venue' ? <select value={form.scopeId} onChange={e=>setForm({...form,scopeId:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"><option value="">Seleziona struttura</option>{references.facilities.map(x=><option key={x.id} value={x.id}>{x.name}{x.type ? ' · '+x.type : ''}</option>)}</select>
          : form.scopeType === 'Club' ? <input value={form.scopeId} onChange={e=>setForm({...form,scopeId:e.target.value})} placeholder="ID Club" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"/>
          : form.scopeType === 'Gate' ? <select value={form.scopeId} onChange={e=>setForm({...form,scopeId:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"><option value="">Seleziona gate</option>{references.gates.map(x=><option key={x.id} value={x.code}>{x.code} · {x.name}</option>)}</select>
          : <input value={form.scopeId} onChange={e=>setForm({...form,scopeId:e.target.value})} disabled={form.scopeType === 'Global'} placeholder="Nessuna risorsa" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"/>}
        </label>
        <label className="text-sm font-bold">Gate<input value={form.gateId} onChange={e=>setForm({...form,gateId:e.target.value})} placeholder="ID gate" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"/></label>
        <label className="text-sm font-bold">Scanner Device<select value={form.deviceId} onChange={e=>setForm({...form,deviceId:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"><option value="">Nessun device</option>{references.devices.map(x=><option key={x.id} value={x.deviceCode}>{x.deviceCode} · {x.name}</option>)}</select></label>
        <label className="text-sm font-bold">Valide du<input type="datetime-local" value={form.validFrom} onChange={e=>setForm({...form,validFrom:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"/></label>
        <label className="text-sm font-bold">Valide jusqu'au<input type="datetime-local" value={form.validTo} onChange={e=>setForm({...form,validTo:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"/></label>
        <div className="flex items-end xl:col-span-4"><button disabled={saving || !form.adminUserId} className="inline-flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 font-bold text-white disabled:opacity-50"><Plus size={16}/> {saving?'Salvataggio…':'Aggiungi affectation'}</button></div>
      </form>
    </div>

    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2"><ShieldCheck className="text-jso-blue"/><h2 className="text-xl font-black">Affectations staff</h2></div>
      <div className="mt-4 overflow-x-auto">
        {assignments.length === 0 ? <p className="text-sm text-slate-400">Nessuna affectation configurata.</p> :
          <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Staff</th><th className="p-2">Rôle</th><th className="p-2">Scope</th><th className="p-2">Gate / Device</th><th className="p-2">Validité</th><th className="p-2"></th></tr></thead><tbody>
            {assignments.map(a=><tr key={a.id} className="border-b last:border-0">
              <td className="p-2 font-bold">{userMap[a.adminUserId]?.displayName || a.adminUserId}</td>
              <td className="p-2"><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-extrabold text-jso-blue">{a.role}</span></td>
              <td className="p-2">{a.scopeType}{a.scopeId ? ' · '+a.scopeId : ''}</td>
              <td className="p-2">{a.gateId || '—'} / {a.deviceId || '—'}</td>
              <td className="p-2 text-xs text-slate-500">{a.validFrom ? new Date(a.validFrom).toLocaleString('fr-FR') : 'Maintenant'} → {a.validTo ? new Date(a.validTo).toLocaleString('fr-FR') : 'Sans expiration'}</td>
              <td className="p-2">{a.isActive && <button onClick={()=>deactivate(a.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Désactiver"><Trash2 size={15}/></button>}</td>
            </tr>)}
          </tbody></table>}
      </div>
    </div>

    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">Utilisateurs administrateurs</h2>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">Utilisateur</th><th className="p-2">Rôle legacy</th><th className="p-2">Statut</th><th className="p-2">Dernière connexion</th></tr></thead><tbody>{users.map(u=><tr key={u.id} className="border-b last:border-0"><td className="p-2"><b>{u.displayName}</b><div className="text-xs text-slate-500">{u.email}</div></td><td className="p-2 font-semibold">{u.role}</td><td className="p-2">{u.isActive?'Actif':'Désactivé'}</td><td className="p-2">{u.lastLoginAt?new Date(u.lastLoginAt).toLocaleString('fr-FR'):'Jamais'}</td></tr>)}</tbody></table></div>
    </div>

    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-black">Audit Log</h2>
      <div className="mt-4 space-y-2">{logs.map(l=><div key={l.id} className="rounded-xl bg-slate-50 p-3 text-sm"><div className="flex justify-between gap-3"><b>{l.action} · {l.entityType}</b><span className="text-xs text-slate-400">{new Date(l.createdAt).toLocaleString('fr-FR')}</span></div><p className="mt-1 text-xs text-slate-500">{l.userEmail||'Système'}{l.entityId?' · '+l.entityId:''}</p></div>)}</div>
    </div>
  </div>
}
