'use client'

import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

const sizeStyles: Record<NonNullable<ButtonProps['size']>, React.CSSProperties> = {
  sm: { padding: '10px 18px', fontSize: '0.85rem',  minHeight: 40 },
  md: { padding: '14px 28px', fontSize: '0.95rem',  minHeight: 48 },
  lg: { padding: '16px 36px', fontSize: '1.05rem',  minHeight: 56 },
}

const LoadingDots = () => (
  <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
    <span className="typing-dot" style={{ animationDelay: '0ms' }} />
    <span className="typing-dot" style={{ animationDelay: '160ms' }} />
    <span className="typing-dot" style={{ animationDelay: '320ms' }} />
  </span>
)

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  const variantClass =
    variant === 'primary' ? 'btn-mood'
    : variant === 'ghost' ? 'btn-ghost'
    : 'btn-danger'

  const mergedClass = [variantClass, className].filter(Boolean).join(' ')

  const mergedStyle: React.CSSProperties = {
    ...sizeStyles[size],
    ...style,
  }

  return (
    <button
      disabled={isDisabled}
      className={mergedClass}
      style={mergedStyle}
      {...props}
    >
      {loading ? <LoadingDots /> : children}
    </button>
  )
}
