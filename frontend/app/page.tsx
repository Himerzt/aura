'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile } from '@/lib/api'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function Home() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [failed, setFailed] = useState(false)

  const check = useCallback(() => {
    setChecking(true)
    setFailed(false)
    getProfile()
      .then((p) => {
        router.replace(p.onboarding_completed ? '/morning' : '/onboarding')
      })
      .catch(() => {
        setFailed(true)
      })
      .finally(() => setChecking(false))
  }, [router])

  useEffect(() => { check() }, [check])

  if (failed) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        gap: 16,
        padding: 24,
      }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Không kết nối được server. Hãy thử lại.
        </p>
        <button
          type="button"
          className="btn-mood"
          onClick={check}
          style={{ borderRadius: 12, cursor: 'pointer' }}
        >
          Thử lại
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <LoadingSpinner size="lg" />
    </div>
  )
}
