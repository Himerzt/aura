'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getToday, postEvening } from '@/lib/api'
import { useMood } from '@/lib/mood-context'
import ErrorCard, { InlineError } from '@/components/ui/ErrorCard'
import { EveningSkeleton } from '@/components/ui/Skeleton'
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
  const [error, setError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [entry, setEntry] = useState<DayEntry | null>(null)
  const [doneIds, setDoneIds] = useState<number[]>([])
  const [reflection, setReflection] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const [result, setResult] = useState<EveningResult | null>(null)

  const date = useMemo(() => todayKey(), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
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
  const doneTasks = tasks.filter((_, i) => doneIds.includes(i))
  const notDoneTasks = tasks.filter((_, i) => !doneIds.includes(i))

  const onSubmit = useCallback(async () => {
    if (!reflection.trim()) {
      setSubmitError(new Error('Hãy viết vài dòng trước khi gửi.'))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await postEvening(reflection.trim(), doneIds)
      setResult(res)
    } catch (e) {
      setSubmitError(e)
    } finally {
      setSubmitting(false)
    }
  }, [reflection, doneIds])

  if (loading) {
    return (
      <PageShell>
        <EveningSkeleton />
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
        <ResultView result={result} onDashboard={() => router.push('/dashboard')} date={date} />
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
        <AmbientToggle />
      </header>

      <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <CompareCard
          done={doneTasks}
          notDone={notDoneTasks}
          total={tasks.length}
          doneCount={doneIds.length}
        />

        {notDoneTasks.length > 0 && <ReframeCard count={notDoneTasks.length} />}

        <GuidedReflection
          value={reflection}
          onChange={setReflection}
          disabled={submitting}
        />

        {submitError != null && (
          <InlineError
            error={submitError}
            onRetry={() => { setSubmitError(null); void onSubmit() }}
          />
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

function ReframeCard({ count }: { count: number }) {
  return (
    <div
      className="glass-card anim-fade-in-up"
      style={{
        padding: '18px 22px',
        borderLeft: '2px solid var(--mood-color-soft, var(--mood-color))',
        background: 'var(--bg-elevated)',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '0.92rem',
          color: 'var(--text-primary)',
          lineHeight: 1.6,
        }}
      >
        {count === 1
          ? '1 task chưa xong — đó là dữ liệu về giới hạn hôm nay, không phải thất bại.'
          : `${count} task chưa xong — đó là dữ liệu về giới hạn hôm nay, không phải thất bại.`}
      </p>
      <p
        style={{
          margin: '8px 0 0',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.55,
        }}
      >
        Bạn vẫn xuất hiện ở đây, và điều đó đã đủ quan trọng.
      </p>
    </div>
  )
}

function GuidedReflection({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  const [mode, setMode] = useState<'guided' | 'free'>('guided')
  const [q1, setQ1] = useState('')
  const [q2, setQ2] = useState('')
  const [q3, setQ3] = useState('')

  // Sync guided fields → combined reflection value
  useEffect(() => {
    if (mode !== 'guided') return
    const parts = [q1, q2, q3].filter((s) => s.trim())
    onChange(parts.join('\n\n'))
  }, [q1, q2, q3, mode, onChange])

  if (mode === 'free') {
    return (
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label
            style={{
              fontSize: '0.7rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            Reflection
          </label>
          <button
            type="button"
            onClick={() => setMode('guided')}
            style={{
              fontSize: '0.72rem',
              color: 'var(--mood-color)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            Dùng 3 câu hỏi gợi ý
          </button>
        </div>
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
        <p style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
          {value.trim().length} ký tự
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <label
          style={{
            fontSize: '0.7rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          Reflection
        </label>
        <button
          type="button"
          onClick={() => setMode('free')}
          style={{
            fontSize: '0.72rem',
            color: 'var(--mood-color)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          Viết tự do
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <GuidedField
          label="1 điều hôm nay dạy bạn"
          value={q1}
          onChange={setQ1}
          disabled={disabled}
          placeholder="Tôi nhận ra rằng..."
        />
        <GuidedField
          label="1 điều làm bạn ngạc nhiên"
          value={q2}
          onChange={setQ2}
          disabled={disabled}
          placeholder="Điều bất ngờ là..."
        />
        <GuidedField
          label="1 điều bạn biết ơn"
          value={q3}
          onChange={setQ3}
          disabled={disabled}
          placeholder="Tôi biết ơn vì..."
        />
      </div>
    </div>
  )
}

function GuidedField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled: boolean
  placeholder: string
}) {
  return (
    <div>
      <p
        style={{
          margin: '0 0 6px',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          fontWeight: 500,
        }}
      >
        {label}
      </p>
      <textarea
        className="input-underline"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        rows={2}
        style={{
          width: '100%',
          resize: 'vertical',
          minHeight: 52,
          fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
          fontSize: '0.9rem',
          lineHeight: 1.55,
          borderBottom: '1px solid var(--border-default)',
          background: 'transparent',
        }}
      />
    </div>
  )
}

function ResultView({
  result,
  onDashboard,
  date,
}: {
  result: EveningResult
  onDashboard: () => void
  date: string
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

      <LetterToTomorrow date={date} />

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

type AmbientMode = 'off' | 'rain' | 'lofi'

const AMBIENT_OPTIONS: { value: AmbientMode; icon: string; label: string }[] = [
  { value: 'rain', icon: '🌧', label: 'Mưa' },
  { value: 'lofi', icon: '🎵', label: 'Lo-fi' },
]

function createNoiseNode(ctx: AudioContext, type: AmbientMode): AudioNode {
  const bufferSize = 2 * ctx.sampleRate
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const output = buffer.getChannelData(0)

  if (type === 'rain') {
    // Brown noise (rain-like): accumulate white noise
    let last = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      output[i] = last * 3.5
    }
  } else {
    // Lo-fi: pink noise (softer)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  return source
}

function AmbientToggle() {
  const [mode, setMode] = useState<AmbientMode>('off')
  const ctxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  const stop = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.stop()
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (gainRef.current) {
      gainRef.current.disconnect()
      gainRef.current = null
    }
  }, [])

  const play = useCallback((type: AmbientMode) => {
    if (type === 'off') return
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    const ctx = ctxRef.current
    const gain = ctx.createGain()
    gain.gain.value = 0.25
    gain.connect(ctx.destination)
    gainRef.current = gain

    const node = createNoiseNode(ctx, type) as AudioBufferSourceNode
    node.connect(gain)
    node.start()
    sourceRef.current = node
  }, [])

  const toggle = useCallback(
    (selected: AmbientMode) => {
      stop()
      if (mode === selected) {
        setMode('off')
      } else {
        setMode(selected)
        play(selected)
      }
    },
    [mode, stop, play],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
      if (ctxRef.current) {
        ctxRef.current.close()
        ctxRef.current = null
      }
    }
  }, [stop])

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        justifyContent: 'center',
        marginTop: 14,
      }}
    >
      {AMBIENT_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => toggle(opt.value)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '10px 18px',
            minHeight: 44,
            fontSize: '0.8rem',
            borderRadius: 999,
            border:
              mode === opt.value
                ? '1.5px solid var(--mood-color)'
                : '1px solid var(--border-default)',
            background:
              mode === opt.value
                ? 'color-mix(in srgb, var(--mood-color) 12%, transparent)'
                : 'transparent',
            color:
              mode === opt.value ? 'var(--mood-color)' : 'var(--text-tertiary)',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
          }}
        >
          <span>{opt.icon}</span>
          <span>{opt.label}</span>
          {mode === opt.value && (
            <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>●</span>
          )}
        </button>
      ))}
    </div>
  )
}

function letterStorageKey(date: string): string {
  // letter written on evening of `date` is for tomorrow
  const d = new Date(date)
  d.setDate(d.getDate() + 1)
  return `aura_letter_${d.toISOString().slice(0, 10)}`
}

function preCommitKey(date: string): string {
  const d = new Date(date)
  d.setDate(d.getDate() + 1)
  return `aura_precommit_${d.toISOString().slice(0, 10)}`
}

interface PreCommit {
  when: string
  what: string
}

function LetterToTomorrow({ date }: { date: string }) {
  const [when, setWhen] = useState('')
  const [what, setWhat] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const existing = window.localStorage.getItem(preCommitKey(date))
    if (existing) {
      try {
        const parsed = JSON.parse(existing) as Partial<PreCommit>
        setWhen(parsed.when ?? '')
        setWhat(parsed.what ?? '')
        if (parsed.when || parsed.what) setSaved(true)
      } catch {
        // fallback: legacy free-form letter
        setWhat(existing)
        setSaved(true)
      }
    } else {
      const legacy = window.localStorage.getItem(letterStorageKey(date))
      if (legacy) {
        setWhat(legacy)
        setSaved(true)
      }
    }
  }, [date])

  const canSave = when.trim() && what.trim()

  const onSave = useCallback(() => {
    if (!canSave) return
    const payload: PreCommit = { when: when.trim(), what: what.trim() }
    window.localStorage.setItem(preCommitKey(date), JSON.stringify(payload))
    // Keep legacy letter key in sync so checklist's LetterFromYesterday still shows something readable
    window.localStorage.setItem(
      letterStorageKey(date),
      `Ngày mai lúc ${payload.when} tôi sẽ ${payload.what}`,
    )
    setSaved(true)
  }, [when, what, date, canSave])

  return (
    <div
      className="glass-card anim-fade-in-up"
      style={{
        padding: 24,
        borderLeft: '2px solid var(--mood-color-soft, var(--mood-color))',
      }}
    >
      <SectionLabel>Pre-commit cho ngày mai</SectionLabel>
      <p
        style={{
          margin: '0 0 14px',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.55,
        }}
      >
        Cấu trúc IF-THEN — khoá ý định trước khi đi ngủ. Sáng mai AURA sẽ nhắc lại khi bạn mở checklist.
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          fontSize: '0.95rem',
          color: 'var(--text-primary)',
          lineHeight: 1.8,
        }}
      >
        <span style={{ color: 'var(--text-tertiary)' }}>Ngày mai lúc</span>
        <input
          type="text"
          value={when}
          onChange={(e) => {
            setWhen(e.target.value)
            setSaved(false)
          }}
          placeholder="7h sáng"
          maxLength={40}
          style={{
            flex: '0 1 140px',
            minWidth: 100,
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid var(--border-default)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontSize: '0.92rem',
            fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
          }}
        />
        <span style={{ color: 'var(--text-tertiary)' }}>tôi sẽ</span>
        <input
          type="text"
          value={what}
          onChange={(e) => {
            setWhat(e.target.value)
            setSaved(false)
          }}
          placeholder="đi bộ 10 phút sau khi pha cà phê"
          maxLength={160}
          style={{
            flex: '1 1 100%',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid var(--border-default)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontSize: '0.92rem',
            fontFamily: 'var(--font-body-loaded, DM Sans, system-ui)',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 14,
        }}
      >
        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
          {when.length + what.length}/200
        </span>
        {saved && canSave ? (
          <span
            style={{
              fontSize: '0.78rem',
              color: 'var(--mood-color)',
              fontWeight: 500,
            }}
          >
            Đã khoá ✓
          </span>
        ) : (
          <button
            type="button"
            className="btn-ghost"
            onClick={onSave}
            disabled={!canSave}
            style={{
              borderRadius: 10,
              cursor: canSave ? 'pointer' : 'default',
              padding: '6px 16px',
              fontSize: '0.8rem',
              opacity: canSave ? 1 : 0.5,
            }}
          >
            Khoá IF-THEN
          </button>
        )}
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
