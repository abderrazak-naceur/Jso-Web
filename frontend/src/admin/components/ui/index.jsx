// Shared building blocks for every back-office module, so all sections share
// the same spacing, radii and typography instead of re-inventing them.

export function Card({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`rounded-[1.5rem] border border-slate-200 bg-white p-6 ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-black text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={title || actions ? 'mt-5' : ''}>{children}</div>
    </section>
  )
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-500',
    blue: 'text-jso-blue',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className={`flex items-center gap-1.5 text-xs font-bold ${tones[tone] || tones.slate}`}>
        {Icon && <Icon size={14} aria-hidden="true" />}{label}
      </p>
      <p className="mt-1 text-2xl font-black text-jso-navy">{value}</p>
      {hint && <p className="mt-0.5 text-xs font-semibold text-slate-400">{hint}</p>}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      {Icon && <Icon size={28} className="mx-auto text-slate-400" aria-hidden="true" />}
      <p className="mt-3 text-sm font-black text-slate-700">{title}</p>
      {message && <p className="mt-1 text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function PrimaryButton({ icon: Icon, children, className = '', ...props }) {
  return (
    <button type="button" className={`inline-flex items-center gap-2 rounded-xl bg-jso-navy px-4 py-2.5 text-sm font-black text-white transition hover:bg-jso-blue disabled:opacity-50 ${className}`} {...props}>
      {Icon && <Icon size={16} aria-hidden="true" />}{children}
    </button>
  )
}

export function SecondaryButton({ icon: Icon, children, className = '', ...props }) {
  return (
    <button type="button" className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-jso-blue disabled:opacity-50 ${className}`} {...props}>
      {Icon && <Icon size={16} aria-hidden="true" />}{children}
    </button>
  )
}

export function DangerButton({ icon: Icon, children, className = '', ...props }) {
  return (
    <button type="button" className={`inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50 ${className}`} {...props}>
      {Icon && <Icon size={16} aria-hidden="true" />}{children}
    </button>
  )
}
