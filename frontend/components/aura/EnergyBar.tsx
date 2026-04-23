'use client'

import Tooltip from '../ui/Tooltip'

interface EnergyBarProps {
  level: number
  showLabel?: boolean
  showNumber?: boolean
}

function getSegmentColor(level: number): string {
  if (level <= 3) return 'var(--rose)'
  if (level <= 6) return 'var(--amber)'
  return 'var(--sage)'
}

export default function EnergyBar({
  level,
  showLabel = true,
  showNumber = true,
}: EnergyBarProps) {
  const clamped = Math.max(1, Math.min(10, Math.round(level)))
  const activeColor = getSegmentColor(clamped)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {(showLabel || showNumber) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {showLabel && (
            <Tooltip text="Mức năng lượng bạn tự đánh giá. AURA dựa vào đây để chọn số lượng và độ khó task.">
              <span
                style={{
                  fontSize: 'var(--text-xs, 0.75rem)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  borderBottom: '1px dotted var(--text-tertiary)',
                }}
              >
                Năng lượng
              </span>
            </Tooltip>
          )}
          {showNumber && (
            <span
              style={{
                fontSize: 'var(--text-sm, 0.875rem)',
                color: 'var(--amber)',
                fontFamily: 'var(--font-body)',
                fontWeight: 500,
              }}
            >
              {clamped}/10
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {Array.from({ length: 10 }, (_, i) => {
          const filled = i < clamped
          return (
            <div
              key={i}
              style={{
                width: 20,
                height: 8,
                borderRadius: 4,
                background: filled ? activeColor : 'transparent',
                border: `1px solid ${filled ? activeColor : 'var(--border-default)'}`,
                transition: 'background 0.2s ease, border-color 0.2s ease',
                opacity: filled ? 1 : 0.4,
              }}
              aria-hidden="true"
            />
          )
        })}
      </div>
    </div>
  )
}
