import { useEffect, useState } from 'react'
import { Flag, MessageSquare, Send, ThumbsUp } from 'lucide-react'
import { communityApi, communityFanApi } from '../../lib/api'
import { formatDate, pick } from '../../lib/format'

// Closed reaction vocabulary mirrored from the backend (CommunityFanController).
const REACTION_KINDS = [
  { kind: 'Like', label: 'J’aime' },
  { kind: 'Love', label: 'J’adore' },
  { kind: 'Clap', label: 'Bravo' },
]

const MAX_BODY_LENGTH = 1000

function normalizeComment(raw) {
  return {
    id: pick(raw, 'Id', 'id'),
    author: pick(raw, 'Author', 'author') || 'Supporter',
    body: pick(raw, 'Body', 'body') || '',
    date: pick(raw, 'Date', 'date'),
  }
}

// Aggregate reaction counts -> a { Like: n, Love: n, Clap: n } map.
function reactionMap(raw) {
  const counts = pick(raw, 'counts', 'Counts') || []
  const map = {}
  for (const entry of Array.isArray(counts) ? counts : []) {
    const kind = pick(entry, 'Kind', 'kind')
    const count = pick(entry, 'Count', 'count') ?? 0
    if (kind) map[kind] = count
  }
  return map
}

/**
 * Reusable community block for a piece of content.
 *
 * Props:
 *  - targetType: 'News' | 'Match'
 *  - targetId: the content Guid used by the backend
 *  - token: fan JWT (from useFanSession) or null — its presence means the fan is logged in
 *  - onRequireLogin: optional callback to open the login modal
 *
 * Renders approved comments (loading / empty / error states), aggregate
 * reaction counts with a react button for logged-in fans, and a comment form
 * for logged-in fans (with a clear "after moderation" notice). Non-authenticated
 * visitors see an invitation to sign in. All user content is rendered escaped by
 * React (no dangerouslySetInnerHTML).
 */
export default function CommentsSection({ targetType, targetId, token, onRequireLogin }) {
  const [comments, setComments] = useState([])
  const [reactions, setReactions] = useState({})
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [reactionsError, setReactionsError] = useState(false)

  const [body, setBody] = useState('')
  const [submitState, setSubmitState] = useState('idle') // idle | sending | sent | error
  const [submitMessage, setSubmitMessage] = useState('')

  const [reactingKind, setReactingKind] = useState(null)
  const [reportState, setReportState] = useState('idle') // idle | sending | sent | error

  const isLoggedIn = Boolean(token)

  useEffect(() => {
    if (!targetId) {
      setStatus('error')
      return undefined
    }
    const controller = new AbortController()
    const { signal } = controller
    setStatus('loading')
    setReactionsError(false)

    communityApi.getComments(targetType, targetId, signal)
      .then((result) => {
        if (signal.aborted) return
        setComments((Array.isArray(result) ? result : []).map(normalizeComment))
        setStatus('ready')
      })
      .catch(() => {
        if (!signal.aborted) setStatus('error')
      })

    communityApi.getReactions(targetType, targetId, signal)
      .then((result) => {
        if (signal.aborted) return
        setReactions(reactionMap(result))
      })
      .catch(() => {
        if (!signal.aborted) setReactionsError(true)
      })

    return () => controller.abort()
  }, [targetType, targetId])

  async function submitComment(event) {
    event.preventDefault()
    const trimmed = body.trim()
    if (!trimmed || submitState === 'sending') return
    setSubmitState('sending')
    setSubmitMessage('')
    try {
      const result = await communityFanApi.postComment(
        { targetType, targetId, body: trimmed },
        token,
      )
      setSubmitMessage(result?.message || 'Commentaire reçu. Il sera visible après modération.')
      setBody('')
      setSubmitState('sent')
    } catch {
      setSubmitMessage('Envoi impossible pour le moment. Réessayez plus tard.')
      setSubmitState('error')
    }
  }

  async function react(kind) {
    if (!isLoggedIn) {
      onRequireLogin?.()
      return
    }
    if (reactingKind) return
    setReactingKind(kind)
    try {
      await communityFanApi.addReaction({ targetType, targetId, kind }, token)
      setReactions((prev) => ({ ...prev, [kind]: (prev[kind] || 0) + 1 }))
    } catch {
      setReactionsError(true)
    } finally {
      setReactingKind(null)
    }
  }

  async function report() {
    if (!isLoggedIn) {
      onRequireLogin?.()
      return
    }
    if (reportState === 'sending' || reportState === 'sent') return
    setReportState('sending')
    try {
      await communityFanApi.report({ targetType, targetId, reason: null }, token)
      setReportState('sent')
    } catch {
      setReportState('error')
    }
  }

  return (
    <section aria-labelledby="community-comments-title" className="mt-8 border-t border-slate-200 pt-8">
      <div className="flex items-center justify-between gap-4">
        <h3 id="community-comments-title" className="flex items-center gap-2 text-xl font-black">
          <MessageSquare size={20} aria-hidden="true" /> Communauté
        </h3>
        {isLoggedIn && (
          <button
            type="button"
            onClick={report}
            disabled={reportState === 'sending' || reportState === 'sent'}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100 disabled:opacity-60"
          >
            <Flag size={14} aria-hidden="true" />
            {reportState === 'sent' ? 'Signalé' : 'Signaler'}
          </button>
        )}
      </div>

      {/* Reactions */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {REACTION_KINDS.map(({ kind, label }) => (
          <button
            key={kind}
            type="button"
            onClick={() => react(kind)}
            disabled={reactingKind === kind}
            aria-label={`${label} (${reactions[kind] || 0})`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-jso-ink transition hover:bg-slate-100 disabled:opacity-60"
          >
            <ThumbsUp size={15} aria-hidden="true" />
            {label}
            <span className="text-slate-400">{reactions[kind] || 0}</span>
          </button>
        ))}
      </div>
      {reactionsError && (
        <p role="alert" className="mt-2 text-xs text-slate-400">Réactions indisponibles pour le moment.</p>
      )}

      {/* Comment form / login invitation */}
      {isLoggedIn ? (
        <form onSubmit={submitComment} className="mt-6">
          <label htmlFor="community-comment" className="text-sm font-bold">Laisser un commentaire</label>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Votre commentaire sera publié après validation par notre équipe de modération.
          </p>
          <textarea
            id="community-comment"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={MAX_BODY_LENGTH}
            rows={3}
            placeholder="Partagez votre avis…"
            className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-jso-blue"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">{body.length}/{MAX_BODY_LENGTH}</span>
            <button
              type="submit"
              disabled={submitState === 'sending' || body.trim().length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-jso-navy px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-jso-blue disabled:opacity-60"
            >
              <Send size={15} aria-hidden="true" />
              {submitState === 'sending' ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
          {submitMessage && (
            <p
              role="status"
              className={`mt-3 rounded-xl px-4 py-3 text-sm ${submitState === 'error' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'}`}
            >
              {submitMessage}
            </p>
          )}
        </form>
      ) : (
        <div className="mt-6 rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
          <p>
            Connectez-vous à votre compte supporter pour réagir et commenter.
            {' '}
            {onRequireLogin && (
              <button type="button" onClick={onRequireLogin} className="font-extrabold text-jso-blue underline">
                Se connecter
              </button>
            )}
          </p>
        </div>
      )}

      {/* Approved comments list */}
      <div className="mt-8">
        {status === 'loading' && (
          <p role="status" className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Chargement des commentaires…</p>
        )}
        {status === 'error' && (
          <p role="alert" className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Commentaires indisponibles pour le moment.</p>
        )}
        {status === 'ready' && comments.length === 0 && (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Aucun commentaire pour le moment. Soyez le premier à réagir&nbsp;!</p>
        )}
        {status === 'ready' && comments.length > 0 && (
          <ul className="space-y-3">
            {comments.map((comment) => (
              <li key={comment.id || `${comment.author}-${comment.date}`} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black">{comment.author}</p>
                  {comment.date && <p className="text-xs text-slate-400">{formatDate(comment.date)}</p>}
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
