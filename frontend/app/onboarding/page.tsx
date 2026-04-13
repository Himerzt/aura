'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMood } from '@/lib/mood-context'

type Step = {
  key: 'name' | 'goal' | 'context' | 'past_attempts' | 'daily_anchors'
  prompt: string
  placeholder: string
  multi?: boolean
}

const STEPS: Step[] = [
  {
    key: 'name',
    prompt: 'Xin chào. Mình là AURA. Mình có thể gọi bạn là gì?',
    placeholder: 'Tên của bạn...',
  },
  {
    key: 'goal',
    prompt: 'Trong 3 tháng tới, bạn muốn thay đổi điều gì?',
    placeholder: 'Mục tiêu bạn đang hướng đến...',
  },
  {
    key: 'context',
    prompt: 'Bối cảnh cuộc sống hiện tại của bạn như thế nào?',
    placeholder: 'Công việc, học tập, các mối quan hệ...',
  },
  {
    key: 'past_attempts',
    prompt: 'Bạn đã thử những cách nào rồi? (mỗi dòng một cách, Enter để xuống dòng)',
    placeholder: 'Ví dụ: viết nhật ký, thiền...',
    multi: true,
  },
  {
    key: 'daily_anchors',
    prompt: 'Có thói quen nào bạn gần như không bao giờ bỏ qua? (điểm neo hàng ngày)',
    placeholder: 'Ví dụ: pha cà phê buổi sáng, đánh răng tối...',
    multi: true,
  },
]

type ChatMessage =
  | { role: 'aura'; text: string }
  | { role: 'user'; text: string }

export default function OnboardingPage() {
  const router = useRouter()
  const { setMood } = useMood()
  const [stepIndex, setStepIndex] = useState(0)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const answersRef = useRef<Record<string, string>>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  // Default mood = stable during onboarding (chưa biết mood của user)
  useEffect(() => {
    setMood('stable')
  }, [setMood])

  // If profile already onboarded, skip straight to morning
  useEffect(() => {
    let cancelled = false
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (!cancelled && p?.onboarding_completed) router.replace('/morning')
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [router])

  // Type out AURA's prompt whenever step changes
  useEffect(() => {
    if (stepIndex >= STEPS.length) return
    setTyping(true)
    const t = setTimeout(() => {
      setMessages((m) => [...m, { role: 'aura', text: STEPS[stepIndex].prompt }])
      setTyping(false)
    }, 900)
    return () => clearTimeout(t)
  }, [stepIndex])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, typing])

  async function handleSend() {
    const value = draft.trim()
    if (!value || typing || submitting) return
    const step = STEPS[stepIndex]

    setMessages((m) => [...m, { role: 'user', text: value }])
    answersRef.current[step.key] = value
    setDraft('')

    if (stepIndex < STEPS.length - 1) {
      setStepIndex((i) => i + 1)
      return
    }

    // Last answer collected — submit
    setSubmitting(true)
    setTyping(true)
    setError(null)

    // Optimistic "saving" bubble so user sees something happening
    setMessages((m) => [
      ...m,
      { role: 'aura', text: 'Đang lưu hồ sơ của bạn...' },
    ])

    try {
      const payload = {
        name: answersRef.current.name ?? '',
        goal: answersRef.current.goal ?? '',
        context: answersRef.current.context ?? '',
        past_attempts: (answersRef.current.past_attempts ?? '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        daily_anchors: (answersRef.current.daily_anchors ?? '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        chronotype: 'flexible',
        support_style: 'balanced',
      }

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(
          `Lưu hồ sơ thất bại (HTTP ${res.status})${body ? ': ' + body.slice(0, 160) : ''}`
        )
      }

      setMessages((m) => [
        ...m,
        {
          role: 'aura',
          text: `Cảm ơn ${payload.name}. Mình đã sẵn sàng đồng hành cùng bạn.`,
        },
      ])
      setTyping(false)
      setTimeout(() => router.push('/morning'), 1600)
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'Không thể kết nối tới máy chủ. Hãy chắc chắn bạn đang mở http://localhost/ (không phải :3000) và docker đang chạy.'
      setError(msg)
      setSubmitting(false)
      setTyping(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const step = STEPS[stepIndex]
    if (e.key === 'Enter' && !e.shiftKey && !step?.multi) {
      e.preventDefault()
      handleSend()
    }
  }

  const currentStep = STEPS[stepIndex]
  const done = stepIndex >= STEPS.length || submitting
  const progress = Math.min(stepIndex + 1, STEPS.length)

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '48px 24px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          flex: 1,
        }}
      >
        {/* Header */}
        <header style={{ textAlign: 'center' }}>
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
            AURA
          </h1>
          <p
            style={{
              marginTop: 6,
              fontSize: '0.72rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            Khởi tạo hồ sơ
          </p>

          {/* Progress dots */}
          <div
            style={{
              marginTop: 20,
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
            }}
            aria-label={`Bước ${progress} / ${STEPS.length}`}
          >
            {STEPS.map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === stepIndex && !done ? 24 : 6,
                  height: 6,
                  borderRadius: 999,
                  background:
                    i <= stepIndex
                      ? 'var(--mood-color)'
                      : 'var(--border-default)',
                  boxShadow:
                    i === stepIndex && !done ? '0 0 12px var(--mood-glow)' : 'none',
                  transition: 'all 0.5s ease',
                }}
              />
            ))}
          </div>
        </header>

        {/* Chat scroll area */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            minHeight: 360,
            maxHeight: '60vh',
            overflowY: 'auto',
            padding: '8px 4px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={msg.role === 'user' ? 'bubble-user' : 'bubble-aura'}
              style={{
                animation: 'fadeIn 0.45s ease forwards',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.55,
                fontSize: '0.95rem',
              }}
            >
              {msg.text}
            </div>
          ))}

          {typing && (
            <div
              className="bubble-aura"
              style={{ display: 'inline-flex', gap: 6, width: 'auto' }}
            >
              <span className="typing-dot" style={{ animationDelay: '0ms' }} />
              <span className="typing-dot" style={{ animationDelay: '160ms' }} />
              <span className="typing-dot" style={{ animationDelay: '320ms' }} />
            </div>
          )}
        </div>

        {/* Input row */}
        {!done && (
          <div
            className="glass-card"
            style={{
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              animation: 'fadeIn 0.5s ease forwards',
            }}
          >
            <textarea
              className="input-underline"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentStep?.placeholder ?? ''}
              rows={currentStep?.multi ? 3 : 1}
              disabled={typing || submitting}
              style={{
                resize: 'none',
                borderBottom: '1px solid var(--border-default)',
                fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                {currentStep?.multi ? 'Enter để xuống dòng' : 'Enter để gửi'}
              </span>
              <button
                type="button"
                className="btn-mood"
                onClick={handleSend}
                disabled={!draft.trim() || typing || submitting}
                style={{
                  padding: '10px 22px',
                  borderRadius: 12,
                  fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                {stepIndex === STEPS.length - 1 ? 'Hoàn tất' : 'Tiếp tục'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <p style={{ color: 'var(--mood-overwhelmed)', fontSize: '0.85rem' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
