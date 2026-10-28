import { Component, Suspense, useEffect, useState } from 'react'
import { Copy, ExternalLink, LayoutDashboard, Menu, Search } from 'lucide-react'
import { adminApi } from './api'
import {
  ADMIN_PUBLIC_PATHS,
  adminItemById,
  adminLandingSection,
  adminWorkspaceForSection,
  visibleAdminItems,
  visibleAdminWorkspaces,
} from './navigation'
import { adminSectionFromPath, adminSectionUrl } from './adminRoutes'
import { ADMIN_MODULES } from './moduleRegistry'
import { ToastProvider } from './components/ui/Toast'
import { ConfirmProvider } from './components/ui/ConfirmDialog'
import CommandPalette from './components/ui/CommandPalette'
import AdminSidebar from './components/navigation/AdminSidebar'
import AdminWorkspaceTabs from './components/navigation/AdminWorkspaceTabs'
import AdminDashboardHome from './components/dashboard/AdminDashboardHome'
import './admin-responsive.css'
import './admin-dark.css'

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@jso.tn')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      const result = await adminApi('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      localStorage.setItem('jso_admin_token', result.accessToken)
      localStorage.setItem('jso_admin_user', JSON.stringify(result.user))
      onLogin(result.user)
    } catch (failure) {
      setError(failure.message || 'Identifiants invalides ou API indisponible.')
    }
  }

  return (
    <main className="jso-admin-login grid min-h-screen place-items-center bg-jso-navy px-5 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-jso-navy text-xl font-black text-jso-gold">JSO</div>
        <p className="mt-8 text-xs font-extrabold tracking-[0.2em] text-jso-blue">ADMINISTRATION</p>
        <h1 className="mt-2 text-4xl font-black text-jso-ink">Connexion</h1>
        <p className="mt-2 text-sm text-slate-500">Accès sécurisé au back office JSO.</p>
        <label className="mt-7 block text-sm font-bold">Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" />
        </label>
        <label className="mt-4 block text-sm font-bold">Mot de passe
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" />
        </label>
        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        <button className="mt-6 w-full rounded-xl bg-jso-navy px-4 py-3 font-extrabold text-white hover:bg-jso-blue">Se connecter</button>
        <a href="/password-reset?type=admin" className="mt-4 block text-center text-sm font-bold text-jso-blue hover:underline">Mot de passe oublié ?</a>
        <a href="/" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-jso-blue hover:underline">Retour au site <ExternalLink size={15} aria-hidden="true" /></a>
      </form>
    </main>
  )
}

class AdminModuleBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-900">
        <p className="font-bold">Cette rubrique n’a pas pu s’ouvrir.</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-3 text-sm font-bold underline">Actualiser la page</button>
      </div>
    )
  }
}

function AdminShell({ user, dark, onToggleTheme, onLogout }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('jso_admin_sidebar_collapsed') === '1' } catch { return false }
  })
  const [section, setSection] = useState(() => adminSectionFromPath())
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [stats, setStats] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const role = user.role ?? user.Role
  const displayName = user.displayName ?? user.DisplayName ?? 'Administrateur'
  const visibleItems = visibleAdminItems(role)
  const workspaces = visibleAdminWorkspaces(role)
  const visibleSectionIds = new Set(visibleItems.map(([id]) => id))
  const currentItem = visibleItems.find(([id]) => id === section)
  const registeredItem = adminItemById(section)
  const registeredWorkspace = adminWorkspaceForSection(section)
  const activeWorkspace = workspaces.find((workspace) => workspace.id === registeredWorkspace?.id) || null
  const landingSection = adminLandingSection(role)
  const canViewDashboard = visibleSectionIds.has('dashboard')
  const homeSection = canViewDashboard ? 'dashboard' : landingSection
  const publicPath = ADMIN_PUBLIC_PATHS[section] || '/'
  const ActiveModule = currentItem ? ADMIN_MODULES[section] : null

  const pendingBySection = {
    tickets: stats?.tickets?.pending ?? 0,
    orders: stats?.sales?.pending ?? 0,
    'community-moderation': (stats?.moderation?.comments ?? 0) + (stats?.moderation?.reports ?? 0),
    'fan-photos': stats?.moderation?.fanPhotos ?? 0,
    classifieds: stats?.moderation?.classifieds ?? 0,
    supporters: stats?.moderation?.supporters ?? 0,
  }

  async function loadDashboard(signal) {
    if (!canViewDashboard) return
    setDashboardLoading(true)
    try {
      const result = await adminApi('/admin/dashboard', signal ? { signal } : {})
      if (!signal?.aborted) {
        setStats(result)
        setError('')
      }
    } catch (failure) {
      if (!signal?.aborted) {
        setStats(null)
        setError(failure.message)
      }
    } finally {
      if (!signal?.aborted) setDashboardLoading(false)
    }
  }

  // One request per authenticated shell mount. The previous shell requested the
  // dashboard twice when /admin was the initial route.
  useEffect(() => {
    if (!canViewDashboard) {
      setDashboardLoading(false)
      return undefined
    }
    const controller = new AbortController()
    loadDashboard(controller.signal)
    return () => controller.abort()
    // role/capability changes require a new authenticated shell, so this is
    // intentionally keyed only to dashboard visibility.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewDashboard])

  // Roles without Dashboard land on their first visible section. A forbidden
  // direct deep link to any other section remains visible as Access denied.
  useEffect(() => {
    if (section !== 'dashboard' || canViewDashboard || !landingSection) return
    const url = adminSectionUrl(landingSection)
    window.history.replaceState({}, '', url)
    setSection(landingSection)
  }, [section, canViewDashboard, landingSection])

  useEffect(() => {
    const onPopState = () => {
      setSection(adminSectionFromPath())
      setError('')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen(true)
      }
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function navigate(event, next) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    const url = adminSectionUrl(next)
    if (window.location.pathname !== url || window.location.search) window.history.pushState({}, '', url)
    window.dispatchEvent(new PopStateEvent('popstate'))
    setSection(next)
    setDrawerOpen(false)
    setError('')
  }

  function paletteNavigate(next) {
    setSection(next)
    setDrawerOpen(false)
    setError('')
  }

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current
      try { localStorage.setItem('jso_admin_sidebar_collapsed', next ? '1' : '0') } catch { /* private mode */ }
      return next
    })
  }

  async function copyCurrentLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Impossible de copier le lien depuis ce navigateur.')
    }
  }

  function logout() {
    localStorage.removeItem('jso_admin_token')
    localStorage.removeItem('jso_admin_user')
    window.JsoAdminBridge?.postMessage('logout')
    onLogout()
  }

  const breadcrumbWorkspace = registeredWorkspace?.label
  const workspaceHomeSection = activeWorkspace?.items[0]?.[0] || null
  const pageTitle = section === 'dashboard'
    ? `Bonjour, ${displayName}`
    : currentItem?.[1] || registeredItem?.[1] || 'Rubrique introuvable'
  const pageSubtitle = section === 'dashboard'
    ? 'Voici les priorités et les performances du club aujourd’hui.'
    : breadcrumbWorkspace || 'Administration JSO'

  return (
    <main className="jso-admin-shell min-h-screen bg-jso-paper text-jso-ink">
      {drawerOpen && <button type="button" aria-label="Fermer la navigation" onClick={() => setDrawerOpen(false)} className="fixed inset-0 z-30 bg-jso-navy/60 lg:hidden" />}

      <AdminSidebar
        open={drawerOpen}
        collapsed={collapsed}
        dark={dark}
        role={role}
        displayName={displayName}
        currentSection={section}
        activeWorkspaceId={registeredWorkspace?.id}
        workspaces={workspaces}
        pendingBySection={pendingBySection}
        copied={copied}
        publicPath={publicPath}
        onClose={() => setDrawerOpen(false)}
        onNavigate={navigate}
        onOpenPalette={() => setPaletteOpen(true)}
        onToggleCollapsed={toggleCollapsed}
        onToggleTheme={onToggleTheme}
        onCopyCurrentLink={copyCurrentLink}
        onLogout={logout}
      />

      <div className={'transition-[padding] duration-200 ' + (collapsed ? 'lg:pl-20' : 'lg:pl-64')}>
        <header className="sticky top-0 z-30 flex min-h-[76px] items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl sm:px-5 lg:px-8">
          <button type="button" aria-label="Ouvrir le menu" aria-controls="admin-sidebar" aria-expanded={drawerOpen} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 lg:hidden" onClick={() => setDrawerOpen(true)}>
            <Menu size={21} aria-hidden="true" />
          </button>

          <div className="min-w-0 flex-1 py-2">
            <nav aria-label="Fil d’Ariane" className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
              {homeSection && <a href={adminSectionUrl(homeSection)} onClick={(event) => navigate(event, homeSection)} className="shrink-0 transition hover:text-jso-blue">Administration</a>}
              {breadcrumbWorkspace && <><span aria-hidden="true">/</span>{workspaceHomeSection ? <a href={adminSectionUrl(workspaceHomeSection)} onClick={(event) => navigate(event, workspaceHomeSection)} className="truncate transition hover:text-jso-blue">{breadcrumbWorkspace}</a> : <span className="truncate">{breadcrumbWorkspace}</span>}</>}
              {section !== 'dashboard' && registeredItem && <><span aria-hidden="true">/</span><span className="truncate text-jso-blue">{registeredItem[1]}</span></>}
            </nav>
            <h1 className="mt-1 truncate text-xl font-black text-slate-900 sm:text-2xl">{pageTitle}</h1>
            <p className="hidden truncate text-xs font-semibold text-slate-500 sm:block">{pageSubtitle}</p>
          </div>

          <button type="button" onClick={() => setPaletteOpen(true)} className="hidden min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600 transition hover:border-jso-blue md:flex">
            <Search size={15} aria-hidden="true" /> Rechercher <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] text-slate-400">Ctrl K</kbd>
          </button>
          <button type="button" onClick={copyCurrentLink} className="hidden min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-jso-navy hover:border-jso-blue sm:flex">
            <Copy size={15} aria-hidden="true" />{copied ? 'Copié' : 'Copier'}
          </button>
          <a href={publicPath} className="hidden min-h-10 items-center gap-2 rounded-xl bg-jso-navy px-3 text-xs font-bold text-white hover:bg-jso-blue xl:flex">
            <ExternalLink size={15} aria-hidden="true" />Voir le site
          </a>
        </header>

        <AdminWorkspaceTabs workspace={activeWorkspace} currentSection={section} pendingBySection={pendingBySection} onNavigate={navigate} />

        <section className="mx-auto max-w-[96rem] p-4 sm:p-5 lg:p-8">
          {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">{error}</div>}
          {!section && <div role="alert" className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600">Page admin introuvable. {homeSection && <a href={adminSectionUrl(homeSection)} className="font-bold text-jso-blue underline">Ouvrir l’administration</a>}</div>}
          {section && !currentItem && registeredItem && <div role="alert" className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-900"><p className="font-black">Accès refusé à cette rubrique.</p><p className="mt-2 text-sm">Votre rôle {role} ne dispose pas de cet accès.</p></div>}
          {section && !registeredItem && <div role="alert" className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600">Rubrique inconnue.</div>}

          {currentItem && section === 'dashboard' && (
            <AdminDashboardHome
              stats={stats}
              loading={dashboardLoading}
              visibleItems={visibleItems}
              onRetry={() => loadDashboard()}
              onNavigate={navigate}
            />
          )}

          {currentItem && ActiveModule && (
            <AdminModuleBoundary key={section}>
              <Suspense fallback={<div role="status" className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500">Chargement de la rubrique…</div>}>
                <ActiveModule onError={setError} />
              </Suspense>
            </AdminModuleBoundary>
          )}
        </section>
      </div>

      <nav aria-label="Navigation admin mobile" className="jso-admin-mobile-nav lg:hidden">
        {homeSection && <a href={adminSectionUrl(homeSection)} onClick={(event) => navigate(event, homeSection)} aria-current={section === homeSection ? 'page' : undefined}><LayoutDashboard size={20} aria-hidden="true" /><span>Accueil</span></a>}
        <button type="button" onClick={() => setDrawerOpen(true)} aria-expanded={drawerOpen} aria-controls="admin-sidebar"><Menu size={20} aria-hidden="true" /><span>Espaces</span></button>
        <button type="button" onClick={() => setPaletteOpen(true)}><Search size={20} aria-hidden="true" /><span>Chercher</span></button>
        <a href={publicPath}><ExternalLink size={20} aria-hidden="true" /><span>Voir le site</span></a>
      </nav>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={visibleItems} onNavigate={paletteNavigate} />
    </main>
  )
}

export default function AdminApp() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jso_admin_user') || 'null') } catch { return null }
  })
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('jso_admin_theme') === 'dark' } catch { return false }
  })

  function toggleTheme() {
    setDark((current) => {
      const next = !current
      try { localStorage.setItem('jso_admin_theme', next ? 'dark' : 'light') } catch { /* private mode */ }
      return next
    })
  }

  useEffect(() => {
    const onSessionExpired = () => {
      setUser(null)
      window.JsoAdminBridge?.postMessage('logout')
    }
    window.addEventListener('jso:admin-session-expired', onSessionExpired)
    return () => window.removeEventListener('jso:admin-session-expired', onSessionExpired)
  }, [])

  return user
    ? <div className={dark ? 'admin-dark' : ''}><ToastProvider><ConfirmProvider><AdminShell user={user} dark={dark} onToggleTheme={toggleTheme} onLogout={() => setUser(null)} /></ConfirmProvider></ToastProvider></div>
    : <Login onLogin={setUser} />
}
