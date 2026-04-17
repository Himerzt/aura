'use client'

import { useEffect, useState } from 'react'

interface MilestoneToastProps {
  streak: number
}

const TOAST_MILESTONES = [7, 14, 30, 60, 100] as const

const MESSAGES: Record<number, string> = {
  7: '1 tuần liên tiếp!',
  14: '2 tuần liên tiếp!',
  30: '30 ngày — respect!',
  60: '60 ngày kiên trì!',
  100: '100 ngày. Legend.',
}

const CONFETTI_COLORS = [
  'var(--mood-color)',
  'var(--mood-color-soft)',
  'var(--amber, #F5A623)',
  'var(--sage, #8BC34A)',
  '#ff8c42',
  '#b388ff',
]

function getSessionKey(milestone: number): string {
  return `aura_milestone_shown_${milestone}`
}

/**
 * Shows a celebration banner when streak hits a milestone (7, 14, 30, 60, 100).
 * Only shows once per milestone per session (sessionStorage).
 */
export default function MilestoneToast({ streak }: MilestoneToastProps) {
  const [activeMilestone, setActiveMilestone] = useState<number | null>(null)

  useEffect(() => {
    if (streak <= 0) return

    // Find exact milestone match
    const hit = TOAST_MILESTONES.find((m) => streak === m)
    if (!hit) return

    // Only show once per session
    const key = getSessionKey(hit)
    if (typeof window !== 'undefined' && sessionStorage.getItem(key)) return

    setActiveMilestone(hit)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(key, '1')
    }

    // Auto-dismiss after animation ends (4.5s)
    const timer = setTimeout(() => setActiveMilestone(null), 4800)
    return () => clearTimeout(timer)
  }, [streak])

  if (!activeMilestone) return null

  const message = MESSAGES[activeMilestone] ?? `${activeMilestone} ngày!`

  return (
    <div className="milestone-toast" aria-live="polite">
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--mood-color)',
          borderRadius: '0 0 16px 16px',
          padding: '16px 32px',
          textAlign: 'center',
          boxShadow: '0 8px 32px var(--mood-glow), 0 2px 12px rgba(0,0,0,0.3)',
          position: 'relative',
          overflow: 'hidden',
          minWidth: 280,
        }}
      >
        {/* Confetti dots */}
        {Array.from({ length: 8 }, (_, i) => (
          <span
            key={i}
            className="confetti-dot"
            style={{
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              left: `${10 + i * 11}%`,
              top: -4,
              animationDelay: `${0.3 + i * 0.12}s`,
            }}
          />
        ))}

        <p
          style={{
            margin: '0 0 4px',
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          Milestone
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-heading, Sora, system-ui)',
            fontSize: '1.2rem',
            fontWeight: 700,
            color: 'var(--mood-color)',
          }}
        >
          {message}
        </p>
      </div>
    </div>
  )
}
