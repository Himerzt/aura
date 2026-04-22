'use client'

import { useEffect, useRef, useState } from 'react'

interface StreakDisplayProps {
  currentStreak: number
  shieldCount?: number
  todayCompleted?: boolean
}

const MAX_SHIELD_SLOTS = 3

function ShieldIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="20"
      height="22"
      viewBox="0 0 20 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{
        transition: 'transform 0.3s ease',
        transform: filled ? 'scale(1)' : 'scale(0.85)',
        opacity: filled ? 1 : 0.5,
      }}
    >
      <path
        d="M10 1L2 4.5V10C2 14.8 5.4 19.3 10 21C14.6 19.3 18 14.8 18 10V4.5L10 1Z"
        fill={filled ? 'var(--amber)' : 'none'}
        stroke={filled ? 'var(--amber)' : 'var(--border-default)'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Animated counter that counts from 0 to target over ~600ms.
 */
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const [flashing, setFlashing] = useState(false)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (value <= 0) {
      setDisplay(0)
      return
    }

    const duration = Math.min(600, value * 80) // cap at 600ms
    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress)
      setDisplay(Math.round(eased * value))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Flash on finish
        setFlashing(true)
        setTimeout(() => setFlashing(false), 600)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value])

  return (
    <span className={flashing ? 'count-flash' : ''}>
      {display}
    </span>
  )
}

export default function StreakDisplay({
  currentStreak,
  shieldCount = 0,
  todayCompleted = false,
}: StreakDisplayProps) {
  const shields = Math.max(0, Math.min(MAX_SHIELD_SLOTS, shieldCount))
  const isFirstDay = currentStreak === 0

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {/* Streak number or first day message */}
      {isFirstDay ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            animation: 'fadeInUp 0.6s ease both',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-4xl, 2.25rem)',
              fontWeight: 600,
              color: 'var(--mood-color, var(--amber))',
              lineHeight: 1,
            }}
          >
            1
          </span>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm, 0.875rem)',
              color: 'var(--text-secondary)',
              fontWeight: 400,
              paddingBottom: 4,
            }}
          >
            ngày đầu tiên
          </span>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
          }}
        >
          {/* Large streak number — animated count-up */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-4xl, 2.25rem)',
                fontWeight: 600,
                color: 'var(--amber)',
                lineHeight: 1,
              }}
            >
              <AnimatedNumber value={currentStreak} />
            </span>

            {/* Completed checkmark */}
            {todayCompleted && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'var(--sage)',
                  flexShrink: 0,
                  animation: 'checkPop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
                }}
                aria-label="Hôm nay đã hoàn thành"
              >
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                  <path
                    d="M1 4L3.5 6.5L9 1"
                    stroke="#0C0C18"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}
          </div>

          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm, 0.875rem)',
              color: 'var(--text-secondary)',
              fontWeight: 400,
              paddingBottom: 4,
            }}
          >
            ngày liên tiếp
          </span>
        </div>
      )}

      {/* Shield row */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          alignItems: 'center',
        }}
        aria-label={`${shields} shield bảo vệ`}
      >
        {Array.from({ length: MAX_SHIELD_SLOTS }, (_, i) => (
          <ShieldIcon key={i} filled={i < shields} />
        ))}
      </div>

      {shields > 0 && (
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs, 0.75rem)',
            color: 'var(--text-tertiary)',
          }}
        >
          {shields} shield bảo vệ
        </p>
      )}
    </div>
  )
}
