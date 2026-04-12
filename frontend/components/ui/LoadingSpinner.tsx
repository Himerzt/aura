'use client'

import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'amber' | 'ice' | 'white'
}

const sizeMap: Record<NonNullable<LoadingSpinnerProps['size']>, number> = {
  sm: 16,
  md: 24,
  lg: 40,
}

const colorMap: Record<NonNullable<LoadingSpinnerProps['color']>, string> = {
  amber: 'var(--amber)',
  ice: 'var(--ice)',
  white: 'rgba(255,255,255,0.8)',
}

export default function LoadingSpinner({
  size = 'md',
  color = 'white',
}: LoadingSpinnerProps) {
  const px = sizeMap[size]
  const borderColor = colorMap[color]
  const borderWidth = size === 'sm' ? 2 : size === 'md' ? 2 : 3

  return (
    <>
      <div
        style={{
          width: px,
          height: px,
          borderRadius: '50%',
          border: `${borderWidth}px solid transparent`,
          borderTopColor: borderColor,
          animation: 'spinnerRotate 0.8s linear infinite',
          flexShrink: 0,
        }}
        aria-label="Loading"
        role="status"
      />
      <style>{`
        @keyframes spinnerRotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
