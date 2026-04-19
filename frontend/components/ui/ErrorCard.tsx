'use client'

import { useEffect, useState } from 'react'

interface ErrorCardProps {
  error?: unknown
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
}

type ErrorShape = 'offline' | 'server' | 'not_found' | 'generic'

function classifyError(error: unknown): { shape: ErrorShape; raw: string } {
  if (error == null) return { shape: 'generic', raw: '' }
  const raw = error instanceof Error ? error.message : String(error)
  const lower = raw.toLowerCase()

  if (
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('networkerror') ||
    lower.includes('connection refused') ||
    lower.includes('econnrefused')
  ) {
    return { shape: 'offline', raw }
  }
  if (/\b5\d\d\b/.test(raw) || lower.includes('internal server')) {
    return { shape: 'server', raw }
  }
  if (/\b404\b/.test(raw) || lower.includes('not found')) {
    return { shape: 'not_found', raw }
  }
  return { shape: 'generic', raw }
}

const COPY: Record<ErrorShape, { title: string; body: string }> = {
  offline: {
    title: 'AURA đang không nghe thấy bạn',
    body: 'Có vẻ như kết nối tới máy chủ đang bị gián đoạn. Hãy kiểm tra mạng hoặc đảm bảo backend đang chạy rồi thử lại.',
  },
  server: {
    title: 'AURA đang gặp trục trặc',
    body: 'Máy chủ đang có vấn đề nội bộ. Việc bạn vừa thử chưa được lưu. Hãy thử lại sau vài giây.',
  },
  not_found: {
    title: 'Không tìm thấy dữ liệu',
    body: 'Tài nguyên bạn yêu cầu không tồn tại hoặc đã bị xoá.',
  },
  generic: {
    title: 'Có chút không ổn',
    body: 'Đã có lỗi xảy ra khi tải dữ liệu. Bạn có thể thử lại.',
  },
}

export default function ErrorCard({
  error,
  title,
  message,
  onRetry,
  retryLabel = 'Thử lại',
}: ErrorCardProps) {
  const { shape, raw } = classifyError(error)
  const copy = COPY[shape]
  const finalTitle = title ?? copy.title
  const finalMessage = message ?? copy.body
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div
      className="glass-card anim-fade-in-up"
      role="alert"
      aria-live="polite"
      style={{
        padding: 28,
        borderLeft: '3px solid var(--mood-overwhelmed)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          aria-hidden
          style={{
            width: 36,
            height: 36,
            minWidth: 36,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'color-mix(in srgb, var(--mood-overwhelmed) 18%, transparent)',
            color: 'var(--mood-overwhelmed)',
            fontSize: '1.1rem',
            fontWeight: 600,
            fontFamily: 'var(--font-heading, Sora, system-ui)',
          }}
        >
          !
        </span>
        <h3
          style={{
            margin: 0,
            fontSize: '1.05rem',
            fontFamily: 'var(--font-heading, Sora, system-ui)',
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.4,
          }}
        >
          {finalTitle}
        </h3>
      </div>
      <p
        style={{
          margin: 0,
          color: 'var(--text-secondary)',
          lineHeight: 1.65,
          fontSize: '0.95rem',
        }}
      >
        {finalMessage}
      </p>
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginTop: 4,
        }}
      >
        {onRetry && (
          <button
            type="button"
            className="btn-ghost"
            onClick={onRetry}
            style={{
              borderRadius: 12,
              cursor: 'pointer',
              padding: '10px 20px',
              minHeight: 44,
              fontSize: '0.88rem',
            }}
          >
            {retryLabel}
          </button>
        )}
        {raw && raw !== finalMessage && (
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              padding: '4px 8px',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            {showDetails ? 'Ẩn chi tiết' : 'Chi tiết kỹ thuật'}
          </button>
        )}
      </div>
      {showDetails && raw && (
        <pre
          style={{
            margin: 0,
            padding: 12,
            borderRadius: 8,
            background: 'var(--bg-void)',
            color: 'var(--text-tertiary)',
            fontSize: '0.75rem',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            overflowX: 'auto',
            lineHeight: 1.5,
            border: '1px solid var(--border-default)',
          }}
        >
          {raw}
        </pre>
      )}
    </div>
  )
}

/**
 * Small inline variant — for use inside a page that already has other content.
 */
export function InlineError({
  error,
  onRetry,
}: {
  error?: unknown
  onRetry?: () => void
}) {
  const { shape, raw } = classifyError(error)
  const copy = COPY[shape]

  return (
    <div
      className="anim-fade-in"
      role="alert"
      style={{
        padding: '12px 16px',
        borderRadius: 12,
        border: '1px solid color-mix(in srgb, var(--mood-overwhelmed) 40%, transparent)',
        background: 'color-mix(in srgb, var(--mood-overwhelmed) 8%, transparent)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          fontSize: '0.88rem',
          color: 'var(--text-primary)',
          flex: 1,
          minWidth: 200,
          lineHeight: 1.5,
        }}
      >
        {copy.title}
        {raw ? ` — ${raw}` : ''}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            border: '1px solid var(--border-strong)',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontSize: '0.78rem',
            padding: '6px 14px',
            borderRadius: 999,
            cursor: 'pointer',
            minHeight: 36,
          }}
        >
          Thử lại
        </button>
      )}
    </div>
  )
}

/**
 * Backend health probe hook — lightweight, checks /api/profile.
 * Only used optionally by pages that want a proactive "backend down" banner.
 */
export function useBackendOnline(pingPath: string = '/api/profile'): boolean | null {
  const [online, setOnline] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(pingPath, { method: 'GET' })
      .then((r) => {
        if (cancelled) return
        setOnline(r.ok || r.status < 500)
      })
      .catch(() => {
        if (!cancelled) setOnline(false)
      })
    return () => { cancelled = true }
  }, [pingPath])

  return online
}
