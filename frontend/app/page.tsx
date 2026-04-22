'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile } from '@/lib/api'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function Home() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    getProfile()
      .then((p) => {
        router.replace(p.onboarding_completed ? '/morning' : '/onboarding')
      })
      .catch(() => {
        router.replace('/onboarding')
      })
      .finally(() => setChecking(false))
  }, [router])

  if (!checking) return null

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <LoadingSpinner size="lg" />
    </div>
  )
}
