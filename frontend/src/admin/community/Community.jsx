import { useEffect, useState } from 'react'
import { MessageSquare, Check, Ban, X, Flag } from 'lucide-react'
import { API_BASE_URL } from '../../lib/apiConfig'

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

const STATUS_LABELS = { Pending: 'En attente', Approved: 'Approuvé', Rejected: 'Refusé' }
const STATUS_STYLES = {
  Pending: 'bg-amber-100 text-amber-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
}
const COMMENT_FILTERS = ['Pending', 'Approved', 'Rejected', '']
const REPORT_FILTERS = ['Open', 'Resolved', 'Dismissed']
const REPORT_LABELS = { Open: 'Ouvert', Resolved: 'Résolu', Dismissed: 'Ignoré' }
const TARGET_LABELS = { News: 'Actualité', Match: 'Match', Comment: 'Commentaire' }

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—' }

// Communauté & modération (idée 4.3 / BE-009) : files de modération des
// commentaires et des signalements envoyés par les tifosi.
// La modération est OBLIGATOIRE avant publication : un commentaire reste
// « En attente » jusqu'à ce qu'un CommunityManager l'approuve, et seuls les
// commentaires approuvés apparaissent publiquement.
// Vie privée : aucune donnée personnelle n'est exposée publiquement (jamais
// d'email) ; côté public seul le nom d'affichage est montré. Le texte est
// rendu comme texte (échappé par React) pour éviter tout XSS stocké.
export default function CommunityModule({ onError }) {
  const [tab, setTab] = useState('comments')
  const [comments, setComments] = useState([])
  const [commentFilter, setCommentFilter] = useState('Pending')
  const [reports, setReports] = useState([])
  const [reportFilter, setReportFilter] = useState('Open')
  const [loading, setLoading] = useState(false)

  async function loadComments() {
    setLoading(true)
    try {
      const q = commentFilter ? '?status=' + encodeURIComponent(commentFilter) : ''
      setComments(await api('/admin/community/comments' + q))
      onError('')
    } catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }

  async function loadReports() {
    setLoading(true)
    try {
      setReports(await api('/admin/community/reports?status=' + encodeURIComponent(reportFilter)))
      onError('')
    } catch (err) { onError(err.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (tab === 'comments') loadComments() }, [tab, commentFilter])
  useEffect(() => { if (tab === 'reports') loadReports() }, [tab, reportFilter])

  async function moderateComment(id, action) {
    try { await api('/admin/community/comments/' + id + '/' + action, { method: 'POST' }); await loadComments() }
    catch (err) { onError(err.message) }
  }

  async function removeComment(id) {
    if (!confirm('Supprimer définitivement ce commentaire ?')) return
    try { await api('/admin/community/comments/' + id, { method: 'DELETE' }); await loadComments() }
    catch (err) { onError(err.message) }
  }

  async function handleReport(id, action) {
    try { await api('/admin/community/reports/' + id + '/' + action, { method: 'POST' }); await loadReports() }
    catch (err) { onError(err.message) }
  }

  return <div className="space-y-6">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2"><MessageSquare className="text-jso-blue" size={20}/><h2 className="text-xl font-black">Communauté &amp; modération</h2></div>
      <p className="mt-1 text-xs text-slate-400">Modération obligatoire avant publication : seuls les commentaires approuvés apparaissent publiquement. Aucune donnée personnelle n'est exposée côté public (jamais d'email, uniquement le nom d'affichage). Le texte est affiché comme texte échappé pour éviter tout XSS.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={() => setTab('comments')} className={'flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ' + (tab === 'comments' ? 'bg-jso-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}><MessageSquare size={14}/> Commentaires</button>
        <button onClick={() => setTab('reports')} className={'flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ' + (tab === 'reports' ? 'bg-jso-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}><Flag size={14}/> Signalements</button>
      </div>
    </div>

    {tab === 'comments' && <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">Commentaires {commentFilter && '— ' + STATUS_LABELS[commentFilter]}</h2>
        <span className="text-xs text-slate-400">{comments.length} élément(s)</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {COMMENT_FILTERS.map(f => <button key={f || 'all'} onClick={() => setCommentFilter(f)} className={'rounded-full px-3 py-1.5 text-xs font-bold transition-colors ' + (commentFilter === f ? 'bg-jso-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>{f ? STATUS_LABELS[f] : 'Tous'}</button>)}
      </div>
      {loading ? <p className="mt-5 text-sm text-slate-400">Chargement…</p>
        : comments.length === 0 ? <p className="mt-5 text-sm text-slate-500">Aucun commentaire dans cette file.</p>
        : <div className="mt-5 space-y-3">
            {comments.map(c => <div key={c.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ' + (STATUS_STYLES[c.status] || 'bg-slate-200 text-slate-600')}>{STATUS_LABELS[c.status] || c.status}</span>
                <span className="text-xs font-bold text-slate-600">{c.author}</span>
                <span className="text-xs text-slate-400">· {TARGET_LABELS[c.targetType] || c.targetType} · {fmtDate(c.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{c.body}</p>
              <div className="mt-3 flex items-center gap-3">
                {c.status !== 'Approved' && <button onClick={() => moderateComment(c.id, 'approve')} className="flex items-center gap-1 text-sm font-bold text-emerald-600"><Check size={16}/> Approuver</button>}
                {c.status !== 'Rejected' && <button onClick={() => moderateComment(c.id, 'reject')} className="flex items-center gap-1 text-sm font-bold text-amber-600"><Ban size={16}/> Refuser</button>}
                <button onClick={() => removeComment(c.id)} className="ml-auto flex items-center gap-1 text-sm font-bold text-red-600"><X size={16}/> Supprimer</button>
              </div>
            </div>)}
          </div>}
    </div>}

    {tab === 'reports' && <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">Signalements — {REPORT_LABELS[reportFilter]}</h2>
        <span className="text-xs text-slate-400">{reports.length} élément(s)</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {REPORT_FILTERS.map(f => <button key={f} onClick={() => setReportFilter(f)} className={'rounded-full px-3 py-1.5 text-xs font-bold transition-colors ' + (reportFilter === f ? 'bg-jso-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>{REPORT_LABELS[f]}</button>)}
      </div>
      {loading ? <p className="mt-5 text-sm text-slate-400">Chargement…</p>
        : reports.length === 0 ? <p className="mt-5 text-sm text-slate-500">Aucun signalement dans cette file.</p>
        : <div className="mt-5 space-y-3">
            {reports.map(r => <div key={r.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600"><Flag size={12}/> {TARGET_LABELS[r.targetType] || r.targetType}</span>
                <span className="text-xs text-slate-400">· {fmtDate(r.createdAt)}</span>
              </div>
              {r.reason && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{r.reason}</p>}
              {!r.reason && <p className="mt-2 text-sm italic text-slate-400">Aucun motif précisé.</p>}
              {r.status === 'Open' && <div className="mt-3 flex items-center gap-3">
                <button onClick={() => handleReport(r.id, 'resolve')} className="flex items-center gap-1 text-sm font-bold text-emerald-600"><Check size={16}/> Résoudre</button>
                <button onClick={() => handleReport(r.id, 'dismiss')} className="flex items-center gap-1 text-sm font-bold text-slate-500"><X size={16}/> Ignorer</button>
              </div>}
            </div>)}
          </div>}
    </div>}
  </div>
}
