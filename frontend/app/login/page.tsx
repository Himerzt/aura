'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMood } from '@/lib/mood-context'
import { postLogin } from '@/lib/api'

interface FormErrors {
  email?: string
  password?: string
}

function validate(email: string, password: string): FormErrors {
  const errors: FormErrors = {}
  if (!email.trim()) {
    errors.email = 'Vui lòng nhập email'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Email không đúng định dạng'
  }
  if (!password) {
    errors.password = 'Vui lòng nhập mật khẩu'
  } else if (password.length < 6) {
    errors.password = 'Mật khẩu phải có ít nhất 6 ký tự'
  }
  return errors
}

export default function LoginPage() {
  const router = useRouter()
  const { setMood } = useMood()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  function handleBlur(field: 'email' | 'password') {
    setTouched((t) => ({ ...t, [field]: true }))
    const newErrors = validate(email, password)
    setErrors((prev) => ({ ...prev, [field]: newErrors[field] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    const validationErrors = validate(email, password)
    setErrors(validationErrors)
    setTouched({ email: true, password: true })

    if (Object.keys(validationErrors).length > 0) return

    setLoading(true)
    try {
      await postLogin(email, password)
      setMood('stable')
      router.push('/dashboard')
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Không thể kết nối tới máy chủ'
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
          gap: 32,
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
            gap: 24,
          }}
          /* prevent hover lift on form card */
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
              Chào mừng trở lại
            </h2>
            <p
              style={{
                marginTop: 6,
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
              }}
            >
              Đăng nhập để tiếp tục hành trình của bạn
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

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              htmlFor="login-email"
              style={{
                fontSize: '0.8rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
              }}
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (touched.email) {
                  const errs = validate(e.target.value, password)
                  setErrors((prev) => ({ ...prev, email: errs.email }))
                }
              }}
              onBlur={() => handleBlur('email')}
              placeholder="you@example.com"
              disabled={loading}
              className="input-underline"
              style={{
                borderBottomColor:
                  touched.email && errors.email
                    ? 'var(--mood-overwhelmed)'
                    : undefined,
              }}
            />
            {touched.email && errors.email && (
              <span
                className="anim-fade-in"
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--mood-overwhelmed)',
                  marginTop: 2,
                }}
              >
                {errors.email}
              </span>
            )}
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              htmlFor="login-password"
              style={{
                fontSize: '0.8rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
              }}
            >
              Mật khẩu
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (touched.password) {
                    const errs = validate(email, e.target.value)
                    setErrors((prev) => ({ ...prev, password: errs.password }))
                  }
                }}
                onBlur={() => handleBlur('password')}
                placeholder="••••••••"
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
                  ((e.target as HTMLElement).style.color =
                    'var(--text-secondary)')
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLElement).style.color =
                    'var(--text-tertiary)')
                }
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? 'Ẩn' : 'Hiện'}
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
          </div>

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
              'Đăng nhập'
            )}
          </button>
        </form>

        {/* Toggle to Register */}
        <p
          style={{
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}
        >
          Chưa có tài khoản?{' '}
          <Link
            href="/register"
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
            Tạo tài khoản
          </Link>
        </p>
      </div>
    </div>
  )
}
