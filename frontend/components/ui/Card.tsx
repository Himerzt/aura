'use client'

import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  hoverable?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  style?: React.CSSProperties
}

const paddingMap: Record<NonNullable<CardProps['padding']>, string> = {
  none: '0px',
  sm: '16px',
  md: '24px',
  lg: '32px',
}

export default function Card({
  children,
  className,
  hoverable = false,
  padding = 'md',
  style,
}: CardProps) {
  const [hovered, setHovered] = React.useState(false)

  const baseStyle: React.CSSProperties = {
    background: hovered && hoverable
      ? 'rgba(255,255,255,0.06)'
      : 'var(--bg-overlay)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: `1px solid ${hovered && hoverable ? 'var(--border-strong)' : 'var(--border-default)'}`,
    borderRadius: '16px',
    padding: paddingMap[padding],
    transition: hoverable ? 'all 0.2s ease' : undefined,
    cursor: hoverable ? 'pointer' : undefined,
    ...style,
  }

  return (
    <div
      className={className}
      style={baseStyle}
      onMouseEnter={hoverable ? () => setHovered(true) : undefined}
      onMouseLeave={hoverable ? () => setHovered(false) : undefined}
    >
      {children}
    </div>
  )
}
