'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MoodOrb from '@/components/aura/MoodOrb'
import { useMood } from '@/lib/mood-context'
import { InlineError } from '@/components/ui/ErrorCard'
import { postMorning, getProfile, getHistory, getBadDayMessageToday, markBadDayMessageUsed } from '@/lib/api'
import type { BadDayMessageEntry } from '@/lib/api'
import type { DayEntry, MorningResult, Task } from '@/lib/types'

const MOOD_LABELS: Record<string, string> = {
  energized: 'Tràn năng lượng',
  stable: 'Ổn định',
  anxious: 'Lo âu',
  overwhelmed: 'Quá tải',
  numb: 'Tê liệt',
}

const FRAMEWORK_LABELS: Record<string, string> = {
  '80_20_pareto': 'Pareto 80/20',
  behavioral_activation: 'Behavioral Activation',
  implementation_intention: 'Implementation Intention',
  habit_stacking: 'Habit Stacking',
  self_compassion: 'Self-Compassion',
  progress_principle: 'Progress Principle',
  two_minute_rule: '2-Minute Rule',
  dunning_kruger: 'Dunning-Kruger',
}

interface PreCommit {
  when: string
  what: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function readPreCommit(): PreCommit | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(`aura_precommit_${todayIso()}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PreCommit>
    if (parsed.when && parsed.what) {
      return { when: parsed.when, what: parsed.what }
    }
  } catch {
    // ignore
  }
  return null
}

function computeMissedDays(history: DayEntry[]): number {
  // history is last 7 days (newest→oldest). Count leading gap days before first morning entry.
  const arr = history as Array<{ date?: string; morning?: unknown }>
  const today = todayIso()
  // Walk day-by-day backwards from yesterday; count consecutive days with no morning entry.
  const byDate = new Map<string, boolean>()
  for (const d of arr) {
    if (d.date) byDate.set(d.date, !!d.morning)
  }
  let gap = 0
  const cursor = new Date(today)
  cursor.setDate(cursor.getDate() - 1)
  for (let i = 0; i < 7; i++) {
    const iso = cursor.toISOString().slice(0, 10)
    if (byDate.get(iso)) break
    gap++
    cursor.setDate(cursor.getDate() - 1)
  }
  return gap
}

export default function MorningPage() {
  const router = useRouter()
  const { setMood } = useMood()
  const [userInput, setUserInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [result, setResult] = useState<MorningResult | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [preCommit, setPreCommit] = useState<PreCommit | null>(null)
  const [missedDays, setMissedDays] = useState<number>(0)
  const [gentleMode, setGentleMode] = useState(false)
  const [badDayMsg, setBadDayMsg] = useState<BadDayMessageEntry | null>(null)
  const [badDayDismissed, setBadDayDismissed] = useState(false)

  // Fetch profile — if not onboarded, redirect
  useEffect(() => {
    let cancelled = false
    getProfile()
      .then((p) => {
        if (cancelled) return
        if (!p?.onboarding_completed) {
          router.replace('/onboarding')
          return
        }
        setUserName(p.name || '')
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [router])

  // Read last-night pre-commit + detect miss ≥ 3 days
  useEffect(() => {
    const pc = readPreCommit()
    setPreCommit(pc)
    getHistory()
      .then((hist) => {
        const gap = computeMissedDays(hist)
        setMissedDays(gap)
        if (gap >= 3) setGentleMode(true)
      })
      .catch(() => {})
  }, [])

  const applyPreCommit = () => {
    if (!preCommit) return
    const sentence = `Sáng nay tôi sẽ ${preCommit.what} (đã hứa: lúc ${preCommit.when}).`
    setUserInput((prev) => (prev.trim() ? `${prev}\n\n${sentence}` : sentence))
  }

  const applyGentleStart = () => {
    setUserInput('Tôi muốn bắt đầu lại bằng một điều nhỏ nhất có thể.')
  }

  async function handleSubmit() {
    const input = userInput.trim()
    if (!input || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await postMorning(input)
      setResult(res)
      if (res.type === 'morning' && res.wellness?.mood_state) {
        setMood(res.wellness.mood_state)
        // Fetch bad-day message if mood is overwhelmed/numb
        if (res.wellness.mood_state === 'overwhelmed' || res.wellness.mood_state === 'numb') {
          getBadDayMessageToday()
            .then((bdm) => {
              if (bdm.available && bdm.entry) {
                setBadDayMsg(bdm.entry)
              }
            })
            .catch(() => {})
        }
      } else if (res.type === 'crisis') {
        setMood('overwhelmed')
      }
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
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
            AURA
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
            Check-in buổi sáng
          </p>
          {userName && !result && (
            <p
              style={{
                marginTop: 16,
                fontSize: '1rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
              }}
            >
              Chào buổi sáng, <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{userName}</span>.
              <br />
              Hôm nay bạn đang cảm thấy thế nào?
            </p>
          )}
        </header>

        {/* Gentle re-entry banner — appears only when user missed ≥ 3 days */}
        {!result && !loading && gentleMode && (
          <div
            className="glass-card anim-fade-in-up"
            style={{
              padding: 20,
              marginBottom: 16,
              borderLeft: '2px solid var(--mood-color-soft, var(--mood-color))',
              background: 'var(--bg-elevated)',
            }}
          >
            <p
              style={{
                margin: '0 0 6px',
                fontSize: '0.65rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              Chào mừng trở lại · {missedDays} ngày vắng
            </p>
            <p
              style={{
                margin: '0 0 12px',
                fontSize: '0.95rem',
                color: 'var(--text-primary)',
                lineHeight: 1.6,
              }}
            >
              Không sao cả. Hôm nay bạn muốn bắt đầu lại bằng điều gì nhỏ nhất?
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={applyGentleStart}
                style={{
                  borderRadius: 999,
                  cursor: 'pointer',
                  padding: '6px 14px',
                  fontSize: '0.78rem',
                }}
              >
                Dùng câu gợi ý
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setGentleMode(false)}
                style={{
                  borderRadius: 999,
                  cursor: 'pointer',
                  padding: '6px 14px',
                  fontSize: '0.78rem',
                  opacity: 0.75,
                }}
              >
                Tôi tự viết
              </button>
            </div>
          </div>
        )}

        {/* Pre-commit IF-THEN from last night */}
        {!result && !loading && preCommit && (
          <div
            className="glass-card anim-fade-in-up"
            style={{
              padding: 20,
              marginBottom: 16,
              borderLeft: '2px solid var(--mood-color)',
              background: 'var(--bg-elevated)',
            }}
          >
            <p
              style={{
                margin: '0 0 6px',
                fontSize: '0.65rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              Đêm qua bạn đã khoá
            </p>
            <p
              style={{
                margin: '0 0 12px',
                fontSize: '0.95rem',
                color: 'var(--text-primary)',
                lineHeight: 1.6,
              }}
            >
              Ngày mai lúc <b>{preCommit.when}</b> tôi sẽ <b>{preCommit.what}</b>.
            </p>
            <button
              type="button"
              className="btn-ghost"
              onClick={applyPreCommit}
              style={{
                borderRadius: 999,
                cursor: 'pointer',
                padding: '6px 14px',
                fontSize: '0.78rem',
              }}
            >
              Dùng làm input sáng nay
            </button>
          </div>
        )}

        {/* Input form */}
        {!result && !loading && (
          <div
            className="glass-card anim-fade-in-up"
            style={{
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <textarea
              className="input-underline"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Viết tự do — mọi cảm xúc đều được chào đón..."
              rows={5}
              style={{
                resize: 'vertical',
                minHeight: 120,
                fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                borderBottom: '1px solid var(--border-default)',
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
                {userInput.trim().length} ký tự
              </span>
              <button
                type="button"
                className="btn-mood"
                onClick={handleSubmit}
                disabled={!userInput.trim()}
                style={{ borderRadius: 12, cursor: 'pointer' }}
              >
                Gửi cho AURA
              </button>
            </div>
            {error != null && (
              <InlineError
                error={error}
                onRetry={() => { setError(null); void handleSubmit() }}
              />
            )}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div
            className="glass-card anim-fade-in"
            style={{
              padding: 48,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 24,
            }}
          >
            <div className="anim-breathe">
              <MoodOrb mood="stable" size={120} energy={5} />
            </div>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.95rem',
                textAlign: 'center',
                margin: 0,
              }}
            >
              AURA đang lắng nghe và suy ngẫm...
            </p>
            <div style={{ display: 'inline-flex', gap: 6 }}>
              <span className="typing-dot" style={{ animationDelay: '0ms' }} />
              <span className="typing-dot" style={{ animationDelay: '160ms' }} />
              <span className="typing-dot" style={{ animationDelay: '320ms' }} />
            </div>
          </div>
        )}

        {/* Bad-day interstitial — shown before result when mood is bad */}
        {result && result.type === 'morning' && badDayMsg && !badDayDismissed && (
          <BadDayInterstitial
            entry={badDayMsg}
            onContinue={() => {
              markBadDayMessageUsed(badDayMsg.id).catch(() => {})
              setBadDayDismissed(true)
            }}
          />
        )}

        {/* Result view */}
        {result && result.type === 'crisis' && (
          <CrisisView result={result} onReset={() => setResult(null)} />
        )}

        {result && result.type === 'morning' && (!badDayMsg || badDayDismissed) && (
          <MorningResultView
            result={result}
            onSaveAndStart={() => router.push('/checklist')}
            onReset={() => {
              setResult(null)
              setUserInput('')
              setBadDayMsg(null)
              setBadDayDismissed(false)
            }}
          />
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Morning result view
// ──────────────────────────────────────────────────────────────────────────────

function MorningResultView({
  result,
  onSaveAndStart,
  onReset,
}: {
  result: MorningResult
  onSaveAndStart: () => void
  onReset: () => void
}) {
  const wellness = result.wellness!
  const insight = result.insight!
  const tasks = result.tasks ?? []
  const moodLabel = MOOD_LABELS[wellness.mood_state] ?? wellness.mood_state
  const frameworkLabel =
    FRAMEWORK_LABELS[insight.recommended_framework] ?? insight.recommended_framework

  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Section 1: Mood */}
      <div
        className="glass-card"
        style={{
          padding: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <MoodOrb mood={wellness.mood_state} size={96} energy={wellness.energy_level} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.7rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            Trạng thái
          </p>
          <h2
            style={{
              margin: '4px 0 12px',
              fontFamily: 'var(--font-heading, Sora, system-ui)',
              fontSize: '1.6rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {moodLabel}
          </h2>
          <SimpleEnergyBar level={wellness.energy_level} />
        </div>
      </div>

      {/* Section 2: Insight */}
      <div className="glass-card" style={{ padding: 28 }}>
        <div
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: 999,
            border: '1px solid color-mix(in srgb, var(--mood-color) 40%, transparent)',
            background: 'color-mix(in srgb, var(--mood-color) 12%, transparent)',
            color: 'var(--text-primary)',
            fontSize: '0.72rem',
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 14,
          }}
        >
          {frameworkLabel}
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-heading, Sora, system-ui)',
            fontSize: '1.15rem',
            lineHeight: 1.6,
            color: 'var(--text-primary)',
            fontWeight: 500,
          }}
        >
          {insight.explanation_for_user}
        </p>
        {insight.why_this_happens && (
          <p
            style={{
              margin: '14px 0 0',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.65,
            }}
          >
            {insight.why_this_happens}
          </p>
        )}
      </div>

      {/* Section 3: Tasks */}
      {tasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.7rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
              paddingLeft: 4,
            }}
          >
            Hành động hôm nay
          </p>
          {tasks.map((task, i) => (
            <SimpleTaskCard key={i} task={task} index={i + 1} />
          ))}
        </div>
      )}

      {/* Encouragement */}
      {result.encouragement && (
        <p
          style={{
            margin: '4px 0 0',
            textAlign: 'center',
            fontSize: '0.95rem',
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
            lineHeight: 1.6,
          }}
        >
          {result.encouragement}
        </p>
      )}

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginTop: 8,
        }}
      >
        <button
          type="button"
          className="btn-mood"
          onClick={onSaveAndStart}
          style={{ borderRadius: 12, cursor: 'pointer' }}
        >
          Lưu & Bắt đầu ngày
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={onReset}
          style={{ borderRadius: 12, cursor: 'pointer' }}
        >
          Viết lại
        </button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Crisis view
// ──────────────────────────────────────────────────────────────────────────────

function CrisisView({
  result,
  onReset,
}: {
  result: MorningResult
  onReset: () => void
}) {
  const hotlines = result.hotlines ?? [
    { name: 'Đường dây hỗ trợ sức khỏe tâm thần', number: '1800 599 920', available: '24/7' },
  ]
  return (
    <div
      className="glass-card anim-fade-in-up"
      style={{
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        borderColor: 'color-mix(in srgb, var(--mood-overwhelmed) 40%, transparent)',
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-heading, Sora, system-ui)',
          fontSize: '1.4rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}
      >
        AURA đang ở đây cùng bạn
      </h2>
      <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
        {result.message ??
          'Cảm ơn bạn đã chia sẻ. Điều bạn đang cảm thấy rất nặng nề và bạn không nên chịu đựng một mình. Hãy gọi đường dây dưới đây ngay bây giờ.'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {hotlines.map((h, i) => (
          <a
            key={i}
            href={`tel:${h.number.replace(/\s/g, '')}`}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px',
              borderRadius: 12,
              border: '1px solid var(--border-strong)',
              background: 'var(--bg-overlay)',
              textDecoration: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
            }}
          >
            <span>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>{h.name}</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                {h.available}
              </span>
            </span>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--mood-color)',
                letterSpacing: '0.04em',
              }}
            >
              {h.number}
            </span>
          </a>
        ))}
      </div>
      <button
        type="button"
        className="btn-ghost"
        onClick={onReset}
        style={{ alignSelf: 'center', borderRadius: 12, cursor: 'pointer' }}
      >
        Quay lại
      </button>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Small helpers (simple, inline, v2.1-compatible)
// ──────────────────────────────────────────────────────────────────────────────

function SimpleEnergyBar({ level }: { level: number }) {
  const clamped = Math.max(1, Math.min(10, Math.round(level)))
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.7rem',
          color: 'var(--text-tertiary)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        <span>Năng lượng</span>
        <span style={{ color: 'var(--text-secondary)' }}>{clamped}/10</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              background:
                i < clamped
                  ? 'var(--mood-color)'
                  : 'var(--border-default)',
              boxShadow:
                i < clamped ? '0 0 8px var(--mood-glow)' : 'none',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Bad-day interstitial (9.4)
// ──────────────────────────────────────────────────────────────────────────────

function BadDayInterstitial({
  entry,
  onContinue,
}: {
  entry: BadDayMessageEntry
  onContinue: () => void
}) {
  return (
    <div
      className="glass-card anim-fade-in-up"
      style={{
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        borderLeft: '2px solid var(--mood-color-soft, var(--mood-color))',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '0.65rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        Từ chính bạn — ngày {entry.author_date}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: '1.15rem',
          fontFamily: 'var(--font-body, "DM Sans", system-ui)',
          color: 'var(--text-primary)',
          lineHeight: 1.8,
          fontStyle: 'italic',
          maxWidth: 480,
        }}
      >
        &ldquo;{entry.message}&rdquo;
      </p>
      <p
        style={{
          margin: 0,
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          maxWidth: 420,
        }}
      >
        Bạn đã viết câu này vào một ngày bạn cảm thấy ổn — để dặn mình cho lúc như hôm nay.
      </p>
      <button
        type="button"
        className="btn-mood"
        onClick={onContinue}
        style={{ borderRadius: 12, cursor: 'pointer', marginTop: 8 }}
      >
        Tiếp tục
      </button>
    </div>
  )
}

function SimpleTaskCard({ task, index }: { task: Task; index: number }) {
  return (
    <div
      className="glass-card hover-lift"
      style={{
        padding: '18px 20px',
        borderLeft: '2px solid var(--mood-color)',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          minWidth: 28,
          borderRadius: '50%',
          background: 'var(--mood-color)',
          color: 'var(--btn-text)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: '0.85rem',
          boxShadow: '0 0 16px var(--mood-glow)',
        }}
      >
        {index}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
            lineHeight: 1.45,
          }}
        >
          {task.title}
        </p>
        {task.implementation && (
          <p
            style={{
              margin: '6px 0 0',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
              lineHeight: 1.55,
            }}
          >
            {task.implementation}
          </p>
        )}
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-tertiary)',
              padding: '2px 10px',
              borderRadius: 999,
              border: '1px solid var(--border-default)',
              letterSpacing: '0.04em',
            }}
          >
            {task.estimated_minutes} phút
          </span>
          {task.difficulty && (
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-tertiary)',
                padding: '2px 10px',
                borderRadius: 999,
                border: '1px solid var(--border-default)',
                letterSpacing: '0.04em',
              }}
            >
              {task.difficulty}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
