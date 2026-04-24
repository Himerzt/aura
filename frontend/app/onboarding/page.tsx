'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMood } from '@/lib/mood-context'
import type { UserProfile } from '@/lib/types'

type Step = {
  key: 'name' | 'goal' | 'context' | 'past_attempts' | 'daily_anchors'
  prompt: string
  placeholder: string
  multi?: boolean
}

type Mode = 'loading' | 'review' | 'editing' | 'fresh'

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
  const [mode, setMode] = useState<Mode>('loading')
  const [existingProfile, setExistingProfile] = useState<UserProfile | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const answersRef = useRef<Record<string, string>>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  // Default mood = stable during onboarding
  useEffect(() => {
    setMood('stable')
  }, [setMood])

  // On mount: decide review vs fresh
  useEffect(() => {
    let cancelled = false
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((p: UserProfile | null) => {
        if (cancelled) return
        if (p?.onboarding_completed) {
          setExistingProfile(p)
          answersRef.current = {
            name: p.name ?? '',
            goal: p.goal ?? '',
            context: p.context ?? '',
            past_attempts: (p.past_attempts ?? []).join('\n'),
            daily_anchors: (p.daily_anchors ?? []).join('\n'),
          }
          setMode('review')
        } else {
          setMode('fresh')
        }
      })
      .catch(() => {
        if (!cancelled) setMode('fresh')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Type AURA prompt when entering each step (fresh or editing)
  useEffect(() => {
    if (mode !== 'fresh' && mode !== 'editing') return
    if (stepIndex >= STEPS.length) return
    setTyping(true)
    const t = setTimeout(() => {
      setMessages((m) => [...m, { role: 'aura', text: STEPS[stepIndex].prompt }])
      setTyping(false)
      // In editing mode, prefill draft with the user's existing answer
      // so they can keep it as-is or modify it.
      if (mode === 'editing') {
        setDraft(answersRef.current[STEPS[stepIndex].key] ?? '')
      }
    }, 900)
    return () => clearTimeout(t)
  }, [stepIndex, mode])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, typing])

  function startEditing() {
    if (!existingProfile) return
    setMessages([
      {
        role: 'aura',
        text: `Chào lại ${existingProfile.name}. Mình sẽ điểm lại 5 thông tin để hiểu bối cảnh hiện tại của bạn rõ hơn. Bạn có thể giữ nguyên hoặc viết lại.`,
      },
    ])
    setStepIndex(0)
    setMode('editing')
  }

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

      const successText =
        mode === 'editing'
          ? `Đã cập nhật hồ sơ. Cảm ơn ${payload.name}.`
          : `Cảm ơn ${payload.name}. Mình đã sẵn sàng đồng hành cùng bạn.`

      setMessages((m) => [...m, { role: 'aura', text: successText }])
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

  const inChat = mode === 'fresh' || mode === 'editing'
  const currentStep = STEPS[stepIndex]
  const done = stepIndex >= STEPS.length || submitting
  const progress = Math.min(stepIndex + 1, STEPS.length)
  const headerSubtitle =
    mode === 'review' || mode === 'editing' ? 'Cập nhật hồ sơ' : 'Khởi tạo hồ sơ'

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
            {headerSubtitle}
          </p>

          {inChat && (
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
                      i === stepIndex && !done
                        ? '0 0 12px var(--mood-glow)'
                        : 'none',
                    transition: 'all 0.5s ease',
                  }}
                />
              ))}
            </div>
          )}
        </header>

        {mode === 'loading' && (
          <p
            style={{
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              fontSize: '0.85rem',
            }}
          >
            Đang tải hồ sơ...
          </p>
        )}

        {mode === 'review' && existingProfile && (
          <ReviewCard
            profile={existingProfile}
            onKeep={() => router.push('/morning')}
            onEdit={startEditing}
          />
        )}

        {inChat && (
          <>
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
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {currentStep?.multi ? 'Enter để xuống dòng' : 'Enter để gửi'}
                  </span>
                  <button
                    type="button"
                    className="btn-mood"
                    onClick={handleSend}
                    disabled={!draft.trim() || typing || submitting}
                    style={{
                      padding: '10px 22px',
                      minHeight: 44,
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
          </>
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

function ReviewCard({
  profile,
  onKeep,
  onEdit,
}: {
  profile: UserProfile
  onKeep: () => void
  onEdit: () => void
}) {
  return (
    <div
      className="glass-card anim-fade-in-up"
      style={{
        padding: 26,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <p
        style={{
          margin: 0,
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
          lineHeight: 1.6,
        }}
      >
        Chào lại{' '}
        <strong style={{ color: 'var(--text-primary)' }}>{profile.name}</strong>.
        Có gì thay đổi trong thời gian qua không? Hãy điểm lại để mình hiểu bối
        cảnh hiện tại của bạn rõ hơn — task gợi ý sẽ phù hợp hơn nhiều.
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          paddingTop: 4,
        }}
      >
        <ProfileRow label="Mục tiêu" value={profile.goal} />
        <ProfileRow label="Bối cảnh" value={profile.context} />
        <ProfileRow
          label="Đã thử"
          value={profile.past_attempts?.join(' • ') || '—'}
        />
        <ProfileRow
          label="Điểm neo hàng ngày"
          value={profile.daily_anchors?.join(' • ') || '—'}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginTop: 4,
        }}
      >
        <button
          type="button"
          className="btn-mood"
          onClick={onKeep}
          style={{
            padding: '12px 22px',
            minHeight: 44,
            borderRadius: 12,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Mọi thứ vẫn vậy
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={onEdit}
          style={{
            padding: '12px 22px',
            minHeight: 44,
            borderRadius: 12,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Cập nhật hồ sơ
        </button>
      </div>
    </div>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: '0.68rem',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: 'var(--text-tertiary)',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '0.92rem',
          color: 'var(--text-primary)',
          lineHeight: 1.5,
        }}
      >
        {value || '—'}
      </div>
    </div>
  )
}
