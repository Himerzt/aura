'use client'

import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export default function Input({
  label,
  error,
  hint,
  id,
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [focused, setFocused] = React.useState(false)

  const inputId = id ?? (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

  const borderColor = focused
    ? error
      ? 'var(--rose)'
      : 'var(--amber)'
    : error
      ? 'var(--rose)'
      : 'var(--border-default)'

  const boxShadow = focused
    ? error
      ? '0 0 0 2px rgba(212,132,138,0.25)'
      : '0 0 0 2px var(--amber-dim)'
    : 'none'

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-surface)',
    border: `1px solid ${borderColor}`,
    borderRadius: '12px',
    padding: '12px 16px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-base)',
    fontWeight: 400,
    outline: 'none',
    boxShadow,
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxSizing: 'border-box',
    ...style,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)',
            fontWeight: 400,
          }}
        >
          {label}
        </label>
      )}

      <input
        id={inputId}
        style={inputStyle}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        {...props}
      />

      {/* Placeholder color override via style tag scoped to component */}
      <style>{`
        #${inputId}::placeholder {
          color: var(--text-tertiary);
          opacity: 1;
        }
      `}</style>

      {error && (
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--rose)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {error}
        </span>
      )}

      {!error && hint && (
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {hint}
        </span>
      )}
    </div>
  )
}
