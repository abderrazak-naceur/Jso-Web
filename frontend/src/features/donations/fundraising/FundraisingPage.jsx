import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, Menu, Search, Share2, X } from 'lucide-react'
import { fundraisingApi, donationsApi } from '../../../lib/api'
import { useFanSession } from '../../account/useFanSession'
import { useDocumentTitle } from '../../../lib/useDocumentTitle'
import { CREST_SRC, CLUB_FULL_NAME } from '../../site/brand'
import FundraisingProjectView from './FundraisingProjectView'
import FundraisingRegistration, { ONLINE_PROVIDERS } from './FundraisingRegistration'
import FundraisingDashboard from './FundraisingDashboard'
import FundraisingEmptyState from './FundraisingEmptyState'
import AuthModal from '../../account/AuthModal'
import { readFundraisingAccess as readAccess, forgetFundraisingAccess, createFundraisingAccess as createAccess } from './fundraisingAccess'
import { MONTHLY_AMOUNTS, PLAN_MONTHS, planTotal, projectImage, fundraisingDate, fundraisingMoney, fundraisingSupporterLabel } from './fundraisingTemplates'
import { useI18n } from '../../../i18n/index.jsx'
import './fundraising.css'

const selectedFromUrl = () => new URLSearchParams(window.location.search).get('projet') || ''

export default function FundraisingPage() {
  const { language, setLanguage, languages, t } = useI18n()
  const money = value => fundraisingMoney(value, language)
  const date = value => fundraisingDate(value, language)
  const fan = useFanSession()
  useDocumentTitle('Nos projets · Ensemble pour la JSO')
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedId, setSelectedId] = useState(selectedFromUrl)
  const [amount, setAmount] = useState(5)
  const [methods, setMethods] = useState({})
  const [registration, setRegistration] = useState(false)
  const [auth, setAuth] = useState(null)
  const [continueSupport, setContinueSupport] = useState(false)
  const [menu, setMenu] = useState(false)
  const [supporters, setSupporters] = useState({ items: [], totalCount: 0, totalPages: 0 })
  const [supportersLoading, setSupportersLoading] = useState(false)
  const [supportersError, setSupportersError] = useState('')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [entries, setEntries] = useState([])
  const [activeCommitmentId, setActiveCommitmentId] = useState('')
  const [privateError, setPrivateError] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [providerId, setProviderId] = useState('')
  const [payingId, setPayingId] = useState('')
  const [copied, setCopied] = useState(false)
  const submission = useRef(null)
  const project = selectedId ? projects.find(item => item.id === selectedId) : projects[0]
  const projectId = project?.id
  const providers = ONLINE_PROVIDERS.filter(provider => methods[provider.key])
  const entry = entries.find(item => item.data.id === activeCommitmentId) || entries[0]

  useEffect(() => {
    const controller = new AbortController()
    fundraisingApi.projects(controller.signal).then(setProjects).catch(e => { if (!controller.signal.aborted) setLoadError(e.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    donationsApi.paymentMethods(controller.signal).then(setMethods).catch(() => {})
    const pop = () => { setSelectedId(selectedFromUrl()); setPage(1) }
    window.addEventListener('popstate', pop)
    return () => { controller.abort(); window.removeEventListener('popstate', pop) }
  }, [])
  useEffect(() => {
    if (providers.length && !providers.some(item => item.id === providerId)) setProviderId(providers[0].id)
  }, [methods, providerId])
  useEffect(() => {
    if (!projectId) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setSupportersLoading(true)
      fundraisingApi.supporters(projectId, page, search, controller.signal).then(data => { if (!controller.signal.aborted) { setSupporters(data); setSupportersError('') } }).catch(e => { if (!controller.signal.aborted) setSupportersError(e.message) }).finally(() => { if (!controller.signal.aborted) setSupportersLoading(false) })
    }, search ? 250 : 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [projectId, page, search, refreshKey])
  useEffect(() => {
    if (!projectId) return
    let active = true
    setEntries([])
    async function load() {
      const access = readAccess().filter(item => item.projectId === projectId)
      const responses = await Promise.allSettled(access.map(async record => ({ data: await fundraisingApi.commitment(record.id, record.token, fan.token), access: record.token })))
      const found = responses.filter(result => result.status === 'fulfilled').map(result => result.value)
      if (fan.token) {
        try {
          for (const data of await fundraisingApi.mine(fan.token)) {
            try { forgetFundraisingAccess(data.id) } catch { /* Account ownership is stored on the server. */ }
            const index = found.findIndex(item => item.data.id === data.id)
            if (index >= 0) found[index] = { data, access: '' }
            else if (data.projectId === projectId) found.push({ data, access: '' })
          }
        }
        catch (e) { if (active) setPrivateError(e.message) }
      }
      if (active) setEntries(found)
    }
    load().catch(e => { if (active) setPrivateError(e.message) })
    return () => { active = false }
  }, [projectId, fan.token, refreshKey])
  useEffect(() => {
    if (projectId && window.location.hash === '#faire-un-don') document.getElementById('faire-un-don')?.scrollIntoView()
    if (entry && window.location.hash === '#mon-engagement') document.getElementById('mon-engagement')?.scrollIntoView()
  }, [projectId, entry?.data.id])

  function selectProject(item) {
    const url = new URL(window.location.href)
    url.searchParams.set('projet', item.id); url.hash = 'le-projet'
    window.history.pushState({}, '', url.pathname + url.search + url.hash)
    setSelectedId(item.id); setPage(1); setSearch(''); setPaymentError(''); submission.current = null
    document.getElementById('le-projet')?.scrollIntoView()
  }
  async function refresh() {
    try { setProjects(await fundraisingApi.projects()); setLoadError(''); setRefreshKey(key => key + 1) }
    catch (e) { setLoadError(e.message) }
  }
  async function share() {
    const url = `${window.location.origin}/nos-projets?projet=${encodeURIComponent(project.id)}`
    try { if (navigator.share) await navigator.share({ title: project.title, url }); else await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { /* Sharing can be dismissed. */ }
  }
  async function payInstallment(installment, provider = providers.find(item => item.id === providerId), email, access = entry?.access) {
    if (!provider || payingId) return
    const payerEmail = email || entry?.data.email
    if (provider.id === 'PAYMEE' && !payerEmail) { setPaymentError('Pour Paymee, utilisez les coordonnées saisies à l’inscription ou choisissez un autre prestataire.'); return }
    setPayingId(installment.id); setPaymentError('')
    try {
      const result = await fundraisingApi.pay(installment.id, provider.country, provider.id, payerEmail || null, access, fan.token)
      if (!result.redirectUrl) throw new Error('Le prestataire n’a pas retourné de page de paiement. Aucun versement n’a été confirmé.')
      window.location.assign(result.redirectUrl)
    } catch (e) { setPaymentError(e.message) }
    finally { setPayingId('') }
  }
  async function join(data, provider) {
    if (fan.status !== 'authenticated' || !fan.token) throw new Error('Connectez-vous à votre compte avant de confirmer votre soutien.')
    if (!submission.current || submission.current.projectId !== projectId) submission.current = createAccess(projectId)
    const access = submission.current
    const result = await fundraisingApi.join(projectId, { ...data, clientRequestId: access.id, accessToken: access.token }, fan.token)
    setEntries(current => [{ data: result, access: '' }, ...current.filter(item => item.data.id !== result.id)])
    setActiveCommitmentId(result.id); setRegistration(false); submission.current = null
    setRefreshKey(key => key + 1)
    setProjects(current => current.map(item => item.id === projectId && data.paymentMethod === 'Cash' ? { ...item, supporterCount: item.supporterCount + 1 } : item))
    window.history.replaceState({}, '', `${window.location.pathname}?projet=${encodeURIComponent(projectId)}#mon-engagement`)
    if (data.paymentMethod === 'Online') await payInstallment(result.installments[0], provider, data.email, access.token)
  }
  function support() {
    if (!project || fan.status === 'unknown') return
    setMenu(false)
    if (fan.status !== 'authenticated') { setContinueSupport(true); setAuth('register') }
    else setRegistration(true)
  }
  function authenticated(result) {
    fan.signIn(result); setAuth(null)
    if (continueSupport) { setContinueSupport(false); setRegistration(true) }
  }

  return <div className="jso-fundraising">
    <a href="#le-projet" className="jso-skip-link">Aller au projet</a>
    <header className="fr-header"><div className="fr-container fr-header-inner">
      <a href="/" className="fr-brand"><img src={CREST_SRC} alt="JSO"/><span>JEUNESSE SPORTIVE<br/>DE OUDHREF</span></a>
      <nav id="fr-navigation" className={menu ? 'is-open' : ''} aria-label={t('common.mainNavigation', 'Navigation de la collecte')}><a href="/">Accueil</a><a href="/actualites">Actualités</a><a href="#tous-les-projets" onClick={() => setMenu(false)}>Nos projets</a><a href="#soutiens" onClick={() => setMenu(false)}>Nos soutiens</a>{entry && fan.status === 'authenticated' && <a href="#mon-engagement" onClick={() => setMenu(false)}>Mon suivi</a>}<label className="fr-language-control"><span className="sr-only">{t('common.language', 'Langue')}</span><select aria-label={t('common.language', 'Langue')} value={language} onChange={event => setLanguage(event.target.value)}>{languages.map(item => <option key={item.code} value={item.code}>{item.flag} {item.label}</option>)}</select></label></nav>
      <div className="fr-header-actions"><button type="button" className="fr-button fr-button-gold" onClick={support} disabled={!project || fan.status === 'unknown'}>Devenir soutien</button>{fan.status === 'authenticated' ? <a className="fr-login" href="/account#mes-soutiens">Mon dashboard</a> : <><button type="button" className="fr-login" onClick={() => { setContinueSupport(false); setAuth('login') }}>Se connecter</button><button type="button" className="fr-login fr-auth-register" onClick={() => { setContinueSupport(false); setAuth('register') }}>Créer un compte</button></>}<button type="button" className="fr-mobile-toggle" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-controls="fr-navigation" aria-label="Menu de la collecte">{menu ? <X size={18}/> : <Menu size={18}/>}</button></div>
    </div></header>
    <main id="le-projet">
      {loading ? <div className="fr-empty" role="status">Chargement des projets du club…</div> : loadError && !projects.length ? <div className="fr-empty"><h1>Les projets sont momentanément indisponibles</h1><p role="alert">{loadError}</p><button type="button" className="fr-button fr-button-blue" onClick={refresh}>Réessayer</button></div> : !project ? <FundraisingEmptyState unavailableProject={Boolean(selectedId)}/> : <>
        <FundraisingProjectView project={project} onSupport={support}/>
        <section className="fr-projects" id="tous-les-projets"><div className="fr-container"><div className="fr-section-heading"><div><p className="fr-eyebrow">Les objectifs du club</p><h2 className="fr-section-title">Nos projets, votre impact.</h2><p>Choisissez le projet auquel vous souhaitez contribuer.</p></div><button className="fr-button fr-button-outline" type="button" onClick={share}><Share2 size={15}/>{copied ? 'Lien partagé' : 'Partager le projet'}</button></div><div className="fr-project-grid">{projects.map(item => <button type="button" key={item.id} className={`fr-project-card ${item.id === projectId ? 'is-active' : ''}`} onClick={() => selectProject(item)}><img src={projectImage(item)} alt="" loading="lazy"/><div className="fr-project-card-body"><h3>{item.title}</h3><p>{fundraisingSupporterLabel(item.supporterCount, language)} · {item.durationMonths} {language === 'en' ? 'months' : language === 'it' ? 'mesi' : language === 'ar' ? 'أشهر' : 'mois'}</p><div className="fr-mini-progress"><span style={{ width: `${item.progressPercent}%` }}/></div><div className="fr-card-bottom"><span>{money(item.totalPaidTnd)} {language === 'en' ? 'collected' : language === 'it' ? 'raccolti' : language === 'ar' ? 'تم جمعها' : 'collectés'}</span><span>{money(item.budgetTnd)}</span></div></div></button>)}</div></div></section>
        <section className="fr-plan" id="faire-un-don"><div className="fr-container fr-plan-layout"><div><p className="fr-eyebrow">Devenez un soutien du projet</p><h2>Dix mois pour faire<br/>la différence.</h2><p>5, 10, 20, 30 ou 50 TND par mois. Choisissez un engagement à votre mesure et suivez chaque versement dans votre espace de soutien.</p><p className="fr-plan-note">En espèces : l’adhésion est visible dès l’inscription, puis chaque versement est confirmé par le club. En ligne : le versement est confirmé par le prestataire.</p></div><div className="fr-plan-card"><p className="fr-eyebrow">Votre contribution mensuelle</p><div className="fr-plan-options">{MONTHLY_AMOUNTS.map(value => <button type="button" key={value} aria-pressed={value === amount} className={`fr-amount ${value === amount ? 'is-selected' : ''}`} onClick={() => setAmount(value)}><strong>{value}</strong><span>TND / mois</span></button>)}</div><div className="fr-plan-total"><span>{PLAN_MONTHS} mensualités de {money(amount)}</span><strong>{money(planTotal(amount))}</strong></div><button type="button" className="fr-button fr-button-gold" onClick={support}>Je soutiens ce projet <ArrowRight size={17}/></button><p className="fr-plan-note">Sans prélèvement automatique. Chaque mensualité est réglée séparément.</p></div></div></section>
        {(paymentError || privateError) && <div className="fr-container"><p role="alert" className="fr-alert fr-error">{paymentError || privateError}</p></div>}
        {entry && fan.status !== 'authenticated' && <div className="fr-container"><div className="fr-alert"><p>Votre suivi et le détail de vos mensualités sont privés. Connectez-vous au compte utilisé pour votre inscription pour les consulter.</p><button type="button" className="fr-button fr-button-blue" onClick={() => { setContinueSupport(false); setAuth('login') }}>Se connecter</button></div></div>}
        {entries.length > 1 && fan.status === 'authenticated' && <div className="fr-container"><label className="fr-field">Mes engagements sur ce projet<select value={entry.data.id} onChange={e => setActiveCommitmentId(e.target.value)}>{entries.map(item => <option key={item.data.id} value={item.data.id}>{money(item.data.monthlyAmountTnd)} / mois · {date(item.data.createdAt)}</option>)}</select></label></div>}
        {entry && fan.status === 'authenticated' && <FundraisingDashboard commitment={entry.data} providers={providers} providerId={providerId} setProviderId={setProviderId} onPay={installment => payInstallment(installment)} payingId={payingId} onRefresh={refresh}/>}
        <section className="fr-supporters" id="soutiens"><div className="fr-container"><div className="fr-section-heading"><div><p className="fr-eyebrow">Ils font avancer le projet</p><h2 className="fr-section-title">Nos soutiens</h2><p>Merci à celles et ceux qui croient en la JSO. Seul le nom public et le suivi des contributions sont affichés.</p></div><span className="fr-badge fr-badge-paid"><CheckCircle2 size={13}/>Des versements vérifiés</span></div><label className="fr-search"><Search size={17}/><input aria-label="Rechercher un soutien" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Rechercher un nom…"/></label>{supportersError && <p className="fr-alert fr-error" role="alert">{supportersError}</p>}<div className="fr-table-scroll"><table className="fr-table"><thead><tr><th>#</th><th>Nom public</th><th>Contribution</th><th>Versements confirmés</th><th>Statut</th></tr></thead><tbody>{supporters.items.map((item, index) => <tr key={item.id}><td>{(page - 1) * 10 + index + 1}</td><td><span className="fr-person"><span className="fr-avatar">{item.displayName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span>{item.displayName}</span></td><td>{money(item.monthlyAmountTnd)} / mois</td><td><strong>{money(item.totalPaidTnd)}</strong> · {item.paidInstallments}/{item.months}</td><td><span className={`fr-badge ${item.paidInstallments > 0 ? 'fr-badge-paid' : 'fr-badge-pending'}`}>{item.paidInstallments > 0 ? 'Versement confirmé' : 'Espèces à confirmer'}</span></td></tr>)}{!supporters.items.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 35 }}>{supportersLoading ? 'Chargement des soutiens…' : search ? 'Aucun nom ne correspond à votre recherche.' : 'Le projet attend ses premiers soutiens. Rejoignez-le !'}</td></tr>}</tbody></table></div><div className="fr-pagination"><p>{fundraisingSupporterLabel(supporters.totalCount, language)}</p><div><button type="button" disabled={page <= 1 || supportersLoading} onClick={() => setPage(page - 1)}>Précédent</button><span>{page} / {Math.max(1, supporters.totalPages)}</span><button type="button" disabled={page >= supporters.totalPages || supportersLoading} onClick={() => setPage(page + 1)}>Suivant</button></div></div></div></section>
      </>}
    </main>
    <footer className="fr-footer"><div className="fr-container fr-footer-inner"><a href="/" className="fr-brand"><img src={CREST_SRC} alt="JSO"/><span>{CLUB_FULL_NAME}<br/>Ensemble depuis 1973</span></a><nav><a href="/">Site du club</a><a href="/account">Mon espace</a><a href="/admin/fundraising-projects">Espace club</a></nav><span>© {new Date().getFullYear()} JSO Oudhref</span></div></footer>
    {registration && project && <FundraisingRegistration project={project} initialAmount={amount} methods={methods} user={fan.user} onClose={() => setRegistration(false)} onJoin={join}/>}
    <AuthModal open={Boolean(auth)} initialMode={auth || 'login'} onClose={() => { setAuth(null); setContinueSupport(false) }} onAuthenticated={authenticated}/>
  </div>
}
