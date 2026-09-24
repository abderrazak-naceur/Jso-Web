import { useEffect, useState } from 'react'
import { LayoutDashboard, LogOut, Menu, ShieldCheck, Trophy, Users, Newspaper, X } from 'lucide-react'

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5080/api').replace(/\/$/, '')

async function api(path, options = {}) {
  const response = await fetch(API_BASE_URL + path, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!response.ok) throw new Error('Request failed: ' + response.status)
  return response.json()
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@jso.tn')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      const result = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem('jso_admin_token', result.accessToken)
      localStorage.setItem('jso_admin_user', JSON.stringify(result.user))
      onLogin(result.user)
    } catch {
      setError('Identifiants invalides ou API indisponible.')
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-jso-navy px-5 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-jso-navy text-xl font-black text-jso-gold">JSO</div>
        <p className="mt-8 text-xs font-extrabold tracking-[0.2em] text-jso-blue">ADMINISTRATION</p>
        <h1 className="mt-2 text-4xl font-black text-jso-ink">Connexion</h1>
        <p className="mt-2 text-sm text-slate-500">Accès sécurisé au back office JSO.</p>
        <label className="mt-7 block text-sm font-bold">Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" /></label>
        <label className="mt-4 block text-sm font-bold">Mot de passe<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jso-blue" /></label>
        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        <button className="mt-6 w-full rounded-xl bg-jso-navy px-4 py-3 font-extrabold text-white hover:bg-jso-blue">Se connecter</button>
      </form>
    </main>
  )
}

function AdminDashboard({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('jso_admin_token')
    api('/admin/dashboard', { headers: { Authorization: 'Bearer ' + token } })
      .then(setStats)
      .catch(() => setError('Session expirée ou API indisponible.'))
  }, [])

  const cards = stats ? [
    ['Parties à venir', stats.matches.upcoming, Trophy],
    ['Résultats', stats.matches.finished, Trophy],
    ['News publiées', stats.news.published, Newspaper],
    ['Brouillons', stats.news.drafts, Newspaper],
    ['Équipes', stats.teams, Users],
    ['Joueurs actifs', stats.players, Users],
  ] : []

  return (
    <main className="min-h-screen bg-jso-paper text-jso-ink">
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white p-6 transition-transform ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-jso-navy font-black text-jso-gold">JSO</span><div><p className="font-black">JSO Admin</p><p className="text-xs text-slate-400">{user.Role}</p></div></div><button className="lg:hidden" onClick={() => setOpen(false)}><X /></button></div>
        <nav className="mt-10 space-y-2">
          {[
            ['Dashboard', LayoutDashboard],
            ['Match Center', Trophy],
            ['Équipes & joueurs', Users],
            ['News CMS', Newspaper],
            ['Sécurité', ShieldCheck],
          ].map(([label, Icon]) => <button key={label} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-jso-navy"><Icon size={18} />{label}</button>)}
        </nav>
        <button onClick={onLogout} className="mt-auto flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 hover:bg-red-50 hover:text-red-700"><LogOut size={18} />Déconnexion</button>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/85 px-5 py-4 backdrop-blur-xl lg:px-8">
          <button className="lg:hidden" onClick={() => setOpen(true)}><Menu /></button>
          <div><p className="text-xs font-extrabold tracking-[0.2em] text-jso-blue">COMMAND CENTER</p><h1 className="text-2xl font-black">Bonjour, {user.DisplayName}</h1></div>
          <span className="hidden rounded-full bg-jso-gold/20 px-3 py-2 text-xs font-extrabold text-jso-navy sm:block">{user.Role}</span>
        </header>

        <section className="mx-auto max-w-7xl p-5 lg:p-8">
          {error && <div className="mb-6 rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.length ? cards.map(([label, value, Icon]) => <div key={label} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"><Icon className="text-jso-blue" size={22} /><p className="mt-7 text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 text-4xl font-black">{value}</p></div>) : <div className="rounded-[1.5rem] bg-white p-8 text-slate-500">Chargement du dashboard…</div>}
          </div>
          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">État du back office</h2><p className="mt-2 text-sm text-slate-500">Les modules de gestion seront branchés progressivement sur les API protégées.</p></div>
        </section>
      </div>
    </main>
  )
}

export default function AdminApp() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jso_admin_user') || 'null') } catch { return null }
  })

  function logout() {
    localStorage.removeItem('jso_admin_token')
    localStorage.removeItem('jso_admin_user')
    setUser(null)
  }

  return user ? <AdminDashboard user={user} onLogout={logout} /> : <Login onLogin={setUser} />
}
