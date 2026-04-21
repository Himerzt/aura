'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMood } from '@/lib/mood-context'
import { postRegister } from '@/lib/api'

interface FormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

function validate(
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
): FormErrors {
  const errors: FormErrors = {}

  if (!name.trim()) {
    errors.name = 'Vui l\u00f2ng nh\u1eadp t\u00ean c\u1ee7a b\u1ea1n'
  } else if (name.trim().length < 2) {
    errors.name = 'T\u00ean ph\u1ea3i c\u00f3 \u00edt nh\u1ea5t 2 k\u00fd t\u1ef1'
  }

  if (!email.trim()) {
    errors.email = 'Vui l\u00f2ng nh\u1eadp email'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Email kh\u00f4ng \u0111\u00fang \u0111\u1ecbnh d\u1ea1ng'
  }

  if (!password) {
    errors.password = 'Vui l\u00f2ng nh\u1eadp m\u1eadt kh\u1ea9u'
  } else if (password.length < 6) {
    errors.password = 'M\u1eadt kh\u1ea9u ph\u1ea3i c\u00f3 \u00edt nh\u1ea5t 6 k\u00fd t\u1ef1'
  } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = 'M\u1eadt kh\u1ea9u ph\u1ea3i c\u00f3 c\u1ea3 ch\u1eef v\u00e0 s\u1ed1'
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Vui l\u00f2ng nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u'
  } else if (confirmPassword !== password) {
    errors.confirmPassword = 'M\u1eadt kh\u1ea9u nh\u1eadp l\u1ea1i kh\u00f4ng kh\u1edbp'
  }

  return errors
}

export default function RegisterPage() {
  const router = useRouter()
  const { setMood } = useMood()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  function handleBlur(field: keyof FormErrors) {
    setTouched((t) => ({ ...t, [field]: true }))
    const newErrors = validate(name, email, password, confirmPassword)
    setErrors((prev) => ({ ...prev, [field]: newErrors[field] }))
  }

  function getPasswordStrength(): { level: number; label: string; color: string } {
    if (password.length === 0) return { level: 0, label: '', color: 'transparent' }
    if (password.length < 6) return { level: 1, label: 'Y\u1ebfu', color: 'var(--mood-overwhelmed)' }
    const hasLetter = /[A-Za-z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[^A-Za-z0-9]/.test(password)
    const score = [hasLetter, hasNumber, hasSpecial, password.length >= 10].filter(Boolean).length
    if (score <= 2) return { level: 2, label: 'Trung b\u00ecnh', color: 'var(--mood-energized)' }
    if (score === 3) return { level: 3, label: 'M\u1ea1nh', color: 'var(--mood-stable)' }
    return { level: 4, label: 'R\u1ea5t m\u1ea1nh', color: 'var(--mood-stable)' }
  }

  const strength = getPasswordStrength()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    const validationErrors = validate(name, email, password, confirmPassword)
    setErrors(validationErrors)
    setTouched({ name: true, email: true, password: true, confirmPassword: true })

    if (Object.keys(validationErrors).length > 0) return

    setLoading(true)
    try {
      await postRegister(name, email, password)
      setMood('energized')
      router.push('/onboarding')
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Kh\u00f4ng th\u1ec3 k\u1ebft n\u1ed1i t\u1edbi m\u00e1y ch\u1ee7'
      setServerError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        className="anim-fade-in-scale"
        style={{
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        {/* Logo */}
        <header style={{ textAlign: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h1
              className="gradient-text"
              style={{
                fontFamily: 'var(--font-heading, Sora, system-ui)',
                fontSize: '2.8rem',
                fontWeight: 700,
                letterSpacing: '0.18em',
                lineHeight: 1,
                margin: 0,
              }}
            >
              AURA
            </h1>
          </Link>
          <p
            style={{
              marginTop: 8,
              fontSize: '0.72rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            AI Life Coach
          </p>
        </header>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="glass-card"
          style={{
            padding: '32px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
          onMouseEnter={(e) => e.stopPropagation()}
        >
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <h2
              style={{
                fontFamily: 'var(--font-heading, Sora, system-ui)',
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              {`B\u1eaft \u0111\u1ea7u h\u00e0nh tr\u00ecnh`}
            </h2>
            <p
              style={{
                marginTop: 6,
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
              }}
            >
              {`T\u1ea1o t\u00e0i kho\u1ea3n \u0111\u1ec3 AURA \u0111\u1ed3ng h\u00e0nh c\u00f9ng b\u1ea1n`}
            </p>
          </div>

          {/* Server error */}
          {serverError && (
            <div
              className="anim-fade-in"
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgba(239, 83, 80, 0.12)',
                border: '1px solid rgba(239, 83, 80, 0.3)',
                color: 'var(--mood-overwhelmed)',
                fontSize: '0.85rem',
                lineHeight: 1.5,
              }}
            >
              {serverError}
            </div>
          )}

          {/* Name */}
          <FieldGroup
            id="register-name"
            label={`T\u00ean c\u1ee7a b\u1ea1n`}
            type="text"
            autoComplete="name"
            value={name}
            onChange={(v) => {
              setName(v)
              if (touched.name) {
                const errs = validate(v, email, password, confirmPassword)
                setErrors((prev) => ({ ...prev, name: errs.name }))
              }
            }}
            onBlur={() => handleBlur('name')}
            placeholder="VD: Minh"
            error={touched.name ? errors.name : undefined}
            disabled={loading}
          />

          {/* Email */}
          <FieldGroup
            id="register-email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(v) => {
              setEmail(v)
              if (touched.email) {
                const errs = validate(name, v, password, confirmPassword)
                setErrors((prev) => ({ ...prev, email: errs.email }))
              }
            }}
            onBlur={() => handleBlur('email')}
            placeholder="you@example.com"
            error={touched.email ? errors.email : undefined}
            disabled={loading}
          />

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              htmlFor="register-password"
              style={{
                fontSize: '0.8rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
              }}
            >
              {`M\u1eadt kh\u1ea9u`}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (touched.password) {
                    const errs = validate(name, email, e.target.value, confirmPassword)
                    setErrors((prev) => ({ ...prev, password: errs.password }))
                  }
                  if (touched.confirmPassword && confirmPassword) {
                    setErrors((prev) => ({
                      ...prev,
                      confirmPassword:
                        confirmPassword !== e.target.value
                          ? 'M\u1eadt kh\u1ea9u nh\u1eadp l\u1ea1i kh\u00f4ng kh\u1edbp'
                          : undefined,
                    }))
                  }
                }}
                onBlur={() => handleBlur('password')}
                placeholder={`\u00cdt nh\u1ea5t 6 k\u00fd t\u1ef1`}
                disabled={loading}
                className="input-underline"
                style={{
                  paddingRight: 44,
                  borderBottomColor:
                    touched.password && errors.password
                      ? 'var(--mood-overwhelmed)'
                      : undefined,
                }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  right: 4,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  padding: '6px 8px',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) =>
                  ((e.target as HTMLElement).style.color = 'var(--text-secondary)')
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLElement).style.color = 'var(--text-tertiary)')
                }
                aria-label={showPassword ? '\u1ea8n m\u1eadt kh\u1ea9u' : 'Hi\u1ec7n m\u1eadt kh\u1ea9u'}
              >
                {showPassword ? '\u1ea8n' : 'Hi\u1ec7n'}
              </button>
            </div>
            {touched.password && errors.password && (
              <span
                className="anim-fade-in"
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--mood-overwhelmed)',
                  marginTop: 2,
                }}
              >
                {errors.password}
              </span>
            )}
            {/* Password strength indicator */}
            {password.length > 0 && (
              <div
                className="anim-fade-in"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 2,
                    background: 'var(--border-default)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${(strength.level / 4) * 100}%`,
                      background: strength.color,
                      borderRadius: 2,
                      transition: 'width 0.3s ease, background 0.3s ease',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: strength.color,
                    fontWeight: 500,
                    minWidth: 60,
                    textAlign: 'right',
                  }}
                >
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <FieldGroup
            id="register-confirm-password"
            label={`Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u`}
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(v) => {
              setConfirmPassword(v)
              if (touched.confirmPassword) {
                setErrors((prev) => ({
                  ...prev,
                  confirmPassword: v !== password ? 'M\u1eadt kh\u1ea9u nh\u1eadp l\u1ea1i kh\u00f4ng kh\u1edbp' : undefined,
                }))
              }
            }}
            onBlur={() => handleBlur('confirmPassword')}
            placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
            error={touched.confirmPassword ? errors.confirmPassword : undefined}
            disabled={loading}
          />

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-mood"
            style={{
              width: '100%',
              borderRadius: 14,
              marginTop: 4,
              fontSize: '0.95rem',
              fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                <span className="typing-dot" style={{ animationDelay: '0ms' }} />
                <span className="typing-dot" style={{ animationDelay: '160ms' }} />
                <span className="typing-dot" style={{ animationDelay: '320ms' }} />
              </span>
            ) : (
              `T\u1ea1o t\u00e0i kho\u1ea3n`
            )}
          </button>
        </form>

        {/* Toggle to Login */}
        <p
          style={{
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}
        >
          {`\u0110\u00e3 c\u00f3 t\u00e0i kho\u1ea3n? `}
          <Link
            href="/login"
            style={{
              color: 'var(--mood-color)',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'filter 0.2s ease',
            }}
            onMouseEnter={(e) =>
              ((e.target as HTMLElement).style.filter = 'brightness(1.2)')
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLElement).style.filter = 'none')
            }
          >
            {`\u0110\u0103ng nh\u1eadp`}
          </Link>
        </p>
      </div>
    </div>
  )
}

/* Reusable field group */

function FieldGroup({
  id,
  label,
  type,
  autoComplete,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  disabled,
}: {
  id: string
  label: string
  type: string
  autoComplete?: string
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  placeholder: string
  error?: string
  disabled: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        htmlFor={id}
        style={{
          fontSize: '0.8rem',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="input-underline"
        style={{
          borderBottomColor: error ? 'var(--mood-overwhelmed)' : undefined,
        }}
      />
      {error && (
        <span
          className="anim-fade-in"
          style={{
            fontSize: '0.75rem',
            color: 'var(--mood-overwhelmed)',
            marginTop: 2,
          }}
        >
          {error}
        </span>
      )}
    </div>
  )
}
