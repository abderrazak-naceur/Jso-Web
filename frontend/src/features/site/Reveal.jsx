import { useEffect, useRef, useState } from 'react'

// Reveals its children with a subtle fade/slide-up the first time they scroll
// into view, using IntersectionObserver (no dependency). Respect for reduced
// motion is handled in CSS (.jso-reveal is neutralised under prefers-reduced-
// motion and the manual toggle). If IntersectionObserver is unavailable, the
// content is shown immediately so nothing can stay hidden.
//
// Props:
//   as    — element tag to render (default 'div')
//   delay — optional stagger in ms (applied as transition-delay)
export default function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
            break
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={`jso-reveal ${visible ? 'is-visible' : ''} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  )
}
