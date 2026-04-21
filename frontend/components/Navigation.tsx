'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/lib/theme-context'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '◉' },
  { href: '/morning',   label: 'Morning',   icon: '☀' },
  { href: '/checklist', label: 'Checklist', icon: '✓' },
  { href: '/evening',   label: 'Evening',   icon: '◐' },
]

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Chuyển sang Light mode' : 'Chuyển sang Dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 0 : 8,
        padding: compact ? '8px' : '8px 12px',
        borderRadius: '999px',
        border: '1px solid var(--border-default)',
        background: 'var(--bg-elevated)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: compact ? '1rem' : '0.8rem',
        fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
        transition: 'all 0.2s ease',
        minWidth: compact ? 44 : 'auto',
        minHeight: compact ? 44 : 44,
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)'
        ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'
        ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
      }}
    >
      <span style={{ fontSize: '1em', lineHeight: 1 }}>
        {isDark ? '☀' : '◑'}
      </span>
      {!compact && (
        <span>{isDark ? 'Light' : 'Dark'}</span>
      )}
    </button>
  )
}

const AUTH_ROUTES = ['/login', '/register']

export default function Navigation() {
  const pathname = usePathname()

  // Hide navigation on auth pages for a clean standalone experience
  if (AUTH_ROUTES.includes(pathname ?? '')) return null

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <nav
        className="hidden md:flex flex-col fixed left-0 top-0 h-full w-60 z-50"
        style={{
          background: 'var(--bg-void)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        {/* Logo */}
        <div className="px-6 pt-8 pb-6">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span
              className="gradient-text"
              style={{
                fontFamily: 'var(--font-heading, Sora, system-ui)',
                fontSize: '1.75rem',
                fontWeight: 700,
                letterSpacing: '0.18em',
                display: 'block',
                lineHeight: 1,
              }}
            >
              AURA
            </span>
            <span
              style={{
                fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
                fontSize: '0.65rem',
                letterSpacing: '0.15em',
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                display: 'block',
                marginTop: 4,
              }}
            >
              AI Life Coach
            </span>
          </Link>
        </div>

        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0 24px' }} />

        {/* Nav Links */}
        <div className="flex flex-col gap-1 px-3 mt-4 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
                style={{
                  color:      isActive ? 'var(--amber)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--amber-dim)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'
                    ;(e.currentTarget as HTMLAnchorElement).style.background = 'var(--bg-overlay)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)'
                    ;(e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                  }
                }}
              >
                <span
                  className="text-lg w-6 text-center"
                  style={{ opacity: isActive ? 1 : 0.7 }}
                >
                  {item.icon}
                </span>
                <span
                  className="text-sm"
                  style={{
                    fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {item.label}
                </span>
                {isActive && (
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--amber)' }}
                  />
                )}
              </Link>
            )
          })}
        </div>

        {/* Bottom: Theme Toggle */}
        <div
          className="px-5 py-5"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <ThemeToggle />
        </div>
      </nav>

      {/* ── Mobile Bottom Bar ── */}
      <nav
        className="flex md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'var(--bg-void)',
          borderTop: '1px solid var(--border-subtle)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all duration-200"
              style={{
                color: isActive ? 'var(--amber)' : 'var(--text-tertiary)',
                minHeight: '56px',
              }}
            >
              <span className="text-xl leading-none" style={{ opacity: isActive ? 1 : 0.6 }}>
                {item.icon}
              </span>
              <span
                className="text-xs"
                style={{
                  fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {item.label}
              </span>
              {isActive && (
                <span
                  className="absolute bottom-0 w-8 h-0.5 rounded-full"
                  style={{ background: 'var(--amber)' }}
                />
              )}
            </Link>
          )
        })}

        {/* Theme toggle — compact icon in mobile bar */}
        <div className="flex items-center justify-center px-3">
          <ThemeToggle compact />
        </div>
      </nav>
    </>
  )
}
