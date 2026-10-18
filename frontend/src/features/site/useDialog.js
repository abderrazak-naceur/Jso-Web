import { useEffect, useRef } from 'react'

// Shared behaviour for the public site's modal dialogs: close on Escape, move
// focus into the dialog, give it back on close and freeze the page behind.
export function useDialog(onClose) {
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()

    function onKeyDown(event) {
      if (event.key === 'Escape') onCloseRef.current?.()
      if (event.key === 'Tab' && dialogRef.current) {
        const elements = [...dialogRef.current.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')].filter(element => element.getClientRects().length > 0)
        const first = elements[0]
        const last = elements[elements.length - 1]
        if (!first) { event.preventDefault(); dialogRef.current.focus() }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [])

  return dialogRef
}
