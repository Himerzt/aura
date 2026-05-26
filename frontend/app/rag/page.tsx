'use client'

import { useState } from 'react'
import { queryRag } from '@/lib/api'
import type { RagResponse, RagSource } from '@/lib/types'

const SAMPLE_QUESTIONS = [
  'AURA khác chatbot motivational ở điểm nào?',
  'Implementation Intention dùng khi nào?',
  'Behavioral Activation hoạt động ra sao?',
  'AURA chọn framework như thế nào?',
]

const CONFIDENCE_CONFIG = {
  high: {
    label: 'Cao',
    color: 'var(--mood-stable)',
    bg: 'color-mix(in srgb, var(--mood-stable) 12%, transparent)',
    border: 'color-mix(in srgb, var(--mood-stable) 35%, transparent)',
  },
  medium: {
    label: 'Trung bình',
    color: 'var(--mood-energized)',
    bg: 'color-mix(in srgb, var(--mood-energized) 12%, transparent)',
    border: 'color-mix(in srgb, var(--mood-energized) 35%, transparent)',
  },
  low: {
    label: 'Thấp',
    color: 'var(--text-tertiary)',
    bg: 'var(--bg-overlay)',
    border: 'var(--border-default)',
  },
}

export default function RagPage() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RagResponse | null>(null)

  async function handleSubmit() {
    const q = input.trim()
    if (!q || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await queryRag(q)
      setResult(res)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra. Hãy thử lại.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 'clamp(24px, 5vw, 48px) clamp(16px, 4vw, 24px) clamp(32px, 8vw, 64px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 640 }}>

        {/* Header */}
        <header className="anim-fade-in-up" style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1
            className="gradient-text"
            style={{
              fontFamily: 'var(--font-heading, Sora, system-ui)',
              fontSize: '2.25rem',
              fontWeight: 700,
              letterSpacing: '0.18em',
              lineHeight: 1,
              margin: 0,
            }}
          >
            RAG LAB
          </h1>
          <p
            style={{
              marginTop: 8,
              fontSize: '0.72rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            Hỏi đáp dựa trên tài liệu nội bộ của AURA
          </p>
        </header>

        {/* Input card */}
        <div className="glass-card anim-fade-in-up" style={{ padding: 24, marginBottom: 24 }}>
          <textarea
            className="input-underline"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={500}
            placeholder="Nhập câu hỏi của bạn về AURA... (Ctrl+Enter để gửi)"
            rows={4}
            style={{
              resize: 'vertical',
              minHeight: 100,
              fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              borderBottom: '1px solid var(--border-default)',
              width: '100%',
              background: 'transparent',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              marginTop: 12,
            }}
          >
            <span style={{
              fontSize: '0.72rem',
              color: input.length >= 450 ? 'var(--mood-overwhelmed)' : 'var(--text-tertiary)',
            }}>
              {input.length}/500
            </span>
            <button
              type="button"
              className="btn-mood"
              onClick={handleSubmit}
              disabled={loading || !input.trim()}
              style={{ borderRadius: 12, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Đang tìm...' : 'Hỏi AURA'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                marginTop: 16,
                padding: '12px 16px',
                borderRadius: 10,
                background: 'color-mix(in srgb, var(--mood-overwhelmed) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--mood-overwhelmed) 30%, transparent)',
                color: 'var(--text-secondary)',
                fontSize: '0.88rem',
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading && <RagLoadingState />}

        {/* Result */}
        {!loading && result && (
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <RagAnswerCard result={result} />
            {result.sources.length > 0 && (
              <RagSourcesCard sources={result.sources} />
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && !result && !error && (
          <RagEmptyState onSampleClick={(q) => setInput(q)} />
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────

function RagLoadingState() {
  return (
    <div
      className="glass-card anim-fade-in"
      style={{
        padding: 48,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '2px solid var(--border-default)',
          borderTopColor: 'var(--mood-color)',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', textAlign: 'center' }}>
        Đang tìm câu trả lời trong tài liệu...
      </p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

function RagAnswerCard({ result }: { result: RagResponse }) {
  const cfg = CONFIDENCE_CONFIG[result.confidence]
  return (
    <div className="glass-card hover-lift" style={{ padding: 28 }}>
      {/* Confidence badge */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 999,
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            color: cfg.color,
            fontSize: '0.72rem',
            fontWeight: 500,
            letterSpacing: '0.06em',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: cfg.color,
              boxShadow: `0 0 6px ${cfg.color}`,
              flexShrink: 0,
            }}
          />
          Độ chắc chắn: {cfg.label}
        </span>
        {!result.used_context && (
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-tertiary)',
              fontStyle: 'italic',
            }}
          >
            (không tìm thấy tài liệu liên quan)
          </span>
        )}
      </div>

      {/* Answer */}
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
          fontSize: '1rem',
          lineHeight: 1.75,
          color: 'var(--text-primary)',
        }}
      >
        {result.answer}
      </p>
    </div>
  )
}

function RagSourcesCard({ sources }: { sources: RagSource[] }) {
  return (
    <div>
      <p
        style={{
          margin: '0 0 10px 4px',
          fontSize: '0.7rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        Nguồn tham khảo
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sources.map((s, i) => (
          <div
            key={s.chunk_id}
            className="glass-card"
            style={{
              padding: '14px 18px',
              borderLeft: '2px solid var(--mood-color)',
              opacity: 0.85,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  lineHeight: 1.4,
                }}
              >
                {s.title}
              </p>
              <span
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-tertiary)',
                  flexShrink: 0,
                  paddingTop: 2,
                }}
              >
                {Math.round(s.score * 100)}%
              </span>
            </div>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}
            >
              {s.preview}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function RagEmptyState({ onSampleClick }: { onSampleClick: (q: string) => void }) {
  return (
    <div className="anim-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Info card */}
      <div
        className="glass-card"
        style={{
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          borderLeft: '2px solid var(--mood-color)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-heading, Sora, system-ui)',
            fontSize: '1.05rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.4,
          }}
        >
          RAG Lab là gì?
        </p>
        <p
          style={{
            margin: 0,
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.65,
          }}
        >
          Đây là nơi bạn có thể hỏi AURA về cách hoạt động, các framework tâm lý mà AURA sử dụng, và những nguyên tắc đằng sau hệ thống.
          Câu trả lời được tạo từ tài liệu nội bộ của AURA — không phải kiến thức chung trên internet.
        </p>
      </div>

      {/* Sample questions */}
      <div>
        <p
          style={{
            margin: '0 0 10px 4px',
            fontSize: '0.7rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          Thử hỏi ngay
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onSampleClick(q)}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                border: '1px solid var(--border-default)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                fontSize: '0.88rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                lineHeight: 1.5,
                fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget
                el.style.borderColor = 'var(--border-strong)'
                el.style.color = 'var(--text-primary)'
                el.style.background = 'var(--bg-overlay)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget
                el.style.borderColor = 'var(--border-default)'
                el.style.color = 'var(--text-secondary)'
                el.style.background = 'var(--bg-elevated)'
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Done 26/05/2026
