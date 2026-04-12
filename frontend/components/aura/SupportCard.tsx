'use client'

interface Hotline {
  name: string
  number: string
  available: string
}

interface SupportCardProps {
  hotlines?: Hotline[]
  message?: string
}

const DEFAULT_HOTLINES: Hotline[] = [
  {
    name: 'Đường dây hỗ trợ sức khỏe tâm thần',
    number: '1800 599 920',
    available: '24/7',
  },
  {
    name: 'Đường dây hỗ trợ khủng hoảng tâm lý',
    number: '1800 599 921',
    available: '24/7',
  },
]

const DEFAULT_MESSAGE =
  'Cảm ơn bạn đã chia sẻ điều này. Hãy kết nối với người có thể hỗ trợ bạn tốt nhất ngay bây giờ.'

export default function SupportCard({
  hotlines = DEFAULT_HOTLINES,
  message = DEFAULT_MESSAGE,
}: SupportCardProps) {
  return (
    <div
      style={{
        background: 'rgba(212,132,138,0.08)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(212,132,138,0.2)',
        borderRadius: 'var(--card-radius, 16px)',
        padding: 'var(--card-padding, 24px)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: '1.5rem', lineHeight: 1 }} aria-hidden="true">
          🌙
        </span>
        <h3
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl, 1.25rem)',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          AURA đang ở đây cùng bạn
        </h3>
      </div>

      {/* Message */}
      <p
        style={{
          margin: '0 0 20px',
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-base, 1rem)',
          fontWeight: 300,
          color: 'var(--text-secondary)',
          lineHeight: 1.65,
        }}
      >
        {message}
      </p>

      {/* Hotlines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {hotlines.map((hotline, idx) => (
          <div
            key={idx}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              padding: '12px 16px',
            }}
          >
            {/* Name row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm, 0.875rem)',
                  color: 'var(--text-secondary)',
                  fontWeight: 400,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {hotline.name}
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--sage)',
                  background: 'rgba(143,184,160,0.12)',
                  border: '1px solid rgba(143,184,160,0.2)',
                  borderRadius: 999,
                  padding: '2px 8px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {hotline.available}
              </span>
            </div>

            {/* Number + call button */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 'var(--text-base, 1rem)',
                  fontWeight: 500,
                  color: 'var(--amber)',
                  letterSpacing: '0.06em',
                }}
              >
                {hotline.number}
              </span>

              <a
                href={`tel:${hotline.number.replace(/\s/g, '')}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  border: '1px solid var(--amber)',
                  borderRadius: 8,
                  background: 'transparent',
                  color: 'var(--amber)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-sm, 0.875rem)',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'background 0.2s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLAnchorElement).style.background =
                    'var(--amber-dim)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLAnchorElement).style.background =
                    'transparent'
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M6.62 10.79C8.06 13.62 10.38 15.93 13.21 17.38L15.41 15.18C15.68 14.91 16.08 14.82 16.43 14.94C17.55 15.31 18.76 15.51 20 15.51C20.55 15.51 21 15.96 21 16.51V20C21 20.55 20.55 21 20 21C10.61 21 3 13.39 3 4C3 3.45 3.45 3 4 3H7.5C8.05 3 8.5 3.45 8.5 4C8.5 5.25 8.7 6.45 9.07 7.57C9.18 7.92 9.1 8.31 8.82 8.59L6.62 10.79Z"
                    fill="currentColor"
                  />
                </svg>
                Gọi ngay
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
