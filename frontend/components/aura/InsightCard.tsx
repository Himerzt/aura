'use client'

import { useState } from 'react'
import FrameworkTag from './FrameworkTag'

interface InsightCardProps {
  framework: string
  explanation: string
  whyItHappens?: string
  patternTrend?: string
  animationDelay?: number
}

export default function InsightCard({
  framework,
  explanation,
  whyItHappens,
  patternTrend,
  animationDelay = 0,
}: InsightCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--card-radius, 16px)',
        padding: 'var(--card-padding, 24px)',
        opacity: 0,
        animation: 'fadeIn 0.4s ease forwards',
        animationDelay: `${animationDelay}ms`,
        overflow: 'hidden',
      }}
    >
      {/* Top gradient accent line */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            'linear-gradient(90deg, var(--amber-dim), var(--ice-dim))',
        }}
      />

      {/* Framework tag */}
      <div style={{ marginBottom: 14 }}>
        <FrameworkTag framework={framework} />
      </div>

      {/* Explanation — Playfair Display italic */}
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 'var(--text-lg, 1.125rem)',
          color: 'var(--text-primary)',
          lineHeight: 1.65,
        }}
      >
        {explanation}
      </p>

      {/* Pattern trend */}
      {patternTrend && (
        <p
          style={{
            margin: '12px 0 0',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm, 0.875rem)',
            color: 'var(--text-secondary)',
            fontWeight: 300,
          }}
        >
          {patternTrend}
        </p>
      )}

      {/* Expandable section */}
      {whyItHappens && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: expanded
                ? 'var(--text-secondary)'
                : 'var(--text-tertiary)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs, 0.75rem)',
              letterSpacing: '0.04em',
              transition: 'color 0.2s ease',
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
              style={{
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
                flexShrink: 0,
              }}
            >
              <path
                d="M4.5 2.5L8 6L4.5 9.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Tại sao điều này xảy ra?
          </button>

          {expanded && (
            <p
              style={{
                margin: '10px 0 0',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm, 0.875rem)',
                color: 'var(--text-secondary)',
                fontWeight: 300,
                lineHeight: 1.6,
                paddingLeft: 18,
                borderLeft: '1px solid var(--border-subtle)',
              }}
            >
              {whyItHappens}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
