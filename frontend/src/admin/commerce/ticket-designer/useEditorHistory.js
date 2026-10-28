import { useCallback, useState } from 'react'

const LIMIT = 60

export default function useEditorHistory(initialDocument) {
  const [state, setState] = useState({ past: [], present: initialDocument, future: [] })

  const commit = useCallback((updater) => {
    setState((current) => {
      const next = typeof updater === 'function' ? updater(current.present) : updater
      if (!next || next === current.present) return current
      return {
        past: [...current.past.slice(-(LIMIT - 1)), current.present],
        present: next,
        future: [],
      }
    })
  }, [])

  const reset = useCallback((document) => {
    setState({ past: [], present: document, future: [] })
  }, [])

  const undo = useCallback(() => {
    setState((current) => {
      if (!current.past.length) return current
      const previous = current.past[current.past.length - 1]
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future].slice(0, LIMIT),
      }
    })
  }, [])

  const redo = useCallback(() => {
    setState((current) => {
      if (!current.future.length) return current
      const next = current.future[0]
      return {
        past: [...current.past, current.present].slice(-LIMIT),
        present: next,
        future: current.future.slice(1),
      }
    })
  }, [])

  return {
    document: state.present,
    commit,
    reset,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  }
}
