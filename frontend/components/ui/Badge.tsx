'use client'

import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'mood' | 'framework' | 'time' | 'difficulty'
  mood?: 'energized' | 'stable' | 'anxious' | 'overwhelmed' | 'numb'
  className?: string
  style?: React.CSSProperties
}

type MoodConfig = {
  color: string
  background: string
  border: string
}

const moodConfigMap: Record<NonNullable<BadgeProps['mood']>, MoodConfig> = {
  energized: {
    color: 'var(--amber)',
    background: 'var(--amber-dim)',
    border: 'rgba(245,166,35,0.3)',
  },
  stable: {
    color: 'var(--ice)',
    background: 'var(--ice-dim)',
    border: 'rgba(168,196,224,0.3)',
  },
  anxious: {
    color: 'var(--mood-anxious)',
    background: 'color-mix(in srgb, var(--mood-anxious) 12%, transparent)',
    border: 'color-mix(in srgb, var(--mood-anxious) 30%, transparent)',
  },
  overwhelmed: {
    color: 'var(--rose)',
    background: 'rgba(212,132,138,0.12)',
    border: 'rgba(212,132,138,0.3)',
  },
  numb: {
    color: 'var(--mood-numb)',
    background: 'color-mix(in srgb, var(--mood-numb) 15%, transparent)',
    border: 'color-mix(in srgb, var(--mood-numb) 30%, transparent)',
  },
}

function getMoodStyle(mood?: BadgeProps['mood']): React.CSSProperties {
  if (!mood) {
    // fallback to stable when no mood provided
    const fallback = moodConfigMap.stable
    return {
      color: fallback.color,
      background: fallback.background,
      border: `1px solid ${fallback.border}`,
    }
  }
  const cfg = moodConfigMap[mood]
  return {
    color: cfg.color,
    background: cfg.background,
    border: `1px solid ${cfg.border}`,
  }
}

function getVariantStyle(
  variant: NonNullable<BadgeProps['variant']>,
  mood?: BadgeProps['mood'],
): React.CSSProperties {
  switch (variant) {
    case 'mood':
      return getMoodStyle(mood)
    case 'framework':
      return {
        color: 'var(--ice)',
        background: 'var(--ice-dim)',
        border: '1px solid rgba(168,196,224,0.2)',
      }
    case 'time':
    case 'difficulty':
      return {
        color: 'var(--text-secondary)',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
      }
    default:
      return {}
  }
}

export default function Badge({
  children,
  variant = 'framework',
  mood,
  className,
  style,
}: BadgeProps) {
  const variantStyle = getVariantStyle(variant, mood)

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '0.75rem',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    fontWeight: 500,
    padding: '4px 10px',
    borderRadius: '999px',
    fontFamily: 'var(--font-body)',
    lineHeight: 1.4,
    ...variantStyle,
    ...style,
  }

  return (
    <span className={className} style={baseStyle}>
      {children}
    </span>
  )
}
