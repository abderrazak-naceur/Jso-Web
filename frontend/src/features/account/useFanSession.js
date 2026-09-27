import { useState, useEffect, useCallback } from 'react'
import { accountApi } from '../../lib/api'

const FAN_TOKEN_KEY = 'jso_fan_token'
const FAN_USER_KEY = 'jso_fan_user'

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(FAN_USER_KEY) || 'null')
  } catch {
    return null
  }
}

function readStoredToken() {
  try {
    return localStorage.getItem(FAN_TOKEN_KEY) || null
  } catch {
    return null
  }
}

/**
 * Centralise la session du supporter (fan).
 *
 * Retourne { user, token, status, signIn, signOut, updateUser }.
 * - status: 'unknown' au démarrage, puis 'authenticated' ou 'anonymous'.
 * - Au montage, si un token existe il est revalidé via accountApi.me(token).
 */
export function useFanSession() {
  const [user, setUser] = useState(readStoredUser)
  const [token, setToken] = useState(readStoredToken)
  // 'unknown' only while a stored token is being revalidated; without a token
  // the answer is immediately 'anonymous', so derive it as the initial state.
  const [status, setStatus] = useState(() => (readStoredToken() ? 'unknown' : 'anonymous'))

  const signIn = useCallback((result) => {
    const nextToken = result.accessToken
    const nextUser = result.user
    localStorage.setItem(FAN_TOKEN_KEY, nextToken)
    localStorage.setItem(FAN_USER_KEY, JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
    setStatus('authenticated')
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem(FAN_TOKEN_KEY)
    localStorage.removeItem(FAN_USER_KEY)
    setToken(null)
    setUser(null)
    setStatus('anonymous')
  }, [])

  const updateUser = useCallback((partialOrFull) => {
    setUser((prev) => {
      const next = { ...prev, ...partialOrFull }
      localStorage.setItem(FAN_USER_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  useEffect(() => {
    if (!token) {
      return undefined
    }

    let active = true

    accountApi
      .me(token)
      .then((freshUser) => {
        if (!active) return
        updateUser(freshUser)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!active) return
        signOut()
      })

    return () => {
      active = false
    }
    // We only revalidate when the token changes; signOut/updateUser are stable.
  }, [token, signOut, updateUser])

  return { user, token, status, signIn, signOut, updateUser }
}
