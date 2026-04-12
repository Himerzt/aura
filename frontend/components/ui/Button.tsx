'use client'

import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

const sizeStyles: Record<NonNullable<ButtonProps['size']>, React.CSSProperties> = {
  sm: {
    padding: '8px 16px',
    fontSize: 'var(--text-sm)',
    minHeight: '36px',
  },
  md: {
    padding: '10px 24px',
    fontSize: 'var(--text-base)',
    minHeight: '44px',
  },
  lg: {
    padding: '14px 32px',
    fontSize: 'var(--text-lg)',
    minHeight: '52px',
  },
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, React.CSSProperties> = {
  primary: {
    background: 'var(--amber)',
    color: '#0C0C18',
    border: '1px solid transparent',
    fontWeight: 500,
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-default)',
    fontWeight: 400,
  },
  danger: {
    background: 'rgba(212,132,138,0.15)',
    color: 'var(--rose)',
    border: '1px solid var(--rose)',
    fontWeight: 400,
  },
}

const LoadingDots = () => (
  <span style={{ letterSpacing: '0.2em', display: 'inline-block' }}>
    <span
      style={{
        display: 'inline-block',
        animation: 'buttonDot 1.2s ease-in-out infinite',
        animationDelay: '0ms',
      }}
    >
      .
    </span>
    <span
      style={{
        display: 'inline-block',
        animation: 'buttonDot 1.2s ease-in-out infinite',
        animationDelay: '200ms',
      }}
    >
      .
    </span>
    <span
      style={{
        display: 'inline-block',
        animation: 'buttonDot 1.2s ease-in-out infinite',
        animationDelay: '400ms',
      }}
    >
      .
    </span>
    <style>{`
      @keyframes buttonDot {
        0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
        40% { opacity: 1; transform: translateY(-3px); }
      }
    `}</style>
  </span>
)

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: ButtonProps) {
  const [hovered, setHovered] = React.useState(false)

  const isDisabled = disabled || loading

  const hoverOverrides: React.CSSProperties = hovered && !isDisabled
    ? variant === 'primary'
      ? { filter: 'brightness(1.1)' }
      : variant === 'ghost'
        ? {
            border: '1px solid var(--border-strong)',
            color: 'var(--text-primary)',
          }
        : {}
    : {}

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    borderRadius: '12px',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.4 : 1,
    transition: 'all 0.2s ease',
    fontFamily: 'var(--font-body)',
    lineHeight: 1,
    userSelect: 'none',
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...hoverOverrides,
    ...style,
  }

  return (
    <button
      disabled={isDisabled}
      style={baseStyle}
      onMouseEnter={(e) => {
        setHovered(true)
        onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        setHovered(false)
        onMouseLeave?.(e)
      }}
      {...props}
    >
      {loading ? <LoadingDots /> : children}
    </button>
  )
}
