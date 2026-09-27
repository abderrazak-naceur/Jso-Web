import { useEffect, useRef, useState } from 'react'
import { Accessibility, Contrast, Type, Zap, RotateCcw, X } from 'lucide-react'
import { useAccessibility } from './lib/useAccessibility'

// Idea G21 — floating accessibility menu for the public site.
// Provides high contrast, adjustable text size and reduced motion.
// All controls are keyboard reachable and announced to assistive tech.

const TEXT_SIZE_OPTIONS = [
  ['normal', 'Normal', 'A'],
  ['large', 'Grand', 'A'],
  ['xlarge', 'Très grand', 'A'],
]

function ToggleRow({ id, icon: Icon, label, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <Icon size={20} className="mt-0.5 shrink-0 text-jso-blue" aria-hidden="true" />
        <span>
          <span className="block text-sm font-extrabold text-jso-ink">{label}</span>
          <span className="block text-xs text-slate-500">{description}</span>
        </span>
      </label>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${checked ? 'bg-jso-blue' : 'bg-slate-300'}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

export default function AccessibilityPanel() {
  const { prefs, setHighContrast, setTextSize, setReduceMotion, reset } = useAccessibility()
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const buttonRef = useRef(null)

  // Close on Escape and restore focus to the trigger.
  useEffect(() => {
    if (!open) return
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  // Move focus into the panel when it opens.
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  return (
    <div className="jso-a11y-launcher">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="jso-a11y-panel"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-jso-navy text-jso-gold shadow-2xl shadow-jso-navy/40 transition hover:-translate-y-0.5 hover:bg-jso-blue hover:text-white"
      >
        <Accessibility size={26} aria-hidden="true" />
        <span className="sr-only">Options d’accessibilité</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          id="jso-a11y-panel"
          role="dialog"
          aria-modal="false"
          aria-label="Options d’accessibilité"
          tabIndex={-1}
          className="jso-a11y-panel mt-3 w-80 max-w-[calc(100vw-2.5rem)] rounded-3xl border border-slate-200 bg-white p-5 text-jso-ink shadow-2xl outline-none"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold tracking-[0.2em] text-jso-gold">ACCESSIBILITÉ</p>
              <h2 className="mt-1 text-lg font-black">Lecture facilitée</h2>
            </div>
            <button
              type="button"
              onClick={() => { setOpen(false); buttonRef.current?.focus() }}
              className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
            >
              <X size={16} aria-hidden="true" />
              <span className="sr-only">Fermer</span>
            </button>
          </div>

          <div className="mt-2 divide-y divide-slate-100">
            <ToggleRow
              id="jso-a11y-contrast"
              icon={Contrast}
              label="Contraste élevé"
              description="Renforce les couleurs et le texte."
              checked={prefs.highContrast}
              onChange={setHighContrast}
            />

            <fieldset className="py-3">
              <legend className="flex items-center gap-3 text-sm font-extrabold text-jso-ink">
                <Type size={20} className="text-jso-blue" aria-hidden="true" /> Taille du texte
              </legend>
              <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Taille du texte">
                {TEXT_SIZE_OPTIONS.map(([value, label, glyph], index) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={prefs.textSize === value}
                    onClick={() => setTextSize(value)}
                    className={`flex flex-1 flex-col items-center rounded-xl border px-2 py-2 transition ${prefs.textSize === value ? 'border-jso-blue bg-jso-blue/10 text-jso-navy' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    <span aria-hidden="true" className="font-black" style={{ fontSize: `${0.85 + index * 0.35}rem` }}>{glyph}</span>
                    <span className="mt-1 text-[11px] font-bold">{label}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <ToggleRow
              id="jso-a11y-motion"
              icon={Zap}
              label="Réduire les animations"
              description="Limite les transitions et effets."
              checked={prefs.reduceMotion}
              onChange={setReduceMotion}
            />
          </div>

          <button
            type="button"
            onClick={reset}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
          >
            <RotateCcw size={15} aria-hidden="true" /> Réinitialiser
          </button>
          <p className="mt-3 text-[11px] leading-4 text-slate-400">Vos préférences sont enregistrées sur cet appareil uniquement.</p>
        </div>
      )}
    </div>
  )
}
