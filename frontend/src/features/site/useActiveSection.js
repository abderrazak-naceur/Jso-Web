import { useEffect, useState } from 'react'

// Scroll-spy: returns the id of the section crossing the upper part of the
// viewport, so the header can highlight where the visitor currently is.
export function useActiveSection(ids) {
  const [active, setActive] = useState('')
  const key = ids.join('|')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    const elements = key.split('|').map((id) => document.getElementById(id)).filter(Boolean)
    if (elements.length === 0) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id)
        })
      },
      // A thin band just below the sticky header decides which section is "current".
      { rootMargin: '-30% 0px -65% 0px' },
    )
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [key])

  return active
}
