'use client'

import { useEffect } from 'react'

/**
 * Warn user before closing/refreshing tab when there's unsaved text.
 * Only activates when `dirty` is true.
 */
export function useWarnUnsaved(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])
}
