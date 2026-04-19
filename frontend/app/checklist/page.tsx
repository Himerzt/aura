'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getToday, getHistory } from '@/lib/api'
import { useMood } from '@/lib/mood-context'
import ErrorCard from '@/components/ui/ErrorCard'
import { ChecklistSkeleton } from '@/components/ui/Skeleton'
import type { DayEntry, MoodState, Task } from '@/lib/types'

const MOOD_LABELS: Record<MoodState, string> = {
  energized: 'Tràn năng lượng',
  stable: 'Ổn định',
  anxious: 'Lo âu',
  overwhelmed: 'Quá tải',
  numb: 'Tê liệt',
}

type PostEmotion = 'relieved' | 'neutral' | 'exhausted'
const EMOTION_OPTIONS: { value: PostEmotion; emoji: string; label: string }[] = [
  { value: 'relieved', emoji: '😌', label: 'Nhẹ nhõm' },
  { value: 'neutral', emoji: '😐', label: 'Bình thường' },
  { value: 'exhausted', emoji: '😩', label: 'Kiệt sức' },
]

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function storageKey(date: string): string {
  return `aura_checklist_${date}`
}

type LocalChecklistState = {
  done: number[]
  note: string
  emotions: Record<number, PostEmotion>
  silentEmoji?: PostEmotion | null
}

function readLocal(date: string): LocalChecklistState {
  if (typeof window === 'undefined') return { done: [], note: '', emotions: {} }
  try {
    const raw = window.localStorage.getItem(storageKey(date))
    if (!raw) return { done: [], note: '', emotions: {} }
    const parsed = JSON.parse(raw) as Partial<LocalChecklistState>
    return {
      done: Array.isArray(parsed.done) ? parsed.done.filter((n) => typeof n === 'number') : [],
      note: typeof parsed.note === 'string' ? parsed.note : '',
      emotions: parsed.emotions && typeof parsed.emotions === 'object' ? parsed.emotions : {},
      silentEmoji: parsed.silentEmoji ?? null,
    }
  } catch {
    return { done: [], note: '', emotions: {} }
  }
}

function writeLocal(date: string, state: LocalChecklistState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey(date), JSON.stringify(state))
  } catch {
    // localStorage quota or privacy mode — fail silently
  }
}

export default function ChecklistPage() {
  const router = useRouter()
  const { setMood } = useMood()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [entry, setEntry] = useState<DayEntry | null>(null)
  const [doneIds, setDoneIds] = useState<number[]>([])
  const [note, setNote] = useState<string>('')
  const [noteSavedAt, setNoteSavedAt] = useState<number | null>(null)
  const [emotions, setEmotions] = useState<Record<number, PostEmotion>>({})
  const [seedQuote, setSeedQuote] = useState<string | null>(null)
  const [letterFromMe, setLetterFromMe] = useState<string | null>(null)
  const [silentMode, setSilentMode] = useState(false)
  const [silentEmoji, setSilentEmoji] = useState<PostEmotion | null>(null)

  const date = useMemo(() => todayKey(), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([getToday(), getHistory()])
      .then(([data, historyData]) => {
        if (cancelled) return
        setEntry(data)
        if (data?.morning?.mood_state) {
          setMood(data.morning.mood_state as MoodState)
        }

        // Silent tick mode: energy ≤ 3
        const energy = data?.morning?.energy_level ?? 5
        setSilentMode(energy <= 3)

        // Seed-of-day: find a past reflection quote (not today)
        const today = todayKey()
        const pastDays = (historyData as Array<{ date: string; evening?: { summary?: string; tomorrow_question?: string } }>)
          .filter((d) => d.date !== today && d.evening)
        if (pastDays.length > 0) {
          const pick = pastDays[pastDays.length - 1]
          const quote = pick.evening?.tomorrow_question || pick.evening?.summary
          if (quote) {
            const daysAgo = Math.floor(
              (new Date(today).getTime() - new Date(pick.date).getTime()) / 86400000
            )
            setSeedQuote(`${daysAgo} ngày trước bạn viết: "${quote}"`)
          }
        }

        // Letter from yesterday evening
        const letterKey = `aura_letter_${date}`
        const letter = window.localStorage.getItem(letterKey)
        if (letter) setLetterFromMe(letter)

        const local = readLocal(date)
        const taskCount = data?.morning?.tasks?.length ?? 0
        const validDone = local.done.filter((i) => i >= 0 && i < taskCount)
        setDoneIds(validDone)
        setNote(local.note)
        setEmotions(local.emotions ?? {})
        setSilentEmoji(local.silentEmoji ?? null)
        if (validDone.length !== local.done.length) {
          writeLocal(date, { done: validDone, note: local.note, emotions: local.emotions ?? {} })
        }
      })
      .catch((e) => {
        if (cancelled) return
        setError(e)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [date, setMood, reloadKey])

  const tasks: Task[] = entry?.morning?.tasks ?? []
  const totalCount = tasks.length
  const doneCount = doneIds.length
  const progressPct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)

  const toggleTask = useCallback(
    (index: number) => {
      setDoneIds((prev) => {
        const wasChecked = prev.includes(index)
        const next = wasChecked
          ? prev.filter((i) => i !== index)
          : [...prev, index]
        // Untick task → also clear its emoji
        if (wasChecked) {
          setEmotions((prevEmo) => {
            const { [index]: _, ...rest } = prevEmo
            writeLocal(date, { done: next, note, emotions: rest })
            return rest
          })
        } else {
          writeLocal(date, { done: next, note, emotions })
        }
        return next
      })
    },
    [date, note, emotions],
  )

  const setTaskEmotion = useCallback(
    (index: number, emotion: PostEmotion) => {
      setEmotions((prev) => {
        // Toggle: click same emoji again → remove it
        if (prev[index] === emotion) {
          const { [index]: _, ...rest } = prev
          writeLocal(date, { done: doneIds, note, emotions: rest })
          return rest
        }
        const next = { ...prev, [index]: emotion }
        writeLocal(date, { done: doneIds, note, emotions: next })
        return next
      })
    },
    [date, doneIds, note],
  )

  const onNoteChange = useCallback(
    (value: string) => {
      setNote(value)
      writeLocal(date, { done: doneIds, note: value, emotions })
      setNoteSavedAt(Date.now())
    },
    [date, doneIds, emotions],
  )

  const onSilentEmojiPick = useCallback(
    (emoji: PostEmotion) => {
      setSilentEmoji(emoji)
      // In silent mode, mark all tasks as done
      const allIds = tasks.map((_, i) => i)
      setDoneIds(allIds)
      writeLocal(date, { done: allIds, note, emotions, silentEmoji: emoji })
    },
    [date, note, emotions, tasks],
  )

  const onEndDay = useCallback(() => {
    writeLocal(date, { done: doneIds, note, emotions })
    router.push('/evening')
  }, [date, doneIds, note, emotions, router])

  if (loading) {
    return (
      <PageShell>
        <ChecklistSkeleton rows={3} />
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell>
        <ErrorCard error={error} onRetry={() => setReloadKey((k) => k + 1)} />
      </PageShell>
    )
  }

  if (!entry?.morning) {
    return (
      <PageShell>
        <div className="glass-card anim-fade-in-up" style={{ padding: 28 }}>
          <h2
            style={{
              margin: '0 0 12px',
              fontFamily: 'var(--font-heading, Sora, system-ui)',
              fontSize: '1.3rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            Bạn chưa check-in buổi sáng
          </h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Checklist được tạo ra từ phiên check-in sáng. Hãy bắt đầu ngày bằng vài dòng cảm xúc.
          </p>
          <button
            type="button"
            className="btn-mood"
            onClick={() => router.push('/morning')}
            style={{ marginTop: 20, borderRadius: 12, cursor: 'pointer' }}
          >
            Đi tới check-in sáng
          </button>
        </div>
      </PageShell>
    )
  }

  const mood = entry.morning.mood_state as MoodState
  const moodLabel = MOOD_LABELS[mood] ?? mood

  // Silent tick mode: energy ≤ 3 → simplified UI
  if (silentMode) {
    return (
      <PageShell>
        <header className="anim-fade-in-up" style={{ textAlign: 'center', marginBottom: 28 }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.72rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            Năng lượng thấp hôm nay
          </p>
          <h1
            className="gradient-text"
            style={{
              margin: '6px 0 4px',
              fontFamily: 'var(--font-heading, Sora, system-ui)',
              fontSize: '1.8rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            Không sao cả
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Hôm nay bạn chỉ cần cho AURA biết bạn đang thế nào.
          </p>
        </header>

        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {seedQuote && <SeedOfDay quote={seedQuote} />}
          {letterFromMe && <LetterFromYesterday text={letterFromMe} />}

          <div className="glass-card" style={{ padding: 28, textAlign: 'center' }}>
            <p
              style={{
                margin: '0 0 20px',
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
              }}
            >
              Chọn 1 emoji mô tả ngày hôm nay:
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              {EMOTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onSilentEmojiPick(opt.value)}
                  className={silentEmoji === opt.value ? '' : 'hover-lift'}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    padding: '16px 20px',
                    borderRadius: 16,
                    border: silentEmoji === opt.value
                      ? '2px solid var(--mood-color)'
                      : '1.5px solid var(--border-default)',
                    background: silentEmoji === opt.value
                      ? 'color-mix(in srgb, var(--mood-color) 15%, transparent)'
                      : 'var(--bg-surface)',
                    boxShadow: silentEmoji === opt.value
                      ? '0 0 20px var(--mood-glow)'
                      : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>{opt.emoji}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
            {silentEmoji && (
              <p
                className="anim-fade-in"
                style={{
                  marginTop: 16,
                  fontSize: '0.85rem',
                  color: 'var(--mood-color)',
                  fontStyle: 'italic',
                }}
              >
                Đã ghi nhận. Bạn làm tốt lắm rồi.
              </p>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: 4,
            }}
          >
            <button
              type="button"
              className="btn-mood"
              onClick={onEndDay}
              style={{ borderRadius: 12, cursor: 'pointer' }}
            >
              Kết thúc ngày
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setSilentMode(false)}
              style={{ borderRadius: 12, cursor: 'pointer' }}
            >
              Xem đầy đủ checklist
            </button>
          </div>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <header className="anim-fade-in-up" style={{ textAlign: 'center', marginBottom: 28 }}>
        <p
          style={{
            margin: 0,
            fontSize: '0.72rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          Checklist hôm nay
        </p>
        <h1
          className="gradient-text"
          style={{
            margin: '6px 0 4px',
            fontFamily: 'var(--font-heading, Sora, system-ui)',
            fontSize: '1.8rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          {moodLabel}
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Tick khi bạn hoàn thành. Không ai chấm điểm bạn.
        </p>
      </header>

      <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {seedQuote && <SeedOfDay quote={seedQuote} />}
        {letterFromMe && <LetterFromYesterday text={letterFromMe} />}

        <ProgressCard done={doneCount} total={totalCount} pct={progressPct} />

        {totalCount === 0 ? (
          <div className="glass-card" style={{ padding: 24 }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Sáng nay AURA không đặt task cụ thể. Bạn có thể vẫn ghi nhận lại ngày của mình ở dưới.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tasks.map((task, index) => (
              <TaskRow
                key={index}
                task={task}
                index={index}
                done={doneIds.includes(index)}
                onToggle={() => toggleTask(index)}
                emotion={emotions[index] ?? null}
                onEmotion={(e) => setTaskEmotion(index, e)}
              />
            ))}
          </div>
        )}

        <MidDayNote value={note} onChange={onNoteChange} savedAt={noteSavedAt} />

        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: 4,
          }}
        >
          <button
            type="button"
            className="btn-mood"
            onClick={onEndDay}
            style={{ borderRadius: 12, cursor: 'pointer' }}
          >
            Kết thúc ngày
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => router.push('/morning')}
            style={{ borderRadius: 12, cursor: 'pointer' }}
          >
            Quay lại check-in sáng
          </button>
        </div>
      </div>
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
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
      <div style={{ width: '100%', maxWidth: 640 }}>{children}</div>
    </div>
  )
}

function SeedOfDay({ quote }: { quote: string }) {
  return (
    <div
      className="glass-card anim-fade-in"
      style={{
        padding: '16px 20px',
        borderLeft: '2px solid var(--mood-color)',
        background: 'var(--bg-elevated)',
      }}
    >
      <p
        style={{
          margin: '0 0 4px',
          fontSize: '0.65rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        Seed of the day
      </p>
      <p
        style={{
          margin: 0,
          fontSize: '0.88rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.55,
          fontStyle: 'italic',
        }}
      >
        {quote}
      </p>
    </div>
  )
}

function LetterFromYesterday({ text }: { text: string }) {
  return (
    <div
      className="glass-card anim-fade-in"
      style={{
        padding: '16px 20px',
        borderLeft: '2px solid var(--mood-color-soft, var(--mood-color))',
        background: 'var(--bg-elevated)',
      }}
    >
      <p
        style={{
          margin: '0 0 4px',
          fontSize: '0.65rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        Thư từ mình hôm qua
      </p>
      <p
        style={{
          margin: 0,
          fontSize: '0.9rem',
          color: 'var(--text-primary)',
          lineHeight: 1.55,
          fontStyle: 'italic',
        }}
      >
        &ldquo;{text}&rdquo;
      </p>
    </div>
  )
}

function ProgressCard({ done, total, pct }: { done: number; total: number; pct: number }) {
  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: '0.7rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          Tiến độ
        </span>
        <span
          style={{
            fontFamily: 'var(--font-heading, Sora, system-ui)',
            fontSize: '1.1rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {done}/{total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: 10,
          borderRadius: 999,
          background: 'var(--border-default)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'linear-gradient(135deg, var(--mood-color), var(--mood-color-soft))',
            boxShadow: '0 0 16px var(--mood-glow)',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  )
}

function TaskRow({
  task,
  index,
  done,
  onToggle,
  emotion,
  onEmotion,
}: {
  task: Task
  index: number
  done: boolean
  onToggle: () => void
  emotion: PostEmotion | null
  onEmotion: (e: PostEmotion) => void
}) {
  const [justCompleted, setJustCompleted] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleToggle() {
    if (!done) {
      // About to complete → trigger burst
      setJustCompleted(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setJustCompleted(false), 600)
    }
    onToggle()
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={done}
        className="glass-card hover-lift"
        style={{
          padding: '18px 20px',
          borderLeft: '2px solid var(--mood-color)',
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
          textAlign: 'left',
          cursor: 'pointer',
          width: '100%',
          background: 'var(--bg-surface)',
          opacity: done ? 0.72 : 1,
          transition: 'opacity 0.3s ease, transform 0.2s ease',
          borderRadius: done && !emotion ? '12px 12px 0 0' : undefined,
        }}
      >
        <Checkbox done={done} index={index + 1} justCompleted={justCompleted} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 500,
              color: 'var(--text-primary)',
              lineHeight: 1.45,
              textDecorationLine: done ? 'line-through' : 'none',
              textDecorationStyle: 'solid',
              textDecorationColor: 'var(--mood-color)',
              textDecorationThickness: '2px',
              transition: 'text-decoration-color 0.3s ease',
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
                textDecorationLine: done ? 'line-through' : 'none',
                textDecorationStyle: 'solid',
                textDecorationColor: 'var(--border-default)',
              }}
            >
              {task.implementation}
            </p>
          )}
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip>{task.estimated_minutes} phút</Chip>
            {task.difficulty && <Chip>{task.difficulty}</Chip>}
            {emotion && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onEmotion(emotion)
                }}
                title="Bỏ chọn cảm xúc"
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-tertiary)',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                {EMOTION_OPTIONS.find((o) => o.value === emotion)?.emoji}{' '}
                {EMOTION_OPTIONS.find((o) => o.value === emotion)?.label}
              </button>
            )}
          </div>
        </div>
      </button>

      {/* Micro-emotion picker — shows after tick, hides after selection */}
      {done && !emotion && (
        <div
          className="anim-fade-in"
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            padding: '10px 16px',
            background: 'var(--bg-elevated)',
            borderRadius: '0 0 12px 12px',
            borderTop: '1px solid var(--border-default)',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', alignSelf: 'center' }}>
            Cảm giác:
          </span>
          {EMOTION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onEmotion(opt.value)
              }}
              title={opt.label}
              style={{
                fontSize: '1.2rem',
                padding: '8px 12px',
                minWidth: 44,
                minHeight: 44,
                borderRadius: 10,
                border: '1px solid var(--border-default)',
                background: 'transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.2)'
                e.currentTarget.style.background = 'var(--bg-surface)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {opt.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Checkbox({ done, index, justCompleted }: { done: boolean; index: number; justCompleted?: boolean }) {
  return (
    <span
      aria-hidden
      className={`particle-burst${justCompleted ? ' burst-active' : ''}`}
      style={{
        width: 32,
        height: 32,
        minWidth: 32,
        borderRadius: 10,
        border: '1.5px solid var(--mood-color)',
        background: done
          ? 'linear-gradient(135deg, var(--mood-color), var(--mood-color-soft))'
          : 'transparent',
        boxShadow: done ? '0 0 18px var(--mood-glow)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.3s ease, box-shadow 0.3s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        transform: justCompleted ? 'scale(1.2)' : 'scale(1)',
        fontSize: '0.85rem',
        fontWeight: 600,
        color: done ? 'var(--btn-text)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-heading, Sora, system-ui)',
        overflow: 'visible',
        position: 'relative',
      }}
    >
      {done ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        index
      )}
    </span>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </span>
  )
}

function MidDayNote({
  value,
  onChange,
  savedAt,
}: {
  value: string
  onChange: (v: string) => void
  savedAt: number | null
}) {
  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <label
        style={{
          display: 'block',
          fontSize: '0.7rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
          marginBottom: 10,
        }}
      >
        Ghi nhận nhanh
      </label>
      <textarea
        className="input-underline"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Một câu ngắn về điều đang xảy ra ngay bây giờ..."
        rows={3}
        style={{
          width: '100%',
          resize: 'vertical',
          minHeight: 72,
          fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
          fontSize: '0.95rem',
          lineHeight: 1.6,
          borderBottom: '1px solid var(--border-default)',
          background: 'transparent',
        }}
      />
      <div
        style={{
          marginTop: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
          {value.trim().length} ký tự
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
          {savedAt ? 'Đã lưu cục bộ' : 'Tự lưu khi bạn gõ'}
        </span>
      </div>
    </div>
  )
}
