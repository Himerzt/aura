'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getToday, postEvening } from '@/lib/api'
import { useMood } from '@/lib/mood-context'
import type { DayEntry, EveningResult, MoodState, Task } from '@/lib/types'

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function checklistStorageKey(date: string): string {
  return `aura_checklist_${date}`
}

function readDoneIds(date: string): number[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(checklistStorageKey(date))
    if (!raw) return []
    const parsed = JSON.parse(raw) as { done?: unknown }
    if (!Array.isArray(parsed.done)) return []
    return parsed.done.filter((n): n is number => typeof n === 'number')
  } catch {
    return []
  }
}

export default function EveningPage() {
  const router = useRouter()
  const { setMood } = useMood()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entry, setEntry] = useState<DayEntry | null>(null)
  const [doneIds, setDoneIds] = useState<number[]>([])
  const [reflection, setReflection] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<EveningResult | null>(null)

  const date = useMemo(() => todayKey(), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getToday()
      .then((data) => {
        if (cancelled) return
        setEntry(data)
        if (data?.morning?.mood_state) {
          setMood(data.morning.mood_state as MoodState)
        }
        const taskCount = data?.morning?.tasks?.length ?? 0
        const validDone = readDoneIds(date).filter((i) => i >= 0 && i < taskCount)
        setDoneIds(validDone)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Không tải được dữ liệu hôm nay')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [date, setMood])

  const tasks: Task[] = entry?.morning?.tasks ?? []
  const doneTasks = tasks.filter((_, i) => doneIds.includes(i))
  const notDoneTasks = tasks.filter((_, i) => !doneIds.includes(i))

  const onSubmit = useCallback(async () => {
    if (!reflection.trim()) {
      setSubmitError('Hãy viết vài dòng trước khi gửi.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await postEvening(reflection.trim(), doneIds)
      setResult(res)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Không gửi được reflection')
    } finally {
      setSubmitting(false)
    }
  }, [reflection, doneIds])

  if (loading) {
    return (
      <PageShell>
        <div className="glass-card anim-fade-in" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Đang tải buổi tối...</p>
        </div>
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell>
        <div className="glass-card anim-fade-in-up" style={{ padding: 28 }}>
          <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.6 }}>{error}</p>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => router.refresh()}
            style={{ marginTop: 18, borderRadius: 12, cursor: 'pointer' }}
          >
            Thử lại
          </button>
        </div>
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
            Chưa có buổi sáng để đối chiếu
          </h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Reflection buổi tối cần dữ liệu check-in sáng. Hãy bắt đầu ngày ở đó trước.
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

  if (result) {
    return (
      <PageShell>
        <ResultView result={result} onDashboard={() => router.push('/dashboard')} />
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
          Buổi tối
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
          Nhìn lại ngày hôm nay
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Không phải để chấm điểm. Chỉ để hiểu bản thân rõ hơn.
        </p>
      </header>

      <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <CompareCard
          done={doneTasks}
          notDone={notDoneTasks}
          total={tasks.length}
          doneCount={doneIds.length}
        />

        <ReflectionInput
          value={reflection}
          onChange={setReflection}
          disabled={submitting}
        />

        {submitError && (
          <div
            className="glass-card"
            style={{
              padding: 16,
              borderLeft: '2px solid #ef5350',
            }}
          >
            <p style={{ margin: 0, color: '#ff8a80', fontSize: '0.9rem' }}>{submitError}</p>
          </div>
        )}

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
            onClick={onSubmit}
            disabled={submitting}
            style={{
              borderRadius: 12,
              cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Đang gửi...' : 'Gửi reflection'}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => router.push('/checklist')}
            disabled={submitting}
            style={{ borderRadius: 12, cursor: 'pointer' }}
          >
            Quay lại checklist
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
        padding: '48px 24px 64px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 640 }}>{children}</div>
    </div>
  )
}

function CompareCard({
  done,
  notDone,
  total,
  doneCount,
}: {
  done: Task[]
  notDone: Task[]
  total: number
  doneCount: number
}) {
  if (total === 0) {
    return (
      <div className="glass-card" style={{ padding: 24 }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Sáng nay không đặt task cụ thể. Bạn vẫn có thể viết reflection ở dưới.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 14,
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
          Đối chiếu
        </span>
        <span
          style={{
            fontFamily: 'var(--font-heading, Sora, system-ui)',
            fontSize: '1.1rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {doneCount}/{total}
        </span>
      </div>

      {done.length > 0 && (
        <TaskGroup label="Đã xong" tasks={done} tone="done" />
      )}
      {notDone.length > 0 && (
        <TaskGroup label="Chưa xong" tasks={notDone} tone="pending" />
      )}
    </div>
  )
}

function TaskGroup({
  label,
  tasks,
  tone,
}: {
  label: string
  tasks: Task[]
  tone: 'done' | 'pending'
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <p
        style={{
          margin: '0 0 8px',
          fontSize: '0.72rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: tone === 'done' ? 'var(--mood-color)' : 'var(--text-tertiary)',
        }}
      >
        {label}
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tasks.map((task, i) => (
          <li
            key={i}
            style={{
              fontSize: '0.92rem',
              color: 'var(--text-primary)',
              lineHeight: 1.5,
              paddingLeft: 12,
              borderLeft: `2px solid ${tone === 'done' ? 'var(--mood-color)' : 'var(--border-default)'}`,
              opacity: tone === 'done' ? 1 : 0.72,
            }}
          >
            {task.title}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ReflectionInput({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled: boolean
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
        Reflection
      </label>
      <textarea
        className="input-underline"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Hôm nay bạn học được gì về chính mình?"
        rows={5}
        style={{
          width: '100%',
          resize: 'vertical',
          minHeight: 120,
          fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
          fontSize: '0.95rem',
          lineHeight: 1.6,
          borderBottom: '1px solid var(--border-default)',
          background: 'transparent',
        }}
      />
      <p
        style={{
          marginTop: 8,
          fontSize: '0.72rem',
          color: 'var(--text-tertiary)',
        }}
      >
        {value.trim().length} ký tự
      </p>
    </div>
  )
}

function ResultView({
  result,
  onDashboard,
}: {
  result: EveningResult
  onDashboard: () => void
}) {
  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header className="anim-fade-in-up" style={{ textAlign: 'center', marginBottom: 4 }}>
        <p
          style={{
            margin: 0,
            fontSize: '0.72rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          AURA đã lắng nghe
        </p>
        <h1
          className="gradient-text"
          style={{
            margin: '6px 0 4px',
            fontFamily: 'var(--font-heading, Sora, system-ui)',
            fontSize: '1.6rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          Ngày hôm nay của bạn
        </h1>
      </header>

      <div className="glass-card" style={{ padding: 24 }}>
        <SectionLabel>Tóm tắt</SectionLabel>
        <p
          style={{
            margin: 0,
            color: 'var(--text-primary)',
            lineHeight: 1.65,
            fontSize: '1rem',
          }}
        >
          {result.today_summary}
        </p>
      </div>

      {result.pattern_detected && result.pattern_description && (
        <div
          className="glass-card"
          style={{
            padding: 24,
            borderLeft: '2px solid var(--mood-color)',
          }}
        >
          <SectionLabel>Pattern đang hình thành</SectionLabel>
          <p
            style={{
              margin: 0,
              color: 'var(--text-primary)',
              lineHeight: 1.65,
              fontSize: '0.96rem',
            }}
          >
            {result.pattern_description}
          </p>
        </div>
      )}

      {result.progress_highlight && (
        <div className="glass-card" style={{ padding: 24 }}>
          <SectionLabel>Điểm sáng</SectionLabel>
          <p
            style={{
              margin: 0,
              color: 'var(--text-primary)',
              lineHeight: 1.65,
              fontSize: '0.96rem',
            }}
          >
            {result.progress_highlight}
          </p>
        </div>
      )}

      <div
        className="glass-card"
        style={{
          padding: 24,
          background: 'var(--bg-elevated)',
        }}
      >
        <SectionLabel>Câu hỏi cho ngày mai</SectionLabel>
        <p
          style={{
            margin: 0,
            color: 'var(--text-primary)',
            lineHeight: 1.65,
            fontSize: '1.05rem',
            fontStyle: 'italic',
          }}
        >
          {result.tomorrow_question}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: 4,
        }}
      >
        <button
          type="button"
          className="btn-mood"
          onClick={onDashboard}
          style={{ borderRadius: 12, cursor: 'pointer' }}
        >
          Xem Dashboard
        </button>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: '0 0 10px',
        fontSize: '0.7rem',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--text-tertiary)',
      }}
    >
      {children}
    </p>
  )
}
