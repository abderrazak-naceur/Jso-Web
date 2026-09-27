import { useCallback, useEffect, useState } from 'react'

const CART_KEY = 'jso_cart'

function readCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

// Lightweight client-side cart persisted in localStorage. Each line stores the
// product id, a display name, the price and quantity. Prices are only for
// display: the backend recomputes them at order time, so a stale local price
// never affects what the fan is actually charged.
export function useCart() {
  const [items, setItems] = useState(readCart)

  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)) } catch { /* ignore */ }
  }, [items])

  const add = useCallback((product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((x) => x.productId === product.id)
      if (existing) {
        return prev.map((x) => x.productId === product.id
          ? { ...x, quantity: Math.min(99, x.quantity + quantity) }
          : x)
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: product.price,
        currency: product.currency || 'TND',
        imageUrl: product.imageUrl || null,
        quantity: Math.min(99, Math.max(1, quantity)),
      }]
    })
  }, [])

  const setQuantity = useCallback((productId, quantity) => {
    const q = Math.min(99, Math.max(1, Number(quantity) || 1))
    setItems((prev) => prev.map((x) => x.productId === productId ? { ...x, quantity: q } : x))
  }, [])

  const remove = useCallback((productId) => {
    setItems((prev) => prev.filter((x) => x.productId !== productId))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const count = items.reduce((n, x) => n + x.quantity, 0)
  const total = items.reduce((sum, x) => sum + (Number(x.price) || 0) * x.quantity, 0)
  const currency = items[0]?.currency || 'TND'

  return { items, add, setQuantity, remove, clear, count, total, currency }
}
