'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, getStreak, getHistory, getToday, getWeeklyInsight } from '@/lib/api'
import type { WeeklyInsightResponse } from '@/lib/api'
import { useMood } from '@/lib/mood-context'
import StreakDisplay from '@/components/aura/StreakDisplay'
import type { DayEntry, MoodState, UserProfile, StreakInfo } from '@/lib/types'

// ── History entry as returned by GET /api/history ──
interface HistoryDay extends DayEntry {
  date: string
}

const MOOD_LABELS: Record<MoodState, string> = {
  energized: 'Tràn năng lượng',
  stable: 'Ổn định',
  anxious: 'Lo âu',
  overwhelmed: 'Quá tải',
  numb: 'Tê liệt',
}

const MOOD_COLORS: Record<MoodState, string> = {
  energized: 'var(--mood-energized)',
  stable: 'var(--mood-stable)',
  anxious: 'var(--mood-anxious)',
  overwhelmed: 'var(--mood-overwhelmed)',
  numb: 'var(--mood-numb)',
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Chào buổi sáng'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

export default function DashboardPage() {
  const router = useRouter()
  const { setMood } = useMood()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [streak, setStreak] = useState<StreakInfo | null>(null)
  const [history, setHistory] = useState<HistoryDay[]>([])
  const [today, setToday] = useState<DayEntry | null>(null)
  const [weeklyInsight, setWeeklyInsight] = useState<WeeklyInsightResponse | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      getProfile(),
      getStreak(),
      getHistory() as Promise<HistoryDay[]>,
      getToday(),
      getWeeklyInsight(),
    ])
      .then(([prof, str, hist, tod, wi]) => {
        if (cancelled) return
        setProfile(prof)
        setStreak(str)
        setHistory(hist)
        setToday(tod)
        setWeeklyInsight(wi)
        if (tod?.morning?.mood_state) {
          setMood(tod.morning.mood_state as MoodState)
        }
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Không tải được dữ liệu')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [setMood])

  if (loading) {
    return (
      <PageShell>
        <div className="glass-card anim-fade-in" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Đang tải dashboard...</p>
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
            onClick={() => window.location.reload()}
            style={{ marginTop: 18, borderRadius: 12, cursor: 'pointer' }}
          >
            Thử lại
          </button>
        </div>
      </PageShell>
    )
  }

  const todayTasks = today?.morning?.tasks ?? []
  const todayDone = todayTasks.filter((t) => t.completed).length
  const todayMood = today?.morning?.mood_state as MoodState | undefined

  return (
    <PageShell>
      {/* ── Greeting (STT 17) ── */}
      <header className="anim-fade-in-up" style={{ textAlign: 'center', marginBottom: 32 }}>
        <p
          style={{
            margin: 0,
            fontSize: '0.72rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          {getGreeting()}
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
          {profile?.name || 'AURA'}
        </h1>
        {profile?.goal && (
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {profile.goal}
          </p>
        )}
      </header>

      <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* ── Streak (STT 18) ── */}
        <div className="glass-card" style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
          <StreakDisplay
            currentStreak={streak?.current_streak ?? 0}
            shieldCount={streak?.shield_count ?? 0}
            todayCompleted={streak?.today_completed ?? false}
          />
        </div>

        {/* ── Quick Stats (STT 19) ── */}
        <QuickStats
          streakDay={streak?.current_streak ?? 0}
          todayTasksDone={todayDone}
          todayTasksTotal={todayTasks.length}
          todayMood={todayMood}
          history={history}
        />

        {/* ── 7-Day Mood Chart (STT 20) ── */}
        <MoodChart7Days history={history} />

        {/* ── CTA Buttons (STT 21) ── */}
        <CTAButtons
          hasMorning={!!today?.morning}
          hasEvening={!!today?.evening}
          router={router}
        />

        {/* ── Weekly Insight (STT 22) ── */}
        <WeeklyInsightCard data={weeklyInsight} />
      </div>
    </PageShell>
  )
}

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

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

// ── Quick Stats (STT 19) ─────────────────────────────────────

function QuickStats({
  streakDay,
  todayTasksDone,
  todayTasksTotal,
  todayMood,
  history,
}: {
  streakDay: number
  todayTasksDone: number
  todayTasksTotal: number
  todayMood?: MoodState
  history: HistoryDay[]
}) {
  const moodTrend = getMoodTrend(history)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      <StatCard label="Ngày" value={`#${streakDay}`} />
      <StatCard
        label="Tasks hôm nay"
        value={todayTasksTotal > 0 ? `${todayTasksDone}/${todayTasksTotal}` : '—'}
      />
      <StatCard
        label="Mood"
        value={todayMood ? MOOD_LABELS[todayMood] : '—'}
        sub={moodTrend}
      />
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="glass-card"
      style={{
        padding: '16px 12px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: '0.65rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-heading, Sora, system-ui)',
          fontSize: '1.05rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}
      >
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
          {sub}
        </span>
      )}
    </div>
  )
}

function getMoodTrend(history: HistoryDay[]): string {
  const moods = history
    .filter((d) => d.morning?.mood_state)
    .map((d) => d.morning!.mood_state as MoodState)

  if (moods.length < 2) return ''

  const score: Record<MoodState, number> = {
    numb: 1,
    overwhelmed: 2,
    anxious: 3,
    stable: 4,
    energized: 5,
  }

  const recent = score[moods[0]] ?? 3
  const prev = score[moods[1]] ?? 3

  if (recent > prev) return 'Tốt hơn hôm qua'
  if (recent < prev) return 'Thấp hơn hôm qua'
  return 'Ổn định'
}

// ── 7-Day Mood Chart (STT 20) ────────────────────────────────

function MoodChart7Days({ history }: { history: HistoryDay[] }) {
  const last7 = getLast7Days(history)

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <SectionLabel>Mood 7 ngày qua</SectionLabel>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          height: 120,
          marginTop: 12,
        }}
      >
        {last7.map((day) => (
          <MoodBar key={day.label} day={day} />
        ))}
      </div>
    </div>
  )
}

interface ChartDay {
  label: string
  mood: MoodState | null
  energy: number
}

function getLast7Days(history: HistoryDay[]): ChartDay[] {
  const days: ChartDay[] = []
  const today = new Date()
  const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const entry = history.find((h) => h.date === iso)
    days.push({
      label: dayLabels[d.getDay()],
      mood: (entry?.morning?.mood_state as MoodState) ?? null,
      energy: entry?.morning?.energy_level ?? 0,
    })
  }

  return days
}

function MoodBar({ day }: { day: ChartDay }) {
  const heightPct = day.energy > 0 ? Math.max(15, (day.energy / 10) * 100) : 0
  const color = day.mood ? MOOD_COLORS[day.mood] : 'var(--border-default)'

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        height: '100%',
        justifyContent: 'flex-end',
      }}
    >
      {day.energy > 0 && (
        <span
          style={{
            fontSize: '0.65rem',
            color: 'var(--text-tertiary)',
            fontWeight: 500,
          }}
        >
          {day.energy}
        </span>
      )}
      <div
        style={{
          width: '100%',
          maxWidth: 36,
          height: day.energy > 0 ? `${heightPct}%` : 4,
          borderRadius: 8,
          background: day.energy > 0
            ? `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color} 50%, transparent))`
            : 'var(--border-default)',
          transition: 'height 0.5s ease, background 0.3s ease',
          minHeight: 4,
        }}
        title={day.mood ? `${MOOD_LABELS[day.mood]} — Energy ${day.energy}` : 'Không có dữ liệu'}
      />
      <span
        style={{
          fontSize: '0.68rem',
          color: 'var(--text-tertiary)',
          fontWeight: 400,
        }}
      >
        {day.label}
      </span>
    </div>
  )
}

// ── CTA Buttons (STT 21) ─────────────────────────────────────

function CTAButtons({
  hasMorning,
  hasEvening,
  router,
}: {
  hasMorning: boolean
  hasEvening: boolean
  router: ReturnType<typeof useRouter>
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      {!hasMorning && (
        <button
          type="button"
          className="btn-mood anim-pulse-glow"
          onClick={() => router.push('/morning')}
          style={{ borderRadius: 12, cursor: 'pointer', flex: '1 1 auto', maxWidth: 220 }}
        >
          Check-in Sáng
        </button>
      )}
      {hasMorning && (
        <button
          type="button"
          className="btn-ghost"
          onClick={() => router.push('/checklist')}
          style={{ borderRadius: 12, cursor: 'pointer', flex: '1 1 auto', maxWidth: 220 }}
        >
          Xem Checklist
        </button>
      )}
      {hasMorning && !hasEvening && (
        <button
          type="button"
          className="btn-mood"
          onClick={() => router.push('/evening')}
          style={{ borderRadius: 12, cursor: 'pointer', flex: '1 1 auto', maxWidth: 220 }}
        >
          Reflection Tối
        </button>
      )}
      {hasMorning && hasEvening && (
        <button
          type="button"
          className="btn-ghost"
          onClick={() => router.push('/morning')}
          style={{ borderRadius: 12, cursor: 'pointer', flex: '1 1 auto', maxWidth: 220 }}
        >
          Check-in Sáng
        </button>
      )}
    </div>
  )
}

// ── Weekly Insight (STT 22) ──────────────────────────────────

function WeeklyInsightCard({ data }: { data: WeeklyInsightResponse | null }) {
  if (!data) return null

  if (!data.available) {
    return (
      <div className="glass-card" style={{ padding: 24 }}>
        <SectionLabel>Weekly Insight</SectionLabel>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Cần thêm {data.days_remaining} ngày nữa để AURA tổng hợp insight tuần cho bạn.
        </p>
        <div
          style={{
            marginTop: 12,
            height: 6,
            borderRadius: 999,
            background: 'var(--border-default)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${((7 - data.days_remaining) / 7) * 100}%`,
              height: '100%',
              background: 'linear-gradient(135deg, var(--mood-color), var(--mood-color-soft))',
              transition: 'width 0.5s ease',
            }}
          />
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
          {7 - data.days_remaining}/7 ngày
        </p>
      </div>
    )
  }

  if (!data.insight) return null

  return (
    <div
      className="glass-card"
      style={{
        padding: 24,
        borderLeft: '2px solid var(--mood-color)',
      }}
    >
      <SectionLabel>Weekly Insight</SectionLabel>
      <p
        style={{
          margin: 0,
          color: 'var(--text-primary)',
          fontSize: '0.96rem',
          lineHeight: 1.65,
        }}
      >
        {data.insight}
      </p>
    </div>
  )
}

// ── Shared ────────────────────────────────────────────────────

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
