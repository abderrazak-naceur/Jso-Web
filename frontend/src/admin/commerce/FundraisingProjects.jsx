import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, ChevronDown, Eye, ExternalLink, Flag, Plus, RefreshCw, Save, X } from 'lucide-react'
import { adminApi } from '../api'
import { adminEditIdFromPath, navigateAdminEdit } from '../adminRoutes'
import { useConfirm } from '../components/ui/ConfirmDialog'
import { useDialog } from '../../features/site/useDialog'
import FundraisingProjectView from '../../features/donations/fundraising/FundraisingProjectView.jsx'
import { FUNDRAISING_TEMPLATES, fundraisingDate, fundraisingMoney } from '../../features/donations/fundraising/fundraisingTemplates.js'
import { useI18n, localizeLegacySubtree } from '../../i18n/index.jsx'

const noop = () => {}
const blankProject = { title: '', description: '', budgetTnd: '', durationMonths: 10, templateId: 'custom', imageUrl: '', status: 'Draft' }
const inputClass = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100'
const statusLabel = status => ({ Draft: 'Brouillon privé', Published: 'Publié', Archived: 'Archivé' })[status] || status
const projectPayload = (project, status = project.status) => ({ title: project.title.trim(), description: project.description.trim(), budgetTnd: Number(project.budgetTnd), durationMonths: 10, templateId: project.templateId, imageUrl: project.imageUrl?.trim() || null, status })

function ManagementDialog({ title, children, onClose, busy = false, footer }) {
  const ref = useDialog(() => { if (!busy) onClose() })
  function containFocus(event) {
    if (event.key !== 'Tab') return
    const targets = [...(ref.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href], select:not(:disabled), textarea:not(:disabled)') || [])]
    if (!targets.length) { event.preventDefault(); return }
    const first = targets[0], last = targets[targets.length - 1]
    if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first.focus() }
  }
  return <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/75 p-4" onClick={event => { if (!busy && event.target === event.currentTarget) onClose() }}>
    <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="fundraising-management-dialog-title" aria-busy={busy} onKeyDown={containFocus} className="my-auto max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl outline-none sm:p-6">
      <div className="flex items-start justify-between gap-3"><h3 id="fundraising-management-dialog-title" className="text-xl font-black">{title}</h3><button type="button" onClick={onClose} disabled={busy} aria-label="Fermer la fenêtre" className="rounded-lg bg-slate-100 p-2 disabled:opacity-40"><X size={18}/></button></div>
      <div className="mt-4">{children}</div>
      {footer && <div className="mt-5 flex flex-wrap justify-end gap-3">{footer}</div>}
    </section>
  </div>
}

function ContactDialog({ commitment, onClose, onSave }) {
  const [form, setForm] = useState({ displayName: commitment.displayName, phone: commitment.phone || '', email: commitment.email || '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try { await onSave({ displayName: form.displayName.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null }); onClose() }
    catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }
  return <ManagementDialog title="Modifier les coordonnées du supporter" onClose={onClose} busy={busy}>
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm leading-6 text-slate-600">Le nom public et les coordonnées de cette inscription seront corrigés. Les reçus et les détails utilisés pour les paiements déjà engagés sont conservés.</p>
      <label className="block text-sm font-bold">Nom public *<input required maxLength={80} value={form.displayName} onChange={event => setForm({ ...form, displayName: event.target.value })} className={inputClass}/></label>
      <label className="block text-sm font-bold">Téléphone privé<input type="tel" maxLength={32} value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} className={inputClass}/></label>
      <label className="block text-sm font-bold">Email privé<input type="email" maxLength={254} value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} className={inputClass}/></label>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold">Annuler</button><button type="submit" disabled={busy} className="rounded-xl bg-blue-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Enregistrement…' : 'Enregistrer les coordonnées'}</button></div>
    </form>
  </ManagementDialog>
}

function PreviewDialog({ project, onClose }) {
  const ref = useDialog(onClose)
  const [mobile, setMobile] = useState(false)
  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/75 p-2 sm:p-6" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <section ref={ref} role="dialog" aria-modal="true" aria-labelledby="fundraising-preview-title" tabIndex={-1} className="mx-auto max-w-6xl overflow-hidden rounded-2xl bg-slate-100 outline-none">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white p-4">
        <div><h3 id="fundraising-preview-title" className="font-black text-slate-950">Aperçu public avant publication</h3><p className="mt-1 text-xs text-slate-600">Vos contenus actuels et les montants réellement encaissés. Cet aperçu ne publie rien.</p></div>
        <div className="flex items-center gap-2"><button type="button" onClick={() => setMobile(value => !value)} aria-pressed={mobile} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">{mobile ? 'Vue ordinateur' : 'Vue mobile'}</button><button type="button" onClick={onClose} aria-label="Fermer l’aperçu" className="rounded-lg bg-slate-100 p-2"><X size={20}/></button></div>
      </header>
      <div className={'mx-auto bg-white ' + (mobile ? 'fr-preview-mobile max-w-[390px]' : 'w-full')}><FundraisingProjectView project={project} preview onSupport={noop}/></div>
    </section>
  </div>
}

export default function FundraisingProjects({ onError = noop }) {
  const confirm = useConfirm()
  const { language, setLanguage, languages } = useI18n()
  const date = value => fundraisingDate(value, language)
  const money = value => fundraisingMoney(value, language)
  const localizationRoot = useRef(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState('All')
  const [form, setForm] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState(false)
  const [managedProject, setManagedProject] = useState(null)
  const [commitments, setCommitments] = useState([])
  const [commitmentsLoading, setCommitmentsLoading] = useState(false)
  const [commitmentsError, setCommitmentsError] = useState('')
  const [search, setSearch] = useState('')
  const [confirmingId, setConfirmingId] = useState(null)
  const [mutationBusy, setMutationBusy] = useState('')
  const [mutationError, setMutationError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false)
  const [canForceDelete, setCanForceDelete] = useState(false)
  const [contactTarget, setContactTarget] = useState(null)
  // The force-delete override (bypassing the payment-history guard) is only
  // offered to a SuperAdmin, matching the server-side restriction.
  const isSuperAdmin = (() => { try { return JSON.parse(localStorage.getItem('jso_admin_user') || '{}').role === 'SuperAdmin' } catch { return false } })()
  const formRef = useRef(form)
  const editingRef = useRef(editingId)
  formRef.current = form
  editingRef.current = editingId

  useEffect(() => localizeLegacySubtree(language, localizationRoot.current), [language])

  const loadProjects = useCallback(async signal => {
    setLoading(true)
    try {
      const result = await adminApi('/admin/fundraising/projects', { signal })
      if (signal?.aborted) return
      setProjects(Array.isArray(result) ? result : [])
      setLoadError('')
    } catch (error) {
      if (!signal?.aborted) { setLoadError(error.message); onError(error.message) }
    } finally { if (!signal?.aborted) setLoading(false) }
  }, [onError])

  useEffect(() => {
    const controller = new AbortController()
    loadProjects(controller.signal)
    return () => controller.abort()
  }, [loadProjects])

  useEffect(() => {
    function syncRoute(force = false) {
      const id = adminEditIdFromPath('fundraising-projects')
      if (!id) { if (!force && formRef.current && !editingRef.current) return; setForm(null); setEditingId(null); return }
      const found = projects.find(item => String(item.id) === id)
      if (found && (force || editingRef.current !== found.id || !formRef.current)) { setEditingId(found.id); setForm({ ...blankProject, ...found, imageUrl: found.imageUrl || '' }) }
    }
    syncRoute()
    const popstate = () => syncRoute(true)
    window.addEventListener('popstate', popstate)
    return () => window.removeEventListener('popstate', popstate)
  }, [projects])

  useEffect(() => {
    if (!managedProject) return
    const controller = new AbortController()
    setCommitments([])
    setCommitmentsLoading(true)
    setCommitmentsError('')
    adminApi(`/admin/fundraising/projects/${managedProject}/commitments`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setCommitments(Array.isArray(result) ? result : []) })
      .catch(error => { if (!controller.signal.aborted) setCommitmentsError(error.message) })
      .finally(() => { if (!controller.signal.aborted) setCommitmentsLoading(false) })
    return () => controller.abort()
  }, [managedProject])

  function begin(template) {
    navigateAdminEdit('fundraising-projects', null)
    setEditingId(null)
    setForm({ ...blankProject, title: template?.suggestedTitle || (template?.id === 'custom' ? '' : template?.title || ''), description: template?.id === 'custom' ? '' : template?.description || '', templateId: template?.id || 'custom', imageUrl: template?.imageUrl || '' })
    setMessage('')
    window.setTimeout(() => document.getElementById('fundraising-project-title')?.focus(), 0)
  }

  function edit(project) {
    navigateAdminEdit('fundraising-projects', project.id)
    setEditingId(project.id)
    setForm({ ...blankProject, ...project, imageUrl: project.imageUrl || '' })
    setMessage('')
    window.setTimeout(() => document.getElementById('fundraising-project-title')?.focus(), 0)
  }

  function closeEditor() { navigateAdminEdit('fundraising-projects', null); setForm(null); setEditingId(null) }

  function duplicate(project) {
    navigateAdminEdit('fundraising-projects', null)
    setEditingId(null)
    setForm({ ...projectPayload(project, 'Draft'), title: `${project.title.slice(0, 150)} (copie)`, imageUrl: project.imageUrl || '' })
    setMessage('Copie préparée en brouillon : vérifiez les informations puis enregistrez. Aucun supporter ni paiement n’est recopié.')
    setMutationError('')
    setDeleteTarget(null)
    window.setTimeout(() => document.getElementById('fundraising-project-title')?.focus(), 0)
  }

  async function changeStatus(project, status) {
    if (mutationBusy) return
    setMutationBusy(project.id)
    setMutationError('')
    try {
      await adminApi(`/admin/fundraising/projects/${project.id}${status === 'Archived' ? '/archive' : ''}`, status === 'Archived'
        ? { method: 'POST' }
        : { method: 'PUT', body: JSON.stringify(projectPayload(project, status)) })
      if (editingId === project.id) setForm(current => current && ({ ...current, status }))
      setDeleteTarget(null)
      await loadProjects()
      setMessage(status === 'Archived' ? 'Projet archivé. Il est retiré de la page publique ; les inscriptions et les paiements restent conservés.' : 'Projet restauré en brouillon. Vous pouvez le modifier avant de le republier.')
      onError('')
    } catch (error) { setMutationError(error.message); onError(error.message) }
    finally { setMutationBusy('') }
  }

  function askDelete(project, commitment = null) {
    setDeleteTarget({ project, commitment })
    setDeleteAcknowledged(false)
    setCanForceDelete(false)
    setMutationError('')
  }

  async function deleteConfirmed(force = false) {
    if (!deleteTarget || !deleteAcknowledged || mutationBusy) return
    const { project, commitment } = deleteTarget
    setMutationBusy(commitment?.id || project.id)
    setMutationError('')
    try {
      // `force=true` (SuperAdmin only, project-level) bypasses the server's
      // payment-history guard to permanently delete an archived project.
      const base = `/admin/fundraising/projects/${project.id}${commitment ? `/commitments/${commitment.id}` : ''}`
      await adminApi(base + (force && !commitment ? '?force=true' : ''), { method: 'DELETE' })
      if (commitment) setCommitments(current => current.filter(item => item.id !== commitment.id))
      else {
        if (editingId === project.id) closeEditor()
        if (managedProject === project.id) { setManagedProject(null); setCommitments([]) }
      }
      setDeleteTarget(null)
      setCanForceDelete(false)
      await loadProjects()
      setMessage(commitment ? 'Inscription sans paiement supprimée, avec ses échéances non réglées.'
        : force ? 'Projet supprimé définitivement (SuperAdmin), avec son historique.'
          : 'Projet de test supprimé avec ses inscriptions et échéances non réglées. Vous pouvez le recréer.')
      onError('')
    } catch (error) {
      // A 409 on a project delete may offer a SuperAdmin force override.
      setCanForceDelete(Boolean(error.payload?.canForceDelete) && !commitment)
      const detail = error.status === 409 ? `${error.message} Pour recommencer les essais, archivez ce projet puis dupliquez-le en brouillon. Les traces financières restent conservées.` : error.message
      setMutationError(detail)
      onError(detail)
    } finally { setMutationBusy('') }
  }

  async function saveContact(values) {
    if (!contactTarget || !managedProject) return
    const updated = await adminApi(`/admin/fundraising/projects/${managedProject}/commitments/${contactTarget.id}`, { method: 'PUT', body: JSON.stringify(values) })
    setCommitments(current => current.map(item => item.id === contactTarget.id ? { ...item, ...updated } : item))
    setMessage('Coordonnées du supporter mises à jour. Les paiements et leur historique sont conservés.')
    onError('')
  }

  async function save(event) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setMessage('')
    try {
      await adminApi(editingId ? `/admin/fundraising/projects/${editingId}` : '/admin/fundraising/projects', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(projectPayload(form)),
      })
      closeEditor()
      await loadProjects()
      setMessage(form.status === 'Published' ? 'Projet enregistré et publié sur « Nos projets ».' : form.status === 'Archived' ? 'Projet archivé. Son historique est conservé.' : 'Brouillon enregistré. Il reste privé.')
      onError('')
    } catch (error) { onError(error.message) }
    finally { setSaving(false) }
  }

  async function confirmCash(commitment, installment) {
    if (installment.paymentProvider !== 'Cash' || installment.paymentStatus !== 'Pending' || confirmingId) return
    if (!await confirm({ title: 'Confirmer la réception ?', message: `Avez-vous réellement reçu ${money(installment.amount)} de ${commitment.displayName} pour le mois ${installment.installmentNumber} ? Cette confirmation comptabilisera la somme encaissée.`, confirmLabel: 'Confirmer la réception' })) return
    setConfirmingId(installment.id)
    try {
      await adminApi(`/admin/donations/${installment.id}/confirm-cash`, { method: 'POST' })
      const result = await adminApi(`/admin/fundraising/projects/${managedProject}/commitments`)
      setCommitments(Array.isArray(result) ? result : [])
      await loadProjects()
      setMessage('Espèces reçues : échéance confirmée et comptabilisée.')
      onError('')
    } catch (error) { onError(error.message) }
    finally { setConfirmingId(null) }
  }

  const selected = projects.find(item => item.id === editingId)
  const previewProject = form ? { ...selected, ...form, budgetTnd: Number(form.budgetTnd) || 0, totalPaidTnd: selected?.totalPaidTnd || 0, supporterCount: selected?.supporterCount || 0, paidSupporterCount: selected?.paidSupporterCount || 0, paidInstallmentCount: selected?.paidInstallmentCount || 0, progressPercent: Number(form.budgetTnd) > 0 ? Math.min(100, (selected?.totalPaidTnd || 0) / Number(form.budgetTnd) * 100) : 0 } : null
  const displayedProjects = projects.filter(project => filter === 'All' || project.status === filter)
  const displayedCommitments = commitments.filter(item => `${item.displayName} ${item.phone || ''} ${item.email || ''}`.toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr')))
  const managed = projects.find(item => item.id === managedProject)

  return <div ref={localizationRoot} className="space-y-6 text-slate-900">
    <header className="rounded-3xl bg-gradient-to-br from-slate-950 to-blue-950 p-6 text-white sm:p-8">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.15em] text-amber-300"><Flag size={16}/> Finances & dons</p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-5"><div><h2 className="text-2xl font-black sm:text-3xl">Objectifs de collecte de fonds</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Créez vos projets, préparez leur page publique et suivez les contributions sur 10 mois. Seuls les paiements confirmés alimentent la collecte.</p></div><div className="flex flex-wrap items-center gap-3"><label className="sr-only" htmlFor="fundraising-language">Langue</label><select id="fundraising-language" aria-label="Langue" value={language} onChange={event => setLanguage(event.target.value)} className="rounded-xl border border-white/30 bg-slate-900/40 px-3 py-3 text-sm font-bold text-white">{languages.map(item => <option key={item.code} value={item.code} className="text-slate-900">{item.flag} {item.label}</option>)}</select><button type="button" disabled={loading || Boolean(loadError)} onClick={() => begin()} className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50"><Plus size={18}/> Nouvel objectif</button></div></div>
      <a href="/nos-projets" target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-amber-200"><ExternalLink size={15}/> Voir la page publique</a>
    </header>

    {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p>}
    {mutationError && !deleteTarget && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800">{mutationError}</p>}
    {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800"><p>{loadError}</p><button type="button" onClick={() => loadProjects()} className="inline-flex items-center gap-2 font-bold underline"><RefreshCw size={16}/> Réessayer</button></div>}

    {form && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="fundraising-editor-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5"><h3 id="fundraising-editor-title" className="text-xl font-black">{editingId ? 'Modifier le projet' : 'Nouvel objectif'}</h3><button type="button" disabled={saving} onClick={closeEditor} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft size={16}/> Retour aux projets</button></div>
      <form onSubmit={save} className="grid gap-6 p-5 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold sm:col-span-2">Titre du projet *<input id="fundraising-project-title" required maxLength={160} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} className={inputClass} placeholder="Un bus pour la JSO"/></label>
          <label className="text-sm font-bold sm:col-span-2">Description *<textarea required rows={5} maxLength={6000} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} className={inputClass} placeholder="Présentez le projet et l’utilisation des fonds collectés."/></label>
          <label className="text-sm font-bold">Budget nécessaire (TND) *<input required type="number" min="1" max="10000000" step="0.01" value={form.budgetTnd} onChange={event => setForm({ ...form, budgetTnd: event.target.value })} className={inputClass}/></label>
          <label className="text-sm font-bold">Durée de l’engagement<select value={form.durationMonths} onChange={event => setForm({ ...form, durationMonths: Number(event.target.value) })} className={inputClass}><option value={10}>10 mois</option></select></label>
          <label className="text-sm font-bold">Modèle<select value={form.templateId} onChange={event => { const template = FUNDRAISING_TEMPLATES.find(item => item.id === event.target.value); setForm({ ...form, templateId: event.target.value, imageUrl: template?.imageUrl || '' }) }} className={inputClass}>{FUNDRAISING_TEMPLATES.map(template => <option key={template.id} value={template.id}>{template.title}</option>)}</select></label>
          <label className="text-sm font-bold">Visibilité<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })} className={inputClass}><option value="Draft">Brouillon · privé</option><option value="Published">Publié · visible par tous</option><option value="Archived">Archivé · historique conservé</option></select></label>
          <label className="text-sm font-bold sm:col-span-2">Image du projet (URL ou chemin du média)<input maxLength={2000} value={form.imageUrl} onChange={event => setForm({ ...form, imageUrl: event.target.value })} className={inputClass} placeholder="/img/mon-projet.jpg"/><span className="mt-2 block text-xs font-normal text-slate-500">Utilisez l’adresse d’une image disponible dans votre médiathèque.</span></label>
        </div>
        <aside><div className="overflow-hidden rounded-xl bg-slate-100">{form.imageUrl ? <img src={form.imageUrl} alt="Image sélectionnée pour le projet" className="aspect-[4/3] w-full object-cover"/> : <div className="grid aspect-[4/3] place-items-center text-slate-400"><Flag size={40}/></div>}</div><p className="mt-4 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-950">Les supporters choisissent <strong>5, 10, 20, 30 ou 50 TND par mois</strong> sur 10 mois. Aucune promesse en espèces n’est considérée comme encaissée.</p><button type="button" onClick={() => setPreview(true)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold"><Eye size={17}/> Prévisualiser la page publique</button><button type="submit" disabled={saving} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-3 text-sm font-black text-white disabled:opacity-50"><Save size={17}/>{saving ? 'Enregistrement…' : form.status === 'Published' ? 'Enregistrer et publier' : form.status === 'Archived' ? 'Enregistrer l’archive' : 'Enregistrer le brouillon'}</button></aside>
      </form>
    </section>}

    <section aria-labelledby="fundraising-gallery-title" className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 id="fundraising-gallery-title" className="text-xl font-black">Un modèle pour chaque objectif</h3><p className="mt-2 text-sm text-slate-500">Choisissez un point de départ, puis personnalisez vos textes, votre budget et votre image.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{FUNDRAISING_TEMPLATES.map(template => <article key={template.id} className="flex flex-col overflow-hidden rounded-xl border border-slate-200"><div className="aspect-[4/3] bg-slate-100">{template.imageUrl ? <img src={template.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover"/> : <div className="grid h-full place-items-center text-blue-900"><Plus size={36}/></div>}</div><div className="flex flex-1 flex-col p-3"><h4 className="text-sm font-black">{template.title}</h4><p className="mt-2 flex-1 text-xs leading-5 text-slate-600">{template.description}</p><button type="button" disabled={loading || Boolean(loadError)} onClick={() => begin(template)} className="mt-4 rounded-lg bg-amber-300 px-3 py-2.5 text-xs font-black text-slate-950 disabled:opacity-50">{template.id === 'custom' ? 'Créez le vôtre' : 'Utiliser ce modèle'}</button></div></article>)}</div>
    </section>

    <section aria-labelledby="fundraising-list-title" className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 id="fundraising-list-title" className="text-xl font-black">Vos projets</h3><button type="button" disabled={loading} onClick={() => loadProjects()} className="inline-flex items-center gap-2 text-sm font-bold text-blue-900 disabled:opacity-50"><RefreshCw size={16}/> Actualiser</button></div>
      <p className="mt-3 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-950">Pour vos essais, supprimez et recréez un projet sans paiement. Dès qu’une tentative ou un reçu existe, archivez le projet puis dupliquez-le pour recommencer en conservant toutes les traces.</p>
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Filtrer les projets">{[['All', 'Tous'], ['Published', 'Publiés'], ['Draft', 'Brouillons'], ['Archived', 'Archivés']].map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)} className={'rounded-lg px-4 py-2 text-xs font-bold ' + (filter === value ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600')}>{label} ({value === 'All' ? projects.length : projects.filter(project => project.status === value).length})</button>)}</div>
      {loading && <p role="status" className="mt-5 text-sm text-slate-500">Chargement des projets…</p>}
      {!loading && !loadError && !displayedProjects.length && <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Aucun projet {filter === 'Draft' ? 'en brouillon' : filter === 'Published' ? 'publié' : filter === 'Archived' ? 'archivé' : 'créé'}. Choisissez un modèle pour préparer votre premier objectif.</p>}
      <div className="mt-5 space-y-4">{displayedProjects.map(project => <article key={project.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center">
        {project.imageUrl && <img src={project.imageUrl} alt="" loading="lazy" className="h-32 w-full rounded-lg object-cover sm:h-24 sm:w-32"/>}
        <div className="min-w-0 flex-1"><span className={'rounded px-2 py-1 text-[10px] font-black ' + (project.status === 'Published' ? 'bg-emerald-100 text-emerald-800' : project.status === 'Archived' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600')}>{statusLabel(project.status)}</span><h4 className="mt-2 font-black">{project.title}</h4><p className="mt-2 text-sm font-bold">{money(project.totalPaidTnd)} <span className="font-normal text-slate-500">encaissés sur {money(project.budgetTnd)}</span></p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, Math.max(0, Number(project.progressPercent) || 0))}%` }}/></div><p className="mt-2 text-xs text-slate-500">{Math.round(Number(project.progressPercent) || 0)} % · {project.supporterCount || 0} soutien(s) · {project.durationMonths} mois</p></div>
        <div className="grid grid-cols-2 gap-2 sm:w-48 sm:shrink-0">
          <button type="button" disabled={Boolean(mutationBusy)} onClick={() => edit(project)} className="col-span-2 rounded-lg bg-slate-950 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50">Modifier le projet</button>
          <button type="button" disabled={Boolean(mutationBusy)} onClick={() => { setManagedProject(project.id); setSearch(''); window.setTimeout(() => document.getElementById('project-contributions')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0) }} className="col-span-2 rounded-lg border border-slate-300 px-3 py-2.5 text-xs font-bold disabled:opacity-50">Gérer les contributions</button>
          <button type="button" disabled={Boolean(mutationBusy)} onClick={() => duplicate(project)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-xs font-bold disabled:opacity-50">Dupliquer</button>
          <button type="button" disabled={Boolean(mutationBusy)} onClick={() => changeStatus(project, project.status === 'Archived' ? 'Draft' : 'Archived')} className="rounded-lg border border-slate-300 px-3 py-2.5 text-xs font-bold disabled:opacity-50">{mutationBusy === project.id ? 'Patientez…' : project.status === 'Archived' ? 'Restaurer en brouillon' : 'Archiver'}</button>
          <button type="button" disabled={Boolean(mutationBusy)} onClick={() => askDelete(project)} className="col-span-2 rounded-lg border border-red-200 px-3 py-2.5 text-xs font-bold text-red-700 disabled:opacity-50">Supprimer le projet</button>
        </div>
      </article>)}</div>
    </section>

    {managedProject && <section id="project-contributions" aria-labelledby="project-contributions-title" className="scroll-mt-20 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5"><div><h3 id="project-contributions-title" className="text-xl font-black">Contributions · {managed?.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">Les contacts restent privés. Confirmez chaque échéance en espèces après réception ; les paiements en ligne sont vérifiés par le prestataire.</p></div><button type="button" onClick={() => setManagedProject(null)} className="rounded-lg bg-slate-100 p-2" aria-label="Fermer les contributions"><X size={18}/></button></div>
      <div className="p-5"><label className="text-sm font-bold">Rechercher un supporter<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nom, téléphone ou email" className={inputClass}/></label></div>
      {commitmentsLoading && <p role="status" className="p-5 text-sm text-slate-500">Chargement des contributions…</p>}
      {commitmentsError && <p role="alert" className="m-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{commitmentsError}</p>}
      {!commitmentsLoading && !commitmentsError && !displayedCommitments.length && <p className="p-5 text-sm text-slate-500">Aucune contribution trouvée.</p>}
      <div className="space-y-3 p-5 pt-0">{displayedCommitments.map(commitment => {
        const installments = commitment.installments || []
        const paidInstallments = installments.filter(installment => installment.paymentStatus === 'Paid')
        const paidCount = paidInstallments.length
        const paidAmount = paidInstallments.reduce((total, installment) => total + Number(installment.amount || 0), 0)
        return <article key={commitment.id} className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex flex-col gap-3 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-black">{commitment.displayName}</h4><span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700">{commitment.paymentMethod === 'Cash' ? 'Espèces' : commitment.paymentMethod}</span></div><p className="mt-1 break-all text-xs text-slate-600">{commitment.phone || 'Téléphone non renseigné'} · {commitment.email || 'Email non renseigné'}</p><p className="mt-2 text-sm font-bold text-blue-950">{money(commitment.monthlyAmountTnd)} / mois × {commitment.months}</p></div>
            <div className="flex flex-wrap gap-2 sm:shrink-0"><button type="button" disabled={Boolean(mutationBusy) || Boolean(confirmingId)} onClick={() => setContactTarget(commitment)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50">Modifier les coordonnées</button><button type="button" disabled={Boolean(mutationBusy) || Boolean(confirmingId) || !managed} onClick={() => askDelete(managed, commitment)} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Supprimer l’inscription</button></div>
          </div>
          <details className="group border-t border-slate-200">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-blue-950 marker:hidden hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">
              <span className="inline-flex items-center gap-2"><ChevronDown size={16} className="transition-transform group-open:rotate-180"/><span>Voir les {installments.length} échéances</span></span><span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500"><span className="text-emerald-700">{paidCount} payée(s)</span><span>Encaissé : {money(paidAmount)}</span></span>
            </summary>
            <div className="overflow-x-auto border-t border-slate-100"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th className="p-3">Échéance</th><th className="p-3">Montant</th><th className="p-3">Statut</th><th className="p-3">Paiement</th><th className="p-3">Action</th></tr></thead><tbody>{(commitment.installments || []).map(installment => <tr key={installment.id} className="border-b border-slate-100 last:border-0"><td className="p-3">Mois {installment.installmentNumber}<span className="mt-1 block text-xs text-slate-500">{date(installment.dueAt)}</span></td><td className="p-3 font-bold">{money(installment.amount)}</td><td className="p-3"><span className={'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ' + (installment.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800')}>{installment.paymentStatus === 'Paid' && <CheckCircle2 size={12}/>}{{ Paid: 'Payé', Pending: 'À payer', Failed: 'Échoué', Cancelled: 'Annulé' }[installment.paymentStatus] || installment.paymentStatus}</span></td><td className="p-3">{date(installment.paidAt)}</td><td className="p-3">{installment.paymentProvider === 'Cash' && installment.paymentStatus === 'Pending' ? <button type="button" disabled={Boolean(confirmingId)} onClick={() => confirmCash(commitment, installment)} className="rounded-lg bg-blue-950 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{confirmingId === installment.id ? 'Confirmation…' : 'Confirmer les espèces reçues'}</button> : '—'}</td></tr>)}</tbody></table></div>
          </details>
        </article>
      })}</div>
    </section>}
    {contactTarget && <ContactDialog commitment={contactTarget} onClose={() => setContactTarget(null)} onSave={saveContact}/>}
    {deleteTarget && <ManagementDialog title={deleteTarget.commitment ? 'Supprimer cette inscription ?' : 'Supprimer ce projet ?'} onClose={() => { setDeleteTarget(null); setMutationError('') }} busy={Boolean(mutationBusy)} footer={<>
      <button type="button" disabled={Boolean(mutationBusy)} onClick={() => { setDeleteTarget(null); setMutationError('') }} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold">Annuler</button>
      <button type="button" disabled={!deleteAcknowledged || Boolean(mutationBusy) || Boolean(confirmingId)} onClick={() => deleteConfirmed(false)} className="rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{mutationBusy ? 'Suppression…' : deleteTarget.commitment ? 'Supprimer définitivement l’inscription' : 'Supprimer définitivement le projet'}</button>
    </>}>
      <p className="text-sm leading-6 text-slate-600">{deleteTarget.commitment ? <>L’inscription de <strong>{deleteTarget.commitment.displayName}</strong> au projet <strong>{deleteTarget.project.title}</strong> et ses échéances non réglées seront supprimées.</> : <>Le projet <strong>{deleteTarget.project.title}</strong>, ses inscriptions et ses échéances non réglées seront supprimés.</>} Cette opération est définitive et sera refusée si un paiement ou une tentative de paiement existe{!deleteTarget.commitment && isSuperAdmin ? ', sauf suppression forcée par un SuperAdmin' : ''}.</p>
      <label className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900"><input type="checkbox" checked={deleteAcknowledged} onChange={event => setDeleteAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 shrink-0"/><span>Je confirme vouloir supprimer définitivement {deleteTarget.commitment ? 'cette inscription de test' : 'ce projet de test'} sans effacer de trace de paiement.</span></label>
      {mutationError && <div role="alert" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950"><p>{mutationError}</p><div className="mt-3 flex flex-wrap gap-2">{deleteTarget.project.status !== 'Archived' && <button type="button" disabled={Boolean(mutationBusy)} onClick={() => changeStatus(deleteTarget.project, 'Archived')} className="rounded-lg bg-blue-950 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Archiver le projet</button>}<button type="button" disabled={Boolean(mutationBusy)} onClick={() => duplicate(deleteTarget.project)} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50">Préparer une copie en brouillon</button></div></div>}
      {canForceDelete && isSuperAdmin && <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4"><p className="text-sm font-bold text-red-900">Suppression définitive (SuperAdmin)</p><p className="mt-1 text-sm leading-6 text-red-800">Ce projet a un historique de paiement. En tant que SuperAdmin, vous pouvez le supprimer définitivement avec toutes ses inscriptions et échéances. Cette action est irréversible et effacera aussi ces traces financières.</p><button type="button" disabled={!deleteAcknowledged || Boolean(mutationBusy)} onClick={() => deleteConfirmed(true)} className="mt-3 rounded-lg bg-red-800 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{mutationBusy ? 'Suppression…' : 'Forcer la suppression définitive'}</button></div>}
    </ManagementDialog>}
    {preview && previewProject && <PreviewDialog project={previewProject} onClose={() => setPreview(false)}/>}
  </div>
}
